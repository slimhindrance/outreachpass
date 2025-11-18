-- Migration: Add analytics and tracking tables
-- Created: 2025-11-17
-- Purpose: Comprehensive event tracking for card views, email engagement, wallet passes, and contact exports

-- Email tracking events
CREATE TABLE IF NOT EXISTS email_events (
    email_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID REFERENCES cards(card_id) ON DELETE SET NULL,
    attendee_id UUID REFERENCES attendees(attendee_id) ON DELETE SET NULL,

    -- Email details
    message_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,

    -- Event type: sent, delivered, opened, clicked, bounced, complained
    event_type VARCHAR(50) NOT NULL,

    -- Event metadata
    link_url TEXT,
    user_agent TEXT,
    ip_address INET,

    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Additional context
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for email_events
CREATE INDEX idx_email_events_card ON email_events(card_id, event_type, occurred_at);
CREATE INDEX idx_email_events_event ON email_events(event_id, event_type, occurred_at);
CREATE INDEX idx_email_events_message ON email_events(message_id);
CREATE INDEX idx_email_events_occurred ON email_events(occurred_at DESC);
CREATE INDEX idx_email_events_tenant ON email_events(tenant_id, occurred_at);

COMMENT ON TABLE email_events IS 'Tracks email delivery and engagement events';
COMMENT ON COLUMN email_events.event_type IS 'Event type: sent, delivered, opened, clicked, bounced, complained';
COMMENT ON COLUMN email_events.message_id IS 'AWS SES MessageId for correlation';


-- Wallet pass tracking
CREATE TABLE IF NOT EXISTS wallet_pass_events (
    wallet_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,

    -- Platform details: apple or google
    platform VARCHAR(20) NOT NULL,

    -- Event type: generated, email_clicked, added_to_wallet, removed, updated
    event_type VARCHAR(50) NOT NULL,

    -- Device/user context
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),

    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Additional context
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for wallet_pass_events
CREATE INDEX idx_wallet_events_card ON wallet_pass_events(card_id, platform, event_type, occurred_at);
CREATE INDEX idx_wallet_events_event ON wallet_pass_events(event_id, platform, event_type, occurred_at);
CREATE INDEX idx_wallet_events_occurred ON wallet_pass_events(occurred_at DESC);
CREATE INDEX idx_wallet_events_tenant ON wallet_pass_events(tenant_id, occurred_at);
CREATE INDEX idx_wallet_events_platform ON wallet_pass_events(platform, event_type);

COMMENT ON TABLE wallet_pass_events IS 'Tracks wallet pass generation and adoption';
COMMENT ON COLUMN wallet_pass_events.platform IS 'Wallet platform: apple or google';
COMMENT ON COLUMN wallet_pass_events.event_type IS 'Event type: generated, email_clicked, added_to_wallet, removed, updated';
COMMENT ON COLUMN wallet_pass_events.device_type IS 'Device type: ios, android, web';


-- Card view events (detailed tracking)
CREATE TABLE IF NOT EXISTS card_view_events (
    view_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,

    -- Source tracking: qr_scan, direct_link, email_link, share
    source_type VARCHAR(50) NOT NULL,
    referrer_url TEXT,

    -- Device/user context
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    browser VARCHAR(100),
    os VARCHAR(100),

    -- Session tracking
    session_id TEXT,

    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Additional context
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for card_view_events
CREATE INDEX idx_card_views_card ON card_view_events(card_id, occurred_at);
CREATE INDEX idx_card_views_event ON card_view_events(event_id, occurred_at);
CREATE INDEX idx_card_views_source ON card_view_events(source_type, occurred_at);
CREATE INDEX idx_card_views_occurred ON card_view_events(occurred_at DESC);
CREATE INDEX idx_card_views_tenant ON card_view_events(tenant_id, occurred_at);
CREATE INDEX idx_card_views_session ON card_view_events(session_id) WHERE session_id IS NOT NULL;

COMMENT ON TABLE card_view_events IS 'Tracks individual card views with source and device context';
COMMENT ON COLUMN card_view_events.source_type IS 'Source type: qr_scan, direct_link, email_link, share';
COMMENT ON COLUMN card_view_events.device_type IS 'Device type: mobile, tablet, desktop';
COMMENT ON COLUMN card_view_events.session_id IS 'Session identifier for grouping multiple views';


-- Contact export events
CREATE TABLE IF NOT EXISTS contact_export_events (
    export_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,

    -- Export type: vcard_download, add_to_contacts, copy_email, copy_phone
    export_type VARCHAR(50) NOT NULL,

    -- Device/user context
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),

    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Additional context
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for contact_export_events
CREATE INDEX idx_export_events_card ON contact_export_events(card_id, export_type, occurred_at);
CREATE INDEX idx_export_events_event ON contact_export_events(event_id, export_type, occurred_at);
CREATE INDEX idx_export_events_occurred ON contact_export_events(occurred_at DESC);
CREATE INDEX idx_export_events_tenant ON contact_export_events(tenant_id, occurred_at);
CREATE INDEX idx_export_events_type ON contact_export_events(export_type);

COMMENT ON TABLE contact_export_events IS 'Tracks contact information exports and saves';
COMMENT ON COLUMN contact_export_events.export_type IS 'Export type: vcard_download, add_to_contacts, copy_email, copy_phone';


-- Materialized view for daily aggregations (performance optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_summary AS
SELECT
    DATE(occurred_at) as summary_date,
    tenant_id,
    event_id,
    card_id,
    COUNT(*) FILTER (WHERE source_type = 'qr_scan') as qr_scans,
    COUNT(*) FILTER (WHERE source_type = 'direct_link') as direct_views,
    COUNT(*) FILTER (WHERE source_type = 'email_link') as email_views,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT ip_address) as unique_ips
FROM card_view_events
GROUP BY summary_date, tenant_id, event_id, card_id;

CREATE UNIQUE INDEX idx_analytics_daily_unique
    ON analytics_daily_summary (summary_date, tenant_id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'::uuid), card_id);

COMMENT ON MATERIALIZED VIEW analytics_daily_summary IS 'Daily aggregated analytics for performance optimization';


-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_daily()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_analytics_daily() IS 'Refreshes analytics_daily_summary materialized view (run daily via cron)';


-- Data retention function (optional - for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_analytics(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(deleted_email_events BIGINT, deleted_wallet_events BIGINT, deleted_view_events BIGINT, deleted_export_events BIGINT) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    email_count BIGINT;
    wallet_count BIGINT;
    view_count BIGINT;
    export_count BIGINT;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;

    -- Delete old email events
    DELETE FROM email_events WHERE occurred_at < cutoff_date;
    GET DIAGNOSTICS email_count = ROW_COUNT;

    -- Delete old wallet events
    DELETE FROM wallet_pass_events WHERE occurred_at < cutoff_date;
    GET DIAGNOSTICS wallet_count = ROW_COUNT;

    -- Delete old view events
    DELETE FROM card_view_events WHERE occurred_at < cutoff_date;
    GET DIAGNOSTICS view_count = ROW_COUNT;

    -- Delete old export events
    DELETE FROM contact_export_events WHERE occurred_at < cutoff_date;
    GET DIAGNOSTICS export_count = ROW_COUNT;

    RETURN QUERY SELECT email_count, wallet_count, view_count, export_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_analytics(INTEGER) IS 'Deletes analytics events older than specified days (default 90 for GDPR compliance)';


-- Grant permissions (adjust based on your database user setup)
-- GRANT SELECT, INSERT ON email_events, wallet_pass_events, card_view_events, contact_export_events TO backend_api_user;
-- GRANT SELECT ON analytics_daily_summary TO backend_api_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO backend_api_user;
