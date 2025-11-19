from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, case
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.database import AnalyticsEvent, Event, Tenant
from pydantic import BaseModel

logger = get_logger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ============================================================================
# Response Models
# ============================================================================

class ConversionRates(BaseModel):
    view_to_download: float
    view_to_wallet: float
    download_to_wallet: float


class DeviceStats(BaseModel):
    type: str
    count: int
    percentage: float


class OSStats(BaseModel):
    name: str
    count: int
    percentage: float


class BrowserStats(BaseModel):
    name: str
    count: int
    percentage: float


class EventSummaryResponse(BaseModel):
    event_id: uuid.UUID
    event_name: str
    total_cards: int
    total_views: int
    total_vcard_downloads: int
    total_apple_wallet_adds: int
    total_google_wallet_adds: int
    total_wallet_adds: int
    total_qr_generated: int
    total_emails_sent: int
    total_emails_failed: int
    conversion_rates: ConversionRates
    device_breakdown: List[DeviceStats]
    date_range_days: int


class TimeSeriesDataPoint(BaseModel):
    timestamp: datetime
    value: int
    unique_cards: Optional[int] = None


class TimeSeriesResponse(BaseModel):
    metric: str
    granularity: str
    data: List[TimeSeriesDataPoint]
    total_count: int
    start_date: datetime
    end_date: datetime


class DeviceBreakdownResponse(BaseModel):
    devices: List[DeviceStats]
    operating_systems: List[OSStats]
    browsers: List[BrowserStats]
    total_events: int
    date_range_days: int


class FunnelStage(BaseModel):
    stage: str
    event_name: str
    unique_cards: int
    total_events: int
    conversion_rate: Optional[float] = None


class ConversionFunnelResponse(BaseModel):
    stages: List[FunnelStage]
    overall_conversion_rate: float
    date_range_days: int


# ============================================================================
# Summary Endpoint
# ============================================================================

@router.get("/events/{event_id}/summary", response_model=EventSummaryResponse)
async def get_event_analytics_summary(
    event_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive analytics summary for an event

    Returns:
    - Total counts for all event types
    - Conversion rates (view→download, view→wallet, etc.)
    - Device type breakdown
    - Date range analyzed
    """

    # Verify event exists
    event_result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Get event counts by type
    counts_query = text("""
        SELECT
            event_name,
            COUNT(*) as count,
            COUNT(DISTINCT card_id) as unique_cards
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
        GROUP BY event_name
    """)

    counts_result = await db.execute(
        counts_query,
        {"event_id": event_id, "start_date": start_date}
    )
    counts = {row.event_name: {"count": row.count, "unique_cards": row.unique_cards}
              for row in counts_result}

    # Extract specific metrics
    total_views = counts.get("card_viewed", {}).get("count", 0)
    total_vcard_downloads = counts.get("vcard_downloaded", {}).get("count", 0)
    total_apple_wallet = counts.get("apple_wallet_generated", {}).get("count", 0)
    total_google_wallet = counts.get("google_wallet_generated", {}).get("count", 0)
    total_wallet_adds = total_apple_wallet + total_google_wallet
    total_qr_generated = counts.get("qr_generated", {}).get("count", 0)
    total_emails_sent = counts.get("email_sent", {}).get("count", 0)
    total_emails_failed = counts.get("email_failed", {}).get("count", 0) + counts.get("email_error", {}).get("count", 0)

    # Get total unique cards
    total_cards_query = text("""
        SELECT COUNT(DISTINCT card_id) as total_cards
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
    """)
    total_cards_result = await db.execute(
        total_cards_query,
        {"event_id": event_id, "start_date": start_date}
    )
    total_cards = total_cards_result.scalar() or 0

    # Calculate conversion rates
    view_to_download = (total_vcard_downloads / total_views) if total_views > 0 else 0.0
    view_to_wallet = (total_wallet_adds / total_views) if total_views > 0 else 0.0
    download_to_wallet = (total_wallet_adds / total_vcard_downloads) if total_vcard_downloads > 0 else 0.0

    # Device breakdown
    device_query = text("""
        SELECT
            device_type,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
          AND device_type IS NOT NULL
        GROUP BY device_type
        ORDER BY count DESC
    """)

    device_result = await db.execute(
        device_query,
        {"event_id": event_id, "start_date": start_date}
    )
    device_breakdown = [
        DeviceStats(type=row.device_type, count=row.count, percentage=float(row.percentage))
        for row in device_result
    ]

    return EventSummaryResponse(
        event_id=event_id,
        event_name=event.name,
        total_cards=total_cards,
        total_views=total_views,
        total_vcard_downloads=total_vcard_downloads,
        total_apple_wallet_adds=total_apple_wallet,
        total_google_wallet_adds=total_google_wallet,
        total_wallet_adds=total_wallet_adds,
        total_qr_generated=total_qr_generated,
        total_emails_sent=total_emails_sent,
        total_emails_failed=total_emails_failed,
        conversion_rates=ConversionRates(
            view_to_download=round(view_to_download, 4),
            view_to_wallet=round(view_to_wallet, 4),
            download_to_wallet=round(download_to_wallet, 4)
        ),
        device_breakdown=device_breakdown,
        date_range_days=days
    )


# ============================================================================
# Time-Series Endpoint
# ============================================================================

@router.get("/events/{event_id}/timeseries", response_model=TimeSeriesResponse)
async def get_event_timeseries(
    event_id: uuid.UUID,
    metric: str = Query(..., description="Metric to chart: views, downloads, wallet_adds, emails_sent"),
    granularity: str = Query("day", description="Time granularity: hour, day, week"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get time-series data for charting event analytics

    Supported metrics:
    - views: card_viewed events
    - downloads: vcard_downloaded events
    - wallet_adds: apple_wallet_generated + google_wallet_generated
    - emails_sent: email_sent events

    Granularity options:
    - hour: Hourly aggregation
    - day: Daily aggregation
    - week: Weekly aggregation
    """

    # Verify event exists
    event_result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Map metric to event names
    metric_map = {
        "views": ["card_viewed"],
        "downloads": ["vcard_downloaded"],
        "wallet_adds": ["apple_wallet_generated", "google_wallet_generated"],
        "emails_sent": ["email_sent"]
    }

    if metric not in metric_map:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metric. Must be one of: {', '.join(metric_map.keys())}"
        )

    # Validate granularity
    granularity_map = {
        "hour": "hour",
        "day": "day",
        "week": "week"
    }

    if granularity not in granularity_map:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid granularity. Must be one of: hour, day, week"
        )

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    event_names = metric_map[metric]
    event_names_str = ", ".join([f"'{name}'" for name in event_names])

    # Build time-series query
    timeseries_query = text(f"""
        SELECT
            DATE_TRUNC('{granularity}', occurred_at) as period,
            COUNT(*) as count,
            COUNT(DISTINCT card_id) as unique_cards
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND event_name IN ({event_names_str})
          AND occurred_at >= :start_date
          AND occurred_at <= :end_date
        GROUP BY DATE_TRUNC('{granularity}', occurred_at)
        ORDER BY period
    """)

    result = await db.execute(
        timeseries_query,
        {"event_id": event_id, "start_date": start_date, "end_date": end_date}
    )

    data_points = [
        TimeSeriesDataPoint(
            timestamp=row.period,
            value=row.count,
            unique_cards=row.unique_cards
        )
        for row in result
    ]

    total_count = sum(point.value for point in data_points)

    return TimeSeriesResponse(
        metric=metric,
        granularity=granularity,
        data=data_points,
        total_count=total_count,
        start_date=start_date,
        end_date=end_date
    )


