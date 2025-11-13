from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
import csv
import io
import uuid

from app.core.database import get_db
from app.models.database import Event, Attendee, Brand, Tenant, PassGenerationJob
from app.models.schemas import (
    EventCreate,
    EventUpdate,
    EventResponse,
    AttendeeResponse,
    AttendeeImportRow,
    PassIssuanceRequest,
    PassIssuanceResponse,
    PassJobResponse,
    PassJobStatusResponse,
)
from app.services.card_service import CardService
from app.utils.migrations import run_sql_migration, get_database_status
from app.utils.seed import seed_database


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/brands")
async def list_brands(
    db: AsyncSession = Depends(get_db)
):
    """List all brands"""
    result = await db.execute(select(Brand))
    brands = result.scalars().all()
    return [
        {
            "brand_id": str(b.brand_id),
            "brand_key": b.brand_key,
            "display_name": b.display_name,
            "domain": b.domain,
            "theme_json": b.theme_json,
            "features_json": b.features_json
        }
        for b in brands
    ]


@router.get("/events", response_model=List[EventResponse])
async def list_events(
    db: AsyncSession = Depends(get_db)
):
    """List all events"""
    result = await db.execute(select(Event))
    events = result.scalars().all()
    return events


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get dashboard statistics"""

    # Count total events
    total_events_result = await db.execute(
        select(func.count(Event.event_id))
    )
    total_events = total_events_result.scalar() or 0

    # Count active events
    active_events_result = await db.execute(
        select(func.count(Event.event_id)).where(Event.status == 'active')
    )
    active_events = active_events_result.scalar() or 0

    # Count total attendees
    total_attendees_result = await db.execute(
        select(func.count(Attendee.attendee_id))
    )
    total_attendees = total_attendees_result.scalar() or 0

    # For now, return 0 for scans until we have a scans table
    # This can be enhanced later when scan tracking is implemented

    return {
        "totalEvents": total_events,
        "activeEvents": active_events,
        "totalAttendees": total_attendees,
        "totalScans": 0  # Placeholder until scan tracking is implemented
    }


@router.post("/events", response_model=EventResponse)
async def create_event(
    event: EventCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new event"""

    # Verify brand exists
    brand_result = await db.execute(
        select(Brand).where(Brand.brand_id == event.brand_id)
    )
    brand = brand_result.scalar_one_or_none()

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Create event
    db_event = Event(
        tenant_id=brand.tenant_id,
        brand_id=event.brand_id,
        name=event.name,
        slug=event.slug,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        timezone=event.timezone,
        settings_json=event.settings_json,
        status="draft"
    )

    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)

    return db_event


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get event by ID"""
    result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    event_update: EventUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update event"""
    result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update fields
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)

    return event


@router.post("/events/{event_id}/attendees/import")
async def import_attendees(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Import attendees from CSV"""

    # Verify event exists
    event_result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Read CSV
    contents = await file.read()
    csv_data = io.StringIO(contents.decode('utf-8'))
    reader = csv.DictReader(csv_data)

    imported = 0
    errors = []

    for row in reader:
        try:
            # Map CSV columns to attendee fields
            flags_json = {}
            if row.get('role'):
                flags_json['role'] = row['role']

            attendee = Attendee(
                event_id=event_id,
                tenant_id=event.tenant_id,
                first_name=row.get('first_name'),
                last_name=row.get('last_name'),
                email=row.get('email'),
                phone=row.get('phone'),
                org_name=row.get('org_name'),
                title=row.get('title'),
                linkedin_url=row.get('linkedin_url'),
                flags_json=flags_json
            )

            db.add(attendee)
            imported += 1

        except Exception as e:
            errors.append(f"Row error: {str(e)}")

    await db.commit()

    return {
        "imported": imported,
        "errors": errors if errors else None
    }


@router.get("/events/{event_id}/attendees", response_model=List[AttendeeResponse])
async def list_attendees(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """List all attendees for an event"""
    result = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id)
    )
    attendees = result.scalars().all()
    return attendees


@router.post("/attendees/{attendee_id}/issue", response_model=PassJobResponse)
async def issue_pass(
    attendee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Queue a pass generation job for an attendee"""

    # Verify attendee exists
    attendee_result = await db.execute(
        select(Attendee).where(Attendee.attendee_id == attendee_id)
    )
    attendee = attendee_result.scalar_one_or_none()

    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    # Create pass generation job
    job = PassGenerationJob(
        attendee_id=attendee_id,
        tenant_id=attendee.tenant_id,
        status="pending"
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    return job


@router.get("/passes/jobs/{job_id}", response_model=PassJobStatusResponse)
async def get_pass_job_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get the status of a pass generation job"""

    result = await db.execute(
        select(PassGenerationJob).where(PassGenerationJob.job_id == job_id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Create progress message
    if job.status == "pending":
        progress_message = "Pass generation queued, waiting to be processed"
    elif job.status == "processing":
        progress_message = "Generating pass and QR code..."
    elif job.status == "completed":
        progress_message = "Pass generated successfully"
    elif job.status == "failed":
        progress_message = f"Pass generation failed: {job.error_message}"
    else:
        progress_message = f"Status: {job.status}"

    return PassJobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress_message=progress_message,
        card_id=job.card_id,
        qr_url=job.qr_url,
        error_message=job.error_message
    )


@router.get("/db/status")
async def database_status(db: AsyncSession = Depends(get_db)):
    """Get database status and check if migrations have been run"""
    status = await get_database_status(db)
    return status


@router.post("/db/migrate")
async def run_migration(db: AsyncSession = Depends(get_db)):
    """Run initial schema migration (one-time setup)"""
    # SQL file will be packaged with Lambda
    import os
    sql_path = os.path.join(os.path.dirname(__file__), '..', '..', '001_initial_schema.sql')

    if not os.path.exists(sql_path):
        raise HTTPException(
            status_code=500,
            detail=f"Migration file not found at {sql_path}"
        )

    result = await run_sql_migration(db, sql_path)

    if result['status'] == 'error':
        raise HTTPException(status_code=500, detail=result['message'])

    return result


@router.post("/db/migrate-jobs")
async def run_jobs_migration(db: AsyncSession = Depends(get_db)):
    """Run pass generation jobs table migration"""
    import os
    sql_path = os.path.join(os.path.dirname(__file__), '..', '..', '002_pass_generation_jobs.sql')

    if not os.path.exists(sql_path):
        raise HTTPException(
            status_code=500,
            detail=f"Migration file not found at {sql_path}"
        )

    result = await run_sql_migration(db, sql_path)

    if result['status'] == 'error':
        raise HTTPException(status_code=500, detail=result['message'])

    return result


@router.post("/db/reset")
async def reset_database(db: AsyncSession = Depends(get_db)):
    """Drop all tables and reset database (DANGEROUS - use with caution)"""
    from sqlalchemy import text
    try:
        # Drop all tables in public schema
        await db.execute(text("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """))
        await db.commit()

        return {"status": "success", "message": "All tables dropped successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@router.post("/db/seed")
async def seed_db(db: AsyncSession = Depends(get_db)):
    """Seed database with initial Base2ML tenant, brands, and admin user"""
    result = await seed_database(db)

    if result['status'] == 'error':
        raise HTTPException(status_code=500, detail=result['message'])

    return result
