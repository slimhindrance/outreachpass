"""
Pass Generation Worker Lambda
Processes pass generation jobs from SQS queue
"""
import json
import logging
import os
from typing import Dict, Any
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import uuid

from app.models.database import PassGenerationJob, Attendee
from app.services.card_service import CardService
from app.core.config import settings

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create async engine for worker
DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def process_pass_generation_job(job_id: str) -> Dict[str, Any]:
    """Process a single pass generation job"""
    async with AsyncSessionLocal() as db:
        job = None
        try:
            # Fetch job
            result = await db.execute(
                select(PassGenerationJob).where(PassGenerationJob.job_id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()

            if not job:
                logger.error(f"Job {job_id} not found")
                return {"status": "error", "message": "Job not found"}

            # Check if already completed
            if job.status == "completed":
                logger.info(f"Job {job_id} already completed")
                return {"status": "success", "message": "Job already completed"}

            # Update job status to processing
            job.status = "processing"
            job.started_at = job.created_at
            await db.commit()

            # Fetch attendee
            attendee_result = await db.execute(
                select(Attendee).where(Attendee.attendee_id == job.attendee_id)
            )
            attendee = attendee_result.scalar_one_or_none()

            if not attendee:
                job.status = "failed"
                job.error_message = "Attendee not found"
                await db.commit()
                return {"status": "error", "message": "Attendee not found"}

            # Check if pass already exists for this attendee
            if attendee.card_id:
                logger.info(f"Attendee {attendee.attendee_id} already has card {attendee.card_id}")
                job.status = "completed"
                job.card_id = attendee.card_id
                job.completed_at = job.created_at
                await db.commit()
                return {"status": "success", "message": "Pass already exists", "card_id": str(attendee.card_id)}

            # Generate pass
            logger.info(f"Generating pass for attendee {attendee.attendee_id}")
            pass_result = await CardService.create_card_for_attendee(
                db=db,
                attendee_id=job.attendee_id
            )

            if not pass_result:
                job.status = "failed"
                job.error_message = "Failed to generate pass"
                await db.commit()
                return {"status": "error", "message": "Failed to generate pass"}

            # Update job with success
            job.status = "completed"
            job.card_id = pass_result.card_id
            job.qr_url = pass_result.qr_url
            job.completed_at = job.created_at
            await db.commit()

            logger.info(f"Successfully generated pass {pass_result.card_id} for job {job_id}")
            return {
                "status": "success",
                "message": "Pass generated successfully",
                "job_id": str(job.job_id),
                "card_id": str(pass_result.card_id),
                "qr_url": pass_result.qr_url
            }

        except Exception as e:
            logger.error(f"Error processing job {job_id}: {str(e)}", exc_info=True)

            # Update job with failure
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await db.commit()

            return {"status": "error", "message": str(e)}


async def process_all_records(event: Dict[str, Any]) -> list:
    """Process all SQS records asynchronously"""
    results = []

    for record in event.get("Records", []):
        try:
            # Parse message body
            body = json.loads(record["body"])
            job_id = body.get("job_id")

            if not job_id:
                logger.error(f"No job_id in message: {record['body']}")
                continue

            # Process job
            result = await process_pass_generation_job(job_id)
            results.append(result)

        except Exception as e:
            logger.error(f"Error processing record: {str(e)}", exc_info=True)
            results.append({"status": "error", "message": str(e)})

    return results


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for SQS-triggered pass generation

    Event structure:
    {
        "Records": [
            {
                "body": "{\"job_id\": \"uuid-here\"}",
                "messageId": "...",
                ...
            }
        ]
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Get or create event loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    # Process all records
    results = loop.run_until_complete(process_all_records(event))

    return {
        "statusCode": 200,
        "body": json.dumps({
            "processed": len(results),
            "results": results
        })
    }
