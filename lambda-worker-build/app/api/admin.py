from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
import csv
import io
import uuid
import json
import boto3
import os

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

# Initialize SQS client with timeout configuration
from botocore.config import Config
sqs_config = Config(
    connect_timeout=5,
    read_timeout=5,
    retries={'max_attempts': 2}
)
sqs = boto3.client('sqs', region_name=os.getenv('AWS_REGION', 'us-east-1'), config=sqs_config)
SQS_QUEUE_URL = os.getenv('SQS_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/741783034843/outreachpass-pass-generation')


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
    """Import attendees from CSV with validation
    
    Limits:
    - Max file size: 5MB
    - Max rows: 10,000
    """
    
    # SECURITY: Validate file size (5MB limit)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_ROWS = 10000
    
    # Read file with size check
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
        )
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Verify event exists
    event_result = await db.execute(
        select(Event).where(Event.event_id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Parse CSV
    try:
        csv_data = io.StringIO(contents.decode('utf-8'))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please use UTF-8")
    
    try:
        reader = csv.DictReader(csv_data)
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is line 1)
        # SECURITY: Enforce row limit
        if row_num - 1 > MAX_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"Too many rows. Maximum is {MAX_ROWS:,} rows"
            )
        
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
            errors.append(f"Row {row_num}: {str(e)}")

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


@router.get("/attendees/{attendee_id}", response_model=AttendeeResponse)
async def get_attendee(
    attendee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a single attendee by ID"""
    result = await db.execute(
        select(Attendee).where(Attendee.attendee_id == attendee_id)
    )
    attendee = result.scalar_one_or_none()

    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    return attendee


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

    # Check if pass already exists
    if attendee.card_id:
        # Return existing job or create completed job record
        existing_job = await db.execute(
            select(PassGenerationJob)
            .where(PassGenerationJob.attendee_id == attendee_id)
            .where(PassGenerationJob.status == "completed")
            .order_by(PassGenerationJob.created_at.desc())
        )
        job = existing_job.scalar_one_or_none()

        if job:
            return job

        # Create completed job record for existing pass
        job = PassGenerationJob(
            attendee_id=attendee_id,
            tenant_id=attendee.tenant_id,
            status="completed",
            card_id=attendee.card_id
        )
        job.started_at = job.created_at
        job.completed_at = job.created_at

        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    # Check if there's already a pending/processing job
    existing_pending = await db.execute(
        select(PassGenerationJob)
        .where(PassGenerationJob.attendee_id == attendee_id)
        .where(PassGenerationJob.status.in_(["pending", "processing"]))
        .order_by(PassGenerationJob.created_at.desc())
    )
    pending_job = existing_pending.scalar_one_or_none()

    if pending_job:
        return pending_job

    # Create pass generation job
    job = PassGenerationJob(
        attendee_id=attendee_id,
        tenant_id=attendee.tenant_id,
        status="pending"
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Send message to SQS queue
    try:
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                "job_id": str(job.job_id),
                "attendee_id": str(attendee_id),
                "tenant_id": str(attendee.tenant_id)
            })
        )
    except Exception as e:
        # If SQS fails, mark job as failed
        job.status = "failed"
        job.error_message = f"Failed to queue job: {str(e)}"
        await db.commit()
        await db.refresh(job)
        raise HTTPException(status_code=500, detail=f"Failed to queue pass generation: {str(e)}")

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
