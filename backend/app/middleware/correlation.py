"""
Request Correlation Middleware

Generates and manages correlation IDs for distributed tracing across requests.
Enables tracking user flows through multiple Lambda invocations and services.
"""
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import set_correlation_id, get_logger

logger = get_logger(__name__)


class CorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to manage correlation IDs for request tracing.

    - Extracts correlation ID from X-Correlation-ID header if present
    - Generates new UUID if no correlation ID provided
    - Sets correlation ID in context for logging
    - Adds correlation ID to response headers
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and inject correlation ID"""

        # Extract or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        # Set in context for logging
        set_correlation_id(correlation_id)

        # Log request start
        logger.info(
            "Request started",
            extra={"extra_fields": {
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None
            }}
        )

        try:
            # Process request
            response = await call_next(request)

            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id

            # Log request completion
            logger.info(
                "Request completed",
                extra={"extra_fields": {
                    "status_code": response.status_code,
                    "method": request.method,
                    "path": request.url.path
                }}
            )

            return response

        except Exception as e:
            # Log error with correlation ID
            logger.error(
                f"Request failed: {str(e)}",
                exc_info=True,
                extra={"extra_fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "error_type": type(e).__name__
                }}
            )
            raise