# ============================================================================
# Device Breakdown Endpoint
# ============================================================================

@router.get("/events/{event_id}/devices", response_model=DeviceBreakdownResponse)
async def get_device_breakdown(
    event_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed device/OS/browser breakdown for event analytics

    Returns:
    - Device type distribution (mobile, tablet, desktop)
    - Operating system distribution
    - Browser distribution
    - Total events analyzed
    """

    # Verify event exists
    event_result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Device type breakdown
    device_query = text("""
        SELECT
            device_type,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
          AND device_type IS NOT NULL
        GROUP BY device_type
        ORDER BY count DESC
    """)

    device_result = await db.execute(
        device_query,
        {"event_id": event_id, "start_date": start_date}
    )

    devices = [
        DeviceStats(type=row.device_type, count=row.count, percentage=float(row.percentage))
        for row in device_result
    ]

    # Operating system breakdown
    os_query = text("""
        SELECT
            os,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
          AND os IS NOT NULL
        GROUP BY os
        ORDER BY count DESC
        LIMIT 10
    """)

    os_result = await db.execute(
        os_query,
        {"event_id": event_id, "start_date": start_date}
    )

    operating_systems = [
        OSStats(name=row.os, count=row.count, percentage=float(row.percentage))
        for row in os_result
    ]

    # Browser breakdown
    browser_query = text("""
        SELECT
            browser,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
          AND browser IS NOT NULL
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 10
    """)

    browser_result = await db.execute(
        browser_query,
        {"event_id": event_id, "start_date": start_date}
    )

    browsers = [
        BrowserStats(name=row.browser, count=row.count, percentage=float(row.percentage))
        for row in browser_result
    ]

    # Total events count
    total_query = text("""
        SELECT COUNT(*) as total
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
    """)

    total_result = await db.execute(
        total_query,
        {"event_id": event_id, "start_date": start_date}
    )
    total_events = total_result.scalar() or 0

    return DeviceBreakdownResponse(
        devices=devices,
        operating_systems=operating_systems,
        browsers=browsers,
        total_events=total_events,
        date_range_days=days
    )


# ============================================================================
# Conversion Funnel Endpoint
# ============================================================================

@router.get("/events/{event_id}/funnel", response_model=ConversionFunnelResponse)
async def get_conversion_funnel(
    event_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get conversion funnel data showing user journey

    Funnel stages:
    1. Card Viewed (entry point)
    2. vCard Downloaded (first conversion)
    3. Wallet Added (final conversion)

    Returns conversion rates between each stage
    """

    # Verify event exists
    event_result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Funnel query
    funnel_query = text("""
        SELECT
            event_name,
            COUNT(DISTINCT card_id) as unique_cards,
            COUNT(*) as total_events
        FROM analytics_events
        WHERE event_type_id = :event_id
          AND occurred_at >= :start_date
          AND event_name IN ('card_viewed', 'vcard_downloaded', 'apple_wallet_generated', 'google_wallet_generated')
        GROUP BY event_name
    """)

    result = await db.execute(
        funnel_query,
        {"event_id": event_id, "start_date": start_date}
    )

    # Process results
    event_data = {row.event_name: {"unique_cards": row.unique_cards, "total_events": row.total_events}
                  for row in result}

    # Build funnel stages
    viewed_cards = event_data.get("card_viewed", {}).get("unique_cards", 0)
    viewed_events = event_data.get("card_viewed", {}).get("total_events", 0)

    downloaded_cards = event_data.get("vcard_downloaded", {}).get("unique_cards", 0)
    downloaded_events = event_data.get("vcard_downloaded", {}).get("total_events", 0)

    apple_wallet_cards = event_data.get("apple_wallet_generated", {}).get("unique_cards", 0)
    google_wallet_cards = event_data.get("google_wallet_generated", {}).get("unique_cards", 0)
    wallet_cards = apple_wallet_cards + google_wallet_cards

    apple_wallet_events = event_data.get("apple_wallet_generated", {}).get("total_events", 0)
    google_wallet_events = event_data.get("google_wallet_generated", {}).get("total_events", 0)
    wallet_events = apple_wallet_events + google_wallet_events

    # Calculate conversion rates
    view_to_download_rate = (downloaded_cards / viewed_cards * 100) if viewed_cards > 0 else 0.0
    download_to_wallet_rate = (wallet_cards / downloaded_cards * 100) if downloaded_cards > 0 else 0.0
    overall_conversion_rate = (wallet_cards / viewed_cards * 100) if viewed_cards > 0 else 0.0

    stages = [
        FunnelStage(
            stage="1. Card Viewed",
            event_name="card_viewed",
            unique_cards=viewed_cards,
            total_events=viewed_events,
            conversion_rate=100.0  # Entry point is 100%
        ),
        FunnelStage(
            stage="2. Contact Downloaded",
            event_name="vcard_downloaded",
            unique_cards=downloaded_cards,
            total_events=downloaded_events,
            conversion_rate=round(view_to_download_rate, 2)
        ),
        FunnelStage(
            stage="3. Wallet Added",
            event_name="wallet_added",
            unique_cards=wallet_cards,
            total_events=wallet_events,
            conversion_rate=round(download_to_wallet_rate, 2)
        )
    ]

    return ConversionFunnelResponse(
        stages=stages,
        overall_conversion_rate=round(overall_conversion_rate, 2),
        date_range_days=days
    )


# ============================================================================
# Tenant-Level Analytics (Bonus Endpoint)
# ============================================================================

@router.get("/tenants/{tenant_id}/summary")
async def get_tenant_analytics_summary(
    tenant_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analytics summary across all events for a tenant

    Useful for:
    - Organization-wide dashboards
    - Multi-event reporting
    - Tenant health metrics
    """

    # Verify tenant exists
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.tenant_id == tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail=f"Tenant {tenant_id} not found")

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Tenant-wide metrics
    summary_query = text("""
        SELECT
            COUNT(DISTINCT event_type_id) as total_events,
            COUNT(DISTINCT card_id) as total_cards,
            COUNT(*) FILTER (WHERE event_name = 'card_viewed') as total_views,
            COUNT(*) FILTER (WHERE event_name = 'vcard_downloaded') as total_downloads,
            COUNT(*) FILTER (WHERE event_name IN ('apple_wallet_generated', 'google_wallet_generated')) as total_wallet_adds,
            COUNT(*) FILTER (WHERE event_name = 'email_sent') as total_emails_sent
        FROM analytics_events
        WHERE tenant_id = :tenant_id
          AND occurred_at >= :start_date
    """)

    result = await db.execute(
        summary_query,
        {"tenant_id": tenant_id, "start_date": start_date}
    )

    row = result.first()

    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant.name,
        "date_range_days": days,
        "total_events": row.total_events or 0,
        "total_cards": row.total_cards or 0,
        "total_views": row.total_views or 0,
        "total_downloads": row.total_downloads or 0,
        "total_wallet_adds": row.total_wallet_adds or 0,
        "total_emails_sent": row.total_emails_sent or 0
    }
