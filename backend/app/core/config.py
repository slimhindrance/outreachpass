from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # App
    PROJECT_NAME: str = "OutreachPass"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # AWS
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_ASSETS: str
    S3_BUCKET_UPLOADS: str

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

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
