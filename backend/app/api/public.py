from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import date
import uuid

from app.core.database import get_db
from app.models.database import Card, ScanDaily, Event, Attendee
from app.models.schemas import CardResponse
from app.utils.vcard import generate_vcard


router = APIRouter(tags=["public"])


@router.get("/c/{card_id}", response_class=HTMLResponse)
async def get_card_page(
    card_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Render public contact card page"""

    # Get card
    result = await db.execute(
        select(Card).where(Card.card_id == card_id)
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Track scan (aggregate only)
    today = date.today()
    await db.execute(
        """
        INSERT INTO scans_daily (day, tenant_id, event_id, card_id, scan_count, vcard_downloads)
        VALUES (:day, :tenant_id, NULL, :card_id, 1, 0)
        ON CONFLICT (day, tenant_id, event_id, card_id)
        DO UPDATE SET scan_count = scans_daily.scan_count + 1
        """,
        {
            "day": today,
            "tenant_id": card.tenant_id,
            "card_id": card.card_id
        }
    )
    await db.commit()

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
    db: AsyncSession = Depends(get_db)
):
    """Download VCard file"""

    # Get card
    result = await db.execute(
        select(Card).where(Card.card_id == card_id)
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Track download
    today = date.today()
    await db.execute(
        """
        INSERT INTO scans_daily (day, tenant_id, event_id, card_id, scan_count, vcard_downloads)
        VALUES (:day, :tenant_id, NULL, :card_id, 0, 1)
        ON CONFLICT (day, tenant_id, event_id, card_id)
        DO UPDATE SET vcard_downloads = scans_daily.vcard_downloads + 1
        """,
        {
            "day": today,
            "tenant_id": card.tenant_id,
            "card_id": card.card_id
        }
    )
    await db.commit()

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
