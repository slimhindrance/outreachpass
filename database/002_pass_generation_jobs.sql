-- Migration: Add pass generation jobs table for async processing
-- Created: 2025-11-12

CREATE TABLE IF NOT EXISTS pass_generation_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id UUID NOT NULL REFERENCES attendees(attendee_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Job status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status values: pending, processing, completed, failed

    -- Results
    card_id UUID REFERENCES cards(card_id) ON DELETE SET NULL,
    qr_url TEXT,
    wallet_pass_url TEXT,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient querying
CREATE INDEX idx_pass_jobs_status ON pass_generation_jobs(status);
CREATE INDEX idx_pass_jobs_attendee ON pass_generation_jobs(attendee_id);
CREATE INDEX idx_pass_jobs_tenant ON pass_generation_jobs(tenant_id);
CREATE INDEX idx_pass_jobs_created ON pass_generation_jobs(created_at);

-- Index for worker queries (find pending jobs)
CREATE INDEX idx_pass_jobs_pending ON pass_generation_jobs(status, created_at)
WHERE status = 'pending';

COMMENT ON TABLE pass_generation_jobs IS 'Tracks asynchronous pass generation requests';
COMMENT ON COLUMN pass_generation_jobs.status IS 'Job status: pending, processing, completed, failed';
COMMENT ON COLUMN pass_generation_jobs.retry_count IS 'Number of times job has been retried after failure';
