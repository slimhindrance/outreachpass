"""
Analytics Service

Handles all analytics tracking and reporting for OutreachPass.
Tracks card views, email engagement, wallet passes, and contact exports.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, desc
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
import uuid
from fastapi import Request

from app.models.database import (
    CardViewEvent, EmailEvent, WalletPassEvent,
    ContactExportEvent, Card, Event, Attendee, Tenant, AnalyticsEvent
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class AnalyticsService:
    """Business logic for analytics tracking and reporting"""

    # ========================================================================
    # Tracking Methods - Record Analytics Events
    # ========================================================================

    @staticmethod
    async def track_card_view(
        db: AsyncSession,
        card: Card,
        event_id: Optional[uuid.UUID],
        source_type: str,
        request: Request
    ) -> CardViewEvent:
        """
        Track a card view event with device context

        Args:
            db: Database session
            card: Card being viewed
            event_id: Optional event ID for context
            source_type: View source (qr_scan, direct_link, email_link, share)
            request: FastAPI request for user-agent, IP, referrer

        Returns:
            Created CardViewEvent
        """
        # Parse user agent for device detection
        user_agent_str = request.headers.get("user-agent", "")
        device_info = AnalyticsService._parse_user_agent(user_agent_str)

        view_event = CardViewEvent(
            tenant_id=card.tenant_id,
            event_id=event_id,
            card_id=card.card_id,
            source_type=source_type,
            referrer_url=request.headers.get("referer"),
            user_agent=user_agent_str,
            ip_address=request.client.host if request.client else None,
            device_type=device_info.get("device_type"),
            browser=device_info.get("browser"),
            os=device_info.get("os"),
            session_id=request.cookies.get("session_id")  # If session tracking exists
        )

        db.add(view_event)
        await db.commit()
        await db.refresh(view_event)

        logger.info(
            "Card view tracked",
            extra={"extra_fields": {
                "card_id": str(card.card_id),
                "event_id": str(event_id) if event_id else None,
                "source_type": source_type,
                "device_type": device_info.get("device_type")
            }}
        )

        return view_event

    @staticmethod
    async def track_email_event(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        message_id: str,
        recipient_email: str,
        event_type: str,
        card_id: Optional[uuid.UUID] = None,
        event_id: Optional[uuid.UUID] = None,
        attendee_id: Optional[uuid.UUID] = None,
        link_url: Optional[str] = None,
        request: Optional[Request] = None
    ) -> EmailEvent:
        """
        Track email engagement events

        Args:
            db: Database session
            tenant_id: Tenant identifier
            message_id: AWS SES MessageId
            recipient_email: Email recipient
            event_type: Event type (sent, delivered, opened, clicked, bounced, complained)
            card_id: Optional card ID
            event_id: Optional event ID
            attendee_id: Optional attendee ID
            link_url: For click events, the clicked link
            request: Optional FastAPI request for tracking opens/clicks

        Returns:
            Created EmailEvent
        """
        email_event = EmailEvent(
            tenant_id=tenant_id,
            event_id=event_id,
            card_id=card_id,
            attendee_id=attendee_id,
            message_id=message_id,
            recipient_email=recipient_email,
            event_type=event_type,
            link_url=link_url,
            user_agent=request.headers.get("user-agent") if request else None,
            ip_address=request.client.host if request and request.client else None
        )

        db.add(email_event)
        await db.commit()
        await db.refresh(email_event)

        logger.info(
            "Email event tracked",
            extra={"extra_fields": {
                "message_id": message_id,
                "event_type": event_type,
                "card_id": str(card_id) if card_id else None,
                "recipient_email": recipient_email
            }}
        )

        return email_event

    @staticmethod
    async def track_wallet_event(
        db: AsyncSession,
        card: Card,
        event_id: uuid.UUID,
        platform: str,
        event_type: str,
        request: Optional[Request] = None
    ) -> WalletPassEvent:
        """
        Track wallet pass events

        Args:
            db: Database session
            card: Card associated with wallet pass
            event_id: Event ID
            platform: Wallet platform (apple or google)
            event_type: Event type (generated, email_clicked, added_to_wallet, removed, updated)
            request: Optional FastAPI request for context

        Returns:
            Created WalletPassEvent
        """
        user_agent_str = request.headers.get("user-agent", "") if request else ""
        device_info = AnalyticsService._parse_user_agent(user_agent_str)

        wallet_event = WalletPassEvent(
            tenant_id=card.tenant_id,
            event_id=event_id,
            card_id=card.card_id,
            platform=platform,
            event_type=event_type,
            user_agent=user_agent_str if request else None,
            ip_address=request.client.host if request and request.client else None,
            device_type=device_info.get("device_type") if request else platform_to_device(platform)
        )

        db.add(wallet_event)
        await db.commit()
        await db.refresh(wallet_event)

        logger.info(
            "Wallet event tracked",
            extra={"extra_fields": {
                "card_id": str(card.card_id),
                "event_id": str(event_id),
                "platform": platform,
                "event_type": event_type
            }}
        )

        return wallet_event

    @staticmethod
    async def track_contact_export(
        db: AsyncSession,
        card: Card,
        event_id: Optional[uuid.UUID],
        export_type: str,
        request: Request
    ) -> ContactExportEvent:
        """
        Track contact export/download events

        Args:
            db: Database session
            card: Card being exported
            event_id: Optional event ID
            export_type: Export type (vcard_download, add_to_contacts, copy_email, copy_phone)
            request: FastAPI request for context

        Returns:
            Created ContactExportEvent
        """
        user_agent_str = request.headers.get("user-agent", "")
        device_info = AnalyticsService._parse_user_agent(user_agent_str)

        export_event = ContactExportEvent(
            tenant_id=card.tenant_id,
            event_id=event_id,
            card_id=card.card_id,
            export_type=export_type,
            user_agent=user_agent_str,
            ip_address=request.client.host if request.client else None,
            device_type=device_info.get("device_type")
        )

        db.add(export_event)
        await db.commit()
        await db.refresh(export_event)

        logger.info(
            "Contact export tracked",
            extra={"extra_fields": {
                "card_id": str(card.card_id),
                "event_id": str(event_id) if event_id else None,
                "export_type": export_type,
                "device_type": device_info.get("device_type")
            }}
        )

        return export_event

    # ========================================================================
    # Query Methods - Analytics Reporting
    # ========================================================================

    @staticmethod
    async def get_overview(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        event_id: Optional[uuid.UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get analytics overview with summary metrics

        Args:
            db: Database session
            tenant_id: Tenant to query
            event_id: Optional event filter
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            Dictionary with summary metrics and breakdowns
        """
        # Build filters
        filters = [CardViewEvent.tenant_id == tenant_id]
        if event_id:
            filters.append(CardViewEvent.event_id == event_id)
        if start_date:
            filters.append(CardViewEvent.occurred_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            filters.append(CardViewEvent.occurred_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

        # Total card views
        view_count_result = await db.execute(
            select(func.count(CardViewEvent.view_event_id))
            .where(and_(*filters))
        )
        total_views = view_count_result.scalar() or 0

        # Card views by source
        source_breakdown_result = await db.execute(
            select(
                CardViewEvent.source_type,
                func.count(CardViewEvent.view_event_id).label("count")
            )
            .where(and_(*filters))
            .group_by(CardViewEvent.source_type)
        )
        source_breakdown = {row[0]: row[1] for row in source_breakdown_result}

        # Device type breakdown
        device_breakdown_result = await db.execute(
            select(
                CardViewEvent.device_type,
                func.count(CardViewEvent.view_event_id).label("count")
            )
            .where(and_(*filters))
            .group_by(CardViewEvent.device_type)
        )
        device_breakdown = {row[0] or "unknown": row[1] for row in device_breakdown_result}

        # Email engagement
        email_filters = [EmailEvent.tenant_id == tenant_id]
        if event_id:
            email_filters.append(EmailEvent.event_id == event_id)
        if start_date:
            email_filters.append(EmailEvent.occurred_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            email_filters.append(EmailEvent.occurred_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

        email_stats_result = await db.execute(
            select(
                func.count(case((EmailEvent.event_type == "sent", 1))).label("sent"),
                func.count(case((EmailEvent.event_type == "opened", 1))).label("opened"),
                func.count(case((EmailEvent.event_type == "clicked", 1))).label("clicked")
            )
            .where(and_(*email_filters))
        )
        email_stats = email_stats_result.first()

        # Wallet pass stats
        wallet_filters = [WalletPassEvent.tenant_id == tenant_id]
        if event_id:
            wallet_filters.append(WalletPassEvent.event_id == event_id)
        if start_date:
            wallet_filters.append(WalletPassEvent.occurred_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            wallet_filters.append(WalletPassEvent.occurred_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

        wallet_stats_result = await db.execute(
            select(
                WalletPassEvent.platform,
                func.count(case((WalletPassEvent.event_type == "generated", 1))).label("generated"),
                func.count(case((WalletPassEvent.event_type == "added_to_wallet", 1))).label("added")
            )
            .where(and_(*wallet_filters))
            .group_by(WalletPassEvent.platform)
        )
        wallet_stats = {row[0]: {"generated": row[1], "added": row[2]} for row in wallet_stats_result}

        # Contact exports
        export_filters = [ContactExportEvent.tenant_id == tenant_id]
        if event_id:
            export_filters.append(ContactExportEvent.event_id == event_id)
        if start_date:
            export_filters.append(ContactExportEvent.occurred_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            export_filters.append(ContactExportEvent.occurred_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

        export_count_result = await db.execute(
            select(func.count(ContactExportEvent.export_event_id))
            .where(and_(*export_filters))
        )
        total_exports = export_count_result.scalar() or 0

        return {
            "total_card_views": total_views,
            "total_email_sends": email_stats[0] if email_stats else 0,
            "total_email_opens": email_stats[1] if email_stats else 0,
            "total_email_clicks": email_stats[2] if email_stats else 0,
            "total_wallet_passes": sum(s["generated"] for s in wallet_stats.values()),
            "total_wallet_adds": sum(s["added"] for s in wallet_stats.values()),
            "total_contact_exports": total_exports,
            "breakdown": {
                "by_source": source_breakdown,
                "by_device": device_breakdown,
                "by_platform": wallet_stats
            }
        }

    @staticmethod
    async def get_card_metrics(
        db: AsyncSession,
        card_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get detailed analytics for a specific card

        Args:
            db: Database session
            card_id: Card to analyze

        Returns:
            Dictionary with card-specific metrics
        """
        # Card views
        view_count_result = await db.execute(
            select(func.count(CardViewEvent.view_event_id))
            .where(CardViewEvent.card_id == card_id)
        )
        total_views = view_count_result.scalar() or 0

        # Unique viewers (by IP)
        unique_viewers_result = await db.execute(
            select(func.count(func.distinct(CardViewEvent.ip_address)))
            .where(and_(CardViewEvent.card_id == card_id, CardViewEvent.ip_address.isnot(None)))
        )
        unique_viewers = unique_viewers_result.scalar() or 0

        # VCard downloads
        vcard_downloads_result = await db.execute(
            select(func.count(ContactExportEvent.export_event_id))
            .where(and_(
                ContactExportEvent.card_id == card_id,
                ContactExportEvent.export_type == "vcard_download"
            ))
        )
        vcard_downloads = vcard_downloads_result.scalar() or 0

        # Email opened
        email_opened_result = await db.execute(
            select(EmailEvent.occurred_at)
            .where(and_(
                EmailEvent.card_id == card_id,
                EmailEvent.event_type == "opened"
            ))
            .order_by(EmailEvent.occurred_at)
            .limit(1)
        )
        email_opened = email_opened_result.scalar()

        # Wallet adds by platform
        wallet_adds_result = await db.execute(
            select(
                WalletPassEvent.platform,
                func.count(WalletPassEvent.wallet_event_id)
            )
            .where(and_(
                WalletPassEvent.card_id == card_id,
                WalletPassEvent.event_type == "added_to_wallet"
            ))
            .group_by(WalletPassEvent.platform)
        )
        wallet_adds = {row[0]: row[1] for row in wallet_adds_result}

        return {
            "card_id": str(card_id),
            "total_views": total_views,
            "unique_viewers": unique_viewers,
            "vcard_downloads": vcard_downloads,
            "email_opened": email_opened is not None,
            "email_opened_at": email_opened.isoformat() if email_opened else None,
            "wallet_adds": wallet_adds
        }

    @staticmethod
    async def get_event_metrics(
        db: AsyncSession,
        event_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get analytics for an event

        Args:
            db: Database session
            event_id: Event to analyze

        Returns:
            Dictionary with event-level analytics
        """
        # Get event details
        event_result = await db.execute(
            select(Event).where(Event.event_id == event_id)
        )
        event = event_result.scalar_one_or_none()

        if not event:
            return {"error": "Event not found"}

        # Attendee count
        attendee_count_result = await db.execute(
            select(func.count(Attendee.attendee_id))
            .where(Attendee.event_id == event_id)
        )
        attendee_count = attendee_count_result.scalar() or 0

        # Use overview method with event filter
        overview = await AnalyticsService.get_overview(
            db=db,
            tenant_id=event.tenant_id,
            event_id=event_id
        )

        # Top cards by views
        top_cards_result = await db.execute(
            select(
                CardViewEvent.card_id,
                Card.display_name,
                func.count(CardViewEvent.view_event_id).label("view_count")
            )
            .join(Card, CardViewEvent.card_id == Card.card_id)
            .where(CardViewEvent.event_id == event_id)
            .group_by(CardViewEvent.card_id, Card.display_name)
            .order_by(desc("view_count"))
            .limit(10)
        )
        top_cards = [
            {"card_id": str(row[0]), "display_name": row[1], "views": row[2]}
            for row in top_cards_result
        ]

        # Engagement rate (% of attendees who had card views)
        engaged_count_result = await db.execute(
            select(func.count(func.distinct(CardViewEvent.card_id)))
            .where(CardViewEvent.event_id == event_id)
        )
        engaged_count = engaged_count_result.scalar() or 0
        engagement_rate = (engaged_count / attendee_count) if attendee_count > 0 else 0

        return {
            "event_id": str(event_id),
            "event_name": event.name,
            "attendee_count": attendee_count,
            "engaged_attendees": engaged_count,
            "engagement_rate": round(engagement_rate, 2),
            **overview,
            "top_cards": top_cards
        }

    # ========================================================================
    # Helper Methods
    # ========================================================================

    @staticmethod
    def _parse_user_agent(user_agent_str: str) -> Dict[str, Optional[str]]:
        """
        Parse user agent string for device type, browser, and OS using user-agents library

        Args:
            user_agent_str: User agent string from request headers

        Returns:
            Dictionary with device_type, browser, os
        """
        from user_agents import parse

        if not user_agent_str:
            return {"device_type": None, "browser": None, "os": None}

        # Parse user agent with user-agents library
        ua = parse(user_agent_str)

        # Device type detection
        if ua.is_mobile:
            device_type = "mobile"
        elif ua.is_tablet:
            device_type = "tablet"
        elif ua.is_pc:
            device_type = "desktop"
        elif ua.is_bot:
            device_type = "bot"
        else:
            device_type = "unknown"

        # Browser detection
        browser = ua.browser.family if ua.browser.family else "Unknown"

        # OS detection
        os = ua.os.family if ua.os.family else "Unknown"

        return {
            "device_type": device_type,
            "browser": browser,
            "os": os
        }


def platform_to_device(platform: str) -> str:
    """Map wallet platform to device type"""
    return "ios" if platform == "apple" else "android" if platform == "google" else "unknown"
