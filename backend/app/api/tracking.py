"""
Email and Link Tracking Endpoints

Provides tracking infrastructure for:
- Email opens (via tracking pixel)
- Email link clicks (via redirect)
- Wallet button clicks from emails
"""
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.core.database import get_db
from app.models.database import Card, EmailEvent
from app.services.analytics_service import AnalyticsService


router = APIRouter(prefix="/track", tags=["tracking"])


# In-memory message_id to context mapping (for MVP)
# In production, this should be Redis or database table
_message_cache = {}


def store_message_context(
    message_id: str,
    card_id: uuid.UUID,
    tenant_id: uuid.UUID,
    event_id: Optional[uuid.UUID] = None,
    attendee_id: Optional[uuid.UUID] = None,
    recipient_email: str = ""
):
    """Store message context for tracking correlation"""
    _message_cache[message_id] = {
        "card_id": card_id,
        "tenant_id": tenant_id,
        "event_id": event_id,
        "attendee_id": attendee_id,
        "recipient_email": recipient_email
    }


def get_message_context(message_id: str) -> Optional[dict]:
    """Retrieve message context from cache"""
    return _message_cache.get(message_id)


@router.get("/email/open/{message_id}")
async def track_email_open(
    message_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Email open tracking pixel endpoint

    Returns a 1x1 transparent GIF image and tracks the email open event.
    This endpoint is called when the email is opened by embedding an image tag:
    <img src="/api/track/email/open/{message_id}" width="1" height="1" />

    Args:
        message_id: Unique message identifier from email sending
        request: FastAPI request for user-agent and IP
        db: Database session

    Returns:
        1x1 transparent GIF image
    """
    # Get message context
    context = get_message_context(message_id)

    if context:
        try:
            await AnalyticsService.track_email_event(
                db=db,
                tenant_id=context["tenant_id"],
                message_id=message_id,
                recipient_email=context["recipient_email"],
                event_type="opened",
                card_id=context.get("card_id"),
                event_id=context.get("event_id"),
                attendee_id=context.get("attendee_id"),
                request=request
            )
        except Exception as e:
            # Log but don't fail - tracking pixel should always return image
            import logging
            logging.getLogger(__name__).warning(f"Failed to track email open: {str(e)}")

    # Return 1x1 transparent GIF
    # GIF89a format: 43 bytes for a 1x1 transparent pixel
    pixel = (
        b'\x47\x49\x46\x38\x39\x61'  # GIF89a header
        b'\x01\x00\x01\x00'          # 1x1 dimensions
        b'\x00\x00\x00'              # No color table
        b'\x21\xf9\x04'              # Graphic control extension
        b'\x01\x00\x00\x00\x00'      # Transparent color
        b'\x2c\x00\x00\x00\x00'      # Image descriptor
        b'\x01\x00\x01\x00'          # 1x1 image
        b'\x00'                      # No local color table
        b'\x02\x02\x44\x01\x00'      # Image data
        b'\x3b'                      # Trailer
    )

    return Response(
        content=pixel,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/email/click")
async def track_email_click(
    url: str,
    mid: str,  # message_id
    type: str,  # link_type: wallet, vcard, card, other
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Email link click tracking with redirect

    Tracks when a link is clicked in an email and redirects to the target URL.
    Links in emails are wrapped like:
    /api/track/email/click?url={encoded_url}&mid={message_id}&type={link_type}

    Args:
        url: Target URL to redirect to (URL-encoded)
        mid: Message ID for correlation
        type: Link type (wallet, vcard, card, other)
        request: FastAPI request for user-agent and IP
        db: Database session

    Returns:
        Redirect to the target URL
    """
    # Get message context
    context = get_message_context(mid)

    if context:
        try:
            await AnalyticsService.track_email_event(
                db=db,
                tenant_id=context["tenant_id"],
                message_id=mid,
                recipient_email=context["recipient_email"],
                event_type="clicked",
                card_id=context.get("card_id"),
                event_id=context.get("event_id"),
                attendee_id=context.get("attendee_id"),
                link_url=url,
                request=request
            )

            # Track wallet button clicks separately
            if type == "wallet" and context.get("card_id"):
                # Determine platform from URL
                platform = "google" if "google.com" in url.lower() else "apple" if "apple.com" in url.lower() else "unknown"

                if platform != "unknown":
                    # Get card for wallet event tracking
                    card_result = await db.execute(
                        select(Card).where(Card.card_id == context["card_id"])
                    )
                    card = card_result.scalar_one_or_none()

                    if card:
                        await AnalyticsService.track_wallet_event(
                            db=db,
                            card=card,
                            event_id=context["event_id"],
                            platform=platform,
                            event_type="email_clicked",
                            request=request
                        )
        except Exception as e:
            # Log but don't fail redirect
            import logging
            logging.getLogger(__name__).warning(f"Failed to track email click: {str(e)}")

    # Redirect to target URL
    return RedirectResponse(url=url, status_code=302)


@router.post("/wallet/add/{platform}/{card_id}")
async def track_wallet_add(
    platform: str,
    card_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Track when a user successfully adds a pass to their wallet

    This endpoint can be called via JavaScript callback from the wallet
    provider when they confirm the pass was added.

    Args:
        platform: Wallet platform (apple or google)
        card_id: Card ID
        request: FastAPI request for context
        db: Database session

    Returns:
        Status confirmation
    """
    try:
        # Get card
        result = await db.execute(
            select(Card).where(Card.card_id == card_id)
        )
        card = result.scalar_one_or_none()

        if not card:
            return {"status": "error", "message": "Card not found"}

        # Track wallet add event
        await AnalyticsService.track_wallet_event(
            db=db,
            card=card,
            event_id=None,  # Could be retrieved from card if needed
            platform=platform,
            event_type="added_to_wallet",
            request=request
        )

        return {"status": "tracked", "card_id": str(card_id), "platform": platform}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to track wallet add: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/health")
async def tracking_health():
    """Health check endpoint for tracking service"""
    return {
        "status": "healthy",
        "service": "tracking",
        "cached_messages": len(_message_cache)
    }
