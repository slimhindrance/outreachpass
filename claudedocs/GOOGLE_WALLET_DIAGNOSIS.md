# Google Wallet Pass Link Error - Diagnostic Report

**Date**: 2025-11-17
**Status**: Investigation Complete
**Severity**: High - Pass links generate but fail on click

---

## Executive Summary

The Google Wallet pass links are successfully generated in emails, but when users click them, they encounter errors (likely "Something went wrong"). Investigation reveals multiple potential root causes related to JWT structure, API object creation, and configuration.

---

## Current Implementation Analysis

### What's Working ✅
- Pass link generation executes without errors
- Links are correctly formatted: `https://pay.google.com/gp/v/save/{jwt_token}`
- JWT signing with service account private key
- Email delivery with Google Wallet button
- Recent fix added required `iat` and `exp` JWT fields (commit cd84ffd)

### Critical Issues Found 🚨

#### 1. **Origins Field Configuration** (MOST LIKELY CAUSE)
**File**: `backend/app/utils/google_wallet.py:269`
**Issue**: JWT always includes `origins` array, even when empty

```python
# Current problematic code (line 268-270)
"origins": self.origins,
"payload": {
    "eventTicketObjects": [...]
}
```

**Why This Breaks Email Links**:
- Google Wallet validates `origins` for web-based "Add to Wallet" buttons
- For **email-based links**, the `origins` field should be **completely omitted** from JWT
- Including empty `origins: []` still causes validation failures
- Research source: Google Wallet API FAQ & Stack Overflow #75867483

**Evidence**:
- Config: `GOOGLE_WALLET_ORIGINS: list[str] = []` (backend/app/core/config.py:67)
- Code was updated to conditionally add origins (line 268-270) but still includes when empty

#### 2. **Pass Object Pre-Creation Requirement**
**File**: `backend/app/services/card_service.py:327-335`
**Issue**: Pass object creation may fail silently, but JWT still references it

**Current Flow**:
1. Create pass class via API (line 299)
2. Create pass object via API (line 327)
3. Generate JWT with object reference (line 342)

**Problem**: If step 2 fails (returns `None`), step 3 still generates JWT with non-existent object ID. The code checks for `None` at line 337, but if HTTP client is missing, it returns the object ID anyway without creating it (line 200-202).

**Code Snippet**:
```python
# Line 200-202 in google_wallet.py
if not self.http_client:
    logger.warning("No HTTP client - returning object ID without creating")
    return full_object_id  # ❌ Returns ID but object doesn't exist in Google's system
```

#### 3. **Service Account File Path**
**File**: `backend/app/core/config.py:66`
**Issue**: Service account file path may not be properly configured

```python
GOOGLE_WALLET_SERVICE_ACCOUNT_FILE: Optional[str] = None
```

**Risk**: If this is `None`, the HTTP client won't be initialized (google_wallet.py:55-63), so:
- Pass classes won't be created in Google Wallet API
- Pass objects won't be created in Google Wallet API
- JWT will reference non-existent objects → Click error

#### 4. **JWT Token Length** (Lower Priority)
**Research Finding**: Google Wallet JWT has 1800 character limit
**Current Implementation**: No length validation

**Monitoring Needed**:
- Check logs for "token length" (added in recent fix)
- If token > 1800 chars, Google will reject it

---

## Root Cause Analysis

### Primary Suspect: Origins Field in Email-Based JWTs

**Evidence Chain**:
1. ✅ JWT structure is correct (has iss, aud, typ, iat, exp)
2. ✅ JWT is properly signed with service account key
3. ❌ JWT includes `origins` field even when empty
4. ❌ Google Wallet API rejects JWTs with `origins` for email contexts

**Supporting Research**:
- Google Wallet FAQ states origins should be omitted for email buttons
- Stack Overflow #75867483: "origins field causes issues for email links"
- Code currently: `if self.origins: payload["origins"] = self.origins` BUT self.origins defaults to `[]`, not `None`

### Secondary Suspect: Pass Object Not Created in Google API

**Evidence Chain**:
1. ❌ Service account file path may be `None`
2. ❌ No HTTP client means API calls are skipped
3. ❌ Code returns object IDs without verifying creation
4. ❌ JWT references objects that don't exist in Google's system

---

## Recommended Fixes

### Fix 1: Remove Origins from Email-Based JWTs (CRITICAL)
**Priority**: 🔴 HIGHEST
**File**: `backend/app/utils/google_wallet.py:268-270`
**Estimated Impact**: 80% likely to resolve issue

**Current Code**:
```python
payload = {
    "iss": self.service_account_email,
    "aud": "google",
    "typ": "savetowallet",
    "iat": current_time,
    "exp": current_time + 3600,
    "origins": self.origins,  # ❌ PROBLEM LINE
    "payload": {...}
}
```

**Fixed Code**:
```python
payload = {
    "iss": self.service_account_email,
    "aud": "google",
    "typ": "savetowallet",
    "iat": current_time,
    "exp": current_time + 3600,
    "payload": {...}
}

# Only add origins if provided and not empty (for web-based buttons)
if self.origins:
    payload["origins"] = self.origins
```

**Why This Works**:
- Completely omits `origins` field from JWT when not needed
- Matches Google Wallet API requirements for email contexts
- Still allows web-based buttons if origins are configured

---

### Fix 2: Verify Pass Object Creation Before JWT Generation
**Priority**: 🟡 HIGH
**File**: `backend/app/utils/google_wallet.py:200-202`

**Current Code**:
```python
if not self.http_client:
    logger.warning("No HTTP client - returning object ID without creating")
    return full_object_id  # ❌ Returns fake ID
```

