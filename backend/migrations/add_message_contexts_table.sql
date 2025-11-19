-- Migration: Add message_contexts table for email tracking
-- Created: 2025-11-17
-- Purpose: Replace in-memory message cache with persistent database storage

-- Message context for email tracking correlation
CREATE TABLE IF NOT EXISTS message_contexts (
    message_id VARCHAR(50) PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    attendee_id UUID REFERENCES attendees(attendee_id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,

    -- TTL for cleanup (messages older than 7 days should be deleted)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast lookup by message_id (primary key already indexed)
-- Index for cleanup queries (find expired messages)
CREATE INDEX IF NOT EXISTS idx_message_contexts_expires_at ON message_contexts(expires_at);
