"""
Structured Logging Configuration

Provides JSON-formatted logging with correlation IDs for CloudWatch integration.
Enables distributed tracing across Lambda invocations and service boundaries.
"""
import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from contextvars import ContextVar

# Context variable for correlation ID (thread-safe for async)
correlation_id_var: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)


def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for current request context"""
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> Optional[str]:
    """Get correlation ID for current request context"""
    return correlation_id_var.get()


class JSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging compatible with CloudWatch Insights.

    Outputs logs in JSON format with:
    - timestamp (ISO 8601)
    - level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - message
    - correlation_id (request tracking)
    - logger (module name)
    - extra context fields
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add correlation ID if available
        correlation_id = get_correlation_id()
        if correlation_id:
            log_data["correlation_id"] = correlation_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add any extra fields passed to logger
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)

        # Add module, function, line number for debugging
        log_data["location"] = {
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        return json.dumps(log_data)


def setup_logging(level: str = "INFO") -> None:
    """
    Configure application-wide structured logging.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Get root logger
    root_logger = logging.getLogger()

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler with JSON formatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    # Set level and add handler
    root_logger.setLevel(getattr(logging, level.upper()))
    root_logger.addHandler(handler)

    # Suppress noisy third-party loggers
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get logger instance with structured logging support.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Logger instance configured for structured logging

    Example:
        logger = get_logger(__name__)
        logger.info("Card created", extra={"extra_fields": {"card_id": str(card.card_id)}})
    """
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """
    Logger adapter that automatically includes context fields in all log messages.

    Example:
        logger = LoggerAdapter(get_logger(__name__), {"service": "card_service"})
        logger.info("Processing card", {"card_id": "123"})
    """

    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Add extra context to log record"""
        # Merge adapter context with call-specific extra fields
        extra_fields = self.extra.copy()
        if 'extra' in kwargs:
            call_extra = kwargs['extra'].get('extra_fields', {})
            extra_fields.update(call_extra)
            kwargs['extra'] = {'extra_fields': extra_fields}
        else:
            kwargs['extra'] = {'extra_fields': extra_fields}

        return msg, kwargs
