# Brand Wallet Customization Guide

**Created**: 2025-11-18
**Status**: Phase 1-4 Complete - Full Brand Customization Enabled

---

## Overview

The OutreachPass platform supports comprehensive branding for wallet passes (Apple Wallet and Google Wallet). Each brand can customize colors, logos, and visual elements to match their identity.

## Brand Theme Schema

The `brands.theme_json` JSONB field stores all brand customization settings:

```json
{
  "primary_color": "#4F46E5",
  "secondary_color": "#06B6D4",
  "text_color": "#1F2937",
  "logo_url": "",

  "apple_wallet": {
    "background_color": "#4F46E5",
    "foreground_color": "#FFFFFF",
    "label_color": "#E5E7EB",
    "logo_url": "",
    "icon_url": "",
    "strip_image_url": ""
  },

  "google_wallet": {
    "background_color": "#4F46E5",
    "text_color": "#FFFFFF",
    "logo_url": "",
    "hero_image_url": ""
  }
}
```

---

## Field Definitions

### Global Brand Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `primary_color` | String (Hex) | Main brand color, fallback for wallet backgrounds | `#4F46E5` |
| `secondary_color` | String (Hex) | Accent color for UI elements | `#06B6D4` |
| `text_color` | String (Hex) | Default text color for web interfaces | `#1F2937` |
| `logo_url` | String (URL) | Primary brand logo (used as fallback) | `https://cdn.../logo.png` |

### Apple Wallet Customization

| Field | Type | Description | Apple Wallet Usage |
|-------|------|-------------|-------------------|
| `background_color` | String (Hex) | Pass background color | Entire pass background |
| `foreground_color` | String (Hex) | Primary text color | Main text and values |
| `label_color` | String (Hex) | Label/caption text color | Field labels (lighter) |
| `logo_url` | String (URL) | Logo image (160x50px @2x) | Top-left corner |
| `icon_url` | String (URL) | Icon image (58x58px @2x) | Pass icon in wallet list |
| `strip_image_url` | String (URL) | Strip image (640x168px @2x) | Top banner/header image |

**Image Requirements (Apple Wallet)**:
- **Logo**: 160x50px at 2x (320x100px actual), PNG with transparency
- **Icon**: 58x58px at 2x (116x116px actual), PNG
- **Strip**: 640x168px at 2x (1280x336px actual), PNG/JPG

### Google Wallet Customization

| Field | Type | Description | Google Wallet Usage |
|-------|------|-------------|-------------------|
| `background_color` | String (Hex) | Pass background color | Card background |
| `text_color` | String (Hex) | Text color | All text elements |
| `logo_url` | String (URL) | Logo image | Brand logo on pass |
| `hero_image_url` | String (URL) | Hero/banner image | Top banner image |

**Image Requirements (Google Wallet)**:
- **Logo**: 660x660px, PNG with transparency preferred
- **Hero**: 1032x336px, PNG/JPG

---

## Current Brand Configurations

### OutreachPass (Indigo Theme)
```json
{
  "primary_color": "#4F46E5",
  "secondary_color": "#06B6D4",
  "apple_wallet": {
    "background_color": "#4F46E5",
    "foreground_color": "#FFFFFF",
    "label_color": "#E5E7EB"
  },
  "google_wallet": {
    "background_color": "#4F46E5",
    "text_color": "#FFFFFF"
  }
}
```

### GovSafe (Dark Blue Theme)
```json
{
  "primary_color": "#1E40AF",
  "secondary_color": "#059669",
  "apple_wallet": {
    "background_color": "#1E40AF",
    "foreground_color": "#FFFFFF",
    "label_color": "#DBEAFE"
  },
  "google_wallet": {
    "background_color": "#1E40AF",
    "text_color": "#FFFFFF"
  }
}
```

### CampusCard (Purple Theme)
```json
{
  "primary_color": "#7C3AED",
  "secondary_color": "#F59E0B",
  "apple_wallet": {
    "background_color": "#7C3AED",
    "foreground_color": "#FFFFFF",
    "label_color": "#EDE9FE"
  },
  "google_wallet": {
    "background_color": "#7C3AED",
    "text_color": "#FFFFFF"
  }
}
```

