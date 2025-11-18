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
    device_type VARCHAR(20),
    browser VARCHAR(100),
    os VARCHAR(100),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Wallet pass events
CREATE TABLE IF NOT EXISTS wallet_pass_events (
    pass_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,

    -- Platform: apple, google
    platform VARCHAR(20) NOT NULL,

    -- Event type: generated, email_clicked, added_to_wallet, removed_from_wallet
    event_type VARCHAR(50) NOT NULL,

    -- Event metadata
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    browser VARCHAR(100),
    os VARCHAR(100),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Card view events
CREATE TABLE IF NOT EXISTS card_view_events (
    view_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,

    -- Source type: qr_scan, direct_link, email_link, share
    source_type VARCHAR(50) NOT NULL,

    -- Event metadata
    referrer_url TEXT,
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    browser VARCHAR(100),
    os VARCHAR(100),
    session_id TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Contact export events
CREATE TABLE IF NOT EXISTS contact_export_events (
    export_event_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,

    -- Export type: vcard_download, csv_export, api_export
    export_type VARCHAR(50) NOT NULL,

    -- Event metadata
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    browser VARCHAR(100),
    os VARCHAR(100),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for email_events
CREATE INDEX IF NOT EXISTS idx_email_events_tenant ON email_events(tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_events_card ON email_events(card_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_events_event ON email_events(event_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON email_events(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_events_occurred ON email_events(occurred_at DESC);

-- Indexes for wallet_pass_events
CREATE INDEX IF NOT EXISTS idx_wallet_events_tenant ON wallet_pass_events(tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_wallet_events_card ON wallet_pass_events(card_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_wallet_events_event ON wallet_pass_events(event_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_wallet_events_platform ON wallet_pass_events(platform, occurred_at);
CREATE INDEX IF NOT EXISTS idx_wallet_events_type ON wallet_pass_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_wallet_events_occurred ON wallet_pass_events(occurred_at DESC);

-- Indexes for card_view_events
CREATE INDEX IF NOT EXISTS idx_card_views_card ON card_view_events(card_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_views_event ON card_view_events(event_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_views_source ON card_view_events(source_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_views_occurred ON card_view_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_views_tenant ON card_view_events(tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_views_session ON card_view_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_card_views_ip ON card_view_events(ip_address, occurred_at) WHERE ip_address IS NOT NULL;

-- Indexes for contact_export_events
CREATE INDEX IF NOT EXISTS idx_export_events_card ON contact_export_events(card_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_export_events_event ON contact_export_events(event_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_export_events_type ON contact_export_events(export_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_export_events_occurred ON contact_export_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_events_tenant ON contact_export_events(tenant_id, occurred_at);

-- Materialized view for daily aggregations (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_summary AS
SELECT
    tenant_id,
    event_id,
    DATE(occurred_at) as day,
    COUNT(DISTINCT card_id) as unique_cards_viewed,
    COUNT(*) as total_views,
    COUNT(DISTINCT ip_address) as unique_visitors
FROM card_view_events
GROUP BY tenant_id, event_id, DATE(occurred_at);

CREATE INDEX IF NOT EXISTS idx_analytics_summary_tenant ON analytics_daily_summary(tenant_id, day);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_event ON analytics_daily_summary(event_id, day);

-- Function to refresh materialized view (can be called by cron job)
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- GDPR compliance: Function to delete old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM email_events WHERE occurred_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    DELETE FROM wallet_pass_events WHERE occurred_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    DELETE FROM card_view_events WHERE occurred_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    DELETE FROM contact_export_events WHERE occurred_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions (adjust schema/users as needed)
GRANT SELECT, INSERT ON email_events TO PUBLIC;
GRANT SELECT, INSERT ON wallet_pass_events TO PUBLIC;
GRANT SELECT, INSERT ON card_view_events TO PUBLIC;
GRANT SELECT, INSERT ON contact_export_events TO PUBLIC;
GRANT SELECT ON analytics_daily_summary TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE email_events_email_event_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE wallet_pass_events_pass_event_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE card_view_events_view_event_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE contact_export_events_export_event_id_seq TO PUBLIC;
