# OutreachPass System Architecture

**Version:** 2.0.0
**Last Updated:** 2025-11-18
**Status:** Production

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Data Architecture](#data-architecture)
7. [Integration Architecture](#integration-architecture)
8. [Security Architecture](#security-architecture)
9. [Performance Architecture](#performance-architecture)

---

## System Overview

OutreachPass is a **multi-tenant SaaS platform** for digital contact card management and event attendee engagement. The system enables organizations to create branded digital business cards, issue wallet passes (Apple/Google), and track engagement analytics across events.

### Core Value Propositions

- **Digital Contact Cards**: Modern, interactive digital business cards with QR codes
- **Wallet Integration**: Seamless Apple Wallet and Google Wallet pass generation
- **Multi-Brand Support**: White-label capabilities for different organizational brands
- **Event Management**: Comprehensive event and attendee management
- **Analytics & Tracking**: Detailed engagement metrics and email tracking
- **Multi-Tenant**: Complete data isolation and tenant-specific branding

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         End Users                                │
│  (Event Attendees, Card Recipients, Mobile Wallet Users)        │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ├──────────────────┬──────────────────┬───────────
                │                  │                  │
        ┌───────▼─────┐   ┌───────▼──────┐  ┌───────▼──────┐
        │   Next.js    │   │  Public API  │  │ Wallet APIs  │
        │   Frontend   │   │  (FastAPI)   │  │ Apple/Google │
        └───────┬──────┘   └───────┬──────┘  └───────┬──────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   API Gateway       │
                        │   (AWS HTTP API)    │
                        └──────────┬──────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
         ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
         │ Backend      │  │   Worker    │  │  Tracking   │
         │ Lambda       │  │   Lambda    │  │  Lambda     │
         └───────┬──────┘  └──────┬──────┘  └──────┬──────┘
                 │                │                 │
                 └────────────────┼─────────────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   │              │              │
            ┌──────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
            │ PostgreSQL │ │    SQS    │ │    S3     │
            │    RDS     │ │   Queue   │ │  Storage  │
            └────────────┘ └───────────┘ └───────────┘
```

---

## Technology Stack

### Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | FastAPI | 0.109.0 | High-performance async API framework |
| **Runtime** | Python | 3.11+ | Application runtime |
| **ORM** | SQLAlchemy | 2.0.25 | Database abstraction and migrations |
| **Async DB** | asyncpg | 0.29.0 | PostgreSQL async driver |
| **Validation** | Pydantic | 2.5.3 | Data validation and settings |
| **Lambda Handler** | Mangum | 0.17.0 | ASGI adapter for AWS Lambda |
| **Rate Limiting** | SlowAPI | 0.1.9 | API rate limiting |
| **Authentication** | python-jose | 3.3.0 | JWT token handling |

### Frontend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js | 15.0.3 | React framework with SSR |
| **Runtime** | React | 19.0.0 | UI library |
| **Language** | TypeScript | 5.6.3 | Type-safe JavaScript |
| **State Management** | Zustand | 5.0.1 | Lightweight state management |
| **Data Fetching** | TanStack Query | 5.59.0 | Server state management |
| **Authentication** | AWS Amplify | 6.8.4 | Cognito integration |
| **UI Components** | Tailwind CSS | 3.4.14 | Utility-first CSS |
| **Charts** | Recharts | 2.15.4 | Analytics visualizations |
| **Animations** | Framer Motion | 11.11.17 | UI animations |

### AWS Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Lambda** | Serverless compute | Python 3.11, 512MB-1GB memory |
| **API Gateway** | HTTP API endpoint | Regional, HTTP API v2 |
| **RDS Aurora** | PostgreSQL database | Serverless v2, Multi-AZ |
| **S3** | Object storage | Assets, uploads, QR codes |
| **SQS** | Message queue | Pass generation queue |
| **Cognito** | User authentication | User pools, JWT tokens |
| **SES** | Email delivery | Transactional emails |
| **CloudWatch** | Monitoring & logging | Logs, metrics, alarms |
| **Route 53** | DNS management | Domain routing |
| **CloudFront** | CDN | Frontend distribution |

### Third-Party Integrations

| Service | Purpose | API Type |
|---------|---------|----------|
| **Google Wallet API** | Digital wallet passes | REST API, OAuth 2.0 |
| **Apple Wallet** | iOS wallet passes | PKPass format, certificates |

---

## Architecture Patterns

### 1. Serverless-First Architecture

The system uses AWS Lambda for all compute, providing:
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost efficiency**: Pay only for actual usage
- **High availability**: Built-in redundancy across AZs
- **Zero server management**: Focus on code, not infrastructure

### 2. Multi-Tenant Architecture

**Tenant Isolation Strategy**: Database-level tenant isolation with row-level security

```python
# Every query includes tenant_id filter
result = await db.execute(
    select(Event)
    .where(Event.tenant_id == current_user.tenant_id)
)
```

**Benefits**:
- Complete data isolation between tenants
- Simplified backup and compliance
- Cost-effective for SaaS model
- Shared infrastructure, isolated data

### 3. Event-Driven Architecture

**Asynchronous Processing**: Heavy operations use SQS queues

```
User Request → API → Enqueue Job → Return Job ID
                        ↓
                    SQS Queue
                        ↓
                  Worker Lambda → Process → Update DB
```

**Use Cases**:
- Wallet pass generation (complex, slow)
- Bulk attendee imports (CSV processing)
- Email batch sends
- Image processing

### 4. API-First Design

All functionality exposed through RESTful APIs:
- **Admin API**: Event/attendee management (`/api/v1/admin/*`)
- **Public API**: Card viewing, downloads (`/c/{card_id}`)
- **Tracking API**: Email/link tracking (`/api/track/*`)
- **Health API**: Health checks (`/health`)

### 5. Layered Architecture

```
┌─────────────────────────────────────┐
│         API Layer (FastAPI)          │  ← HTTP endpoints, validation
├─────────────────────────────────────┤
│      Service Layer (Business)        │  ← Business logic, workflows
├─────────────────────────────────────┤
│      Data Layer (SQLAlchemy)         │  ← Database operations, ORM
├─────────────────────────────────────┤
│     Integration Layer (Utilities)    │  ← External services (S3, SES)
└─────────────────────────────────────┘
```

---

## Backend Architecture

### Application Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI application entry
│   ├── api/                       # API route handlers
│   │   ├── admin.py              # Admin endpoints
│   │   ├── public.py             # Public card endpoints
│   │   ├── tracking.py           # Analytics tracking
│   │   └── health.py             # Health checks
│   ├── services/                  # Business logic layer
│   │   ├── card_service.py       # Card operations
│   │   └── analytics_service.py  # Analytics aggregation
│   ├── models/                    # Data models
│   │   ├── database.py           # SQLAlchemy models (17 tables)
│   │   └── schemas.py            # Pydantic schemas
│   ├── utils/                     # Utilities and integrations
│   │   ├── email.py              # SES email client
│   │   ├── s3.py                 # S3 operations
│   │   ├── qr.py                 # QR code generation
│   │   ├── vcard.py              # vCard generation
│   │   ├── google_wallet.py      # Google Wallet integration
│   │   └── apple_wallet.py       # Apple Wallet integration
│   ├── core/                      # Core infrastructure
│   │   ├── config.py             # Settings management
│   │   ├── database.py           # Database connection
│   │   ├── logging.py            # Structured logging
│   │   └── exceptions.py         # Custom exceptions
│   └── middleware/                # HTTP middleware
│       ├── correlation.py        # Request correlation IDs
│       └── error_handler.py      # Global error handling
├── tests/                         # Test suite
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── conftest.py               # Test fixtures
└── scripts/                       # Utility scripts
    └── generate_analytics_test_data.py
```

### Core Components

#### 1. FastAPI Application (main.py)

**Responsibilities**:
- Application initialization
- Middleware registration
- Route registration
- CORS configuration
- Rate limiting
- Error handling

**Key Features**:
```python
# Mangum handler for Lambda
lambda_handler = Mangum(app)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Structured logging with correlation IDs
app.add_middleware(CorrelationMiddleware)

# Global error handlers
register_error_handlers(app)
```

#### 2. Service Layer

**CardService** (`services/card_service.py`):
- Card creation and management
- QR code generation
- Wallet pass orchestration
- Email delivery coordination

**AnalyticsService** (`services/analytics_service.py`):
- Event tracking (email, views, exports)
- User agent parsing (device/browser detection)
- Analytics aggregation queries
- Multi-tenant metrics

#### 3. Data Models

**17 Database Tables** (see Data Architecture section):
- Core entities: Tenant, Brand, User, Event, Attendee, Card
- Wallet: WalletPass, QRCode, PassGenerationJob
- Analytics: EmailEvent, CardViewEvent, WalletPassEvent, ContactExportEvent
- Supporting: FeatureFlag, AuditLog, ScanDaily, MessageContext

#### 4. Middleware Stack

**Request Flow**:
```
Request → CorrelationMiddleware (add correlation_id)
       → CORSMiddleware (handle CORS)
       → RateLimitMiddleware (check limits)
       → ErrorHandlerMiddleware (catch exceptions)
       → Route Handler
```

### API Design Principles

#### RESTful Conventions

- **GET**: Read operations, idempotent
- **POST**: Create operations, non-idempotent
- **PUT**: Update entire resource
- **PATCH**: Partial updates
- **DELETE**: Remove resources

#### Response Format

```json
{
  "data": { /* response payload */ },
  "meta": {
    "correlation_id": "uuid",
    "timestamp": "2025-11-18T10:30:00Z"
  }
}
```

#### Error Format

```json
{
  "error": {
    "code": "CARD_NOT_FOUND",
    "message": "Card with ID abc-123 not found",
    "correlation_id": "uuid"
  }
}
```

### Authentication & Authorization

**Cognito JWT Tokens**:
```
Authorization: Bearer <JWT_TOKEN>

JWT Payload:
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "cognito:username": "user",
  "custom:tenant_id": "tenant_uuid",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/...",
  "exp": 1234567890
}
```

**Authorization Flow**:
1. User logs in via Cognito
2. Frontend receives JWT token
3. Token included in API requests
4. API validates JWT signature
5. Extract tenant_id from custom claim
6. All queries filtered by tenant_id

---

## Frontend Architecture

### Application Structure

```
frontend-outreachpass/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx           # Admin layout
│   │   ├── dashboard/           # Dashboard
│   │   ├── events/              # Event management
│   │   ├── attendees/           # Attendee management
│   │   └── analytics/           # Analytics dashboard
│   └── auth/                     # Authentication flows
│       └── callback/            # OAuth callback
├── components/                    # React components
│   ├── admin/                   # Admin components
│   │   ├── AdminLayout.tsx     # Layout wrapper
│   │   └── CSVImport.tsx       # CSV import
│   └── shared/                  # Shared components
│       └── ProtectedRoute.tsx  # Auth guard
├── lib/                          # Utilities and hooks
│   ├── auth/                    # Authentication
│   │   └── auth-context.tsx    # Auth state
│   └── api/                     # API client
└── public/                       # Static assets
```

### Frontend Patterns

#### 1. Server-Side Rendering (SSR)

Next.js 15 App Router with React Server Components:
```typescript
// Server Component (default)
export default async function EventPage({ params }) {
  const event = await fetchEvent(params.id);
  return <EventDetails event={event} />;
}

// Client Component (interactive)
'use client'
export function EventForm() {
  const [data, setData] = useState({});
  // ... interactive logic
}
```

#### 2. State Management Architecture

**Three-Tier State**:

1. **Server State** (TanStack Query):
   - API data caching
   - Automatic refetching
   - Optimistic updates

2. **Global State** (Zustand):
   - User authentication
   - UI preferences
   - Cross-component state

3. **Local State** (React useState):
   - Form inputs
   - UI toggles
   - Component-specific state

```typescript
// TanStack Query for server data
const { data: events } = useQuery({
  queryKey: ['events'],
  queryFn: fetchEvents
});

// Zustand for global state
const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user })
}));

