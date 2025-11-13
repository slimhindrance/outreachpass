from pydantic import BaseModel, EmailStr, Field, UUID4
from typing import Optional, Dict, Any
from datetime import datetime


# Event Schemas
class EventBase(BaseModel):
    name: str
    slug: str
    starts_at: datetime
    ends_at: datetime
    timezone: str = "UTC"
    settings_json: Dict[str, Any] = {}


class EventCreate(EventBase):
    brand_id: UUID4


class EventUpdate(BaseModel):
    name: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    timezone: Optional[str] = None
    status: Optional[str] = None
    settings_json: Optional[Dict[str, Any]] = None


class EventResponse(EventBase):
    event_id: UUID4
    tenant_id: UUID4
    brand_id: UUID4
    status: str
    created_by: Optional[UUID4]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Attendee Schemas
class AttendeeBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    org_name: Optional[str] = None
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    flags_json: Dict[str, Any] = {}


class AttendeeCreate(AttendeeBase):
    event_id: UUID4


class AttendeeImportRow(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    org_name: Optional[str] = None
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    role: Optional[str] = None


class AttendeeResponse(AttendeeBase):
    attendee_id: UUID4
    event_id: UUID4
    tenant_id: UUID4
    card_id: Optional[UUID4]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Card Schemas
class CardBase(BaseModel):
    display_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    org_name: Optional[str] = None
    title: Optional[str] = None
    links_json: Dict[str, str] = {}


class CardCreate(CardBase):
    owner_attendee_id: Optional[UUID4] = None
    owner_user_id: Optional[UUID4] = None
    is_personal: bool = True


class CardResponse(CardBase):
    card_id: UUID4
    tenant_id: UUID4
    owner_attendee_id: Optional[UUID4]
    owner_user_id: Optional[UUID4]
    avatar_s3_key: Optional[str]
    vcard_rev: int
    is_personal: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Pass Issuance
class PassIssuanceRequest(BaseModel):
    attendee_id: UUID4
    include_wallet: bool = False


class PassIssuanceResponse(BaseModel):
    card_id: UUID4
    qr_url: str
    qr_s3_key: Optional[str]
    wallet_passes: list[str] = []


# Pass Generation Job Schemas
class PassJobResponse(BaseModel):
    job_id: UUID4
    attendee_id: UUID4
    status: str  # pending, processing, completed, failed
    card_id: Optional[UUID4] = None
    qr_url: Optional[str] = None
    wallet_pass_url: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PassJobCreate(BaseModel):
    attendee_id: UUID4


class PassJobStatusResponse(BaseModel):
    job_id: UUID4
    status: str
    progress_message: str
    card_id: Optional[UUID4] = None
    qr_url: Optional[str] = None
    error_message: Optional[str] = None


# Exhibitor Schemas
class ExhibitorBase(BaseModel):
    name: str
    booth: Optional[str] = None


class ExhibitorCreate(ExhibitorBase):
    event_id: UUID4
    contact_user_id: Optional[UUID4] = None


class ExhibitorResponse(ExhibitorBase):
    exhibitor_id: UUID4
    event_id: UUID4
    tenant_id: UUID4
    contact_user_id: Optional[UUID4]
    created_at: datetime

    class Config:
        from_attributes = True


# Lead Schemas
class LeadCapture(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = []


class LeadResponse(BaseModel):
    lead_id: UUID4
    exhibitor_id: UUID4
    event_id: UUID4
    captured_at: datetime
    data_json: Dict[str, Any]

    class Config:
        from_attributes = True


# Metrics
class DailyMetrics(BaseModel):
    day: str
    scan_count: int
    vcard_downloads: int


class EventMetrics(BaseModel):
    event_id: UUID4
    event_name: str
    total_scans: int
    total_downloads: int
    daily_data: list[DailyMetrics]
