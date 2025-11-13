-- OutreachPass Initial Schema Migration
-- Aurora PostgreSQL Serverless v2 / PostgreSQL 14+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Tenants & Brands
CREATE TABLE tenants (
  tenant_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  brand_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  brand_key        TEXT NOT NULL,             -- 'OUTREACHPASS' | 'GOVSAFE' | 'CAMPUSCARD'
  display_name     TEXT NOT NULL,
  domain           TEXT NOT NULL,             -- outreachpass.com
  theme_json       JSONB NOT NULL DEFAULT '{}',
  features_json    JSONB NOT NULL DEFAULT '{}', -- feature toggles
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, brand_key)
);

-- Users (organizers/admins/staff)
CREATE TABLE users (
  user_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email            CITEXT NOT NULL,
  full_name        TEXT,
  role             TEXT NOT NULL,            -- 'OWNER','ADMIN','STAFF'
  cognito_sub      TEXT UNIQUE,              -- mapping to Cognito user
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Events
CREATE TABLE events (
  event_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  brand_id         UUID NOT NULL REFERENCES brands(brand_id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,           -- for URLs: /e/{slug}
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  timezone         TEXT NOT NULL DEFAULT 'UTC',
  status           TEXT NOT NULL DEFAULT 'draft',  -- 'draft','active','closed','archived'
  settings_json    JSONB NOT NULL DEFAULT '{}',    -- e.g., scans_visible, lead_fields
  created_by       UUID REFERENCES users(user_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Attendees
CREATE TABLE attendees (
  attendee_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id         UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email            CITEXT,
  phone            TEXT,
  first_name       TEXT,
  last_name        TEXT,
  org_name         TEXT,
  title            TEXT,
  linkedin_url     TEXT,
  card_id          UUID,                     -- FK to cards after issuance
  flags_json       JSONB NOT NULL DEFAULT '{}',  -- e.g., VIP, speaker, exhibitor_rep
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cards (contact cards)
CREATE TABLE cards (
  card_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  owner_attendee_id UUID REFERENCES attendees(attendee_id) ON DELETE SET NULL,
  owner_user_id     UUID REFERENCES users(user_id) ON DELETE SET NULL,
  display_name     TEXT NOT NULL,
  email            CITEXT,
  phone            TEXT,
  org_name         TEXT,
  title            TEXT,
  avatar_s3_key    TEXT,                    -- S3 key for profile image
  links_json       JSONB NOT NULL DEFAULT '{}',  -- { linkedin, website, calendly, scholar }
  vcard_rev        INTEGER NOT NULL DEFAULT 1,    -- increment on change
  is_personal      BOOLEAN NOT NULL DEFAULT TRUE, -- true=card follows user; false=event-temporary
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from attendees to cards
ALTER TABLE attendees ADD CONSTRAINT fk_attendees_card
  FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE SET NULL;

-- Wallet passes
CREATE TABLE wallet_passes (
  wallet_pass_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id          UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
  event_id         UUID REFERENCES events(event_id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,            -- 'APPLE' | 'GOOGLE'
  pass_serial      TEXT UNIQUE,              -- for updates
  status           TEXT NOT NULL DEFAULT 'active',
  last_issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- QR codes
CREATE TABLE qr_codes (
  qr_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  event_id         UUID REFERENCES events(event_id) ON DELETE CASCADE,
  card_id          UUID NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
  url              TEXT NOT NULL,            -- encoded URL
  s3_key_png       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scans (daily aggregated counts)
CREATE TABLE scans_daily (
  day              DATE NOT NULL,
  tenant_id        UUID NOT NULL,
  event_id         UUID,
  card_id          UUID,
  scan_count       INTEGER NOT NULL DEFAULT 0,
  vcard_downloads  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, tenant_id, event_id, card_id)
);

-- Exhibitors
CREATE TABLE exhibitors (
  exhibitor_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id         UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  booth            TEXT,
  contact_user_id  UUID REFERENCES users(user_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exhibitor leads
CREATE TABLE exhibitor_leads (
  lead_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exhibitor_id     UUID NOT NULL REFERENCES exhibitors(exhibitor_id) ON DELETE CASCADE,
  event_id         UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  captured_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_json        JSONB NOT NULL           -- {name,email,phone,notes,tags}
);

-- Feature flags
CREATE TABLE feature_flags (
  flag_key         TEXT NOT NULL,
  tenant_id        UUID NOT NULL,
  brand_id         UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
  is_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  variant_json     JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (flag_key, tenant_id, brand_id)
);

-- Audit log
CREATE TABLE audit_log (
  audit_id         BIGSERIAL PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  actor_user_id    UUID,
  actor_kind       TEXT NOT NULL, -- 'SYSTEM','USER','ATTENDEE'
  action           TEXT NOT NULL, -- 'CREATE_EVENT','ISSUE_PASS', etc.
  target_type      TEXT,
  target_id        TEXT,
  meta_json        JSONB NOT NULL DEFAULT '{}',
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_brand ON events(brand_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_attendees_event ON attendees(event_id);
CREATE INDEX idx_attendees_tenant ON attendees(tenant_id);
CREATE INDEX idx_attendees_email ON attendees(email);
CREATE INDEX idx_cards_owner_attendee ON cards(owner_attendee_id);
CREATE INDEX idx_cards_owner_user ON cards(owner_user_id);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_scans_daily_rollup ON scans_daily(tenant_id, event_id, day);
CREATE INDEX idx_exhibitors_event ON exhibitors(event_id);
CREATE INDEX idx_exhibitor_leads_exhibitor ON exhibitor_leads(exhibitor_id);
CREATE INDEX idx_exhibitor_leads_event ON exhibitor_leads(event_id);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON attendees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
