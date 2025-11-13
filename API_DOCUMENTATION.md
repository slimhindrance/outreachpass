# OutreachPass API Documentation

## Security Updates (November 2025)

### Recent Security Improvements
- ✅ CSV import validation (file size and row limits)
- ✅ Structured logging for better monitoring
- ✅ Environment variable validation for frontend

---

## Base URL

```
Production: https://outreachpass.base2ml.com/api/v1
Development: http://localhost:8000/api/v1
```

---

## Authentication

Admin endpoints require **Cognito JWT authentication**.

### Headers
```http
Authorization: Bearer <cognito-jwt-token>
Content-Type: application/json
```

---

## Public Endpoints (No Auth Required)

### Get Contact Card
```http
GET /c/{card_id}
```
Renders the public contact card page for sharing.

**Response**: HTML page

---

### Download VCard
```http
GET /c/{card_id}/vcard
```
Downloads contact information as a `.vcf` file for importing to phone contacts.

**Response**: `text/vcard` file

---

### Get Card Data (JSON)
```http
GET /api/cards/{card_id}
```
Returns card data in JSON format.

**Response**:
```json
{
  "card_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "org_name": "Acme Corp",
  "title": "CEO",
  "links": {},
  "qr_url": "https://..."
}
```

---

## Admin Endpoints (JWT Required)

### Brands

#### List All Brands
```http
GET /api/v1/admin/brands
```

**Response**:
```json
{
  "brands": [
    {
      "brand_id": "uuid",
      "brand_key": "OUTREACHPASS",
      "display_name": "OutreachPass",
      "features": {}
    }
  ]
}
```

---

### Events

#### Create Event
```http
POST /api/v1/admin/events
```

**Request Body**:
```json
{
  "name": "Tech Conference 2025",
  "brand_id": "uuid",
  "start_date": "2025-03-15",
  "end_date": "2025-03-17",
  "location": "San Francisco, CA",
  "description": "Annual tech conference"
}
```

**Response**:
```json
{
  "event_id": "uuid",
  "name": "Tech Conference 2025",
  "status": "active",
  "created_at": "2025-11-12T10:30:00Z"
}
```

---

#### Get Event
```http
GET /api/v1/admin/events/{event_id}
```

**Response**: Event details with attendee count and stats

---

#### Update Event
```http
PUT /api/v1/admin/events/{event_id}
```

**Request Body**: Same as create (partial updates supported)

---

#### List Events
```http
GET /api/v1/admin/events
```

**Query Parameters**:
- `status` (optional): `active`, `archived`
- `brand_id` (optional): Filter by brand

**Response**:
```json
{
  "events": [
    {
      "event_id": "uuid",
      "name": "Tech Conference 2025",
      "start_date": "2025-03-15",
      "attendee_count": 250
    }
  ]
}
```

---

### Attendees

#### Import Attendees from CSV
```http
POST /api/v1/admin/events/{event_id}/attendees/import
```

**Request**: `multipart/form-data`
- `file`: CSV file upload

**CSV Format**:
```csv
first_name,last_name,email,phone,org_name,title,linkedin_url,role
John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,https://linkedin.com/in/johndoe,speaker
```

**Validation Rules** (as of November 2025):
- ✅ **Maximum file size**: 5MB
- ✅ **Maximum rows**: 10,000
- ✅ **Encoding**: UTF-8 required
- ✅ **Required columns**: `first_name`, `last_name`, `email`
- ✅ **Optional columns**: `phone`, `org_name`, `title`, `linkedin_url`, `role`

**Success Response** (200):
```json
{
  "imported": 150,
  "errors": null
}
```

**Error Responses**:

File Too Large (413):
```json
{
  "detail": "File too large. Maximum size is 5.0MB"
}
```

Too Many Rows (413):
```json
{
  "detail": "Too many rows. Maximum is 10,000 rows"
}
```

Invalid Encoding (400):
```json
{
  "detail": "Invalid file encoding. Please use UTF-8"
}
```

Invalid Format (400):
```json
{
  "detail": "Invalid CSV format: <error details>"
}
```

Empty File (400):
```json
{
  "detail": "Empty file uploaded"
}
```

Partial Success (200 with errors):
```json
{
  "imported": 145,
  "errors": [
    "Row 23: Invalid email format",
    "Row 47: Missing required field 'first_name'"
  ]
}
```

---

#### List Attendees
```http
GET /api/v1/admin/events/{event_id}/attendees
```

**Query Parameters**:
- `limit` (optional): Default 100, max 1000
- `offset` (optional): For pagination

**Response**:
```json
{
  "attendees": [
    {
      "attendee_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "has_card": true,
      "created_at": "2025-11-12T10:30:00Z"
    }
  ],
  "total": 250
}
```

---

#### Issue Digital Pass
```http
POST /api/v1/admin/attendees/{attendee_id}/issue
```

**Request Body**:
```json
{
  "delivery_method": "email"
}
```

**Response**:
```json
{
  "card_id": "uuid",
  "qr_url": "https://outreachpass.base2ml.com/c/uuid",
  "qr_s3_key": "qr/tenant-id/card-id.png",
  "wallet_passes": [],
  "email_sent": true
}
```

**Processing**:
- Creates job in `pass_generation_jobs` table
- Background worker processes jobs asynchronously
- Email sent with card link and QR code

---

#### Get Pass Job Status
```http
GET /api/v1/admin/attendees/{attendee_id}/issue/status
```

**Response**:
```json
{
  "job_id": "uuid",
  "status": "completed",
  "card_id": "uuid",
  "qr_url": "https://...",
  "created_at": "2025-11-12T10:30:00Z",
  "completed_at": "2025-11-12T10:30:05Z"
}
```

**Status Values**:
- `pending`: Waiting for worker to process
- `processing`: Currently being processed
- `completed`: Successfully generated
- `failed`: Permanently failed after retries

---

### Dashboard

#### Get Dashboard Stats
```http
GET /api/v1/admin/dashboard/stats
```

**Response**:
```json
{
  "total_events": 15,
  "active_events": 8,
  "total_attendees": 2450,
  "cards_issued": 2100,
  "recent_activity": []
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation error, invalid format)
- `401` - Unauthorized (missing or invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `413` - Payload Too Large (file size or row limit exceeded)
- `422` - Unprocessable Entity (schema validation failed)
- `500` - Internal Server Error

---

## Rate Limiting

**Current**: No rate limiting implemented

**Recommended** (future):
- CSV import: 10 requests per minute per user
- API endpoints: 100 requests per minute per user

---

## Changelog

### November 2025 - Security & Validation Updates
- ✅ Added CSV file size limit (5MB)
- ✅ Added CSV row count limit (10,000)
- ✅ Added UTF-8 encoding validation
- ✅ Improved error messages with row numbers
- ✅ Replaced print() with structured logging
- ✅ Removed hardcoded credentials from frontend

### October 2025 - Initial Release
- ✅ Core API endpoints
- ✅ Cognito authentication
- ✅ CSV import
- ✅ Pass generation
- ✅ Email delivery

---

## Support

For API issues or questions:
- GitHub Issues: [Create Issue](https://github.com/yourusername/ContactSolution/issues)
- Email: clindeman@base2ml.com
