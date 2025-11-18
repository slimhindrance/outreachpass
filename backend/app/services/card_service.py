from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
import uuid
import logging

from app.models.database import Card, Attendee, QRCode, Event
from app.models.schemas import CardCreate, PassIssuanceResponse, WalletPass
from app.utils.qr import generate_qr_code
from app.utils.s3 import s3_client
from app.utils.email import email_client
from app.utils.apple_wallet import AppleWalletPassGenerator
from app.utils.google_wallet import GoogleWalletPassGenerator

logger = logging.getLogger(__name__)
from app.core.config import settings


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
            return None

        # Fetch event for context
        event_result = await db.execute(
            select(Event).where(Event.event_id == attendee.event_id)
        )
        event = event_result.scalar_one_or_none()

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

        # Generate wallet passes if enabled
        wallet_passes = []

        # Apple Wallet pass
        if settings.APPLE_WALLET_ENABLED and event:
            try:
                apple_wallet_pass = await CardService._generate_apple_wallet_pass(
                    card=card,
                    attendee=attendee,
                    event=event,
                    card_url=card_url,
                    base_domain=base_domain
                )
                if apple_wallet_pass:
                    wallet_passes.append(apple_wallet_pass)
            except Exception as e:
                # Log wallet pass generation failure but don't fail card creation
                logger.warning(f"Failed to generate Apple Wallet pass: {str(e)}")

        # Google Wallet pass
        if settings.GOOGLE_WALLET_ENABLED and event:
            try:
                google_wallet_pass = await CardService._generate_google_wallet_pass(
                    card=card,
                    attendee=attendee,
                    event=event,
                    card_url=card_url,
                    base_domain=base_domain
                )
                if google_wallet_pass:
                    wallet_passes.append(google_wallet_pass)
            except Exception as e:
                # Log wallet pass generation failure but don't fail card creation
                logger.warning(f"Failed to generate Google Wallet pass: {str(e)}")

        # Send email if attendee has email (non-blocking)
        if attendee.email and event:
            try:
                vcard_url = f"{base_domain}/c/{card.card_id}/vcard"
                email_client.send_pass_email(
                    to_email=attendee.email,
                    display_name=display_name,
                    event_name=event.name,
                    card_url=card_url,
                    qr_url=f"{base_domain}/qr/{card.card_id}",
                    wallet_passes=wallet_passes,
                    vcard_url=vcard_url
                )
            except Exception as e:
                # Log email failure but don't fail pass generation
                logger.warning(f"Failed to send pass email to {attendee.email}: {str(e)}")

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
        card: Card,
        attendee: Attendee,
        event: Event,
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
                logger.warning("Apple Wallet not fully configured - skipping pass generation")
                return None

            # Create generator instance
            generator = AppleWalletPassGenerator(
                team_id=settings.APPLE_WALLET_TEAM_ID,
                pass_type_id=settings.APPLE_WALLET_PASS_TYPE_ID,
                organization_name=settings.APPLE_WALLET_ORGANIZATION_NAME,
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

            pkpass_bytes = generator.create_event_pass(
                serial_number=str(card.card_id),
                attendee_name=display_name,
                event_name=event.name,
                event_date=event.starts_at,
                qr_code_url=card_url,
                additional_fields=additional_fields,
                # TODO: Add actual logo/icon/strip images from S3 or config
                logo_image=None,
                icon_image=None,
                strip_image=None
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

            logger.info(f"Generated Apple Wallet pass for card {card.card_id}")

            return WalletPass(
                type="apple",
                url=pkpass_url,
                s3_key=pkpass_s3_key
            )

        except Exception as e:
            logger.error(f"Error generating Apple Wallet pass: {str(e)}", exc_info=True)
            return None

    @staticmethod
    async def _generate_google_wallet_pass(
        card: Card,
        attendee: Attendee,
        event: Event,
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
                logger.warning("Google Wallet not fully configured - skipping pass generation")
                return None

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
                organization_name=settings.GOOGLE_WALLET_ORIGINS[0].split("//")[1].split(".")[0].title() if settings.GOOGLE_WALLET_ORIGINS else "OutreachPass"
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
                logger.warning("Failed to create Google Wallet pass object")
                return None

            # Generate the "Save to Google Wallet" link
            save_url = generator.generate_save_url(
                class_id=class_id,
                object_id=object_id
            )

            logger.info(f"Generated Google Wallet pass for card {card.card_id}")

            return WalletPass(
                type="google",
                url=save_url,
                s3_key=None  # Google Wallet uses links, not stored files
            )

        except Exception as e:
            logger.error(f"Error generating Google Wallet pass: {str(e)}", exc_info=True)
            return None
