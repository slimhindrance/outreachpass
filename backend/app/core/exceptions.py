"""
Custom Exception Classes

Defines domain-specific exceptions for better error handling and reporting.
Each exception includes appropriate HTTP status codes for API responses.
"""
from typing import Any, Dict, Optional


class OutreachPassException(Exception):
    """
    Base exception for all OutreachPass-specific errors.

    Attributes:
        message: Human-readable error message
        status_code: HTTP status code for API responses
        details: Additional context about the error
    """
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


# ============================================================================
# Resource Not Found Errors (404)
# ============================================================================

class ResourceNotFoundError(OutreachPassException):
    """Base class for resource not found errors (404)"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, details=details)


class CardNotFoundError(ResourceNotFoundError):
    """Raised when a card cannot be found"""
    def __init__(self, card_id: str):
        super().__init__(
            message=f"Card not found",
            details={"card_id": card_id}
        )


class AttendeeNotFoundError(ResourceNotFoundError):
    """Raised when an attendee cannot be found"""
    def __init__(self, attendee_id: str):
        super().__init__(
            message=f"Attendee not found",
            details={"attendee_id": attendee_id}
        )


class EventNotFoundError(ResourceNotFoundError):
    """Raised when an event cannot be found"""
    def __init__(self, event_id: str):
        super().__init__(
            message=f"Event not found",
            details={"event_id": event_id}
        )


class TenantNotFoundError(ResourceNotFoundError):
    """Raised when a tenant cannot be found"""
    def __init__(self, tenant_id: str):
        super().__init__(
            message=f"Tenant not found",
            details={"tenant_id": tenant_id}
        )


class QRCodeNotFoundError(ResourceNotFoundError):
    """Raised when a QR code cannot be found"""
    def __init__(self, card_id: str):
        super().__init__(
            message=f"QR code not found",
            details={"card_id": card_id}
        )


# ============================================================================
# Validation Errors (400)
# ============================================================================

class ValidationError(OutreachPassException):
    """Raised when input validation fails (400)"""
    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(message, status_code=400, details=details)


class InvalidEmailError(ValidationError):
    """Raised when email address is invalid"""
    def __init__(self, email: str):
        super().__init__(
            message=f"Invalid email address",
            field="email"
        )
        self.details["email"] = email


class MissingRequiredFieldError(ValidationError):
    """Raised when a required field is missing"""
    def __init__(self, field: str):
        super().__init__(
            message=f"Required field missing: {field}",
            field=field
        )


class InvalidFileFormatError(ValidationError):
    """Raised when uploaded file format is invalid"""
    def __init__(self, expected_format: str, actual_format: str):
        super().__init__(
            message=f"Invalid file format. Expected: {expected_format}, got: {actual_format}",
            field="file"
        )
        self.details.update({
            "expected_format": expected_format,
            "actual_format": actual_format
        })


# ============================================================================
# External Service Errors (502/503)
# ============================================================================

class ExternalServiceError(OutreachPassException):
    """Base class for external service failures (502)"""
    def __init__(
        self,
        service: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        details["service"] = service
        super().__init__(message, status_code=502, details=details)


class S3UploadError(ExternalServiceError):
    """Raised when S3 upload fails"""
    def __init__(self, key: str, error: str):
        super().__init__(
            service="S3",
            message=f"Failed to upload file to S3",
            details={"s3_key": key, "error": error}
        )


class S3DownloadError(ExternalServiceError):
    """Raised when S3 download fails"""
    def __init__(self, key: str, error: str):
        super().__init__(
            service="S3",
            message=f"Failed to download file from S3",
            details={"s3_key": key, "error": error}
        )


class EmailDeliveryError(ExternalServiceError):
    """Raised when email delivery fails"""
    def __init__(self, recipient: str, error: str):
        super().__init__(
            service="SES",
            message=f"Failed to send email",
            details={"recipient": recipient, "error": error}
        )


class QRGenerationError(ExternalServiceError):
    """Raised when QR code generation fails"""
    def __init__(self, url: str, error: str):
        super().__init__(
            service="QR Generator",
            message=f"Failed to generate QR code",
            details={"url": url, "error": error}
        )


class WalletPassGenerationError(ExternalServiceError):
    """Raised when wallet pass generation fails"""
    def __init__(self, platform: str, error: str, card_id: Optional[str] = None):
        details = {"platform": platform, "error": error}
        if card_id:
            details["card_id"] = card_id
        super().__init__(
            service=f"{platform} Wallet",
            message=f"Failed to generate {platform} Wallet pass",
            details=details
        )


class SQSMessageError(ExternalServiceError):
    """Raised when SQS message operations fail"""
    def __init__(self, operation: str, error: str):
        super().__init__(
            service="SQS",
            message=f"SQS {operation} failed",
            details={"operation": operation, "error": error}
        )


# ============================================================================
# Database Errors (500)
# ============================================================================

class DatabaseError(OutreachPassException):
    """Raised when database operations fail (500)"""
    def __init__(self, message: str, operation: Optional[str] = None):
        details = {"operation": operation} if operation else {}
        super().__init__(message, status_code=500, details=details)


class DatabaseConnectionError(DatabaseError):
    """Raised when database connection fails"""
    def __init__(self):
        super().__init__(
            message="Failed to connect to database",
            operation="connect"
        )


class TransactionError(DatabaseError):
    """Raised when database transaction fails"""
    def __init__(self, operation: str, error: str):
        super().__init__(
            message=f"Transaction failed during {operation}",
            operation=operation
        )
        self.details["error"] = error


# ============================================================================
# Business Logic Errors (422)
# ============================================================================

class BusinessLogicError(OutreachPassException):
    """Base class for business logic violations (422)"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, details=details)


class DuplicateResourceError(BusinessLogicError):
    """Raised when attempting to create a duplicate resource"""
    def __init__(self, resource_type: str, identifier: str):
        super().__init__(
            message=f"{resource_type} already exists",
            details={"resource_type": resource_type, "identifier": identifier}
        )


class InvalidStateTransitionError(BusinessLogicError):
    """Raised when invalid state transition is attempted"""
    def __init__(self, current_state: str, requested_state: str):
        super().__init__(
            message=f"Cannot transition from {current_state} to {requested_state}",
            details={"current_state": current_state, "requested_state": requested_state}
        )


class QuotaExceededError(BusinessLogicError):
    """Raised when quota or limit is exceeded"""
    def __init__(self, resource: str, limit: int, current: int):
        super().__init__(
            message=f"{resource} quota exceeded",
            details={"resource": resource, "limit": limit, "current": current}
        )