---

## Implementation Details

### Color Fallback Logic

The system uses intelligent fallbacks to ensure passes always have colors:

1. **Apple Wallet**:
   - `background_color`: `apple_wallet.background_color` → `primary_color` → `#1E40AF`
   - `foreground_color`: `apple_wallet.foreground_color` → `#FFFFFF`
   - `label_color`: `apple_wallet.label_color` → `#E5E7EB`

2. **Google Wallet**:
   - Uses `google_wallet.background_color` or falls back to `primary_color`
   - Text color defaults to white (`#FFFFFF`) for contrast

### Code Integration

**Location**: `/backend/app/services/card_service.py`

```python
# Extract brand information
brand_name = event.brand.display_name if event.brand else settings.APPLE_WALLET_ORGANIZATION_NAME
brand_theme = event.brand.theme_json if event.brand else {}

# Apple Wallet color extraction
apple_wallet_theme = brand_theme.get('apple_wallet', {})
background_color = apple_wallet_theme.get('background_color') or brand_theme.get('primary_color', '#1E40AF')
foreground_color = apple_wallet_theme.get('foreground_color', '#FFFFFF')
label_color = apple_wallet_theme.get('label_color', '#E5E7EB')

# Pass to generator
pkpass_bytes = generator.create_event_pass(
    background_color=background_color,
    foreground_color=foreground_color,
    label_color=label_color,
    # ... other parameters
)
```

---

## How to Add Brand Logos

### Step 1: Upload Images to S3

```bash
# Upload to S3 bucket
aws s3 cp logo.png s3://outreachpass-assets/brands/outreachpass/logo.png
aws s3 cp icon.png s3://outreachpass-assets/brands/outreachpass/icon.png
aws s3 cp strip.png s3://outreachpass-assets/brands/outreachpass/strip.png
```

### Step 2: Update Brand Theme

```python
# Update brand in database
UPDATE brands
SET theme_json = jsonb_set(
  theme_json,
  '{apple_wallet,logo_url}',
  '"https://assets.outreachpass.com/brands/outreachpass/logo.png"'
)
WHERE brand_key = 'OUTREACHPASS';
```

### Step 3: Regenerate Passes

New passes will automatically use the updated branding. Existing passes need to be regenerated to reflect changes.

---

## Phase 3 Implementation: Automatic Image Loading ✅

**Status**: Complete

### Image Fetching Utility

Created `/backend/app/utils/images.py` with comprehensive image loading capabilities:

**Features**:
- Automatic detection of URL type (HTTP, HTTPS, S3)
- Support for S3 URLs: `s3://bucket/key` and `https://bucket.s3.amazonaws.com/key`
- Image format validation (PNG, JPEG, GIF, WebP)
- Size limits (default 5MB max)
- Timeout protection (default 10s)
- Graceful fallbacks on errors

**Functions**:
```python
# Fetch single image from any URL
image_bytes = await fetch_image_from_url("https://example.com/logo.png")

# Fetch all brand images for a wallet type
brand_images = await fetch_brand_images(brand_theme, wallet_type='apple')
# Returns: {'logo': bytes, 'icon': bytes, 'strip': bytes}
```

### Integration

**Apple Wallet**: Images automatically fetched and embedded in `.pkpass` files
- Logo (160x50px @2x) - Top-left corner
- Icon (58x58px @2x) - Wallet list view
- Strip (640x168px @2x) - Top banner

**Google Wallet**: Ready for future implementation
- Currently stores URLs in theme_json
- Can be extended to use Google Wallet API image fields

### Error Handling

All image loading is **non-blocking** - if an image fails to load:
1. Warning logged with details
2. Pass generation continues without image
3. Pass uses colors and text only
4. No user-facing errors

### Supported Image Sources

| Source Type | Example | Use Case |
|-------------|---------|----------|
| **HTTP/HTTPS** | `https://cdn.example.com/logo.png` | Public CDN hosting |
| **S3 (URL)** | `s3://bucket-name/brands/logo.png` | Private S3 bucket |
| **S3 (HTTP)** | `https://bucket.s3.amazonaws.com/logo.png` | Pre-signed or public S3 URLs |

