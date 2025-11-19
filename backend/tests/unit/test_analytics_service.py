"""
Unit Tests for Analytics Service

Tests all analytics tracking and reporting methods including:
- Card view tracking
- Email event tracking
- Wallet pass event tracking
- Contact export tracking
- Analytics overview queries
- Card-specific analytics
- Event-specific analytics
"""
import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select, func

from app.services.analytics_service import AnalyticsService
from app.models.database import (
    EmailEvent, CardViewEvent, WalletPassEvent, ContactExportEvent
)


class TestAnalyticsTracking:
    """Test analytics event tracking methods"""

    @pytest.mark.asyncio
    async def test_track_card_view(self, db_session, test_card, test_event, sample_request_context):
        """Test card view tracking with device context"""
        view_event = await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            source_type="qr_scan",
            request=sample_request_context
        )

        assert view_event.view_event_id is not None
        assert view_event.tenant_id == test_card.tenant_id
        assert view_event.card_id == test_card.card_id
        assert view_event.event_id == test_event.event_id
        assert view_event.source_type == "qr_scan"
        assert view_event.ip_address == "192.168.1.1"
        assert view_event.device_type == "mobile"  # Parsed from iPhone user agent
        assert view_event.occurred_at is not None

    @pytest.mark.asyncio
    async def test_track_card_view_sources(self, db_session, test_card, test_event, sample_request_context):
        """Test tracking different card view sources"""
        sources = ["qr_scan", "direct_link", "email_link", "share"]

        for source in sources:
            view_event = await AnalyticsService.track_card_view(
                db=db_session,
                card=test_card,
                event_id=test_event.event_id,
                source_type=source,
                request=sample_request_context
            )
            assert view_event.source_type == source

        # Verify all sources were tracked
        result = await db_session.execute(
            select(func.count(CardViewEvent.view_event_id))
            .where(CardViewEvent.card_id == test_card.card_id)
        )
        assert result.scalar() == len(sources)

    @pytest.mark.asyncio
    async def test_track_email_event(self, db_session, test_tenant, test_card, test_event, test_attendee):
        """Test email event tracking"""
        email_event = await AnalyticsService.track_email_event(
            db=db_session,
            tenant_id=test_tenant.tenant_id,
            message_id="test-msg-123",
            recipient_email="test@example.com",
            event_type="opened",
            card_id=test_card.card_id,
            event_id=test_event.event_id,
            attendee_id=test_attendee.attendee_id,
            link_url=None,
            request=None
        )

        assert email_event.email_event_id is not None
        assert email_event.tenant_id == test_tenant.tenant_id
        assert email_event.message_id == "test-msg-123"
        assert email_event.recipient_email == "test@example.com"
        assert email_event.event_type == "opened"
        assert email_event.card_id == test_card.card_id
        assert email_event.event_id == test_event.event_id
        assert email_event.attendee_id == test_attendee.attendee_id

    @pytest.mark.asyncio
    async def test_track_email_funnel(self, db_session, test_tenant, test_card, test_event):
        """Test email engagement funnel tracking"""
        message_id = "funnel-test-123"
        recipient = "funnel@example.com"

        # Track email funnel: sent -> delivered -> opened -> clicked
        funnel_events = ["sent", "delivered", "opened", "clicked"]

        for event_type in funnel_events:
            await AnalyticsService.track_email_event(
                db=db_session,
                tenant_id=test_tenant.tenant_id,
                message_id=message_id,
                recipient_email=recipient,
                event_type=event_type,
                card_id=test_card.card_id,
                event_id=test_event.event_id
            )

        # Verify all funnel stages tracked
        result = await db_session.execute(
            select(func.count(EmailEvent.email_event_id))
            .where(EmailEvent.message_id == message_id)
        )
        assert result.scalar() == len(funnel_events)

    @pytest.mark.asyncio
    async def test_track_wallet_event(self, db_session, test_card, test_event, sample_request_context):
        """Test wallet pass event tracking"""
        wallet_event = await AnalyticsService.track_wallet_event(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            platform="google",
            event_type="added_to_wallet",
            request=sample_request_context
        )

        assert wallet_event.wallet_event_id is not None
        assert wallet_event.tenant_id == test_card.tenant_id
        assert wallet_event.card_id == test_card.card_id
        assert wallet_event.event_id == test_event.event_id
        assert wallet_event.platform == "google"
        assert wallet_event.event_type == "added_to_wallet"
        assert wallet_event.device_type == "mobile"

    @pytest.mark.asyncio
    async def test_track_wallet_platforms(self, db_session, test_card, test_event, sample_request_context):
        """Test tracking both Apple and Google wallet events"""
        platforms = ["apple", "google"]
        event_types = ["generated", "email_clicked", "added_to_wallet"]

        for platform in platforms:
            for event_type in event_types:
                await AnalyticsService.track_wallet_event(
                    db=db_session,
                    card=test_card,
                    event_id=test_event.event_id,
                    platform=platform,
                    event_type=event_type,
                    request=sample_request_context
                )

        # Verify all combinations tracked
        result = await db_session.execute(
            select(func.count(WalletPassEvent.wallet_event_id))
            .where(WalletPassEvent.card_id == test_card.card_id)
        )
        assert result.scalar() == len(platforms) * len(event_types)

    @pytest.mark.asyncio
    async def test_track_contact_export(self, db_session, test_card, test_event, sample_request_context):
        """Test contact export event tracking"""
        export_event = await AnalyticsService.track_contact_export(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            export_type="vcard_download",
            request=sample_request_context
        )

        assert export_event.export_event_id is not None
        assert export_event.tenant_id == test_card.tenant_id
        assert export_event.card_id == test_card.card_id
        assert export_event.event_id == test_event.event_id
        assert export_event.export_type == "vcard_download"
        assert export_event.ip_address == "192.168.1.1"

    @pytest.mark.asyncio
    async def test_track_export_types(self, db_session, test_card, test_event, sample_request_context):
        """Test tracking different export types"""
        export_types = ["vcard_download", "add_to_contacts", "copy_email", "copy_phone"]

        for export_type in export_types:
            await AnalyticsService.track_contact_export(
                db=db_session,
                card=test_card,
                event_id=test_event.event_id,
                export_type=export_type,
                request=sample_request_context
            )

        # Verify all export types tracked
        result = await db_session.execute(
            select(func.count(ContactExportEvent.export_event_id))
            .where(ContactExportEvent.card_id == test_card.card_id)
        )
        assert result.scalar() == len(export_types)


