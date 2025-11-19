# Analytics Testing Guide

Complete guide for testing the OutreachPass analytics system including test data generation, unit tests, integration tests, and end-to-end validation.

## Table of Contents
- [Overview](#overview)
- [Test Data Generation](#test-data-generation)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The analytics system tracks four types of events:
1. **Email Events** - Email engagement (sent, delivered, opened, clicked, bounced, complained)
2. **Card View Events** - Digital card views (QR scans, direct links, email links, shares)
3. **Wallet Pass Events** - Wallet pass activity (generated, clicked, added, removed, updated)
4. **Contact Export Events** - Contact information exports (vCard downloads, contact additions)

### Database Tables
- `email_events` - Email engagement tracking
- `card_view_events` - Card view tracking with device/source context
- `wallet_pass_events` - Apple/Google Wallet pass tracking
- `contact_export_events` - Contact export tracking

---

## Test Data Generation

### Prerequisites
- Database access (local PostgreSQL or AWS RDS connection)
- Python 3.11+ with poetry
- Seeded database with at least one tenant, event, and cards

### Running the Test Data Generator

```bash
# Navigate to backend directory
cd backend

# Install dependencies if needed
poetry install
poetry add greenlet  # Required for async SQLAlchemy

# Run the generator
poetry run python ../scripts/generate_analytics_test_data.py
```

### What Gets Generated

The script generates **4,300 total analytics events** with realistic distributions:

| Event Type | Count | Distribution |
|------------|-------|-------------|
| Email Events | 1,000 | Funnel: 100% sent → 95% delivered → 40% opened → 15% clicked |
| Card Views | 2,000 | Sources: 40% QR, 30% direct, 20% email, 10% share |
| Wallet Passes | 500 | Platforms: 50/50 Apple/Google with event funnel |
| Contact Exports | 800 | Types: 60% vCard, 20% add contact, 10% copy email, 10% copy phone |

### Data Characteristics

**Time Distribution:**
- All events distributed across last 30 days
- Random timestamps to simulate organic growth
- Realistic clustering around business hours

**Device Distribution:**
- 60% Mobile devices
- 25% Desktop
- 15% Tablet

**Browsers & OS:**
- Chrome, Safari, Firefox, Edge, Mobile Safari
- iOS, Android, Windows, macOS, Linux
- Realistic user agent strings

### Custom Generation

Modify the script to generate custom data:

```python
# In generate_analytics_test_data.py, modify these calls:
await generator.generate_email_events(1000)        # Adjust count
await generator.generate_card_view_events(2000)    # Adjust count
await generator.generate_wallet_pass_events(500)   # Adjust count
await generator.generate_contact_export_events(800) # Adjust count
```

### Connecting to AWS RDS

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql+asyncpg://user:password@your-rds-endpoint:5432/dbname"

# Or update .env file
DATABASE_URL=postgresql+asyncpg://user:password@your-rds-endpoint:5432/dbname

# Run generator
poetry run python ../scripts/generate_analytics_test_data.py
```

---

## Unit Tests

Unit tests validate individual analytics service methods in isolation.

### Running Unit Tests

```bash
# Run all analytics unit tests
cd backend
poetry run pytest tests/unit/test_analytics_service.py -v

# Run specific test
poetry run pytest tests/unit/test_analytics_service.py::test_track_email_event -v

# Run with coverage
poetry run pytest tests/unit/test_analytics_service.py --cov=app/services/analytics_service --cov-report=html
```

### Test Coverage

Unit tests cover:
- ✅ Event tracking methods (email, card view, wallet, contact export)
- ✅ Analytics query methods (overview, card metrics, event metrics)
- ✅ Data aggregation and filtering
- ✅ Date range handling
- ✅ Tenant isolation
- ✅ Error handling and edge cases

### Test Structure

```python
# Example unit test structure
class TestAnalyticsService:
    async def test_track_email_event(self, db_session, test_tenant):
        """Test email event tracking"""
        event = await AnalyticsService.track_email_event(
            db=db_session,
            tenant_id=test_tenant.tenant_id,
            message_id="test-msg-123",
            recipient_email="test@example.com",
            event_type="opened"
        )
        assert event.event_type == "opened"
        assert event.tenant_id == test_tenant.tenant_id
```

---

## Integration Tests

Integration tests validate API endpoints end-to-end with real database interactions.

### Running Integration Tests

```bash
# Run all analytics integration tests
cd backend
poetry run pytest tests/integration/test_analytics_api.py -v

# Run specific endpoint test
poetry run pytest tests/integration/test_analytics_api.py::test_get_analytics_overview -v

# Run with detailed output
poetry run pytest tests/integration/test_analytics_api.py -v -s
```

### Test Coverage

Integration tests cover:
- ✅ GET /admin/analytics/overview - Analytics overview endpoint
- ✅ GET /admin/analytics/card/{card_id} - Card-specific analytics
- ✅ GET /admin/analytics/event/{event_id} - Event-specific analytics
- ✅ Authentication and authorization
- ✅ Query parameter validation
- ✅ Response format validation
- ✅ Error responses (400, 401, 404, 500)

### API Test Examples

```bash
# Test analytics overview endpoint
curl "http://localhost:8000/api/v1/admin/analytics/overview?tenant_id=YOUR_TENANT_ID&days=30"

# Test with event filter
curl "http://localhost:8000/api/v1/admin/analytics/overview?tenant_id=YOUR_TENANT_ID&event_id=EVENT_ID&days=7"

# Test card analytics
curl "http://localhost:8000/api/v1/admin/analytics/card/CARD_ID?start_date=2024-01-01&end_date=2024-01-31"
```

---

## End-to-End Testing

### Frontend Dashboard Testing

1. **Access Dashboard**
   ```
   http://localhost:3000/admin/analytics
   ```

2. **Verify Components Load:**
   - ✅ Metrics grid shows 4 cards (emails, views, wallet, exports)
   - ✅ Email engagement funnel displays
   - ✅ Pie charts for email events and wallet passes
   - ✅ Bar charts for card view sources
   - ✅ Time-series area charts for trends

3. **Test Interactions:**
   - ✅ Date range selector (7d, 30d, 90d)
   - ✅ Event filter dropdown
   - ✅ Export CSV button
   - ✅ Loading states (skeleton loaders)
   - ✅ Empty states (no data scenarios)
   - ✅ Error states (API failures)

4. **Test Data Scenarios:**
   - ✅ No tenant_id (warning message)
   - ✅ No data available (empty states)
   - ✅ API error (error message with retry)
   - ✅ Loading state (skeleton UI)
   - ✅ Full data (all charts populated)

### Browser Testing Matrix

| Browser | Desktop | Mobile | Tablet | Status |
|---------|---------|--------|--------|--------|
| Chrome | ✅ | ✅ | ✅ | Primary |
| Safari | ✅ | ✅ | ✅ | Primary |
| Firefox | ✅ | ⏸️ | ⏸️ | Secondary |
| Edge | ✅ | ⏸️ | ⏸️ | Secondary |

---

## Performance Testing

### Backend Performance

```bash
# Test analytics query performance
time curl "http://localhost:8000/api/v1/admin/analytics/overview?tenant_id=YOUR_TENANT_ID&days=90"

# Load test with ab (Apache Bench)
ab -n 1000 -c 10 "http://localhost:8000/api/v1/admin/analytics/overview?tenant_id=YOUR_TENANT_ID"
```

### Database Query Optimization

```sql
-- Check query execution plans
EXPLAIN ANALYZE
SELECT COUNT(*) FROM email_events
WHERE tenant_id = 'YOUR_TENANT_ID'
AND occurred_at >= NOW() - INTERVAL '30 days';

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('email_events', 'card_view_events', 'wallet_pass_events', 'contact_export_events');
```

### Expected Performance Metrics

| Metric | Target | Acceptable | Action Required |
|--------|--------|------------|-----------------|
| Overview API | < 200ms | < 500ms | > 1s |
| Card Analytics | < 300ms | < 700ms | > 1.5s |
| Event Analytics | < 300ms | < 700ms | > 1.5s |
| Frontend Load | < 1s | < 2s | > 3s |
| Chart Render | < 500ms | < 1s | > 2s |

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
Error: Connect call failed ('127.0.0.1', 5432)
```
**Solution:** Ensure PostgreSQL is running or check RDS connection string

```bash
# Check local PostgreSQL
pg_isready

# Test RDS connection
psql -h your-rds-endpoint -U username -d dbname
```

**2. No Tenant Found**
```
❌ No tenant found. Please seed the database first.
```
**Solution:** Run database seeding script

```bash
cd backend
poetry run python scripts/seed_database.sh
```

**3. Module Not Found Errors**
```
ModuleNotFoundError: No module named 'sqlalchemy'
```
**Solution:** Install dependencies

```bash
cd backend
poetry install
poetry add greenlet  # If async issues
```

**4. CORS_ORIGINS Parsing Error**
```
error parsing value for field "CORS_ORIGINS"
```
**Solution:** Fix .env format to JSON array

```bash
# Update backend/.env
CORS_ORIGINS=["http://localhost:3000","https://your-domain.com"]
```

**5. Frontend Tenant ID Missing**
```
⚠️ Tenant ID Missing warning displayed
```
**Solution:** Ensure Cognito token includes tenant_id claim

```javascript
// Check token payload in browser console
const session = await fetchAuthSession();
console.log(session.tokens?.idToken?.payload);
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Backend - Enable SQL logging
export LOG_LEVEL=DEBUG
poetry run uvicorn app.main:app --reload --log-level debug

# Frontend - Enable verbose console output
# In browser console:
localStorage.setItem('debug', 'analytics:*')
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Database connectivity
curl http://localhost:8000/api/v1/admin/db/ping

# Analytics data counts
psql -d your_db -c "
SELECT
  (SELECT COUNT(*) FROM email_events) as email_events,
  (SELECT COUNT(*) FROM card_view_events) as card_views,
  (SELECT COUNT(*) FROM wallet_pass_events) as wallet_passes,
  (SELECT COUNT(*) FROM contact_export_events) as exports;
"
```

---

## Testing Checklist

### Pre-Deployment Checklist

- [ ] Unit tests pass (100% coverage for critical paths)
- [ ] Integration tests pass (all endpoints)
- [ ] Test data generated successfully
- [ ] Frontend displays all chart types
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Empty states show helpful messages
- [ ] Date range filtering works
- [ ] Event filtering works
- [ ] CSV export works
- [ ] Mobile responsive (tested on 3+ devices)
- [ ] Cross-browser compatibility (Chrome, Safari minimum)
- [ ] Performance metrics within targets
- [ ] Database indexes optimized
- [ ] API response times < 500ms
- [ ] Frontend load time < 2s

### Post-Deployment Validation

- [ ] CloudWatch metrics show successful requests
- [ ] No error spikes in logs
- [ ] Database connection pool healthy
- [ ] CDN serving frontend assets
- [ ] SSL certificates valid
- [ ] API Gateway throttling configured
- [ ] Lambda cold starts acceptable
- [ ] RDS connection count normal
- [ ] User sessions working correctly
- [ ] Analytics data accumulating

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  test-analytics:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install poetry
          poetry install

      - name: Run unit tests
        run: |
          cd backend
          poetry run pytest tests/unit/test_analytics_service.py -v

      - name: Run integration tests
        run: |
          cd backend
          poetry run pytest tests/integration/test_analytics_api.py -v
```

---

## Additional Resources

- [Analytics Service Code](../backend/app/services/analytics_service.py)
- [Analytics API Endpoints](../backend/app/api/admin.py)
- [Frontend Dashboard](../frontend-outreachpass/app/admin/analytics/page.tsx)
- [Database Models](../backend/app/models/database.py)
- [Test Data Generator](../scripts/generate_analytics_test_data.py)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review CloudWatch logs for error details
3. Check database query performance
4. Verify environment variables are set correctly
5. Contact: christopherwlindeman@gmail.com
