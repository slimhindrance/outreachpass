"""
Global Error Handler Middleware

Catches exceptions and returns properly formatted JSON error responses.
Integrates with structured logging for error tracking and debugging.
"""
from typing import Union
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import OutreachPassException
from app.core.logging import get_logger, get_correlation_id

logger = get_logger(__name__)


async def handle_outreachpass_exception(
    request: Request,
    exc: OutreachPassException
) -> JSONResponse:
    """
    Handle custom OutreachPass exceptions.

    Args:
        request: FastAPI request object
        exc: OutreachPass exception instance

    Returns:
        JSON response with error details
    """
    correlation_id = get_correlation_id()

    # Log the error with context
    logger.error(
        f"{exc.__class__.__name__}: {exc.message}",
        extra={"extra_fields": {
            "exception_type": exc.__class__.__name__,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
            "correlation_id": correlation_id
        }},
        exc_info=True
    )

    # Build error response
    error_response = {
        "error": {
            "type": exc.__class__.__name__,
            "message": exc.message,
            "status_code": exc.status_code,
        }
    }

    # Add details if present
    if exc.details:
        error_response["error"]["details"] = exc.details

    # Add correlation ID for debugging
    if correlation_id:
        error_response["error"]["correlation_id"] = correlation_id

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def handle_validation_error(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """
    Handle FastAPI/Pydantic validation errors.

    Args:
        request: FastAPI request object
        exc: Pydantic validation error

    Returns:
        JSON response with validation error details
    """
    correlation_id = get_correlation_id()

    # Log validation error
    logger.warning(
        "Request validation failed",
        extra={"extra_fields": {
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors(),
            "correlation_id": correlation_id
        }}
    )

    # Build validation error response
    error_response = {
        "error": {
            "type": "ValidationError",
            "message": "Request validation failed",
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "details": {
                "validation_errors": exc.errors()
            }
        }
    }

    if correlation_id:
        error_response["error"]["correlation_id"] = correlation_id

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response
    )


async def handle_http_exception(
    request: Request,
    exc: StarletteHTTPException
) -> JSONResponse:
    """
    Handle standard HTTP exceptions.

    Args:
        request: FastAPI request object
        exc: HTTP exception

    Returns:
        JSON response with error details
    """
    correlation_id = get_correlation_id()

    # Log HTTP exception
    log_level = "error" if exc.status_code >= 500 else "warning"
    getattr(logger, log_level)(
        f"HTTP {exc.status_code}: {exc.detail}",
        extra={"extra_fields": {
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "correlation_id": correlation_id
        }}
    )

    # Build HTTP error response
    error_response = {
        "error": {
            "type": "HTTPException",
            "message": exc.detail,
            "status_code": exc.status_code,
        }
    }

    if correlation_id:
        error_response["error"]["correlation_id"] = correlation_id

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def handle_generic_exception(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """
    Handle unexpected exceptions (500 Internal Server Error).

    Args:
        request: FastAPI request object
        exc: Generic exception

    Returns:
        JSON response with error details (sanitized for production)
    """
    correlation_id = get_correlation_id()

    # Log unexpected exception with full traceback
    logger.critical(
        f"Unhandled exception: {str(exc)}",
        extra={"extra_fields": {
            "exception_type": type(exc).__name__,
            "path": request.url.path,
            "method": request.method,
            "correlation_id": correlation_id
        }},
        exc_info=True
    )

    # Build generic error response (don't expose internal details)
    error_response = {
        "error": {
            "type": "InternalServerError",
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        }
    }

    if correlation_id:
        error_response["error"]["correlation_id"] = correlation_id
        error_response["error"]["support_message"] = (
            f"If this issue persists, please contact support with "
            f"correlation ID: {correlation_id}"
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response
    )


def register_error_handlers(app):
    """
    Register all error handlers with FastAPI app.

    Args:
        app: FastAPI application instance
    """
    # Custom OutreachPass exceptions
    app.add_exception_handler(OutreachPassException, handle_outreachpass_exception)

    # FastAPI validation errors
    app.add_exception_handler(RequestValidationError, handle_validation_error)

    # Standard HTTP exceptions
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)

    # Catch-all for unexpected exceptions
    app.add_exception_handler(Exception, handle_generic_exception)