class TestAnalyticsQueries:
    """Test analytics reporting and query methods"""

    @pytest.mark.asyncio
    async def test_get_overview_empty(self, db_session, test_tenant):
        """Test analytics overview with no data"""
        overview = await AnalyticsService.get_overview(
            db=db_session,
            tenant_id=test_tenant.tenant_id
        )

        assert overview["total_card_views"] == 0
        assert overview["total_email_sends"] == 0
        assert overview["total_email_opens"] == 0
        assert overview["total_email_clicks"] == 0
        assert overview["total_wallet_passes"] == 0
        assert overview["total_wallet_adds"] == 0
        assert overview["total_contact_exports"] == 0
        assert "breakdown" in overview

    @pytest.mark.asyncio
    async def test_get_overview_with_data(
        self, db_session, test_tenant, test_card, test_event, sample_request_context
    ):
        """Test analytics overview with actual data"""
        # Create test data
        await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            source_type="qr_scan",
            request=sample_request_context
        )

        await AnalyticsService.track_email_event(
            db=db_session,
            tenant_id=test_tenant.tenant_id,
            message_id="overview-test",
            recipient_email="test@example.com",
            event_type="sent",
            event_id=test_event.event_id
        )

        await AnalyticsService.track_wallet_event(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            platform="google",
            event_type="generated",
            request=sample_request_context
        )

        await AnalyticsService.track_contact_export(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            export_type="vcard_download",
            request=sample_request_context
        )

        # Get overview
        overview = await AnalyticsService.get_overview(
            db=db_session,
            tenant_id=test_tenant.tenant_id
        )

        assert overview["total_card_views"] == 1
        assert overview["total_email_sends"] == 1
        assert overview["total_wallet_passes"] == 1
        assert overview["total_contact_exports"] == 1
        assert "breakdown" in overview
        assert "by_source" in overview["breakdown"]
        assert "by_device" in overview["breakdown"]

    @pytest.mark.asyncio
    async def test_get_overview_event_filter(
        self, db_session, test_tenant, test_card, test_event, sample_request_context
    ):
        """Test analytics overview filtered by event"""
        # Create data for this event
        await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            source_type="qr_scan",
            request=sample_request_context
        )

        # Create data for different event (None)
        await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=None,
            source_type="direct_link",
            request=sample_request_context
        )

        # Get overview filtered by event
        overview = await AnalyticsService.get_overview(
            db=db_session,
            tenant_id=test_tenant.tenant_id,
            event_id=test_event.event_id
        )

        # Should only count the event-specific view
        assert overview["total_card_views"] == 1

    @pytest.mark.asyncio
    async def test_get_card_metrics(self, db_session, test_card, test_event, sample_request_context):
        """Test card-specific analytics"""
        # Create test data for card
        await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            source_type="qr_scan",
            request=sample_request_context
        )

        await AnalyticsService.track_contact_export(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            export_type="vcard_download",
            request=sample_request_context
        )

        await AnalyticsService.track_wallet_event(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            platform="apple",
            event_type="added_to_wallet",
            request=sample_request_context
        )

        # Get card metrics
        metrics = await AnalyticsService.get_card_metrics(
            db=db_session,
            card_id=test_card.card_id
        )

        assert metrics["card_id"] == str(test_card.card_id)
        assert metrics["total_views"] == 1
        assert metrics["unique_viewers"] == 1  # Based on IP
        assert metrics["vcard_downloads"] == 1
        assert "wallet_adds" in metrics
        assert metrics["wallet_adds"]["apple"] == 1

    @pytest.mark.asyncio
    async def test_get_event_metrics(self, db_session, test_event, test_card, sample_request_context):
        """Test event-level analytics"""
        # Create test data for event
        await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            source_type="qr_scan",
            request=sample_request_context
        )

        # Get event metrics
        metrics = await AnalyticsService.get_event_metrics(
            db=db_session,
            event_id=test_event.event_id
        )

        assert metrics["event_id"] == str(test_event.event_id)
        assert metrics["event_name"] == test_event.name
        assert "attendee_count" in metrics
        assert "engaged_attendees" in metrics
        assert "engagement_rate" in metrics
        assert metrics["total_card_views"] == 1

    @pytest.mark.asyncio
    async def test_get_event_metrics_not_found(self, db_session):
        """Test event metrics for non-existent event"""
        fake_event_id = uuid.uuid4()
        metrics = await AnalyticsService.get_event_metrics(
            db=db_session,
            event_id=fake_event_id
        )

        assert metrics == {"error": "Event not found"}


