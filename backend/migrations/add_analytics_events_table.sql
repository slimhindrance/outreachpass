-- Enhanced Analytics Events Table
-- This migration adds detailed event tracking for analytics dashboard
-- Provides granular insights into pass generation, engagement, and conversions
--
-- Expected Benefits:
--   - Real-time analytics dashboard
--   - Device/OS/browser breakdown
--   - Geographic analytics
--   - Conversion funnel tracking
--   - Time-series analytics

-- ============================================================================
-- Create analytics_events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    -- Primary key
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenant context (required for multi-tenant isolation)
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Event context (optional - some events are tenant-wide)
    event_type_id UUID REFERENCES events(event_id) ON DELETE CASCADE,

    -- Event classification
    event_name VARCHAR(100) NOT NULL,  -- 'card_viewed', 'vcard_downloaded', 'wallet_added', etc.
    category VARCHAR(50) NOT NULL,     -- 'engagement', 'conversion', 'delivery', 'error'

    -- Entity references (all optional - depends on event type)
    card_id UUID REFERENCES cards(card_id) ON DELETE SET NULL,
    attendee_id UUID REFERENCES attendees(attendee_id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

    -- Flexible properties for event-specific data (JSON)
    -- Examples: {"button_clicked": "google_wallet", "error_code": "500"}
    properties JSONB NOT NULL DEFAULT '{}',

    -- Technical/device information
    user_agent TEXT,                   -- Raw user agent string
    device_type VARCHAR(50),           -- 'mobile', 'tablet', 'desktop'
    os VARCHAR(50),                    -- 'iOS 17.1', 'Android 14', 'Windows 11'
    browser VARCHAR(50),               -- 'Chrome 119', 'Safari 17', 'Firefox 120'
    ip_address INET,                   -- For geographic analytics

    -- Geographic information (derived from IP or user-provided)
    country_code VARCHAR(2),           -- ISO 3166-1 alpha-2 (e.g., 'US', 'CA')
    city VARCHAR(100),                 -- City name if available

    -- Timing
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_event_name_not_empty CHECK (LENGTH(event_name) > 0),
    CONSTRAINT check_category_valid CHECK (category IN ('engagement', 'conversion', 'delivery', 'error', 'system'))
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Primary tenant + time-range queries (most common pattern)
-- Supports: "Show me all events for this tenant in the last 7 days"
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_occurred
ON analytics_events(tenant_id, occurred_at DESC);

-- Event-specific queries with time range
-- Supports: "Show me all events for this event in the last 30 days"
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_occurred
ON analytics_events(event_type_id, occurred_at DESC)
WHERE event_type_id IS NOT NULL;

-- Event name breakdown queries
-- Supports: "Show me all 'vcard_downloaded' events grouped by hour"
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_occurred
ON analytics_events(event_name, occurred_at DESC);

-- Category analytics
-- Supports: "Show me all conversion events"
CREATE INDEX IF NOT EXISTS idx_analytics_events_category
ON analytics_events(category, occurred_at DESC);

-- Card-specific analytics
-- Supports: "Show me all events for this specific card"
CREATE INDEX IF NOT EXISTS idx_analytics_events_card
ON analytics_events(card_id, occurred_at DESC)
WHERE card_id IS NOT NULL;

-- Attendee-specific analytics
-- Supports: "Show me all events for this attendee"
CREATE INDEX IF NOT EXISTS idx_analytics_events_attendee
ON analytics_events(attendee_id, occurred_at DESC)
WHERE attendee_id IS NOT NULL;

-- Device type analytics
-- Supports: "Show me breakdown by device type"
CREATE INDEX IF NOT EXISTS idx_analytics_events_device
ON analytics_events(device_type, occurred_at DESC)
WHERE device_type IS NOT NULL;

-- Geographic analytics
-- Supports: "Show me events by country"
CREATE INDEX IF NOT EXISTS idx_analytics_events_country
ON analytics_events(country_code, occurred_at DESC)
WHERE country_code IS NOT NULL;

-- JSONB properties index for flexible querying
-- Supports: GIN index for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties
ON analytics_events USING GIN (properties);

-- ============================================================================
-- Row-Level Security (Optional for future multi-tenant isolation)
-- ============================================================================

-- Enable RLS on analytics_events table
-- ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation (when using RLS)
-- CREATE POLICY analytics_events_tenant_isolation ON analytics_events
--   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- Event Types Reference
-- ============================================================================

-- Common event_name values (for documentation):
--
-- DELIVERY EVENTS:
--   - pass_generated          : Pass generation job completed
--   - email_sent              : Email delivery successful
--   - email_bounced           : Email delivery failed
--
-- ENGAGEMENT EVENTS:
--   - card_viewed             : Digital card page viewed
--   - qr_scanned              : QR code scanned
--   - google_wallet_clicked   : "Add to Google Wallet" button clicked
--   - apple_wallet_clicked    : "Add to Apple Wallet" button clicked
--
-- CONVERSION EVENTS:
--   - vcard_downloaded        : vCard (.vcf) file downloaded
--   - google_wallet_added     : Successfully added to Google Wallet
--   - apple_wallet_added      : Successfully added to Apple Wallet
--   - contact_saved           : User saved contact (tracked via JS)
--
-- ERROR EVENTS:
--   - pass_generation_failed  : Pass generation encountered error
--   - email_failed            : Email sending failed
--   - wallet_api_error        : Wallet API returned error

-- ============================================================================
-- Example Queries
-- ============================================================================

-- Time-series analytics (events per hour for last 24 hours):
-- SELECT
--   DATE_TRUNC('hour', occurred_at) as hour,
--   COUNT(*) as event_count,
--   COUNT(DISTINCT card_id) as unique_cards
-- FROM analytics_events
-- WHERE tenant_id = ?
--   AND occurred_at >= NOW() - INTERVAL '24 hours'
--   AND category = 'conversion'
-- GROUP BY DATE_TRUNC('hour', occurred_at)
-- ORDER BY hour DESC;

-- Device breakdown:
-- SELECT
--   device_type,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
-- FROM analytics_events
-- WHERE tenant_id = ?
--   AND event_type_id = ?
--   AND occurred_at >= NOW() - INTERVAL '7 days'
-- GROUP BY device_type
-- ORDER BY count DESC;

-- Conversion funnel:
-- SELECT
--   event_name,
--   COUNT(DISTINCT card_id) as unique_cards,
--   COUNT(*) as total_events
-- FROM analytics_events
-- WHERE tenant_id = ?
--   AND event_type_id = ?
--   AND event_name IN ('card_viewed', 'vcard_downloaded', 'wallet_added')
--   AND occurred_at >= NOW() - INTERVAL '30 days'
-- GROUP BY event_name
-- ORDER BY
--   CASE event_name
--     WHEN 'card_viewed' THEN 1
--     WHEN 'vcard_downloaded' THEN 2
--     WHEN 'wallet_added' THEN 3
--   END;

-- Geographic distribution:
-- SELECT
--   country_code,
--   COUNT(*) as event_count,
--   COUNT(DISTINCT card_id) as unique_cards
-- FROM analytics_events
-- WHERE tenant_id = ?
--   AND occurred_at >= NOW() - INTERVAL '30 days'
-- GROUP BY country_code
-- ORDER BY event_count DESC
-- LIMIT 10;

-- ============================================================================
-- Performance Expectations
-- ============================================================================

-- Table Size Estimates:
--   - 100K events: ~50-75MB
--   - 1M events: ~500MB-750MB
--   - 10M events: ~5-7GB
--
-- Index Overhead:
--   - ~10 indexes × ~40-60MB each = ~400-600MB for 1M events
--
-- Query Performance Targets:
--   - Tenant + date range: <100ms for 1M events
--   - Aggregation queries: <200ms for 1M events
--   - Device/geo breakdown: <150ms for 1M events
--
-- Retention Policy:
--   - Recommend 90-day retention for GDPR compliance
--   - Use partitioning for >10M events
--   - Archive to S3 for long-term storage

-- ============================================================================
-- Data Retention (90-day policy)
-- ============================================================================

-- Create function to auto-delete old events (optional)
-- Run this as a scheduled job (daily):

-- DELETE FROM analytics_events
-- WHERE occurred_at < NOW() - INTERVAL '90 days'
--   AND category != 'error';  -- Keep error events longer for debugging

-- For better performance with large datasets, use partitioning:
-- CREATE TABLE analytics_events_y2025m01 PARTITION OF analytics_events
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table created successfully:
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_name = 'analytics_events';

-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'analytics_events';

-- Check row count:
-- SELECT COUNT(*) FROM analytics_events;

-- Check table size:
-- SELECT
--   pg_size_pretty(pg_total_relation_size('analytics_events')) as total_size,
--   pg_size_pretty(pg_relation_size('analytics_events')) as table_size,
--   pg_size_pretty(pg_total_relation_size('analytics_events') - pg_relation_size('analytics_events')) as indexes_size;
