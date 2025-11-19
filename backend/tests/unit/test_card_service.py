"""
Unit Tests for CardService

Tests card creation, QR generation, wallet pass generation, and email delivery.
"""
import pytest
import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta

from app.services.card_service import CardService
from app.models.database import Card, Attendee, QRCode, Event
from app.models.schemas import WalletPass


@pytest.mark.unit
@pytest.mark.asyncio
class TestCardService:
    """Test suite for CardService"""

    async def test_create_card_for_attendee_success(
        self,
        db_session,
        test_tenant,
        test_event,
        mock_s3_client,
        mock_qr_generator
    ):
        """Test successful card creation for attendee"""
        # Create test attendee
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            email="john.doe@example.com",
            first_name="John",
            last_name="Doe",
            org_name="Test Corp",
            title="Engineer"
        )
        db_session.add(attendee)
        await db_session.commit()

        # Mock S3 upload
        with patch("app.services.card_service.s3_client") as mock_s3:
            mock_s3.upload_file = MagicMock()

            # Create card
            result = await CardService.create_card_for_attendee(
                db=db_session,
                attendee_id=attendee.attendee_id
            )

            # Assertions
            assert result is not None
            assert result.card_id is not None
            assert result.qr_url is not None
            assert mock_s3.upload_file.called

            # Verify card in database
            card_result = await db_session.execute(
                db_session.query(Card).filter(Card.card_id == result.card_id)
            )
            card = card_result.scalar_one_or_none()
            assert card is not None
            assert card.display_name == "John Doe"
            assert card.email == "john.doe@example.com"

    async def test_create_card_attendee_not_found(self, db_session):
        """Test card creation fails when attendee doesn't exist"""
        result = await CardService.create_card_for_attendee(
            db=db_session,
            attendee_id=uuid.uuid4()  # Non-existent ID
        )

        assert result is None

    async def test_create_card_display_name_fallback(
        self,
        db_session,
        test_tenant,
        test_event,
        mock_s3_client
    ):
        """Test display name falls back to email when names missing"""
        # Attendee with no first/last name
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            email="user@example.com"
        )
        db_session.add(attendee)
        await db_session.commit()

        with patch("app.services.card_service.s3_client") as mock_s3, \
             patch("app.services.card_service.generate_qr_code") as mock_qr, \
             patch("app.services.card_service.email_client"):

            mock_s3.upload_file = MagicMock()
            mock_qr.return_value = b"fake-qr-bytes"

            result = await CardService.create_card_for_attendee(
                db=db_session,
                attendee_id=attendee.attendee_id
            )

            # Verify display name uses email
            card_result = await db_session.execute(
                db_session.query(Card).filter(Card.card_id == result.card_id)
            )
            card = card_result.scalar_one_or_none()
            assert card.display_name == "user@example.com"

    async def test_qr_code_generation(
        self,
        db_session,
        test_tenant,
        test_event,
        mock_s3_client
    ):
        """Test QR code is generated and uploaded to S3"""
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            email="test@example.com",
            first_name="Test"
        )
        db_session.add(attendee)
        await db_session.commit()

        with patch("app.services.card_service.generate_qr_code") as mock_qr, \
             patch("app.services.card_service.s3_client") as mock_s3, \
             patch("app.services.card_service.email_client"):

            mock_qr.return_value = b"fake-qr-bytes"
            mock_s3.upload_file = MagicMock()

            result = await CardService.create_card_for_attendee(
                db=db_session,
                attendee_id=attendee.attendee_id
            )

            # Verify QR generation was called
            assert mock_qr.called
            card_url = mock_qr.call_args[0][0]
            assert str(result.card_id) in card_url

            # Verify S3 upload
            assert mock_s3.upload_file.called
            upload_args = mock_s3.upload_file.call_args[1]
            assert upload_args["file_bytes"] == b"fake-qr-bytes"
            assert upload_args["content_type"] == "image/png"
            assert f"qr/{test_tenant.tenant_id}/" in upload_args["key"]

    async def test_wallet_pass_generation_disabled(
        self,
        db_session,
        test_tenant,
        test_event
    ):
        """Test wallet passes not generated when disabled"""
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            email="test@example.com"
        )
        db_session.add(attendee)
        await db_session.commit()

        with patch("app.services.card_service.s3_client"), \
             patch("app.services.card_service.generate_qr_code") as mock_qr, \
             patch("app.services.card_service.settings") as mock_settings, \
             patch("app.services.card_service.email_client"):

            mock_qr.return_value = b"fake-qr-bytes"
            mock_settings.GOOGLE_WALLET_ENABLED = False
            mock_settings.APPLE_WALLET_ENABLED = False
            mock_settings.BRAND_DOMAINS = {"OUTREACHPASS": "https://test.com"}

            result = await CardService.create_card_for_attendee(
                db=db_session,
                attendee_id=attendee.attendee_id
            )

            # No wallet passes should be generated
            assert result.wallet_passes is None or len(result.wallet_passes) == 0

    async def test_email_not_sent_when_missing(
        self,
        db_session,
        test_tenant,
        test_event
    ):
        """Test email not sent when attendee has no email"""
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            first_name="Test",
            email=None  # No email
        )
        db_session.add(attendee)
        await db_session.commit()

        with patch("app.services.card_service.s3_client"), \
             patch("app.services.card_service.generate_qr_code") as mock_qr, \
             patch("app.services.card_service.email_client") as mock_email:

            mock_qr.return_value = b"fake-qr-bytes"

            result = await CardService.create_card_for_attendee(
                db=db_session,
                attendee_id=attendee.attendee_id
            )

            # Email should not be sent
            assert not mock_email.send_pass_email.called

    async def test_linkedin_url_included_in_links(
        self,
        db_session,
        test_tenant,
        test_event
    ):
        """Test LinkedIn URL is included in card links"""
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            email="test@example.com",
            first_name="Test",
            linkedin_url="https://linkedin.com/in/testuser"
        )
        db_session.add(attendee)
        await db_session.commit()

        with patch("app.services.card_service.s3_client"), \
             patch("app.services.card_service.generate_qr_code") as mock_qr, \
             patch("app.services.card_service.email_client"):

            mock_qr.return_value = b"fake-qr-bytes"

            result = await CardService.create_card_for_attendee(
                db=db_session,
                attendee_id=attendee.attendee_id
            )

            # Verify card has LinkedIn link
            card_result = await db_session.execute(
                db_session.query(Card).filter(Card.card_id == result.card_id)
            )
            card = card_result.scalar_one_or_none()
            assert "linkedin" in card.links_json
            assert card.links_json["linkedin"] == "https://linkedin.com/in/testuser"

    async def test_s3_upload_failure_handling(
        self,
        db_session,
        test_tenant,
        test_event
    ):
        """Test graceful handling of S3 upload failures"""
        attendee = Attendee(
            attendee_id=uuid.uuid4(),
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id,
            email="test@example.com"
        )
        db_session.add(attendee)
        await db_session.commit()

        with patch("app.services.card_service.generate_qr_code") as mock_qr, \
             patch("app.services.card_service.s3_client") as mock_s3:

            mock_qr.return_value = b"fake-qr-bytes"
            mock_s3.upload_file.side_effect = Exception("S3 upload failed")

            # Should raise exception (card creation should fail if QR upload fails)
            with pytest.raises(Exception):
                await CardService.create_card_for_attendee(
                    db=db_session,
                    attendee_id=attendee.attendee_id
                )
