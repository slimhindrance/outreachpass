"""
Health Check Endpoint

Provides comprehensive application health status including:
- Database connectivity
- S3 availability
- SQS queue status
- Overall service health
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

from app.core.database import get_db
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Comprehensive health check endpoint.

    Returns:
        Health status with dependency checks
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "dependencies": {}
    }

    overall_healthy = True

    # Check database connectivity
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        health_status["dependencies"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
        logger.debug("Health check: Database OK")
    except Exception as e:
        health_status["dependencies"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        overall_healthy = False
        logger.error(
            "Health check: Database FAILED",
            exc_info=True,
            extra={"extra_fields": {"error": str(e)}}
        )

    # Check S3 connectivity
    try:
        s3_client = boto3.client('s3', region_name=settings.AWS_REGION)
        # Try to head the assets bucket
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_ASSETS)
        health_status["dependencies"]["s3"] = {
            "status": "healthy",
            "message": "S3 access successful",
            "bucket": settings.S3_BUCKET_ASSETS
        }
        logger.debug("Health check: S3 OK")
    except ClientError as e:
        health_status["dependencies"]["s3"] = {
            "status": "unhealthy",
            "message": f"S3 access failed: {str(e)}",
            "bucket": settings.S3_BUCKET_ASSETS
        }
        overall_healthy = False
        logger.error(
            "Health check: S3 FAILED",
            exc_info=True,
            extra={"extra_fields": {"error": str(e), "bucket": settings.S3_BUCKET_ASSETS}}
        )
    except Exception as e:
        health_status["dependencies"]["s3"] = {
            "status": "unhealthy",
            "message": f"S3 check failed: {str(e)}"
        }
        overall_healthy = False
        logger.error(
            "Health check: S3 check FAILED",
            exc_info=True,
            extra={"extra_fields": {"error": str(e)}}
        )

    # Check SQS connectivity
    try:
        sqs_client = boto3.client('sqs', region_name=settings.AWS_REGION)
        # Get queue attributes to verify access
        response = sqs_client.get_queue_attributes(
            QueueUrl=settings.SQS_QUEUE_URL,
            AttributeNames=['ApproximateNumberOfMessages']
        )
        message_count = int(response['Attributes'].get('ApproximateNumberOfMessages', 0))

        health_status["dependencies"]["sqs"] = {
            "status": "healthy",
            "message": "SQS access successful",
            "queue_depth": message_count
        }

        # Warn if queue is backing up
        if message_count > 100:
            health_status["dependencies"]["sqs"]["warning"] = f"Queue depth high: {message_count} messages"
            logger.warning(
                "SQS queue depth high",
                extra={"extra_fields": {"queue_depth": message_count}}
            )

        logger.debug("Health check: SQS OK")
    except ClientError as e:
        health_status["dependencies"]["sqs"] = {
            "status": "unhealthy",
            "message": f"SQS access failed: {str(e)}"
        }
        overall_healthy = False
        logger.error(
            "Health check: SQS FAILED",
            exc_info=True,
            extra={"extra_fields": {"error": str(e)}}
        )
    except Exception as e:
        health_status["dependencies"]["sqs"] = {
            "status": "unhealthy",
            "message": f"SQS check failed: {str(e)}"
        }
        overall_healthy = False
        logger.error(
            "Health check: SQS check FAILED",
            exc_info=True,
            extra={"extra_fields": {"error": str(e)}}
        )

    # Set overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
        logger.warning("Health check: Overall status UNHEALTHY")
    else:
        logger.info("Health check: All systems healthy")

    return health_status


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> Dict[str, str]:
    """
    Kubernetes-style readiness probe.

    Returns:
        Simple ready/not-ready status
    """
    try:
        # Quick database check
        await db.execute(text("SELECT 1"))
        logger.debug("Readiness check: READY")
        return {"status": "ready"}
    except Exception as e:
        logger.error(
            "Readiness check: NOT READY",
            exc_info=True,
            extra={"extra_fields": {"error": str(e)}}
        )
        return {"status": "not ready", "reason": str(e)}


@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """
    Kubernetes-style liveness probe.

    Returns:
        Simple alive status (no dependency checks)
    """
    logger.debug("Liveness check: ALIVE")
    return {"status": "alive"}
