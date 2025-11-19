from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
import uuid

from app.models.database import Card, Attendee, QRCode, Event, Brand
from app.models.schemas import CardCreate, PassIssuanceResponse, WalletPass
from app.utils.qr import generate_qr_code
from app.utils.s3 import s3_client
from app.utils.email import email_client
from app.utils.images import fetch_brand_images
from app.utils.apple_wallet import AppleWalletPassGenerator
from app.utils.google_wallet import GoogleWalletPassGenerator
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import (
    AttendeeNotFoundError,
    S3UploadError,
    WalletPassGenerationError,
    EmailDeliveryError
)

logger = get_logger(__name__)


class CardService:
    """Business logic for card operations"""

    @staticmethod
    async def create_card_for_attendee(
        db: AsyncSession,
        attendee_id: uuid.UUID,
        brand_key: str = "OUTREACHPASS"
    ) -> Optional[PassIssuanceResponse]:
        """Create card, QR code, and optionally wallet pass for an attendee"""

        # Fetch attendee
        result = await db.execute(
            select(Attendee).where(Attendee.attendee_id == attendee_id)
        )
        attendee = result.scalar_one_or_none()

        if not attendee:
            raise AttendeeNotFoundError(attendee_id=str(attendee_id))

        # Fetch event
        event_result = await db.execute(
            select(Event)
            .where(Event.event_id == attendee.event_id)
        )
        event = event_result.scalar_one_or_none()

        # Fetch brand separately if event has one
        brand = None
        if event and event.brand_id:
            brand_result = await db.execute(
                select(Brand).where(Brand.brand_id == event.brand_id)
            )
            brand = brand_result.scalar_one_or_none()

        # Create card
        display_name = f"{attendee.first_name or ''} {attendee.last_name or ''}".strip()
        if not display_name:
            display_name = attendee.email or "Attendee"

        links_json = {}
        if attendee.linkedin_url:
            links_json['linkedin'] = attendee.linkedin_url

        card = Card(
            tenant_id=attendee.tenant_id,
            owner_attendee_id=attendee.attendee_id,
            display_name=display_name,
            email=attendee.email,
            phone=attendee.phone,
            org_name=attendee.org_name,
            title=attendee.title,
            links_json=links_json,
            is_personal=False  # Event-temporary card
        )

        db.add(card)
        await db.flush()

        # Update attendee with card reference
        attendee.card_id = card.card_id

        # Generate card URL
        base_domain = settings.BRAND_DOMAINS.get(brand_key, settings.BRAND_DOMAINS["OUTREACHPASS"])
        card_url = f"{base_domain}/c/{card.card_id}"

        # Generate QR code
        qr_bytes = generate_qr_code(card_url)

        # Upload to S3
        s3_key = f"qr/{attendee.tenant_id}/{card.card_id}.png"
        s3_client.upload_file(
            file_bytes=qr_bytes,
            key=s3_key,
            content_type="image/png"
        )

        # Create QR code record
        qr_code = QRCode(
            tenant_id=attendee.tenant_id,
            event_id=attendee.event_id,
            card_id=card.card_id,
            url=card_url,
            s3_key_png=s3_key
        )

        db.add(qr_code)
        await db.commit()

        # Track QR code generation (Enhanced Analytics)
        try:
            from app.services.analytics_service import AnalyticsService
            from app.models.database import AnalyticsEvent

            await db.execute(
                AnalyticsEvent.__table__.insert().values(
                    tenant_id=attendee.tenant_id,
                    event_type_id=attendee.event_id,
                    event_name="qr_generated",
                    category="delivery",
                    card_id=card.card_id,
                    attendee_id=attendee.attendee_id,
                    properties={"s3_key": s3_key, "url": card_url}
                )
            )
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to track QR generation: {e}")

        # Generate wallet passes if enabled
        wallet_passes = []

        # Apple Wallet pass
        if settings.APPLE_WALLET_ENABLED and event:
            try:
                apple_wallet_pass = await CardService._generate_apple_wallet_pass(
                    db=db,
                    card=card,
                    attendee=attendee,
                    event=event,
                    brand=brand,
                    card_url=card_url,
                    base_domain=base_domain
                )
                if apple_wallet_pass:
                    wallet_passes.append(apple_wallet_pass)
            except Exception as e:
                # Log wallet pass generation failure but don't fail card creation
                logger.warning(
                    "Failed to generate Apple Wallet pass",
                    exc_info=True,
                    extra={"extra_fields": {
                        "card_id": str(card.card_id),
                        "attendee_id": str(attendee.attendee_id),
                        "error": str(e)
                    }}
                )

        # Google Wallet pass
        if settings.GOOGLE_WALLET_ENABLED and event:
            try:
                google_wallet_pass = await CardService._generate_google_wallet_pass(
                    db=db,
                    card=card,
                    attendee=attendee,
                    event=event,
                    brand=brand,
                    card_url=card_url,
                    base_domain=base_domain
                )
                if google_wallet_pass:
                    wallet_passes.append(google_wallet_pass)
            except Exception as e:
                # Log wallet pass generation failure but don't fail card creation
                logger.warning(
                    "Failed to generate Google Wallet pass",
                    exc_info=True,
                    extra={"extra_fields": {
                        "card_id": str(card.card_id),
                        "attendee_id": str(attendee.attendee_id),
                        "error": str(e)
                    }}
                )

        # Send email if attendee has email (non-blocking)
        if attendee.email and event:
            try:
                # Extract brand information for email customization
                brand_name = brand.display_name if brand else None
                brand_theme = brand.theme_json if brand else None

                # Generate pre-signed URL for QR code (valid for 7 days)
                qr_s3_url = s3_client.get_presigned_url(s3_key, expiration=604800)  # 7 days = 604800 seconds

                vcard_url = f"{base_domain}/c/{card.card_id}/vcard"
                email_sent = email_client.send_pass_email(
                    to_email=attendee.email,
                    display_name=display_name,
                    event_name=event.name,
                    card_url=card_url,
                    qr_url=qr_s3_url,
                    wallet_passes=wallet_passes,
                    vcard_url=vcard_url,
                    # Brand customization
                    brand_name=brand_name,
                    brand_theme=brand_theme,
                    # Tracking parameters
                    card_id=card.card_id,
                    tenant_id=attendee.tenant_id,
                    event_id=attendee.event_id,
                    attendee_id=attendee.attendee_id,
                    db=db
                )

                # Track email sent in Enhanced Analytics
                if email_sent:
                    try:
                        from app.models.database import AnalyticsEvent
                        await db.execute(
                            AnalyticsEvent.__table__.insert().values(
                                tenant_id=attendee.tenant_id,
                                event_type_id=attendee.event_id,
                                event_name="email_sent",
                                category="delivery",
                                card_id=card.card_id,
                                attendee_id=attendee.attendee_id,
                                properties={
                                    "recipient": attendee.email,
                                    "has_apple_wallet": any(p.type == "apple" for p in wallet_passes),
                                    "has_google_wallet": any(p.type == "google" for p in wallet_passes),
                                    "wallet_count": len(wallet_passes)
                                }
                            )
                        )
                        await db.commit()
                    except Exception as e:
                        logger.warning(f"Failed to track email in Enhanced Analytics: {e}")
                else:
                    # Track email failure
                    try:
                        from app.models.database import AnalyticsEvent
                        await db.execute(
                            AnalyticsEvent.__table__.insert().values(
                                tenant_id=attendee.tenant_id,
                                event_type_id=attendee.event_id,
                                event_name="email_failed",
                                category="error",
                                card_id=card.card_id,
                                attendee_id=attendee.attendee_id,
                                properties={"recipient": attendee.email}
                            )
                        )
                        await db.commit()
                    except Exception as e:
                        logger.warning(f"Failed to track email failure in Enhanced Analytics: {e}")

            except Exception as e:
                # Log email failure but don't fail pass generation
                logger.warning(
                    "Failed to send pass email",
                    exc_info=True,
                    extra={"extra_fields": {
                        "recipient_email": attendee.email,
                        "card_id": str(card.card_id),
                        "attendee_id": str(attendee.attendee_id),
                        "error": str(e)
                    }}
                )

                # Track email error in Enhanced Analytics
                try:
                    from app.models.database import AnalyticsEvent
                    await db.execute(
                        AnalyticsEvent.__table__.insert().values(
                            tenant_id=attendee.tenant_id,
                            event_type_id=attendee.event_id if event else None,
                            event_name="email_error",
                            category="error",
                            card_id=card.card_id,
                            attendee_id=attendee.attendee_id,
                            properties={"recipient": attendee.email, "error": str(e)}
                        )
                    )
                    await db.commit()
                except Exception as track_error:
                    logger.warning(f"Failed to track email error in Enhanced Analytics: {track_error}")

        return PassIssuanceResponse(
            card_id=card.card_id,
            qr_url=card_url,
            qr_s3_key=s3_key,
            wallet_passes=wallet_passes
        )

    @staticmethod
    async def get_card_by_id(
        db: AsyncSession,
        card_id: uuid.UUID
    ) -> Optional[Card]:
        """Retrieve card by ID"""
        result = await db.execute(
            select(Card).where(Card.card_id == card_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _generate_apple_wallet_pass(
        db: AsyncSession,
        card: Card,
        attendee: Attendee,
        event: Event,
        brand: Optional[Brand],
        card_url: str,
        base_domain: str
    ) -> Optional[WalletPass]:
        """
        Generate an Apple Wallet (.pkpass) file for the attendee

        Args:
            card: Card database record
            attendee: Attendee database record
            event: Event database record
            card_url: URL to the digital card
            base_domain: Base domain for URLs

        Returns:
            WalletPass object with download URL or None if generation failed
        """
        try:
            # Initialize Apple Wallet generator if not already done
            if not settings.APPLE_WALLET_TEAM_ID or not settings.APPLE_WALLET_PASS_TYPE_ID:
                logger.warning(
                    "Apple Wallet not fully configured - skipping pass generation",
                    extra={"extra_fields": {"card_id": str(card.card_id)}}
                )
                return None

            # Extract brand information for customization
            brand_name = brand.display_name if brand else settings.APPLE_WALLET_ORGANIZATION_NAME
            brand_theme = brand.theme_json if brand else {}

            # Create generator instance with brand name
            generator = AppleWalletPassGenerator(
                team_id=settings.APPLE_WALLET_TEAM_ID,
                pass_type_id=settings.APPLE_WALLET_PASS_TYPE_ID,
                organization_name=brand_name,
                cert_path=settings.APPLE_WALLET_CERT_PATH,
                key_path=settings.APPLE_WALLET_KEY_PATH,
                wwdr_cert_path=settings.APPLE_WALLET_WWDR_CERT_PATH
            )

            # Prepare additional fields for the pass
            additional_fields = {}
            if attendee.org_name:
                additional_fields["organization"] = {
                    "label": "ORGANIZATION",
                    "value": attendee.org_name
                }
            if attendee.title:
                additional_fields["title"] = {
                    "label": "TITLE",
                    "value": attendee.title
                }

            # Generate the .pkpass file
            display_name = f"{attendee.first_name or ''} {attendee.last_name or ''}".strip()
            if not display_name:
                display_name = attendee.email or "Attendee"

            # Extract brand colors for wallet pass styling
            apple_wallet_theme = brand_theme.get('apple_wallet', {})
            background_color = apple_wallet_theme.get('background_color') or brand_theme.get('primary_color', '#1E40AF')
            foreground_color = apple_wallet_theme.get('foreground_color', '#FFFFFF')
            label_color = apple_wallet_theme.get('label_color', '#E5E7EB')

            # Fetch brand images from URLs (if configured)
            brand_images = await fetch_brand_images(brand_theme, wallet_type='apple')
            logo_image = brand_images.get('logo')
            icon_image = brand_images.get('icon')
            strip_image = brand_images.get('strip')

            pkpass_bytes = generator.create_event_pass(
                serial_number=str(card.card_id),
                attendee_name=display_name,
                event_name=event.name,
                event_date=event.starts_at,
                qr_code_url=card_url,
                background_color=background_color,
                foreground_color=foreground_color,
                label_color=label_color,
                additional_fields=additional_fields,
                logo_image=logo_image,
                icon_image=icon_image,
                strip_image=strip_image
            )

            # Upload .pkpass file to S3
            pkpass_s3_key = f"passes/apple/{attendee.tenant_id}/{card.card_id}.pkpass"
            s3_client.upload_file(
                file_bytes=pkpass_bytes,
                key=pkpass_s3_key,
                content_type="application/vnd.apple.pkpass"
            )

            # Generate public download URL
            pkpass_url = f"{base_domain}/api/v1/passes/apple/{card.card_id}"

            logger.info(
                "Generated Apple Wallet pass",
                extra={"extra_fields": {
                    "card_id": str(card.card_id),
                    "event_id": str(event.event_id),
                    "s3_key": pkpass_s3_key
                }}
            )

            # Track wallet pass generation (legacy table)
            try:
                from app.services.analytics_service import AnalyticsService
                await AnalyticsService.track_wallet_event(
                    db=db,
                    card=card,
                    event_id=event.event_id,
                    platform="apple",
                    event_type="generated",
                    request=None
                )
            except Exception as e:
                logger.warning(
                    "Failed to track Apple Wallet pass generation",
                    extra={"extra_fields": {"card_id": str(card.card_id), "error": str(e)}}
                )

            # Track in Enhanced Analytics
            try:
                from app.models.database import AnalyticsEvent
                await db.execute(
                    AnalyticsEvent.__table__.insert().values(
                        tenant_id=attendee.tenant_id,
                        event_type_id=event.event_id,
                        event_name="apple_wallet_generated",
                        category="delivery",
                        card_id=card.card_id,
                        attendee_id=attendee.attendee_id,
                        properties={"platform": "apple", "s3_key": pkpass_s3_key}
                    )
                )
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to track Apple Wallet in Enhanced Analytics: {e}")

            return WalletPass(
                type="apple",
                url=pkpass_url,
                s3_key=pkpass_s3_key
            )

        except Exception as e:
            logger.error(
                "Error generating Apple Wallet pass",
                exc_info=True,
                extra={"extra_fields": {"card_id": str(card.card_id), "error": str(e)}}
            )
            return None

    @staticmethod
    async def _generate_google_wallet_pass(
        db: AsyncSession,
        card: Card,
        attendee: Attendee,
        event: Event,
        brand: Optional[Brand],
        card_url: str,
        base_domain: str
    ) -> Optional[WalletPass]:
        """
        Generate a Google Wallet pass for the attendee

        Args:
            card: Card database record
            attendee: Attendee database record
            event: Event database record
            card_url: URL to the digital card
            base_domain: Base domain for URLs

        Returns:
            WalletPass object with save URL or None if generation failed
        """
        try:
            # Check if Google Wallet is configured
            if not settings.GOOGLE_WALLET_ISSUER_ID or not settings.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL:
                logger.warning(
                    "Google Wallet not fully configured - skipping pass generation",
                    extra={"extra_fields": {"card_id": str(card.card_id)}}
                )
                return None

            # Extract brand information for customization
            brand_name = brand.display_name if brand else "OutreachPass"

            # Create generator instance
            generator = GoogleWalletPassGenerator(
                issuer_id=settings.GOOGLE_WALLET_ISSUER_ID,
                service_account_email=settings.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
                service_account_file=settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE,
                origins=settings.GOOGLE_WALLET_ORIGINS
            )

            # Generate class ID from event (one class per event)
            # Use configurable suffix to allow forcing new class creation with all required fields
            class_id = f"{settings.GOOGLE_WALLET_CLASS_SUFFIX}_{event.event_id}".replace("-", "_")

            # Create/update the pass class (template) for this event
            generator.create_event_pass_class(
                class_id=class_id,
                event_name=event.name,
                organization_name=brand_name
            )

            # Prepare additional fields for the pass
            additional_fields = {}
            if attendee.org_name:
                additional_fields["organization"] = {
                    "label": "ORGANIZATION",
                    "value": attendee.org_name
                }
            if attendee.title:
                additional_fields["title"] = {
                    "label": "TITLE",
                    "value": attendee.title
                }

            # Get attendee display name
            display_name = f"{attendee.first_name or ''} {attendee.last_name or ''}".strip()
            if not display_name:
                display_name = attendee.email or "Attendee"

            # Generate object ID from card
            object_id = f"card_{card.card_id}".replace("-", "_")

            # Create the pass object for this attendee
            full_object_id = generator.create_event_pass_object(
                class_id=class_id,
                object_id=object_id,
                attendee_name=display_name,
                event_name=event.name,
                event_date=event.starts_at,
                qr_code_url=card_url,
                additional_fields=additional_fields
            )

            if not full_object_id:
                logger.warning(
                    "Failed to create Google Wallet pass object",
                    extra={"extra_fields": {"card_id": str(card.card_id), "class_id": class_id}}
                )
                return None

            # Generate the "Save to Google Wallet" link
            save_url = generator.generate_save_url(
                class_id=class_id,
                object_id=object_id
            )

            logger.info(
                "Generated Google Wallet pass",
                extra={"extra_fields": {
                    "card_id": str(card.card_id),
                    "event_id": str(event.event_id),
                    "save_url": save_url
                }}
            )

            # Track wallet pass generation (legacy table)
            try:
                from app.services.analytics_service import AnalyticsService
                await AnalyticsService.track_wallet_event(
                    db=db,
                    card=card,
                    event_id=event.event_id,
                    platform="google",
                    event_type="generated",
                    request=None
                )
            except Exception as e:
                logger.warning(
                    "Failed to track Google Wallet pass generation",
                    extra={"extra_fields": {"card_id": str(card.card_id), "error": str(e)}}
                )

            # Track in Enhanced Analytics
            try:
                from app.models.database import AnalyticsEvent
                await db.execute(
                    AnalyticsEvent.__table__.insert().values(
                        tenant_id=attendee.tenant_id,
                        event_type_id=event.event_id,
                        event_name="google_wallet_generated",
                        category="delivery",
                        card_id=card.card_id,
                        attendee_id=attendee.attendee_id,
                        properties={"platform": "google", "save_url": save_url}
                    )
                )
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to track Google Wallet in Enhanced Analytics: {e}")

            return WalletPass(
                type="google",
                url=save_url,
                s3_key=None  # Google Wallet uses links, not stored files
            )

        except Exception as e:
            logger.error(
                "Error generating Google Wallet pass",
                exc_info=True,
                extra={"extra_fields": {"card_id": str(card.card_id), "error": str(e)}}
            )
            return None
