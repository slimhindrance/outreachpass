from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.models.database import Card, Attendee, QRCode, Event
from app.models.schemas import CardCreate, PassIssuanceResponse
from app.utils.qr import generate_qr_code
from app.utils.s3 import s3_client
from app.utils.email import email_client
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

        # Send email if attendee has email
        if attendee.email and event:
            email_client.send_pass_email(
                to_email=attendee.email,
                display_name=display_name,
                event_name=event.name,
                card_url=card_url,
                qr_url=f"{base_domain}/qr/{card.card_id}"
            )

        return PassIssuanceResponse(
            card_id=card.card_id,
            qr_url=card_url,
            qr_s3_key=s3_key,
            wallet_passes=[]  # TODO: Add wallet pass generation
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
