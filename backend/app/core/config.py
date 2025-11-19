from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""

    # App
    PROJECT_NAME: str = "OutreachPass"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    API_BASE_URL: str = "https://r2h140rt0a.execute-api.us-east-1.amazonaws.com"  # API Gateway endpoint

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # AWS
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_ASSETS: str
    S3_BUCKET_UPLOADS: str
    SQS_QUEUE_URL: str  # Pass generation queue

    # Cognito
    COGNITO_USER_POOL_ID: str
    COGNITO_CLIENT_ID: str
    COGNITO_REGION: str

    # SES
    SES_FROM_EMAIL: str
    SES_REGION: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://app.outreachpass.base2ml.com",  # Frontend app
        "https://outreachpass.base2ml.com",
        "https://govsafe.base2ml.com",
        "https://campuscard.base2ml.com",
        "http://outreachpass-alb-1728703295.us-east-1.elb.amazonaws.com"
    ]

    # Brand domains
    BRAND_DOMAINS: dict[str, str] = {
        "OUTREACHPASS": "https://outreachpass.base2ml.com",
        "GOVSAFE": "https://govsafe.base2ml.com",
        "CAMPUSCARD": "https://campuscard.base2ml.com"
    }

    # Apple Wallet Configuration
    APPLE_WALLET_ENABLED: bool = False  # Disabled until Apple Developer credentials available
    APPLE_WALLET_TEAM_ID: Optional[str] = None
    APPLE_WALLET_PASS_TYPE_ID: Optional[str] = None
    APPLE_WALLET_ORGANIZATION_NAME: str = "OutreachPass"
    APPLE_WALLET_CERT_PATH: Optional[str] = None
    APPLE_WALLET_KEY_PATH: Optional[str] = None
    APPLE_WALLET_WWDR_CERT_PATH: Optional[str] = None

    # Google Wallet Configuration
    GOOGLE_WALLET_ENABLED: bool = True
    GOOGLE_WALLET_ISSUER_ID: Optional[str] = None  # Google Cloud Project numeric ID
    GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: Optional[str] = None
    GOOGLE_WALLET_SERVICE_ACCOUNT_FILE: Optional[str] = None  # Path to JSON key file
    GOOGLE_WALLET_ORIGINS: list[str] = []  # Empty by default for email compatibility
    GOOGLE_WALLET_CLASS_SUFFIX: str = "event_pass"  # Suffix for pass class IDs (change to force new class creation)

    class Config:
        case_sensitive = True


# Explicitly prevent loading .env file - only use environment variables
settings = Settings(_env_file=None)
