"""
Background worker Lambda function for processing pass generation jobs.

This Lambda:
1. Queries for pending pass generation jobs
2. Processes them in batches (10-20 at a time)
3. Calls CardService to generate cards and QR codes
4. Updates job status with results or errors
5. Implements retry logic for failed jobs
"""

import os
import asyncio
from datetime import datetime
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.database import PassGenerationJob, Attendee
from app.services.card_service import CardService


async def process_job(job: PassGenerationJob, session: AsyncSession) -> bool:
    """
    Process a single pass generation job.

    Returns:
        True if successful, False if failed
    """
    try:
        # Update status to processing
        job.status = "processing"
        job.started_at = datetime.utcnow()
        await session.commit()

        # Get attendee details
        result = await session.execute(
            select(Attendee).where(Attendee.attendee_id == job.attendee_id)
        )
        attendee = result.scalar_one_or_none()

        if not attendee:
            raise ValueError(f"Attendee {job.attendee_id} not found")

        # Create card service instance
        card_service = CardService()

        # Generate card and QR code
        card = await card_service.create_card_for_attendee(
            attendee=attendee,
            session=session
        )

        # Update job with success
        job.status = "completed"
        job.card_id = card.card_id
        job.qr_url = f"https://outreachpass.base2ml.com/c/{card.card_id}"
        job.completed_at = datetime.utcnow()
        job.error_message = None

        await session.commit()

        print(f"✅ Job {job.job_id} completed successfully - Card {card.card_id}")
        return True

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Job {job.job_id} failed: {error_msg}")

        # Update job with failure
        job.retry_count += 1
        job.error_message = error_msg

        # If we've hit max retries, mark as failed permanently
        if job.retry_count >= job.max_retries:
            job.status = "failed"
            job.completed_at = datetime.utcnow()
            print(f"🔴 Job {job.job_id} permanently failed after {job.retry_count} retries")
        else:
            # Reset to pending for retry
            job.status = "pending"
            job.started_at = None
            print(f"🔄 Job {job.job_id} will retry ({job.retry_count}/{job.max_retries})")

        await session.commit()
        return False


async def get_pending_jobs(session: AsyncSession, limit: int = 20) -> List[PassGenerationJob]:
    """
    Fetch pending jobs that need processing.

    Args:
        session: Database session
        limit: Maximum number of jobs to fetch

    Returns:
        List of pending jobs
    """
    result = await session.execute(
        select(PassGenerationJob)
        .where(PassGenerationJob.status == "pending")
        .order_by(PassGenerationJob.created_at)
        .limit(limit)
    )
    return list(result.scalars().all())


async def process_batch():
    """
    Main processing function - fetches and processes a batch of jobs.
    """
    print("🚀 Starting pass generation worker...")

    async for session in get_async_session():
        try:
            # Fetch pending jobs
            jobs = await get_pending_jobs(session, limit=20)

            if not jobs:
                print("✨ No pending jobs to process")
                return {
                    "statusCode": 200,
                    "body": {
                        "message": "No pending jobs",
                        "processed": 0,
                        "succeeded": 0,
                        "failed": 0
                    }
                }

            print(f"📋 Found {len(jobs)} pending jobs")

            # Process each job
            succeeded = 0
            failed = 0

            for job in jobs:
                try:
                    success = await process_job(job, session)
                    if success:
                        succeeded += 1
                    else:
                        failed += 1
                except Exception as e:
                    print(f"💥 Unexpected error processing job {job.job_id}: {str(e)}")
                    failed += 1

            print(f"✅ Batch complete: {succeeded} succeeded, {failed} failed")

            return {
                "statusCode": 200,
                "body": {
                    "message": "Batch processing complete",
                    "processed": len(jobs),
                    "succeeded": succeeded,
                    "failed": failed
                }
            }

        except Exception as e:
            print(f"💥 Fatal error in batch processing: {str(e)}")
            return {
                "statusCode": 500,
                "body": {
                    "message": f"Batch processing failed: {str(e)}",
                    "processed": 0,
                    "succeeded": 0,
                    "failed": 0
                }
            }


def lambda_handler(event, context):
    """
    AWS Lambda entry point.

    This function is triggered by EventBridge on a schedule.
    """
    # Run async processing
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(process_batch())

    return result


# For local testing
if __name__ == "__main__":
    print("🧪 Running worker locally...")
    result = asyncio.run(process_batch())
    print(f"Result: {result}")
