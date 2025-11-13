# OutreachPass API Examples

Complete API reference with curl examples.

## Base URL

```bash
# Get from Terraform
cd terraform
export API_BASE=$(terraform output -raw api_endpoint)
```

## Public Endpoints (No Auth)

### Health Check

```bash
curl "$API_BASE/health"
```

**Response:**
```json
{"status": "ok"}
```

### Get Contact Card Page

```bash
CARD_ID="your-card-id"
curl "$API_BASE/c/$CARD_ID"
```

**Response:** HTML page with contact details

### Download VCard

```bash
CARD_ID="your-card-id"
curl "$API_BASE/c/$CARD_ID/vcard" -o contact.vcf
```

**Response:** VCF file download

### Get Card Data (API)

```bash
CARD_ID="your-card-id"
curl "$API_BASE/api/cards/$CARD_ID"
```

**Response:**
```json
{
  "card_id": "...",
  "display_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "org_name": "Acme Corp",
  "title": "CEO",
  "links_json": {
    "linkedin": "https://linkedin.com/in/johndoe"
  }
}
```

## Admin Endpoints (Auth Required)

### Authentication

#### Get Cognito Token

```bash
# Install AWS CLI if needed
# aws configure

# Get User Pool details
USER_POOL_ID=$(cd terraform && terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(cd terraform && terraform output -raw cognito_client_id)

# Create user (first time only)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@outreachpass.com \
  --user-attributes Name=email,Value=admin@outreachpass.com \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@outreachpass.com \
  --password YourSecurePassword123! \
  --permanent

# Get authentication token
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=admin@outreachpass.com,PASSWORD=YourSecurePassword123! \
  --query 'AuthenticationResult.IdToken' \
  --output text > token.txt

# Use token in requests
export AUTH_TOKEN=$(cat token.txt)
```

### Events

#### Create Event

```bash
curl -X POST "$API_BASE/api/v1/admin/events" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "00000000-0000-0000-0000-000000000010",
    "name": "Tech Summit 2025",
    "slug": "tech-summit-2025",
    "starts_at": "2025-06-15T09:00:00Z",
    "ends_at": "2025-06-17T18:00:00Z",
    "timezone": "America/Los_Angeles",
    "settings_json": {
      "scans_visible": true,
      "lead_capture_enabled": false
    }
  }'
```

**Response:**
```json
{
  "event_id": "...",
  "tenant_id": "...",
  "brand_id": "00000000-0000-0000-0000-000000000010",
  "name": "Tech Summit 2025",
  "slug": "tech-summit-2025",
  "starts_at": "2025-06-15T09:00:00Z",
  "ends_at": "2025-06-17T18:00:00Z",
  "timezone": "America/Los_Angeles",
  "status": "draft",
  "created_at": "...",
  "updated_at": "..."
}
```

#### Get Event

```bash
EVENT_ID="your-event-id"
curl "$API_BASE/api/v1/admin/events/$EVENT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Update Event

```bash
EVENT_ID="your-event-id"
curl -X PUT "$API_BASE/api/v1/admin/events/$EVENT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "settings_json": {
      "scans_visible": true,
      "lead_capture_enabled": true
    }
  }'
```

### Attendees

#### Import Attendees from CSV

Create `attendees.csv`:
```csv
first_name,last_name,email,phone,org_name,title,linkedin_url,role
Alice,Johnson,alice@example.com,+1-555-0100,Tech Corp,Engineer,https://linkedin.com/in/alice,speaker
Bob,Smith,bob@example.com,+1-555-0101,Innovation Inc,CTO,,attendee
Carol,Davis,carol@example.com,+1-555-0102,StartupCo,Founder,https://linkedin.com/in/carol,exhibitor
```

Upload:
```bash
EVENT_ID="your-event-id"
curl -X POST "$API_BASE/api/v1/admin/events/$EVENT_ID/attendees/import" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@attendees.csv"
```

**Response:**
```json
{
  "imported": 3,
  "errors": null
}
```

#### List Attendees

```bash
EVENT_ID="your-event-id"
curl "$API_BASE/api/v1/admin/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Response:**
```json
[
  {
    "attendee_id": "...",
    "event_id": "...",
    "tenant_id": "...",
    "email": "alice@example.com",
    "phone": "+1-555-0100",
    "first_name": "Alice",
    "last_name": "Johnson",
    "org_name": "Tech Corp",
    "title": "Engineer",
    "linkedin_url": "https://linkedin.com/in/alice",
    "card_id": null,
    "flags_json": {"role": "speaker"},
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### Pass Issuance

#### Issue Card for Attendee

```bash
ATTENDEE_ID="your-attendee-id"
curl -X POST "$API_BASE/api/v1/admin/attendees/$ATTENDEE_ID/issue" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attendee_id": "'$ATTENDEE_ID'",
    "include_wallet": false
  }'
