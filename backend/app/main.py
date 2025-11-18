from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.core.config import settings
from app.api import admin, public, tracking

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(public.router)
app.include_router(tracking.router, prefix="/api")  # Email/link tracking endpoints


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy"
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok"}


# Lambda handler (for AWS Lambda deployment)
lambda_handler = Mangum(app)
