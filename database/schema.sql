-- =====================================================
-- RescueNet AI — PostgreSQL Database Schema
-- Run against: Supabase or local PostgreSQL
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  role          TEXT DEFAULT 'operator',  -- operator | commander | admin
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INCIDENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  type            TEXT NOT NULL,  -- flood | earthquake | fire | industrial | landslide | cyclone | other
  description     TEXT,
  location        TEXT NOT NULL,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  severity        INTEGER CHECK (severity BETWEEN 1 AND 5),
  status          TEXT DEFAULT 'reported',  -- reported | active | resolved | closed
  reported_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HOSPITALS
-- =====================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  total_beds      INTEGER DEFAULT 0,
  available_beds  INTEGER DEFAULT 0,
  icu_beds        INTEGER DEFAULT 0,
  specializations TEXT[],
  contact_phone   TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RESOURCES
-- =====================================================
CREATE TABLE IF NOT EXISTS resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,  -- ambulance | helicopter | rescue_team | fire_truck | water_rescue | medical_unit
  quantity        INTEGER DEFAULT 0,
  available       INTEGER DEFAULT 0,
  location        TEXT,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  status          TEXT DEFAULT 'available',  -- available | deployed | maintenance
  assigned_to     UUID REFERENCES incidents(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RESCUE REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS rescue_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       UUID REFERENCES incidents(id) NOT NULL,
  priority          TEXT,  -- P1 | P2 | P3 | P4 | P5
  survivor_estimate INTEGER,
  rescue_plan       JSONB,
  status            TEXT DEFAULT 'pending',  -- pending | dispatched | completed | cancelled
  dispatched_at     TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AGENT DECISIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID REFERENCES incidents(id),
  agent_name      TEXT NOT NULL,
  task_name       TEXT,
  input_data      JSONB,
  output_data     JSONB,
  duration_ms     INTEGER,
  status          TEXT DEFAULT 'success',  -- success | error | mock
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ALERT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID REFERENCES incidents(id),
  channel         TEXT,  -- sms | voice | dashboard | email
  recipient       TEXT,
  message         TEXT,
  status          TEXT DEFAULT 'sent',  -- sent | failed | pending
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISASTER RISK FORECASTS
-- =====================================================
CREATE TABLE IF NOT EXISTS disaster_risk_forecasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID REFERENCES incidents(id),
  risk_type       TEXT,  -- aftershock | flood_escalation | fire_spread | landslide
  risk_score      NUMERIC(4, 2),  -- 0.00 to 1.00
  confidence      NUMERIC(4, 2),
  forecast_window TEXT,  -- next_1h | next_6h | next_24h
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HISTORICAL DISASTERS
-- =====================================================
CREATE TABLE IF NOT EXISTS historical_disasters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  type            TEXT,
  location        TEXT,
  country         TEXT,
  year            INTEGER,
  casualties      INTEGER,
  survivors       INTEGER,
  magnitude       NUMERIC(4, 1),
  description     TEXT,
  source          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_incident ON rescue_requests(incident_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_incident ON agent_decisions(incident_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_incident ON alert_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_historical_disasters_type ON historical_disasters(type);
CREATE INDEX IF NOT EXISTS idx_historical_disasters_country ON historical_disasters(country);