// Local state for UI
const [isOpen, setIsOpen] = useState(false);
```

#### 3. Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Navigate to /admin
       ▼
┌─────────────────┐
│ ProtectedRoute  │ ← Checks auth state
└──────┬──────────┘
       │
       ├─ Not Authenticated → Redirect to Cognito
       │
       └─ Authenticated
             │ 2. Get JWT token
             ▼
       ┌──────────────┐
       │  API Client  │ ← Adds Authorization header
       └──────┬───────┘
              │ 3. API Request
              ▼
       ┌──────────────┐
       │   Backend    │ ← Validates JWT
       └──────────────┘
```

#### 4. Component Organization

**Atomic Design Principles**:
- **Pages**: Route-level components (app/*/page.tsx)
- **Layouts**: Shared layouts (app/*/layout.tsx)
- **Components**: Reusable UI (components/*)
- **Hooks**: Custom hooks (lib/hooks/*)
- **Utils**: Helper functions (lib/utils/*)

### Analytics Dashboard Architecture

**Real-Time Dashboard** (`app/admin/analytics/page.tsx`):

```typescript
// Multi-query data fetching
const { data: overview } = useQuery(['analytics', 'overview', params]);
const { data: emailAnalytics } = useQuery(['analytics', 'email', params]);
const { data: cardViews } = useQuery(['analytics', 'views', params]);
const { data: walletPasses } = useQuery(['analytics', 'wallet', params]);

// Visualization components
<MetricsGrid data={overview} />
<EmailFunnelChart data={emailAnalytics} />
<CardViewSourcesChart data={cardViews} />
<WalletPassesChart data={walletPasses} />
<TimeSeriesChart data={trends} />
```

**Features**:
- Real-time metrics updates
- Interactive charts (Recharts)
- CSV export functionality
- Date range filtering
- Responsive design
- Loading skeletons
- Error boundaries

---

## Data Architecture

### Database Schema

**PostgreSQL 15** on AWS RDS Aurora Serverless v2

#### Entity Relationship Diagram

```
┌─────────────┐
│   Tenant    │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
┌──────▼─────┐    ┌──────▼─────┐
│   Brand    │    │    User    │
└──────┬─────┘    └────────────┘
       │
┌──────▼─────┐
│   Event    │
└──────┬─────┘
       │
┌──────▼─────────┐
│   Attendee     │
└──────┬─────────┘
       │
┌──────▼─────┐
│    Card    │
└──────┬─────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
┌──────▼─────┐    ┌──────▼──────┐   ┌──────▼─────────┐
│  QRCode    │    │ WalletPass  │   │ EmailEvent     │
└────────────┘    └─────────────┘   │ CardViewEvent  │
                                     │ WalletPassEvent│
                                     │ ContactExport  │
                                     └────────────────┘
```

#### Core Tables

**1. tenants** - Multi-tenant root
```sql
tenant_id     UUID PRIMARY KEY
name          TEXT NOT NULL
status        TEXT NOT NULL DEFAULT 'active'
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

**2. brands** - White-label branding
```sql
brand_id      UUID PRIMARY KEY
tenant_id     UUID REFERENCES tenants
brand_key     TEXT NOT NULL (e.g., 'OUTREACHPASS')
display_name  TEXT
domain        TEXT
theme_json    JSONB (colors, logos)
features_json JSONB (feature flags)
```

**3. users** - System users
```sql
user_id       UUID PRIMARY KEY
tenant_id     UUID REFERENCES tenants
email         TEXT NOT NULL
full_name     TEXT
role          TEXT NOT NULL (admin, user, exhibitor)
cognito_sub   TEXT UNIQUE (Cognito user ID)
status        TEXT DEFAULT 'active'
```

**4. events** - Event management
```sql
event_id      UUID PRIMARY KEY
tenant_id     UUID REFERENCES tenants
brand_id      UUID REFERENCES brands
name          TEXT NOT NULL
slug          TEXT NOT NULL
starts_at     TIMESTAMP
ends_at       TIMESTAMP
timezone      TEXT DEFAULT 'UTC'
status        TEXT DEFAULT 'draft'
settings_json JSONB
created_by    UUID REFERENCES users
```

**5. attendees** - Event participants
```sql
attendee_id   UUID PRIMARY KEY
event_id      UUID REFERENCES events
tenant_id     UUID REFERENCES tenants
email         TEXT
phone         TEXT
first_name    TEXT
last_name     TEXT
org_name      TEXT
title         TEXT
linkedin_url  TEXT
card_id       UUID REFERENCES cards
flags_json    JSONB
```

**6. cards** - Digital contact cards
```sql
card_id       UUID PRIMARY KEY
tenant_id     UUID REFERENCES tenants
owner_attendee_id UUID REFERENCES attendees
owner_user_id UUID REFERENCES users
display_name  TEXT NOT NULL
email         TEXT
phone         TEXT
org_name      TEXT
title         TEXT
avatar_s3_key TEXT
links_json    JSONB (linkedin, website, etc.)
vcard_rev     INTEGER DEFAULT 1
is_personal   BOOLEAN DEFAULT true
```

#### Analytics Tables

**7. email_events** - Email engagement tracking
```sql
email_event_id  BIGSERIAL PRIMARY KEY
tenant_id       UUID REFERENCES tenants
event_id        UUID REFERENCES events
card_id         UUID REFERENCES cards
attendee_id     UUID REFERENCES attendees
message_id      TEXT NOT NULL
recipient_email TEXT NOT NULL
event_type      TEXT NOT NULL (sent, delivered, opened, clicked)
link_url        TEXT (for clicked events)
user_agent      TEXT
ip_address      INET
occurred_at     TIMESTAMP
metadata_json   JSONB
```

**8. card_view_events** - Card page views
```sql
view_event_id BIGSERIAL PRIMARY KEY
tenant_id     UUID REFERENCES tenants
event_id      UUID REFERENCES events
card_id       UUID REFERENCES cards
source_type   TEXT (qr_scan, direct_link, email_link, share)
referrer_url  TEXT
user_agent    TEXT
ip_address    INET
device_type   TEXT (mobile, desktop, tablet)
browser       TEXT
os            TEXT
session_id    TEXT
occurred_at   TIMESTAMP
metadata_json JSONB
```

**9. wallet_pass_events** - Wallet pass tracking
```sql
wallet_event_id BIGSERIAL PRIMARY KEY
tenant_id       UUID REFERENCES tenants
event_id        UUID REFERENCES events
card_id         UUID REFERENCES cards
platform        TEXT (apple, google)
event_type      TEXT (generated, email_clicked, added_to_wallet)
user_agent      TEXT
ip_address      INET
device_type     TEXT
occurred_at     TIMESTAMP
metadata_json   JSONB
```

**10. contact_export_events** - Contact export tracking
```sql
export_event_id BIGSERIAL PRIMARY KEY
tenant_id       UUID REFERENCES tenants
event_id        UUID REFERENCES events
card_id         UUID REFERENCES cards
export_type     TEXT (vcard_download, add_to_contacts, copy_email)
user_agent      TEXT
ip_address      INET
device_type     TEXT
occurred_at     TIMESTAMP
metadata_json   JSONB
```

### Indexing Strategy

```sql
-- Tenant-based queries (most common)
CREATE INDEX idx_events_tenant ON events(tenant_id, created_at DESC);
CREATE INDEX idx_attendees_tenant ON attendees(tenant_id, created_at DESC);
CREATE INDEX idx_cards_tenant ON cards(tenant_id, created_at DESC);

-- Analytics queries
CREATE INDEX idx_email_events_tenant_occurred
  ON email_events(tenant_id, occurred_at DESC);
CREATE INDEX idx_card_views_tenant_source
  ON card_view_events(tenant_id, source_type, occurred_at DESC);

-- Lookup queries
CREATE INDEX idx_cards_owner_attendee ON cards(owner_attendee_id);
CREATE INDEX idx_attendees_event ON attendees(event_id);
```

### Data Lifecycle

**Retention Policies**:
- **Analytics Events**: Retained indefinitely (business intelligence)
- **Audit Logs**: 2 years minimum (compliance)
- **Message Contexts**: 7 days (temporary tracking correlation)
- **Job Records**: 30 days for failed jobs, 7 days for successful

**Archival Strategy**:
```sql
-- Archive old analytics to cold storage
-- Move events older than 1 year to S3 for cost savings
-- Keep aggregated metrics in hot storage
```

---

## Integration Architecture

### Google Wallet Integration

**OAuth 2.0 Service Account**:
```python
from google.oauth2 import service_account

credentials = service_account.Credentials.from_service_account_file(
    settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE,
    scopes=['https://www.googleapis.com/auth/wallet_object.issuer']
)
```

**Pass Generation Flow**:
```
1. Create Pass Class (one-time per event/card type)
   ├─ Define template, logo, colors
   └─ Register with Google Wallet API

2. Create Pass Object (per attendee)
   ├─ Populate attendee data
   ├─ Generate unique object ID
   └─ Create pass instance

3. Generate JWT Token
   ├─ Sign with service account
   ├─ Include pass object reference
   └─ Encode as base64url

4. Create Save URL
   └─ https://pay.google.com/gp/v/save/{jwt_token}

5. Email to attendee with save link
```

### Apple Wallet Integration

**PKPass Format**:
```
pass.pkpass (ZIP archive)
├── pass.json          # Pass definition
├── logo.png          # Brand logo
├── icon.png          # App icon
├── manifest.json     # File checksums
└── signature         # PKCS#7 signature
```

**Certificate Requirements**:
- Pass Type ID Certificate (Apple Developer)
- WWDR Certificate (Worldwide Developer Relations)
- Private key for signing

### Email Integration (AWS SES)

**Email Tracking Architecture**:
```
1. Generate message_id
2. Store MessageContext in database
3. Embed tracking pixel: /api/track/email/open/{message_id}.gif
4. Wrap links: /api/track/email/click/{message_id}?url={encoded_url}
5. Send via SES
6. Track opens and clicks via pixel/redirect
7. Correlate with card_id via MessageContext
```

### S3 Storage Integration

**Bucket Organization**:
```
s3://outreachpass-assets/
├── qr/
│   └── {tenant_id}/{card_id}.png
├── avatars/
│   └── {tenant_id}/{user_id}.jpg
└── logos/
    └── {tenant_id}/{brand_id}.png

s3://outreachpass-uploads/
└── csv/
    └── {tenant_id}/{event_id}/attendees.csv
```

---

## Security Architecture

### Authentication

**AWS Cognito User Pools**:
- Email/password authentication
- MFA support (optional)
- Password policies (min 8 chars, complexity)
- Session management
- Token refresh

### Authorization

**Role-Based Access Control (RBAC)**:
```
Roles:
├── admin      → Full access to tenant
├── user       → Event management, attendee ops
└── exhibitor  → Read-only, lead capture
```

**Tenant Isolation**:
```python
# Every query includes tenant check
@require_auth
async def get_events(current_user: User, db: AsyncSession):
    events = await db.execute(
        select(Event)
        .where(Event.tenant_id == current_user.tenant_id)
    )
    return events.scalars().all()
```

### Data Protection

**Encryption**:
- **At Rest**: RDS encryption (AES-256)
- **In Transit**: TLS 1.2+ for all connections
- **S3**: Server-side encryption (SSE-S3)

**Secrets Management**:
```python
# Environment variables from AWS Secrets Manager
DATABASE_URL = get_secret("database_url")
SECRET_KEY = get_secret("jwt_secret")
GOOGLE_WALLET_KEY = get_secret("google_wallet_key")
```

### API Security

**Rate Limiting**:
```python
# Per-IP rate limits
@limiter.limit("60/minute")
async def get_card_page(card_id: UUID):
    # ... 60 requests per minute per IP
```

**Input Validation**:
```python
# Pydantic models validate all inputs
class EventCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., regex=r'^[a-z0-9-]+$')
    starts_at: datetime
    ends_at: datetime

    @validator('ends_at')
    def end_after_start(cls, v, values):
        if v <= values['starts_at']:
            raise ValueError('end must be after start')
        return v
```

**SQL Injection Prevention**:
```python
# SQLAlchemy ORM prevents SQL injection
result = await db.execute(
    select(Card).where(Card.card_id == card_id)  # Parameterized
)
# NOT: f"SELECT * FROM cards WHERE id = '{card_id}'"  # VULNERABLE
```

---

## Performance Architecture

### Caching Strategy

**Multi-Layer Cache**:
```
┌─────────────────┐
│  CloudFront CDN │ ← Static assets (frontend)
├─────────────────┤
│  API Gateway    │ ← API caching (disabled for dynamic)
├─────────────────┤
│  TanStack Query │ ← Client-side cache (5 min TTL)
├─────────────────┤
│  Database       │ ← PostgreSQL query cache
└─────────────────┘
```

### Database Optimization

**Connection Pooling**:
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,          # 5 connections per Lambda
    max_overflow=10,      # Up to 15 total
    pool_pre_ping=True,   # Health checks
    pool_recycle=3600     # Recycle hourly
)
```

**Query Optimization**:
- **Eager Loading**: Join related entities
- **Pagination**: Limit result sets
- **Indexes**: All foreign keys and common filters
- **Explain Plans**: Analyze slow queries

### Lambda Cold Start Optimization

**Strategies**:
1. **Minimal dependencies**: Only import what's needed
2. **Connection reuse**: Keep DB connections alive
3. **Provisioned concurrency**: For critical endpoints (optional)
4. **Code splitting**: Separate Lambda for heavy operations

**Typical Performance**:
- Cold start: 1-2 seconds
- Warm invocation: 50-200ms
- Database query: 10-50ms

### Monitoring & Alerting

**CloudWatch Alarms**:
- Lambda error rate > 5%
- Lambda duration > 5 seconds
- API Gateway 5xx > 5%
- API Gateway latency > 3 seconds
- RDS CPU > 80%
- SQS queue depth > 100 messages

**Metrics Tracked**:
- Request count
- Error rates
- Response times
- Database connections
- Lambda concurrency
- Queue depths

---

## Deployment Architecture

### CI/CD Pipeline

```
┌──────────────┐
│  Git Push    │
└──────┬───────┘
       │
┌──────▼──────────┐
│ GitHub Actions  │
└──────┬──────────┘
       │
       ├─ Run Tests (pytest)
       ├─ Build Lambda Package
       ├─ Upload to S3
       └─ Update Lambda Function
              │
       ┌──────▼────────┐
       │  Deployment   │
       ├───────────────┤
       │ • Backend     │
       │ • Worker      │
       │ • Frontend    │
       └───────────────┘
```

### Environment Strategy

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Development** | Local testing | Docker Compose, LocalStack |
| **Staging** | Pre-production | AWS (separate account) |
| **Production** | Live system | AWS (production account) |

---

## Disaster Recovery

### Backup Strategy

**RDS Automated Backups**:
- Daily snapshots
- 7-day retention
- Point-in-time recovery

**S3 Versioning**:
- Enabled on all buckets
- 30-day lifecycle policy

### Recovery Procedures

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

**Failure Scenarios**:
1. **Lambda failure**: Auto-retry, fallback to alternate
2. **Database failure**: RDS Multi-AZ automatic failover
3. **Region failure**: Manual failover to backup region (not currently implemented)

---

## Scalability

### Current Capacity

- **Concurrent Users**: 1,000+ (tested)
- **API Throughput**: 10,000 req/min
- **Database**: Aurora auto-scaling (0.5-16 ACUs)
- **Lambda**: 1,000 concurrent executions (soft limit)

### Scaling Strategy

**Horizontal Scaling**:
- Lambda: Automatic based on traffic
- RDS: Aurora auto-scaling based on CPU/connections
- Frontend: CloudFront global distribution

**Vertical Scaling**:
- Lambda memory: 512MB → 3GB (as needed)
- RDS ACUs: 0.5 → 128 (auto-adjusts)

---

## Future Architecture Considerations

### Planned Improvements

1. **Redis Caching**: Add Redis for analytics query caching
2. **Event Streaming**: Implement EventBridge for event-driven workflows
3. **GraphQL API**: Alternative API for frontend optimization
4. **Real-time Updates**: WebSocket support for live dashboards
5. **CDN Optimization**: Move more assets to CloudFront
6. **Multi-Region**: Deploy across multiple AWS regions

### Technical Debt

1. **Test Coverage**: Increase to 90% (currently ~70%)
2. **API Documentation**: Generate OpenAPI/Swagger docs
3. **Performance Testing**: Implement load testing suite
4. **Security Scanning**: Add automated vulnerability scanning
5. **Observability**: Implement distributed tracing (X-Ray)

---

**Document End** • [Back to Top](#outreachpass-system-architecture)