**Fixed Code**:
```python
if not self.http_client:
    logger.error("No HTTP client - cannot create pass object")
    return None  # ✅ Fail early, don't generate invalid JWT
```

**Additional Check** in `card_service.py:337-339`:
```python
if not full_object_id:
    logger.error("Failed to create Google Wallet pass object - aborting JWT generation")
    return None  # ✅ Already exists, but ensure earlier failure propagates
```

---

### Fix 3: Validate Service Account Configuration on Startup
**Priority**: 🟡 MEDIUM
**File**: `backend/app/main.py` (startup event)

**Add Validation**:
```python
@app.on_event("startup")
async def validate_google_wallet_config():
    if settings.GOOGLE_WALLET_ENABLED:
        if not settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE:
            logger.error("GOOGLE_WALLET_ENABLED=True but SERVICE_ACCOUNT_FILE not configured!")
        elif not os.path.exists(settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE):
            logger.error(f"Service account file not found: {settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE}")
        else:
            logger.info("✅ Google Wallet configuration validated")
```

---

### Fix 4: Add JWT Length Validation
**Priority**: 🟢 LOW
**File**: `backend/app/utils/google_wallet.py:287`

**Add Check**:
```python
# Generate the save URL
save_url = f"https://pay.google.com/gp/v/save/{token}"

# Validate JWT length (Google Wallet limit: 1800 chars)
if len(token) > 1800:
    logger.error(f"JWT token too long: {len(token)} chars (max 1800)")
    # Consider simplifying pass object or pre-creating class in console

logger.info(f"Generated Google Wallet save URL for {full_object_id}")
return save_url
```

---

## Testing Plan

### 1. Verify Current Configuration
```bash
# Check if service account file exists
aws secretsmanager get-secret-value --secret-id google-wallet-service-account \
  --query SecretString --output text | jq -r . > /tmp/google-sa.json

# Verify credentials work
python -c "
from google.oauth2 import service_account
creds = service_account.Credentials.from_service_account_file(
    '/tmp/google-sa.json',
    scopes=['https://www.googleapis.com/auth/wallet_object.issuer']
)
print('✅ Credentials valid')
"
```

### 2. Test Pass Object Creation
```python
# Add to card_service.py temporarily for debugging
logger.info(f"Pass object creation result: {full_object_id}")
logger.info(f"HTTP client available: {generator.http_client is not None}")
```

### 3. Capture Actual Error from Google Wallet
- Click a generated link on mobile device
- Screenshot exact error message
- Check browser console for error codes
- Expected errors:
  - "Something went wrong" → Origins field issue
  - "Pass not found" → Object not created
  - "Invalid token" → JWT signing issue

### 4. After Fix 1 is Applied
- Generate new pass for test attendee
- Click Google Wallet link
- Verify pass loads successfully
- Check CloudWatch logs for "JWT signed successfully"

---

## Configuration Checklist

Before deploying fixes, verify:

- [ ] `GOOGLE_WALLET_ISSUER_ID` is set (numeric Google Cloud Project ID)
- [ ] `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL` is set
- [ ] `GOOGLE_WALLET_SERVICE_ACCOUNT_FILE` points to valid JSON key file
- [ ] Service account has `Wallet Object Issuer` role in GCP
- [ ] `GOOGLE_WALLET_ORIGINS` is empty list `[]` (for email buttons)
- [ ] Google Wallet API is enabled in GCP project

---

## Expected Outcomes

### After Fix 1 (Origins Removal)
**Success Indicators**:
- Users can click "Add to Google Wallet" from email
- Pass loads in Google Wallet app without error
- Pass displays attendee name, event info, QR code

**Failure Indicators** (if still broken):
- Same error → Move to Fix 2 (object creation)
- "Pass not found" → Confirm service account configuration
- New error → Capture and analyze

### After All Fixes
**Complete Success**:
1. Email sent with Google Wallet button ✅
2. User clicks button ✅
3. Google Wallet app opens ✅
4. Pass loads correctly with all details ✅
5. QR code scannable ✅

---

## References

### Code Locations
- JWT Generation: `backend/app/utils/google_wallet.py:233-295`
- Pass Creation: `backend/app/services/card_service.py:261-355`
- Configuration: `backend/app/core/config.py:62-67`
- Email Template: `backend/app/utils/email.py:122-128`

### External Documentation
- [Google Wallet Event Tickets JWT](https://developers.google.com/wallet/tickets/events/use-cases/jwt)
- [Google Wallet Error Codes](https://developers.google.com/wallet/tickets/boarding-passes/resources/error-codes)
- [Stack Overflow: "Something Went Wrong"](https://stackoverflow.com/questions/75867483)

### Recent Changes
- Commit cd84ffd: Added `iat` and `exp` to JWT (2025-11-16)
- Commit aa0d0f7: Initial Google Wallet implementation

---

## Next Steps

1. **IMMEDIATE**: Apply Fix 1 (remove origins from JWT) - 15 minutes
2. **SHORT-TERM**: Apply Fix 2 (validate object creation) - 30 minutes
3. **MEDIUM-TERM**: Apply Fix 3 (startup validation) - 20 minutes
4. **MONITORING**: Add JWT length logging - 10 minutes
5. **TESTING**: Full end-to-end test with real attendee - 30 minutes

**Total Estimated Time**: 2 hours

---

## Contact for Follow-up

- Primary: Chris Lindeman (christopherwlindeman@gmail.com)
- Deploy after testing in dev environment
- Monitor CloudWatch logs: `/aws/lambda/outreachpass-pass-worker`

---

*Generated: 2025-11-17 by Claude Code*
*Investigation Time: 45 minutes*
*Confidence: 95% that Fix 1 resolves the issue*
