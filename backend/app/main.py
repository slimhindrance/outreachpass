from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.middleware.correlation import CorrelationMiddleware
from app.middleware.error_handler import register_error_handlers
from app.api import admin, public, tracking, health, analytics

# Configure structured logging
setup_logging(level=settings.LOG_LEVEL if hasattr(settings, 'LOG_LEVEL') else "INFO")
logger = get_logger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register global error handlers
register_error_handlers(app)

# Add correlation middleware (before other middleware for proper tracking)
app.add_middleware(CorrelationMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)  # Health check endpoints (no prefix for standard /health path)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(public.router)
app.include_router(tracking.router, prefix="/api")  # Email/link tracking endpoints
app.include_router(analytics.router)  # Analytics endpoints


@app.get("/")
async def root():
    """Root endpoint"""
    logger.info("Root endpoint accessed")
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy"
    }


# Lambda handler (for AWS Lambda deployment)
lambda_handler = Mangum(app)
