# OutreachPass Features Guide

**Version:** 2.0.0
**Last Updated:** 2025-11-18
**Status:** Production

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Multi-Tenant & Multi-Brand](#multi-tenant--multi-brand)
3. [Event Management](#event-management)
4. [Attendee Management](#attendee-management)
5. [Digital Contact Cards](#digital-contact-cards)
6. [Mobile Wallet Integration](#mobile-wallet-integration)
7. [QR Code Generation](#qr-code-generation)
8. [Email Delivery](#email-delivery)
9. [Analytics & Tracking](#analytics--tracking)
10. [Import & Export](#import--export)
11. [Future Features](#future-features)

---

## Feature Overview

OutreachPass is a comprehensive **digital contact card and event management platform** designed for organizations hosting conferences, trade shows, networking events, and professional gatherings.

### Core Capabilities

| Feature Category | Description | Status |
|-----------------|-------------|--------|
| **Multi-Tenancy** | Complete data isolation, white-label branding | ✅ Live |
| **Event Management** | Create, manage, and track events | ✅ Live |
| **Attendee Management** | Import, organize, and manage attendees | ✅ Live |
| **Digital Cards** | Modern, interactive contact cards with vCard | ✅ Live |
| **Wallet Passes** | Apple Wallet and Google Wallet integration | ✅ Live |
| **QR Codes** | Scannable QR codes for instant card access | ✅ Live |
| **Email Delivery** | Automated wallet pass delivery via email | ✅ Live |
| **Analytics** | Comprehensive engagement tracking & reporting | ✅ Live |
| **CSV Import** | Bulk attendee import from spreadsheets | ✅ Live |

---

## Multi-Tenant & Multi-Brand

### Tenant Isolation

**Complete Data Separation**:
- Each organization (tenant) has isolated data
- No cross-tenant data access
- Dedicated branding per tenant
- Custom domains per brand

**Example Tenants**:
```
Tenant: Base2ML
├── Brand: OutreachPass (default)
├── Brand: GovSafe (government events)
└── Brand: CampusCard (university events)
```

### White-Label Branding

**Brand Configuration**:
```json
{
  "brand_id": "uuid",
  "brand_key": "OUTREACHPASS",
  "display_name": "OutreachPass",
  "domain": "https://outreachpass.base2ml.com",
  "theme_json": {
    "primary_color": "#4F46E5",
    "secondary_color": "#10B981",
    "logo_url": "https://assets.../logo.png",
    "favicon_url": "https://assets.../favicon.ico"
  },
  "features_json": {
    "apple_wallet_enabled": false,
    "google_wallet_enabled": true,
    "analytics_enabled": true,
    "custom_branding": true
  }
}
```

**Brand-Specific Domains**:
- `outreachpass.base2ml.com` → OutreachPass brand
- `govsafe.base2ml.com` → GovSafe brand
- `campuscard.base2ml.com` → CampusCard brand

**Benefits**:
- Consistent branding across touchpoints
- Professional appearance for clients
- Customizable for different markets
- Domain-based brand recognition

---

## Event Management

### Event Creation

**Event Properties**:
```typescript
interface Event {
  event_id: string;           // UUID
  tenant_id: string;          // Owning tenant
  brand_id: string;           // Brand association
  name: string;               // "Tech Conference 2025"
  slug: string;               // "tech-conf-2025"
  starts_at: datetime;        // Event start
  ends_at: datetime;          // Event end
  timezone: string;           // "America/New_York"
  status: 'draft' | 'active' | 'archived';
  settings_json: {
    enable_qr_codes: boolean;
    enable_wallet_passes: boolean;
    auto_send_emails: boolean;
    custom_email_template?: string;
  };
}
```

**Event Workflow**:
```
1. Create Event
   ├─ Name: "Tech Summit 2025"
   ├─ Dates: Jan 15-17, 2025
   ├─ Brand: OutreachPass
   └─ Status: Draft

2. Configure Settings
   ├─ Enable wallet passes: Yes
   ├─ Enable email delivery: Yes
   └─ Custom branding: Yes

3. Import Attendees (CSV)
   └─ Upload attendee list

4. Generate Passes
   ├─ Create contact cards
   ├─ Generate QR codes
   └─ Create wallet passes

5. Distribute
   ├─ Send emails with passes
   └─ Share QR codes

6. Track Engagement
   └─ Monitor analytics
```

### Event Dashboard

**Metrics Displayed**:
- Total attendees registered
- Cards generated
- Wallet passes issued
- QR code scans
- Email open rate
- Click-through rate

**Event Actions**:
- Edit event details
- Import attendees
- Generate passes
- Send emails
- View analytics
- Export data

---

## Attendee Management

### Attendee Data Model

```typescript
interface Attendee {
  attendee_id: string;
  event_id: string;
  tenant_id: string;

  // Personal Info
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;

  // Professional Info
  org_name?: string;
  title?: string;
  linkedin_url?: string;

  // Association
  card_id?: string;         // Linked contact card

  // Metadata
  flags_json: {
    vip?: boolean;
    speaker?: boolean;
    sponsor?: boolean;
    checked_in?: boolean;
  };
}
```

### Attendee Import (CSV)

**Supported CSV Format**:
```csv
first_name,last_name,email,phone,org_name,title,linkedin_url
John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,https://linkedin.com/in/johndoe
Jane,Smith,jane@example.com,+1-555-0101,Tech Inc,CTO,https://linkedin.com/in/janesmith
```

**Import Process**:
```
1. Upload CSV → Backend
2. Validate Format → Check headers, data types
3. Parse Rows → Extract attendee data
4. Create Records → Insert into database
5. Generate Cards → Create contact cards
6. Queue Jobs → Generate wallet passes
7. Send Emails → Deliver passes to attendees
```

**Import Features**:
- **Validation**: Email format, required fields
- **Deduplication**: Prevent duplicate attendees
- **Batch Processing**: Handle large imports (1000+)
- **Error Reporting**: Detailed validation errors
- **Progress Tracking**: Real-time import status

### Attendee Detail View

**Information Displayed**:
- Personal details (name, email, phone)
- Professional info (org, title)
- Associated contact card
- Wallet pass status
- Engagement metrics:
  - Email opened
  - Links clicked
  - Card views
  - vCard downloads

**Actions Available**:
- Edit attendee details
- Regenerate wallet pass
- Resend email
- View card preview
- Download vCard
- Delete attendee

---

## Digital Contact Cards

### Card Features

**Interactive Contact Card** (`/c/{card_id}`):
```html
┌─────────────────────────────────┐
│  [Avatar/Photo]                 │
│                                 │
│  John Doe                       │
│  CEO, Acme Corporation          │
│                                 │
│  📧 john@acme.com              │
│  📱 +1-555-0100                │
│  🏢 Acme Corporation           │
│                                 │
│  [Save to Contacts] [Download] │
│                                 │
│  [LinkedIn] [Website]           │
│                                 │
│  [Add to Apple Wallet]          │
│  [Add to Google Wallet]         │
└─────────────────────────────────┘
```

**Card Capabilities**:
1. **View Contact Info**: Name, title, organization, contact details
2. **Download vCard**: Save to phone contacts (`.vcf` file)
3. **Copy to Clipboard**: One-click copy email/phone
4. **Social Links**: LinkedIn, website, custom links
5. **Add to Wallet**: Generate and save wallet pass
6. **QR Code**: Shareable QR code for card
7. **Analytics Tracking**: Track views, exports, engagement

### vCard Generation

**vCard Format** (RFC 6350):
```vcard
BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
ORG:Acme Corporation
TITLE:CEO
EMAIL;TYPE=WORK:john@acme.com
TEL;TYPE=WORK,VOICE:+1-555-0100
URL:https://linkedin.com/in/johndoe
REV:2025-11-18T10:30:00Z
END:VCARD
```

**vCard Features**:
- **Standard Compliant**: Works with all contact apps
- **Multi-Platform**: iOS, Android, Windows, Mac
- **Versioning**: Track card updates with revision number
- **Rich Data**: Includes all contact details, social links

### Card Customization

**Per-Brand Styling**:
```css
/* OutreachPass Brand */
--primary-color: #4F46E5;
--accent-color: #10B981;
--logo: url('/brand/outreachpass/logo.png');

/* GovSafe Brand */
--primary-color: #1E40AF;
--accent-color: #DC2626;
--logo: url('/brand/govsafe/logo.png');
```

**Responsive Design**:
- Mobile-first layout
- Touch-friendly buttons
- Optimized for phone screens
- Works on desktop browsers

---

## Mobile Wallet Integration

### Google Wallet

**Status**: ✅ **Live and Working**

**Pass Features**:
- **Contact Information**: Name, title, org, email, phone
- **Event Association**: Linked to specific event
- **Expiration**: Automatically expires after event
- **Updates**: Pass can be updated remotely
- **Branding**: Custom logo, colors per brand

**Pass Class Configuration**:
```json
{
  "id": "issuer_id.event_pass",
  "classTemplateInfo": {
    "cardTemplateOverride": {
      "cardRowTemplateInfos": [
        {
          "oneItem": {
            "item": {
              "firstValue": {
                "fields": [
                  {
                    "fieldPath": "object.textModulesData['contact_name']"
                  }
                ]
              }
            }
          }
        }
      ]
    }
  },
  "issuerName": "OutreachPass",
  "reviewStatus": "UNDER_REVIEW"
}
```

**Pass Object**:
```json
{
  "id": "issuer_id.card_id",
  "classId": "issuer_id.event_pass",
  "state": "ACTIVE",
  "textModulesData": [
    {
      "id": "contact_name",
      "header": "Name",
      "body": "John Doe"
    },
    {
      "id": "contact_title",
      "header": "Title",
      "body": "CEO, Acme Corp"
    }
  ],
  "barcode": {
    "type": "QR_CODE",
    "value": "https://outreachpass.base2ml.com/c/card_id"
  }
}
```

**Save URL Generation**:
```python
# Create JWT token
jwt_payload = {
    'iss': service_account_email,
    'aud': 'google',
    'typ': 'savetowallet',
    'payload': {
        'genericObjects': [pass_object]
    }
}

# Sign with service account key
jwt_token = jwt.encode(jwt_payload, private_key, algorithm='RS256')

# Generate save URL
save_url = f'https://pay.google.com/gp/v/save/{jwt_token}'
```

**User Flow**:
```
1. User receives email with wallet pass link
2. Clicks "Add to Google Wallet"
3. Redirects to pay.google.com
4. Google Wallet app opens (or web interface)
5. User reviews pass details
6. Clicks "Save" button
7. Pass added to Google Wallet
8. Pass appears in wallet app
```

### Apple Wallet

**Status**: 🔧 **Configured (Requires Apple Developer Account)**

**PKPass Structure**:
```
pass.pkpass
├── pass.json              # Pass definition
├── logo.png               # 160x50px logo
├── logo@2x.png            # 320x100px retina
├── icon.png               # 29x29px icon
├── icon@2x.png            # 58x58px retina
├── manifest.json          # SHA-1 checksums
└── signature              # PKCS#7 detached signature
```

**pass.json Example**:
```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.outreachpass.event",
  "serialNumber": "card_uuid",
  "teamIdentifier": "TEAM_ID",
  "organizationName": "OutreachPass",
  "description": "Contact Card",
  "logoText": "OutreachPass",
  "foregroundColor": "rgb(255, 255, 255)",
  "backgroundColor": "rgb(79, 70, 229)",
  "generic": {
    "primaryFields": [
      {
        "key": "name",
        "label": "Name",
        "value": "John Doe"
      }
    ],
    "secondaryFields": [
      {
        "key": "title",
        "label": "Title",
        "value": "CEO, Acme Corp"
      }
    ],
    "backFields": [
      {
        "key": "email",
        "label": "Email",
        "value": "john@acme.com"
      },
      {
        "key": "phone",
        "label": "Phone",
        "value": "+1-555-0100"
      }
    ]
  },
  "barcode": {
    "message": "https://outreachpass.base2ml.com/c/card_id",
    "format": "PKBarcodeFormatQR",
    "messageEncoding": "iso-8859-1"
  },
  "expirationDate": "2025-12-31T23:59:59Z"
}
```

**Requirements**:
- Apple Developer Account ($99/year)
- Pass Type ID Certificate
- WWDR Intermediate Certificate
- Private key for signing

**User Flow**:
```
1. User receives email with .pkpass attachment
2. Opens attachment
3. iOS recognizes PKPass format
4. Wallet app opens automatically
5. User reviews pass
6. Taps "Add" button
7. Pass added to Apple Wallet
```

---

## QR Code Generation

### QR Code Features

**Generated for Each Card**:
```
QR Code → https://outreachpass.base2ml.com/c/{card_id}
```

**QR Code Properties**:
- **Format**: PNG image
- **Size**: 512x512 pixels
- **Error Correction**: High (30% redundancy)
- **Foreground**: Black (#000000)
- **Background**: White (#FFFFFF)
- **Storage**: S3 bucket (`qr/{tenant_id}/{card_id}.png`)

**Generation Process**:
```python
import qrcode
from io import BytesIO

# Generate QR code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4
)
qr.add_data(card_url)
qr.make(fit=True)

# Create image
img = qr.make_image(fill_color="black", back_color="white")

# Save to bytes
buffer = BytesIO()
img.save(buffer, format='PNG')
qr_bytes = buffer.getvalue()

# Upload to S3
s3_client.upload_file(qr_bytes, s3_key, content_type='image/png')
```

### QR Code Usage

**Use Cases**:
1. **Print on Badge**: Event badge with QR code
2. **Table Tent**: Display at networking tables
3. **Presentation Slide**: Share during presentations
4. **Email Signature**: Include in email footer
5. **Business Card**: Print on physical cards
6. **Poster/Signage**: Large format for booths

**Scan Flow**:
```
1. User scans QR code (phone camera)
2. Phone recognizes URL
3. Opens in browser
4. Loads contact card page
5. User can view, save, or add to wallet
```

---

## Email Delivery

### Email Templates

**Wallet Pass Delivery Email**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Digital Contact Card</title>
</head>
<body>
  <h1>Welcome to Tech Summit 2025!</h1>

  <p>Hi John,</p>

  <p>Your digital contact card is ready! Save it to your mobile wallet for easy access during the event.</p>

  <a href="https://pay.google.com/gp/v/save/{jwt_token}">
    <img src="https://cdn.../add-to-google-wallet.png" alt="Add to Google Wallet">
  </a>

  <p>Or view your card online:</p>
  <a href="https://outreachpass.base2ml.com/c/{card_id}">View Contact Card</a>

  <p>See you at the event!</p>

  <img src="https://outreachpass.base2ml.com/api/track/email/open/{message_id}.gif" width="1" height="1">
</body>
</html>
```

### Email Tracking

**Tracking Capabilities**:
1. **Email Sent**: Message queued to SES
2. **Email Delivered**: SES confirms delivery
3. **Email Opened**: Tracking pixel loaded
4. **Links Clicked**: Wallet link, card link clicked
5. **Bounce Handling**: Bounced emails recorded
6. **Complaint Handling**: Spam complaints tracked

**Tracking Implementation**:
```python
# Generate unique message ID
message_id = str(uuid.uuid4())

# Store context for correlation
message_context = MessageContext(
    message_id=message_id,
    card_id=card.card_id,
    tenant_id=card.tenant_id,
    event_id=event.event_id,
    attendee_id=attendee.attendee_id,
    recipient_email=attendee.email,
    expires_at=datetime.now() + timedelta(days=7)
)
db.add(message_context)

# Embed tracking pixel
tracking_pixel = f'<img src="{settings.API_BASE_URL}/api/track/email/open/{message_id}.gif" width="1" height="1">'

# Wrap links
wallet_link = f'{settings.API_BASE_URL}/api/track/email/click/{message_id}?url={encoded_wallet_url}'
```

**Email Analytics**:
- Open rate: % of delivered emails opened
- Click-through rate: % of opened emails clicked
- Bounce rate: % of emails bounced
- Complaint rate: % marked as spam
- Device breakdown: Mobile vs desktop opens

---

## Analytics & Tracking

### Analytics Dashboard

**Overview Metrics**:
```
┌────────────────────────────────────────────────┐
│  Analytics Dashboard                           │
├────────────────────────────────────────────────┤
│  Date Range: [Last 30 Days ▼]                  │
│                                                 │
│  📊 Overview                                   │
│  ┌──────────┬──────────┬──────────┬──────────┐│
│  │   2,150  │   1,820  │   687    │   412    ││
│  │  Card    │  Email   │  Email   │  Wallet  ││
│  │  Views   │  Opens   │  Clicks  │  Passes  ││
│  └──────────┴──────────┴──────────┴──────────┘│
│                                                 │
│  📧 Email Funnel                               │
│  Sent (1,820) ████████████████████ 100%       │
│  Delivered (1,802) █████████████████ 99%      │
│  Opened (687) ███████ 38%                     │
│  Clicked (412) ████ 23%                       │
│                                                 │
│  📱 Card View Sources                          │
│  [Pie Chart]                                   │
│  • QR Scan: 45%                                │
│  • Email Link: 30%                             │
│  • Direct Link: 20%                            │
│  • Share: 5%                                   │
│                                                 │
│  📲 Wallet Passes                              │
│  [Bar Chart]                                   │
│  • Google Wallet: 380 (92%)                    │
│  • Apple Wallet: 32 (8%)                       │
│                                                 │
│  📈 Trends (Last 30 Days)                      │
│  [Line Chart showing daily card views]         │
└────────────────────────────────────────────────┘
```

### Event Tracking

**Tracked Events**:

1. **Email Events** (`email_events` table):
   - `sent`: Email sent via SES
   - `delivered`: SES confirmed delivery
   - `opened`: Tracking pixel loaded
   - `clicked`: Link clicked
   - `bounced`: Email bounced
   - `complained`: Marked as spam

2. **Card View Events** (`card_view_events` table):
   - Source: `qr_scan`, `email_link`, `direct_link`, `share`
   - Device: `mobile`, `desktop`, `tablet`
   - Browser: Chrome, Safari, Firefox, etc.
   - OS: iOS, Android, Windows, macOS

3. **Wallet Pass Events** (`wallet_pass_events` table):
   - `generated`: Pass created
   - `email_clicked`: Wallet link clicked in email
   - `added_to_wallet`: Pass saved to wallet
   - Platform: `apple`, `google`

4. **Contact Export Events** (`contact_export_events` table):
   - `vcard_download`: vCard file downloaded
   - `add_to_contacts`: Contacts app opened
   - `copy_email`: Email copied to clipboard
   - `copy_phone`: Phone copied to clipboard

### Device Detection

**User Agent Parsing**:
```python
from user_agents import parse

ua_string = request.headers.get('User-Agent')
user_agent = parse(ua_string)

device_info = {
    'device_type': 'mobile' if user_agent.is_mobile else 'desktop',
    'browser': user_agent.browser.family,
    'browser_version': user_agent.browser.version_string,
    'os': user_agent.os.family,
    'os_version': user_agent.os.version_string,
    'device_brand': user_agent.device.brand,
    'device_model': user_agent.device.model
}
```

**Example Output**:
```json
{
  "device_type": "mobile",
  "browser": "Mobile Safari",
  "browser_version": "17.2",
  "os": "iOS",
  "os_version": "17.2",
  "device_brand": "Apple",
  "device_model": "iPhone"
}
```

### Analytics API Endpoints

**1. Overview Analytics**:
```http
GET /api/v1/admin/analytics/overview?days=30

Response:
{
  "total_card_views": 2150,
  "unique_visitors": 1823,
  "total_email_sends": 1820,
  "total_email_opens": 687,
  "total_email_clicks": 412,
  "total_wallet_passes": 412,
  "email_open_rate": 37.7,
  "email_click_rate": 22.6,
  "wallet_conversion_rate": 22.6
}
```

**2. Card-Specific Analytics**:
```http
GET /api/v1/admin/analytics/card/{card_id}?days=30

Response:
{
  "card_id": "uuid",
  "total_views": 45,
  "unique_views": 38,
  "vcard_downloads": 12,
  "wallet_passes_generated": 8,
  "view_sources": {
    "qr_scan": 20,
    "email_link": 15,
    "direct_link": 10
  },
  "device_breakdown": {
    "mobile": 30,
    "desktop": 15
  }
}
```

**3. Event Analytics**:
```http
GET /api/v1/admin/analytics/event/{event_id}?days=30

Response:
{
  "event_id": "uuid",
  "total_attendees": 250,
  "cards_generated": 250,
  "total_card_views": 1200,
  "emails_sent": 250,
  "emails_opened": 180,
  "wallet_passes_issued": 150,
  "top_cards": [
    {"card_id": "uuid", "views": 50, "name": "John Doe"},
    {"card_id": "uuid", "views": 45, "name": "Jane Smith"}
  ]
}
```

---

## Import & Export

### CSV Import

**Import Attendees**:
```
File: attendees.csv
Format: UTF-8, comma-separated
Max Size: 10 MB
Max Rows: 5,000 attendees
```

**Required Columns**:
- `first_name`
- `last_name`
- `email`

**Optional Columns**:
- `phone`
- `org_name`
- `title`
- `linkedin_url`

**Import API**:
```http
POST /api/v1/admin/events/{event_id}/attendees/import
Content-Type: multipart/form-data

Request:
{
  "file": <CSV file>,
  "send_emails": true,
  "generate_passes": true
}

Response:
{
  "job_id": "uuid",
  "status": "processing",
  "total_rows": 250,
  "imported": 0,
  "failed": 0
}
```

**Check Import Status**:
```http
GET /api/v1/admin/jobs/{job_id}

Response:
{
  "job_id": "uuid",
  "status": "completed",
  "total_rows": 250,
  "imported": 248,
  "failed": 2,
  "errors": [
    {"row": 15, "error": "Invalid email format"},
    {"row": 127, "error": "Missing required field: first_name"}
  ]
}
```

### CSV Export

**Export Analytics**:
```http
GET /api/v1/admin/analytics/export?format=csv&days=30

Response:
Content-Type: text/csv
Content-Disposition: attachment; filename="analytics-20251118.csv"

date,card_views,email_opens,email_clicks,wallet_passes
2025-11-01,150,80,45,30
2025-11-02,160,85,50,35
...
```

**Export Attendees**:
```http
GET /api/v1/admin/events/{event_id}/attendees/export

Response:
Content-Type: text/csv

attendee_id,first_name,last_name,email,phone,org_name,title,card_views,wallet_pass_generated
uuid1,John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,45,true
uuid2,Jane,Smith,jane@example.com,+1-555-0101,Tech Inc,CTO,38,true
```

---

## Future Features

### Roadmap

#### Phase 1: Enhanced Analytics (Q1 2026)
- [ ] Real-time analytics dashboard (WebSocket)
- [ ] Custom date range picker
- [ ] Advanced filtering (multi-event, multi-card)
- [ ] Period comparison (vs previous period)
- [ ] PDF report generation
- [ ] Scheduled email reports

#### Phase 2: Advanced Integrations (Q2 2026)
- [ ] Salesforce integration (lead capture)
- [ ] HubSpot integration (contact sync)
- [ ] Zapier integration (automation)
- [ ] Slack notifications (event alerts)
- [ ] Microsoft Teams integration

#### Phase 3: Event Features (Q3 2026)
- [ ] Session management (multi-track events)
- [ ] Speaker management
- [ ] Sponsor/exhibitor portal
- [ ] Check-in app (mobile scanning)
- [ ] Badge printing integration
- [ ] Networking recommendations

#### Phase 4: Advanced Features (Q4 2026)
- [ ] AI-powered lead scoring
- [ ] Chatbot for event info
- [ ] Mobile app (iOS/Android)
- [ ] Virtual event support (streaming)
- [ ] Gamification (attendee challenges)
- [ ] Social wall (live feed)

### Feature Requests

**Submit Feature Requests**:
- Email: christopherwlindeman@gmail.com
- GitHub Issues: (if repository is public)

**Criteria for Consideration**:
1. Alignment with product vision
2. User demand and impact
3. Technical feasibility
4. Resource requirements
5. ROI for development effort

---

## Feature Flags

### Feature Toggle System

**Feature Flag Table**:
```sql
CREATE TABLE feature_flags (
  flag_key TEXT PRIMARY KEY,
  tenant_id UUID,
  brand_id UUID,
  is_enabled BOOLEAN DEFAULT false,
  variant_json JSONB DEFAULT '{}'
);
```

**Example Flags**:
```json
{
  "apple_wallet_enabled": false,
  "google_wallet_enabled": true,
  "advanced_analytics": true,
  "custom_email_templates": false,
  "real_time_notifications": false,
  "api_rate_limit": 1000
}
```

**Usage**:
```python
async def is_feature_enabled(
    tenant_id: str,
    feature_key: str
) -> bool:
    flag = await db.get_feature_flag(tenant_id, feature_key)
    return flag.is_enabled if flag else False
```

---

**Document End** • [Back to Top](#outreachpass-features-guide)