class TestAnalyticsEdgeCases:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_track_email_without_request(self, db_session, test_tenant):
        """Test email tracking without request context"""
        email_event = await AnalyticsService.track_email_event(
            db=db_session,
            tenant_id=test_tenant.tenant_id,
            message_id="no-request-test",
            recipient_email="test@example.com",
            event_type="sent"
        )

        assert email_event.user_agent is None
        assert email_event.ip_address is None

    @pytest.mark.asyncio
    async def test_track_wallet_without_request(self, db_session, test_card, test_event):
        """Test wallet tracking without request context"""
        wallet_event = await AnalyticsService.track_wallet_event(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            platform="apple",
            event_type="generated",
            request=None
        )

        assert wallet_event.user_agent is None
        assert wallet_event.ip_address is None

    @pytest.mark.asyncio
    async def test_user_agent_parsing(self):
        """Test user agent parsing logic"""
        # Test mobile detection
        mobile_ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
        result = AnalyticsService._parse_user_agent(mobile_ua)
        assert result["device_type"] == "mobile"

        # Test desktop detection
        desktop_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0"
        result = AnalyticsService._parse_user_agent(desktop_ua)
        assert result["device_type"] == "desktop"

        # Test tablet detection
        tablet_ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)"
        result = AnalyticsService._parse_user_agent(tablet_ua)
        assert result["device_type"] == "tablet"

        # Test empty user agent
        result = AnalyticsService._parse_user_agent("")
        assert result["device_type"] is None
        assert result["browser"] is None
        assert result["os"] is None

    @pytest.mark.asyncio
    async def test_tenant_isolation(
        self, db_session, test_tenant, test_card, test_event, sample_request_context
    ):
        """Test that analytics are properly isolated by tenant"""
        # Create another tenant
        other_tenant_id = uuid.uuid4()

        # Track event for test tenant
        await AnalyticsService.track_card_view(
            db=db_session,
            card=test_card,
            event_id=test_event.event_id,
            source_type="qr_scan",
            request=sample_request_context
        )

        # Get overview for test tenant
        overview1 = await AnalyticsService.get_overview(
            db=db_session,
            tenant_id=test_tenant.tenant_id
        )

        # Get overview for other tenant (should be empty)
        overview2 = await AnalyticsService.get_overview(
            db=db_session,
            tenant_id=other_tenant_id
        )

        assert overview1["total_card_views"] == 1
        assert overview2["total_card_views"] == 0