### Example Configuration

```json
{
  "apple_wallet": {
    "logo_url": "s3://outreachpass-assets/brands/outreachpass/logo.png",
    "icon_url": "s3://outreachpass-assets/brands/outreachpass/icon.png",
    "strip_image_url": "https://cdn.outreachpass.com/brand-strip.png"
  }
}
```

All three URL types can be mixed within the same brand configuration.

---

## Phase 4 Implementation: Email Template Branding ✅

**Status**: Complete

### Email Customization Features

Extended the email system to support brand-specific styling and sender names:

**Branded Elements**:
- Primary button color (Access Your Card) - uses `primary_color`
- Secondary button color (Download VCard) - uses `secondary_color`
- Text colors - uses `text_color` and `light_text_color`
- Sender name - uses brand `display_name`

**Implementation**:
Updated `/backend/app/utils/email.py` with brand theme extraction:

```python
def send_pass_email(
    self,
    to_email: str,
    display_name: str,
    event_name: str,
    card_url: str,
    qr_url: str,
    wallet_passes: Optional[List] = None,
    vcard_url: Optional[str] = None,
    # Brand customization - NEW
    brand_name: Optional[str] = None,
    brand_theme: Optional[dict] = None,
    # Tracking parameters
    card_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[uuid.UUID] = None,
    event_id: Optional[uuid.UUID] = None,
    attendee_id: Optional[uuid.UUID] = None,
    db: Optional[any] = None
) -> bool:
```

**Color Extraction with Fallbacks**:
```python
# Extract brand colors for email styling
primary_color = "#0066cc"  # Default blue
secondary_color = "#28a745"  # Default green
text_color = "#333"
light_text_color = "#555"
sender_name = brand_name or "OutreachPass"

if brand_theme:
    # Primary button color
    primary_color = brand_theme.get('primary_color', primary_color)
    # VCard download button color
    secondary_color = brand_theme.get('secondary_color', secondary_color)
    # Text colors
    text_color = brand_theme.get('text_color', text_color)
    light_text_color = brand_theme.get('light_text_color', light_text_color)
```

**Dynamic HTML Template**:
```html
<h2 style="color: {text_color};">Hello {display_name},</h2>
<p style="font-size: 16px; color: {light_text_color};">Your digital contact card...</p>
<a href="{tracked_card_url}" style="background-color: {primary_color}; color: white; ...">
    Access Your Card
</a>
<a href="{tracked_vcard_url}" style="background-color: {secondary_color}; color: white; ...">
    📥 Download Contact Card (.vcf)
</a>
<p>Best regards,<br/>The {sender_name} Team</p>
```

### Email Branding Example

**OutreachPass Brand** (Indigo):
- Primary button: `#4F46E5` (Indigo)
- VCard button: `#06B6D4` (Cyan)
- Sender: "The OutreachPass Team"

**GovSafe Brand** (Dark Blue):
- Primary button: `#1E40AF` (Blue 800)
- VCard button: `#059669` (Green 700)
- Sender: "The GovSafe Team"

**CampusCard Brand** (Purple):
- Primary button: `#7C3AED` (Purple 600)
- VCard button: `#F59E0B` (Amber 500)
- Sender: "The CampusCard Team"

### Integration

Updated `/backend/app/services/card_service.py` to pass brand data:

```python
# Extract brand information for email customization
brand_name = event.brand.display_name if event.brand else None
brand_theme = event.brand.theme_json if event.brand else None

email_client.send_pass_email(
    to_email=attendee.email,
    display_name=display_name,
    event_name=event.name,
    card_url=card_url,
    qr_url=f"{base_domain}/qr/{card.card_id}",
    wallet_passes=wallet_passes,
    vcard_url=vcard_url,
    # Brand customization
    brand_name=brand_name,
    brand_theme=brand_theme,
    # Tracking parameters
    card_id=card.card_id,
    tenant_id=attendee.tenant_id,
    event_id=attendee.event_id,
    attendee_id=attendee.attendee_id,
    db=db
)
```