```

**Response:**
```json
{
  "card_id": "abc123...",
  "qr_url": "https://outreachpass.com/c/abc123...",
  "qr_s3_key": "qr/tenant-id/card-id.png",
  "wallet_passes": []
}
```

**What happens:**
1. Creates digital contact card
2. Generates QR code → uploads to S3
3. Sends email to attendee with card link
4. Returns card details

## Complete Workflow Example

### Scenario: Create Event → Import Attendees → Issue Passes

```bash
#!/bin/bash
set -e

# 1. Get API endpoint and auth token
cd terraform
export API_BASE=$(terraform output -raw api_endpoint)
export AUTH_TOKEN=$(cat ../token.txt)
cd ..

# 2. Create event
echo "Creating event..."
EVENT_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/admin/events" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "00000000-0000-0000-0000-000000000010",
    "name": "DevOps Days 2025",
    "slug": "devops-days-2025",
    "starts_at": "2025-09-10T09:00:00Z",
    "ends_at": "2025-09-12T18:00:00Z",
    "timezone": "America/New_York",
    "settings_json": {}
  }')

EVENT_ID=$(echo $EVENT_RESPONSE | jq -r '.event_id')
echo "Event created: $EVENT_ID"

# 3. Create attendees CSV
cat > /tmp/attendees.csv << 'EOF'
first_name,last_name,email,phone,org_name,title,linkedin_url,role
John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,https://linkedin.com/in/johndoe,speaker
Jane,Smith,jane@example.com,+1-555-0101,Tech Inc,CTO,https://linkedin.com/in/janesmith,attendee
Mike,Johnson,mike@example.com,+1-555-0102,DevCo,Engineer,,attendee
EOF

# 4. Import attendees
echo "Importing attendees..."
IMPORT_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/admin/events/$EVENT_ID/attendees/import" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@/tmp/attendees.csv")

echo $IMPORT_RESPONSE | jq '.'

# 5. Get attendee list
echo "Fetching attendees..."
ATTENDEES=$(curl -s "$API_BASE/api/v1/admin/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $AUTH_TOKEN")

# 6. Issue passes for all attendees
echo "Issuing passes..."
echo $ATTENDEES | jq -r '.[].attendee_id' | while read ATTENDEE_ID; do
  echo "Issuing pass for $ATTENDEE_ID..."
  curl -s -X POST "$API_BASE/api/v1/admin/attendees/$ATTENDEE_ID/issue" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"attendee_id": "'$ATTENDEE_ID'", "include_wallet": false}' | jq '.'
done

echo "Done! All passes issued."
```

## Testing Tips

### Use jq for JSON

```bash
# Pretty print response
curl "$API_BASE/health" | jq '.'

# Extract specific field
EVENT_ID=$(curl -s ... | jq -r '.event_id')
```

### Save responses

```bash
# Save to file
curl "$API_BASE/api/v1/admin/events" \
  -H "Authorization: Bearer $AUTH_TOKEN" > events.json

# View
cat events.json | jq '.'
```

### Debug with verbose

```bash
curl -v "$API_BASE/health"
```

## Rate Limits

**No rate limits in MVP.**

For production, add API Gateway usage plans:
- Free tier: 100 requests/day
- Paid tier: Unlimited

## Error Responses

### 401 Unauthorized

```json
{"detail": "Not authenticated"}
```

**Fix:** Include valid JWT token in Authorization header

### 404 Not Found

```json
{"detail": "Event not found"}
```

**Fix:** Check resource ID is correct

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

**Fix:** Correct request body format

## Postman Collection

Import this JSON to Postman:

```json
{
  "info": {
    "name": "OutreachPass API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://your-api-id.execute-api.us-east-1.amazonaws.com"
    },
    {
      "key": "auth_token",
      "value": "your-cognito-jwt-token"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Create Event",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/v1/admin/events",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"brand_id\": \"00000000-0000-0000-0000-000000000010\",\n  \"name\": \"Test Event\",\n  \"slug\": \"test-event\",\n  \"starts_at\": \"2025-06-01T09:00:00Z\",\n  \"ends_at\": \"2025-06-03T18:00:00Z\",\n  \"timezone\": \"UTC\"\n}"
        }
      }
    }
  ]
}
```

---

For more examples, see [README.md](README.md)
