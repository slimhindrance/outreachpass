# OutreachPass Analytics Test Suite

Comprehensive test suite for the OutreachPass analytics tracking and reporting system.

## Test Structure

```
tests/
├── conftest.py                    # Shared fixtures and test configuration
├── unit/                         # Unit tests for services
│   └── test_analytics_service.py # Analytics service unit tests
└── integration/                  # API integration tests
    └── test_analytics_api.py    # Analytics API endpoint tests
```

## Prerequisites

- Python 3.11+
- Poetry dependency manager
- PostgreSQL database (for integration tests)
- Pytest and async test dependencies

## Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies including test packages
poetry install

# Install test-specific dependencies
poetry add --group dev pytest pytest-asyncio pytest-cov httpx
```

## Running Tests

### Run All Tests

```bash
# Run complete test suite
poetry run pytest

# Run with verbose output
poetry run pytest -v

# Run with coverage report
poetry run pytest --cov=app/services/analytics_service --cov-report=html
```

### Run Specific Test Categories

```bash
# Run only unit tests
poetry run pytest tests/unit/

# Run only integration tests
poetry run pytest tests/integration/

# Run specific test file
poetry run pytest tests/unit/test_analytics_service.py

# Run specific test class
poetry run pytest tests/unit/test_analytics_service.py::TestAnalyticsTracking

# Run specific test method
poetry run pytest tests/unit/test_analytics_service.py::TestAnalyticsTracking::test_track_card_view
```

### Run with Markers

```bash
# Run only fast unit tests
poetry run pytest -m unit

# Skip slow tests
poetry run pytest -m "not slow"

# Run auth-related tests only
poetry run pytest -m auth
```

## Test Coverage

### Current Coverage Targets

- **Analytics Service**: 80%+ coverage required
- **API Endpoints**: 80%+ coverage required
- **Critical paths**: 100% coverage recommended

### Generate Coverage Report

```bash
# Generate HTML coverage report
poetry run pytest --cov=app/services/analytics_service --cov-report=html

# Open coverage report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows

# Generate terminal coverage report
poetry run pytest --cov=app/services/analytics_service --cov-report=term-missing
```

## Test Database Setup

### Local PostgreSQL

```bash
# Create test database
createdb outreachpass_test

# Update conftest.py with your connection string
TEST_DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/outreachpass_test"

# Run tests
poetry run pytest
```

### Docker PostgreSQL

```bash
# Start test database with Docker
docker run -d \
  --name outreachpass-test-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=outreachpass_test \
  -p 5433:5432 \
  postgres:15

# Update connection string in conftest.py
TEST_DATABASE_URL = "postgresql+asyncpg://testuser:testpass@localhost:5433/outreachpass_test"

# Run tests
poetry run pytest

