from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, BigInteger, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    tenant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Brand(Base):
    __tablename__ = "brands"

    brand_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    brand_key = Column(Text, nullable=False)
    display_name = Column(Text, nullable=False)
    domain = Column(Text, nullable=False)
    theme_json = Column(JSONB, nullable=False, default={})
    features_json = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False)
    full_name = Column(Text)
    role = Column(Text, nullable=False)
    cognito_sub = Column(Text, unique=True)
    status = Column(Text, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Event(Base):
    __tablename__ = "events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.brand_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    slug = Column(Text, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(Text, nullable=False, default="UTC")
    status = Column(Text, nullable=False, default="draft")
    settings_json = Column(JSONB, nullable=False, default={})
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Attendee(Base):
    __tablename__ = "attendees"

    attendee_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    email = Column(String)
    phone = Column(Text)
    first_name = Column(Text)
    last_name = Column(Text)
    org_name = Column(Text)
    title = Column(Text)
    linkedin_url = Column(Text)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="SET NULL"))
    flags_json = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Card(Base):
    __tablename__ = "cards"

    card_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    owner_attendee_id = Column(UUID(as_uuid=True), ForeignKey("attendees.attendee_id", ondelete="SET NULL"))
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    display_name = Column(Text, nullable=False)
    email = Column(String)
    phone = Column(Text)
    org_name = Column(Text)
    title = Column(Text)
    avatar_s3_key = Column(Text)
    links_json = Column(JSONB, nullable=False, default={})
    vcard_rev = Column(Integer, nullable=False, default=1)
    is_personal = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class WalletPass(Base):
    __tablename__ = "wallet_passes"

    wallet_pass_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="CASCADE"))
    platform = Column(Text, nullable=False)
    pass_serial = Column(Text, unique=True)
    status = Column(Text, nullable=False, default="active")
    last_issued_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class QRCode(Base):
    __tablename__ = "qr_codes"

    qr_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="CASCADE"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    s3_key_png = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ScanDaily(Base):
    __tablename__ = "scans_daily"

    day = Column(Date, primary_key=True, nullable=False)
    tenant_id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    event_id = Column(UUID(as_uuid=True), primary_key=True)
    card_id = Column(UUID(as_uuid=True), primary_key=True)
    scan_count = Column(Integer, nullable=False, default=0)
    vcard_downloads = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Exhibitor(Base):
    __tablename__ = "exhibitors"

    exhibitor_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    booth = Column(Text)
    contact_user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ExhibitorLead(Base):
    __tablename__ = "exhibitor_leads"

    lead_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exhibitor_id = Column(UUID(as_uuid=True), ForeignKey("exhibitors.exhibitor_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    data_json = Column(JSONB, nullable=False)


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    flag_key = Column(Text, primary_key=True, nullable=False)
    tenant_id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    brand_id = Column(UUID(as_uuid=True), primary_key=True)
    is_enabled = Column(Boolean, nullable=False, default=False)
    variant_json = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    actor_user_id = Column(UUID(as_uuid=True))
    actor_kind = Column(Text, nullable=False)
    action = Column(Text, nullable=False)
    target_type = Column(Text)
    target_id = Column(Text)
    meta_json = Column(JSONB, nullable=False, default={})
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class PassGenerationJob(Base):
    __tablename__ = "pass_generation_jobs"

    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attendee_id = Column(UUID(as_uuid=True), ForeignKey("attendees.attendee_id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)

    # Job status tracking
    status = Column(String(50), nullable=False, default="pending")  # pending, processing, completed, failed

    # Results
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="SET NULL"))
    qr_url = Column(Text)
    wallet_pass_url = Column(Text)

    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    # Metadata
    metadata_json = Column(JSONB, nullable=False, default={})


# ============================================================================
# Analytics & Tracking Models
# ============================================================================

class EmailEvent(Base):
    __tablename__ = "email_events"

    email_event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="SET NULL"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="SET NULL"))
    attendee_id = Column(UUID(as_uuid=True), ForeignKey("attendees.attendee_id", ondelete="SET NULL"))

    # Email details
    message_id = Column(Text, nullable=False)
    recipient_email = Column(Text, nullable=False)

    # Event type: sent, delivered, opened, clicked, bounced, complained
    event_type = Column(String(50), nullable=False)

    # Event metadata
    link_url = Column(Text)
    user_agent = Column(Text)
    ip_address = Column(INET)

    # Timestamps
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Additional context
    metadata_json = Column(JSONB, nullable=False, default={})


class WalletPassEvent(Base):
    __tablename__ = "wallet_pass_events"

    wallet_event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="SET NULL"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="CASCADE"), nullable=False)

    # Platform: apple or google
    platform = Column(String(20), nullable=False)

    # Event type: generated, email_clicked, added_to_wallet, removed, updated
    event_type = Column(String(50), nullable=False)

    # Device/user context
    user_agent = Column(Text)
    ip_address = Column(INET)
    device_type = Column(String(20))

    # Timestamps
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Additional context
    metadata_json = Column(JSONB, nullable=False, default={})


class CardViewEvent(Base):
    __tablename__ = "card_view_events"

    view_event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="SET NULL"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="CASCADE"), nullable=False)

    # Source tracking: qr_scan, direct_link, email_link, share
    source_type = Column(String(50), nullable=False)
    referrer_url = Column(Text)

    # Device/user context
    user_agent = Column(Text)
    ip_address = Column(INET)
    device_type = Column(String(20))
    browser = Column(String(100))
    os = Column(String(100))

    # Session tracking
    session_id = Column(Text)

    # Timestamps
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Additional context
    metadata_json = Column(JSONB, nullable=False, default={})


class ContactExportEvent(Base):
    __tablename__ = "contact_export_events"

    export_event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id", ondelete="SET NULL"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.card_id", ondelete="CASCADE"), nullable=False)

    # Export type: vcard_download, add_to_contacts, copy_email, copy_phone
    export_type = Column(String(50), nullable=False)

    # Device/user context
    user_agent = Column(Text)
    ip_address = Column(INET)
    device_type = Column(String(20))

    # Timestamps
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Additional context
    metadata_json = Column(JSONB, nullable=False, default={})
