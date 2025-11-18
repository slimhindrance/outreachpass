from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from datetime import date
import uuid

from app.core.database import get_db
from app.models.database import Card, ScanDaily, Event, Attendee, QRCode
from app.models.schemas import CardResponse
from app.utils.vcard import generate_vcard
from app.utils.s3 import s3_client
from app.services.analytics_service import AnalyticsService


router = APIRouter(tags=["public"])


@router.get("/c/{card_id}", response_class=HTMLResponse)
async def get_card_page(
    card_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Render public contact card page"""

    # Get card with attendee to get event_id
    result = await db.execute(
        select(Card, Attendee)
        .join(Attendee, Card.owner_attendee_id == Attendee.attendee_id, isouter=True)
        .where(Card.card_id == card_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Card not found")

    card, attendee = row

    # Track scan (aggregate only) - only if we have an event_id
    if attendee and attendee.event_id:
        today = date.today()
        await db.execute(
            text("""
            INSERT INTO scans_daily (day, tenant_id, event_id, card_id, scan_count, vcard_downloads)
            VALUES (:day, :tenant_id, :event_id, :card_id, 1, 0)
            ON CONFLICT (day, tenant_id, event_id, card_id)
            DO UPDATE SET scan_count = scans_daily.scan_count + 1
            """),
            {
                "day": today,
                "tenant_id": card.tenant_id,
                "event_id": attendee.event_id,
                "card_id": card.card_id
            }
        )
        await db.commit()

    # Track detailed card view event (new analytics)
    source_type = "qr_scan" if "qr" in request.headers.get("referer", "").lower() else "direct_link"
    try:
        await AnalyticsService.track_card_view(
            db=db,
            card=card,
            event_id=attendee.event_id if attendee else None,
            source_type=source_type,
            request=request
        )
    except Exception as e:
        # Don't fail the request if analytics tracking fails
        import logging
        logging.getLogger(__name__).warning(f"Failed to track card view: {str(e)}")

    # Build simple HTML response
    links_html = ""
    if card.links_json:
        if card.links_json.get('linkedin'):
            links_html += f'<a href="{card.links_json["linkedin"]}" target="_blank">LinkedIn</a><br>'
        if card.links_json.get('website'):
            links_html += f'<a href="{card.links_json["website"]}" target="_blank">Website</a><br>'

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{card.display_name} - Contact Card</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background: #f5f5f5;
            }}
            .card {{
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }}
            h1 {{
                margin: 0 0 10px 0;
                font-size: 28px;
            }}
            .meta {{
                color: #666;
                margin-bottom: 20px;
            }}
            .contact {{
                margin: 20px 0;
            }}
            .button {{
                display: inline-block;
                background: #0066cc;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 10px 0;
            }}
            .links {{
                margin-top: 20px;
            }}
            .links a {{
                color: #0066cc;
                text-decoration: none;
                display: inline-block;
                margin: 5px 10px 5px 0;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>{card.display_name}</h1>
            <div class="meta">
                {card.title or ''}{' at ' + card.org_name if card.org_name else ''}
            </div>

            <div class="contact">
                {f'<p>Email: <a href="mailto:{card.email}">{card.email}</a></p>' if card.email else ''}
                {f'<p>Phone: <a href="tel:{card.phone}">{card.phone}</a></p>' if card.phone else ''}
            </div>

            <a href="/c/{card.card_id}/vcard" class="button">Add to Contacts (.vcf)</a>

            <div class="links">
                {links_html}
            </div>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html)


@router.get("/c/{card_id}/vcard")
async def download_vcard(
    card_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Download VCard file"""

    # Get card with attendee to get event_id
    result = await db.execute(
        select(Card, Attendee)
        .join(Attendee, Card.owner_attendee_id == Attendee.attendee_id, isouter=True)
        .where(Card.card_id == card_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Card not found")

    card, attendee = row

    # Track download - only if we have an event_id
    if attendee and attendee.event_id:
        today = date.today()
        await db.execute(
            text("""
            INSERT INTO scans_daily (day, tenant_id, event_id, card_id, scan_count, vcard_downloads)
            VALUES (:day, :tenant_id, :event_id, :card_id, 0, 1)
            ON CONFLICT (day, tenant_id, event_id, card_id)
            DO UPDATE SET vcard_downloads = scans_daily.vcard_downloads + 1
            """),
            {
                "day": today,
                "tenant_id": card.tenant_id,
                "event_id": attendee.event_id,
                "card_id": card.card_id
            }
        )
        await db.commit()

    # Track contact export event (new analytics)
    try:
        await AnalyticsService.track_contact_export(
            db=db,
            card=card,
            event_id=attendee.event_id if attendee else None,
            export_type="vcard_download",
            request=request
        )
    except Exception as e:
        # Don't fail the request if analytics tracking fails
        import logging
        logging.getLogger(__name__).warning(f"Failed to track contact export: {str(e)}")

    # Generate VCard
    vcard_str = generate_vcard(
        display_name=card.display_name,
        email=card.email,
        phone=card.phone,
        org_name=card.org_name,
        title=card.title,
        linkedin_url=card.links_json.get('linkedin') if card.links_json else None,
        website=card.links_json.get('website') if card.links_json else None
    )

    # Return as downloadable file
    filename = f"{card.display_name.replace(' ', '_')}.vcf"

    return Response(
        content=vcard_str,
        media_type="text/vcard",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/qr/{card_id}")
async def get_qr_code(
    card_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get QR code PNG image for a card"""

    # Get QR code record
    result = await db.execute(
        select(QRCode).where(QRCode.card_id == card_id)
    )
    qr_code = result.scalar_one_or_none()

    if not qr_code or not qr_code.s3_key_png:
        raise HTTPException(status_code=404, detail="QR code not found")

    # Fetch from S3
    try:
        png_bytes = s3_client.get_file(qr_code.s3_key_png)

        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 1 day
                "Content-Type": "image/png"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve QR code: {str(e)}")


@router.get("/api/cards/{card_id}", response_model=CardResponse)
async def get_card_api(
    card_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get card data (API endpoint)"""
    result = await db.execute(
        select(Card).where(Card.card_id == card_id)
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    return card
