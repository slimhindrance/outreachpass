-- Analytics Table Performance Indexes
-- Run this migration to optimize analytics query performance
-- Expected improvement: 50-70% faster queries on large datasets

-- ============================================================================
-- Email Events Indexes
-- ============================================================================

-- Primary composite index for tenant + time-range queries
CREATE INDEX IF NOT EXISTS idx_email_events_tenant_occurred
ON email_events(tenant_id, occurred_at DESC);

-- Composite index for event type analytics (email funnel queries)
CREATE INDEX IF NOT EXISTS idx_email_events_tenant_event_type
ON email_events(tenant_id, event_type, occurred_at DESC);

-- Index for event-specific queries
CREATE INDEX IF NOT EXISTS idx_email_events_event_id
ON email_events(event_id, occurred_at DESC)
WHERE event_id IS NOT NULL;

-- Index for recipient email lookups
CREATE INDEX IF NOT EXISTS idx_email_events_recipient
ON email_events(recipient_email, occurred_at DESC);

-- Index for message_id lookups (email tracking correlation)
CREATE INDEX IF NOT EXISTS idx_email_events_message_id
ON email_events(message_id, occurred_at DESC);

-- Index for card-specific email funnel analytics
CREATE INDEX IF NOT EXISTS idx_email_events_card_type
ON email_events(card_id, event_type, occurred_at DESC)
WHERE card_id IS NOT NULL;

-- ============================================================================
-- Card View Events Indexes
-- ============================================================================

-- Primary composite index for tenant + time-range queries
CREATE INDEX IF NOT EXISTS idx_card_views_tenant_occurred
ON card_view_events(tenant_id, occurred_at DESC);

-- Composite index for source type analytics
CREATE INDEX IF NOT EXISTS idx_card_views_tenant_source
ON card_view_events(tenant_id, source_type, occurred_at DESC);

-- Composite index for device type analytics
CREATE INDEX IF NOT EXISTS idx_card_views_tenant_device
ON card_view_events(tenant_id, device_type, occurred_at DESC);

-- Index for card-specific queries
CREATE INDEX IF NOT EXISTS idx_card_views_card_id
ON card_view_events(card_id, occurred_at DESC);

-- Index for event-specific queries
CREATE INDEX IF NOT EXISTS idx_card_views_event_id
ON card_view_events(event_id, occurred_at DESC)
WHERE event_id IS NOT NULL;

-- Index for unique visitor analysis (session tracking)
CREATE INDEX IF NOT EXISTS idx_card_views_session
ON card_view_events(session_id, occurred_at DESC)
WHERE session_id IS NOT NULL;

-- ============================================================================
-- Wallet Pass Events Indexes
-- ============================================================================

-- Primary composite index for tenant + time-range queries
CREATE INDEX IF NOT EXISTS idx_wallet_events_tenant_occurred
ON wallet_pass_events(tenant_id, occurred_at DESC);

-- Composite index for platform analytics (Apple vs Google)
CREATE INDEX IF NOT EXISTS idx_wallet_events_tenant_platform
ON wallet_pass_events(tenant_id, platform, occurred_at DESC);

-- Composite index for event type analytics (generated, added, removed)
CREATE INDEX IF NOT EXISTS idx_wallet_events_tenant_event_type
ON wallet_pass_events(tenant_id, event_type, occurred_at DESC);

-- Index for card-specific wallet analytics
CREATE INDEX IF NOT EXISTS idx_wallet_events_card_id
ON wallet_pass_events(card_id, occurred_at DESC);

-- ============================================================================
-- Contact Export Events Indexes
-- ============================================================================

-- Primary composite index for tenant + time-range queries
CREATE INDEX IF NOT EXISTS idx_contact_exports_tenant_occurred
ON contact_export_events(tenant_id, occurred_at DESC);

-- Composite index for export type analytics (vcard, add_to_contacts, copy)
CREATE INDEX IF NOT EXISTS idx_contact_exports_tenant_type
ON contact_export_events(tenant_id, export_type, occurred_at DESC);

-- Index for card-specific export analytics
CREATE INDEX IF NOT EXISTS idx_contact_exports_card_id
ON contact_export_events(card_id, occurred_at DESC);

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- These indexes are optimized for common analytics queries:
--
-- 1. Tenant + Date Range Queries (most common):
--    SELECT * FROM email_events
--    WHERE tenant_id = ? AND occurred_at BETWEEN ? AND ?
--    Uses: idx_email_events_tenant_occurred
--
-- 2. Grouped Analytics (breakdown queries):
--    SELECT event_type, COUNT(*) FROM email_events
--    WHERE tenant_id = ? GROUP BY event_type
--    Uses: idx_email_events_tenant_event_type
--
-- 3. Card/Event Specific Queries:
--    SELECT * FROM card_view_events WHERE card_id = ?
--    Uses: idx_card_views_card_id
--
-- Index Size Estimates (for 1M events):
--   - Basic indexes: ~20-30MB each
--   - Composite indexes: ~40-60MB each
--   - Total overhead: ~500MB for full index set
--
-- Maintenance:
--   - PostgreSQL auto-vacuums will keep indexes optimized
--   - Run ANALYZE after large data imports
--   - Monitor index usage with pg_stat_user_indexes

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check index sizes:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index usage:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as times_used,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check for unused indexes (idx_scan = 0):
-- SELECT
--   schemaname,
--   tablename,
--   indexname
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND idx_scan = 0
-- ORDER BY pg_relation_size(indexrelid) DESC;