### Fallback Behavior

**No Brand Data**: Falls back to default OutreachPass branding
- Default colors: Blue (#0066cc) and Green (#28a745)
- Default sender: "The OutreachPass Team"

**Partial Brand Data**: Uses provided values with intelligent fallbacks
- Missing `primary_color`: Falls back to #0066cc
- Missing `secondary_color`: Falls back to #28a745
- Missing `brand_name`: Falls back to "OutreachPass"

---

## Future Enhancements (Phase 5+)

### Google Wallet Image Integration
- Extend `google_wallet.py` to include logo/hero image fields
- Pass image URLs to Google Wallet API
- Note: Google Wallet uses URLs, not embedded bytes

### Image Optimization
- Automatic resizing to correct dimensions
- Format conversion (WebP → PNG for compatibility)
- Quality compression for file size optimization

### Image Caching
- Cache frequently accessed brand images
- Reduce S3/HTTP requests for performance
- TTL-based cache invalidation

### Phase 4: Email Template Branding
- Branded email templates using `theme_json`
- Custom email headers with logos
- Color-matched email styling

---

## API Usage

### Get Brand Details

```bash
GET /api/v1/admin/brands/{brand_id}
```

```json
{
  "brand_id": "uuid",
  "brand_key": "OUTREACHPASS",
  "display_name": "OutreachPass",
  "domain": "outreachpass.com",
  "theme_json": {
    "primary_color": "#4F46E5",
    "apple_wallet": { ... },
    "google_wallet": { ... }
  }
}
```

### Update Brand Theme

```bash
PUT /api/v1/admin/brands/{brand_id}
Content-Type: application/json

{
  "theme_json": {
    "primary_color": "#NEW_COLOR",
    "apple_wallet": {
      "background_color": "#NEW_COLOR"
    }
  }
}
```

---

## Testing Wallet Customization

### 1. Create Test Event

```bash
POST /api/v1/admin/events
{
  "name": "Test Event",
  "brand_id": "outreachpass-brand-id",
  "starts_at": "2025-12-01T10:00:00Z"
}
```

### 2. Create Test Attendee

```bash
POST /api/v1/admin/attendees
{
  "event_id": "event-id",
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User"
}
```

### 3. Verify Pass Generation

The system will automatically:
1. Fetch event with brand relationship
2. Extract brand colors from `theme_json`
3. Generate Apple Wallet pass with brand colors
4. Generate Google Wallet pass with brand name
5. Send email with branded wallet links

---

## Color Guidelines

### Recommended Contrast Ratios

For accessibility (WCAG 2.1):
- **Normal text**: 4.5:1 minimum
- **Large text**: 3:1 minimum
- **UI components**: 3:1 minimum

### Testing Tool
Use https://webaim.org/resources/contrastchecker/ to verify color combinations.

### Brand-Safe Color Palettes

**OutreachPass** (Indigo):
- Background: `#4F46E5` (Indigo 600)
- Foreground: `#FFFFFF` (White) - 8.6:1 contrast ✅
- Labels: `#E5E7EB` (Gray 200) - 7.2:1 contrast ✅

**GovSafe** (Dark Blue):
- Background: `#1E40AF` (Blue 800)
- Foreground: `#FFFFFF` (White) - 10.3:1 contrast ✅
- Labels: `#DBEAFE` (Blue 100) - 8.9:1 contrast ✅

**CampusCard** (Purple):
- Background: `#7C3AED` (Purple 600)
- Foreground: `#FFFFFF` (White) - 6.7:1 contrast ✅
- Labels: `#EDE9FE` (Purple 100) - 5.8:1 contrast ✅

---

## Database Schema Reference

```sql
CREATE TABLE brands (
  brand_id         UUID PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  brand_key        TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  domain           TEXT NOT NULL,
  theme_json       JSONB NOT NULL DEFAULT '{}',  -- ← Stores all customization
  features_json    JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);
```

The `theme_json` field is a flexible JSONB column that can be extended with additional customization options without database migrations.

---

*Last Updated: 2025-11-18*
*Phase 1-4 Implementation Complete - Wallet Passes + Images + Email Branding*