# Clean up when done
docker stop outreachpass-test-db
docker rm outreachpass-test-db
```

## Test Organization

### Unit Tests (`tests/unit/test_analytics_service.py`)

**TestAnalyticsTracking:**
- ✅ `test_track_card_view` - Card view event tracking
- ✅ `test_track_card_view_sources` - Different view sources
- ✅ `test_track_email_event` - Email event tracking
- ✅ `test_track_email_funnel` - Email engagement funnel
- ✅ `test_track_wallet_event` - Wallet pass tracking
- ✅ `test_track_wallet_platforms` - Apple & Google platforms
- ✅ `test_track_contact_export` - Contact export tracking
- ✅ `test_track_export_types` - Different export types

**TestAnalyticsQueries:**
- ✅ `test_get_overview_empty` - Empty analytics overview
- ✅ `test_get_overview_with_data` - Overview with data
- ✅ `test_get_overview_event_filter` - Event filtering
- ✅ `test_get_card_metrics` - Card-specific analytics
- ✅ `test_get_event_metrics` - Event-specific analytics
- ✅ `test_get_event_metrics_not_found` - Error handling

**TestAnalyticsEdgeCases:**
- ✅ `test_track_email_without_request` - No request context
- ✅ `test_track_wallet_without_request` - No request context
- ✅ `test_user_agent_parsing` - Device detection logic
- ✅ `test_tenant_isolation` - Multi-tenant data isolation

### Integration Tests (`tests/integration/test_analytics_api.py`)

**TestAnalyticsOverviewAPI:**
- ✅ `test_get_overview_success` - Successful overview retrieval
- ✅ `test_get_overview_missing_tenant_id` - Missing parameters
- ✅ `test_get_overview_invalid_tenant_id` - Invalid UUID
- ✅ `test_get_overview_with_date_filters` - Date filtering
- ✅ `test_get_overview_error_handling` - Error responses

**TestCardAnalyticsAPI:**
- ✅ `test_get_card_analytics_success` - Card analytics retrieval
- ✅ `test_get_card_analytics_invalid_card_id` - Validation
- ✅ `test_get_card_analytics_not_found` - 404 handling
- ✅ `test_get_card_analytics_with_date_range` - Date filters

**TestEventAnalyticsAPI:**
- ✅ `test_get_event_analytics_success` - Event analytics retrieval
- ✅ `test_get_event_analytics_invalid_event_id` - Validation
- ✅ `test_get_event_analytics_not_found` - Error handling
- ✅ `test_get_event_analytics_with_date_range` - Date filters

**TestAnalyticsAPIValidation:**
- ✅ `test_malformed_date_format` - Date validation
- ✅ `test_date_range_validation` - Range validation
- ✅ `test_sql_injection_prevention` - Security testing
- ✅ `test_concurrent_requests` - Concurrency handling

**TestAnalyticsAPIPerformance:**
- ✅ `test_large_dataset_query` - Performance with 100+ events
- ✅ `test_response_caching_headers` - Caching strategy
- ✅ `test_pagination_support` - Pagination handling

**TestAnalyticsAPIAuth:**
- ⏸️ `test_unauthorized_access` - 401 responses (requires auth)
- ⏸️ `test_forbidden_cross_tenant_access` - 403 responses (requires auth)
- ⏸️ `test_role_based_access` - Role permissions (requires auth)

**TestAnalyticsAPIIntegration:**
- ✅ `test_full_analytics_workflow` - End-to-end workflow
- ✅ `test_multi_tenant_isolation` - Tenant data isolation
- ✅ `test_analytics_data_consistency` - Data consistency

## Fixtures

### Database Fixtures
- `test_engine` - Test database engine (session scope)
- `db_session` - Database session (function scope)

### Entity Fixtures
- `test_tenant` - Test tenant
- `test_brand` - Test brand
- `test_event` - Test event
- `test_attendee` - Test attendee
- `test_card` - Test card

### Utility Fixtures
- `test_client` - FastAPI test client
- `sample_request_context` - Mock HTTP request

## Continuous Integration

### GitHub Actions Example

```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: outreachpass_test
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
          poetry run pytest tests/unit/ -v

      - name: Run integration tests
        run: |
          cd backend
          poetry run pytest tests/integration/ -v

      - name: Generate coverage report
        run: |
          cd backend
          poetry run pytest --cov=app --cov-report=xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql postgresql://user:password@localhost:5432/outreachpass_test

# Reset test database
dropdb outreachpass_test
createdb outreachpass_test
```

### Import Errors

```bash
# Ensure backend directory is in Python path
export PYTHONPATH="${PYTHONPATH}:/path/to/backend"

# Or run from backend directory
cd backend
poetry run pytest
```

### Async Test Issues

```bash
# Install/update async dependencies
poetry add --group dev pytest-asyncio

# Check pytest-asyncio is configured
# Ensure pytest.ini has: asyncio_mode = auto
```

### Coverage Not Working

```bash
# Install coverage dependencies
poetry add --group dev pytest-cov

# Run with explicit coverage flags
poetry run pytest --cov=app/services/analytics_service --cov-report=term
```

## Best Practices

### Writing New Tests

1. **Use descriptive names**: `test_track_email_event_with_click_tracking`
2. **One assertion per concept**: Test one thing at a time
3. **Use fixtures**: Reuse test data via fixtures
4. **Async where needed**: Use `@pytest.mark.asyncio` for async tests
5. **Clean up**: Tests should not leave persistent state

### Test Data

- Use unique identifiers (UUIDs) to avoid collisions
- Create minimal data needed for each test
- Use realistic but non-sensitive test data
- Clean up test data in fixtures (rollback transactions)

### Performance

- Keep unit tests fast (< 100ms each)
- Use mocks for external dependencies
- Parallelize tests when possible
- Profile slow tests: `pytest --durations=10`

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest-Asyncio](https://pytest-asyncio.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Async Testing](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)

## Support

For issues or questions:
- Review troubleshooting section above
- Check test output for detailed error messages
- Consult main testing guide: `/docs/ANALYTICS_TESTING_GUIDE.md`
- Contact: christopherwlindeman@gmail.com
