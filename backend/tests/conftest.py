"""
Pytest Configuration and Fixtures

Provides test database setup, sample data, and common test utilities.
"""
import asyncio
import pytest
import uuid
from datetime import datetime, timedelta
from typing import AsyncGenerator
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from fastapi.testclient import TestClient
from faker import Faker
from moto import mock_s3, mock_ses, mock_sqs
import boto3

from app.core.database import Base
from app.main import app
from app.models.database import (
    Tenant, Brand, Event, Attendee, Card,
    EmailEvent, CardViewEvent, WalletPassEvent, ContactExportEvent
)

# Initialize Faker for test data generation
fake = Faker()


# Test database URL - use separate test database
TEST_DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/outreachpass_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,  # Disable pooling for tests
        echo=False
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for tests"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        yield session
        await session.rollback()  # Rollback after each test


@pytest.fixture
async def test_tenant(db_session: AsyncSession):
    """Create test tenant"""
    tenant = Tenant(
        tenant_id=uuid.uuid4(),
        name="Test Company",
        domain="test.example.com",
        subscription_tier="enterprise",
        status="active"
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
async def test_brand(db_session: AsyncSession, test_tenant):
    """Create test brand"""
    brand = Brand(
        brand_id=uuid.uuid4(),
        tenant_id=test_tenant.tenant_id,
        brand_key="testbrand",
        display_name="Test Brand",
        domain="test.example.com",
        theme_json={"primaryColor": "#000000"},
        features_json={"wallet": True}
    )
    db_session.add(brand)
    await db_session.commit()
    await db_session.refresh(brand)
    return brand


@pytest.fixture
async def test_event(db_session: AsyncSession, test_tenant, test_brand):
    """Create test event"""
    event = Event(
        event_id=uuid.uuid4(),
        tenant_id=test_tenant.tenant_id,
        brand_id=test_brand.brand_id,
        name="Test Conference 2025",
        description="Test event for analytics",
        status="active",
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=3)
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


@pytest.fixture
async def test_attendee(db_session: AsyncSession, test_tenant, test_event):
    """Create test attendee"""
    attendee = Attendee(
        attendee_id=uuid.uuid4(),
        tenant_id=test_tenant.tenant_id,
        event_id=test_event.event_id,
        email="test@example.com",
        first_name="John",
        last_name="Doe",
        company="Test Corp",
        job_title="Software Engineer",
        registration_status="confirmed"
    )
    db_session.add(attendee)
    await db_session.commit()
    await db_session.refresh(attendee)
    return attendee


@pytest.fixture
async def test_card(db_session: AsyncSession, test_tenant, test_event, test_attendee):
    """Create test card"""
    card = Card(
        card_id=uuid.uuid4(),
        tenant_id=test_tenant.tenant_id,
        event_id=test_event.event_id,
        attendee_id=test_attendee.attendee_id,
        display_name="John Doe",
        email="test@example.com",
        phone="+1234567890",
        company="Test Corp",
        job_title="Software Engineer",
        card_url=f"https://test.example.com/card/{uuid.uuid4()}",
        qr_code_url="https://test.example.com/qr/test.png"
    )
    db_session.add(card)
    await db_session.commit()
    await db_session.refresh(card)
    return card


@pytest.fixture
def test_client():
    """Create FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def sample_request_context():
    """Create sample request context for analytics tracking"""
    class MockRequest:
        def __init__(self):
            self.headers = {
                "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
                "referer": "https://example.com/event"
            }
            self.client = type('obj', (object,), {'host': '192.168.1.1'})()
            self.cookies = {"session_id": "test-session-123"}

    return MockRequest()


# ============================================================================
# AWS Mocked Services
# ============================================================================

@pytest.fixture
def aws_credentials():
    """Mocked AWS credentials for moto"""
    import os
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"


@pytest.fixture
def mock_s3_client(aws_credentials):
    """Create mocked S3 client"""
    with mock_s3():
        s3 = boto3.client("s3", region_name="us-east-1")

        # Create test buckets
        s3.create_bucket(Bucket="test-assets-bucket")
        s3.create_bucket(Bucket="test-uploads-bucket")

        yield s3


@pytest.fixture
def mock_ses_client(aws_credentials):
    """Create mocked SES client"""
    with mock_ses():
        ses = boto3.client("ses", region_name="us-east-1")

        # Verify test email address
        ses.verify_email_identity(EmailAddress="test@example.com")

        yield ses


@pytest.fixture
def mock_sqs_client(aws_credentials):
    """Create mocked SQS client"""
    with mock_sqs():
        sqs = boto3.client("sqs", region_name="us-east-1")

        # Create test queue
        response = sqs.create_queue(QueueName="test-pass-generation-queue")
        queue_url = response["QueueUrl"]

        yield sqs, queue_url


# ============================================================================
# Test Data Factories
# ============================================================================

@pytest.fixture
def tenant_factory(db_session: AsyncSession):
    """Factory for creating test tenants"""
    async def create_tenant(**kwargs):
        defaults = {
            "tenant_id": uuid.uuid4(),
            "name": fake.company(),
            "status": "active"
        }
        defaults.update(kwargs)

        tenant = Tenant(**defaults)
        db_session.add(tenant)
        await db_session.commit()
        await db_session.refresh(tenant)
        return tenant

    return create_tenant


@pytest.fixture
def attendee_factory(db_session: AsyncSession):
    """Factory for creating test attendees"""
    async def create_attendee(event_id, tenant_id, **kwargs):
        defaults = {
            "attendee_id": uuid.uuid4(),
            "event_id": event_id,
            "tenant_id": tenant_id,
            "email": fake.email(),
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "org_name": fake.company(),
            "title": fake.job()
        }
        defaults.update(kwargs)

        attendee = Attendee(**defaults)
        db_session.add(attendee)
        await db_session.commit()
        await db_session.refresh(attendee)
        return attendee

    return create_attendee


@pytest.fixture
def card_factory(db_session: AsyncSession):
    """Factory for creating test cards"""
    async def create_card(tenant_id, **kwargs):
        defaults = {
            "card_id": uuid.uuid4(),
            "tenant_id": tenant_id,
            "display_name": fake.name(),
            "email": fake.email(),
            "phone": fake.phone_number(),
            "org_name": fake.company(),
            "title": fake.job()
        }
        defaults.update(kwargs)

        card = Card(**defaults)
        db_session.add(card)
        await db_session.commit()
        await db_session.refresh(card)
        return card

    return create_card


# ============================================================================
# Mocked External Services
# ============================================================================

@pytest.fixture
def mock_google_wallet():
    """Mock Google Wallet API client"""
    with patch("app.utils.google_wallet.build") as mock_build:
        mock_service = MagicMock()
        mock_build.return_value = mock_service

        # Mock successful pass creation
        mock_service.genericclass().insert().execute.return_value = {
            "id": "test-class-id",
            "classId": "test-class-id"
        }
        mock_service.genericobject().insert().execute.return_value = {
            "id": "test-object-id",
            "state": "active"
        }

        yield mock_service


@pytest.fixture
def mock_qr_generator():
    """Mock QR code generation"""
    with patch("app.utils.qr.generate_qr_code") as mock_gen:
        mock_gen.return_value = "https://test-bucket.s3.amazonaws.com/qr/test.png"
        yield mock_gen
