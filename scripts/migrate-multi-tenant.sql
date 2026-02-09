-- Multi-Tenant Calling Agent Platform - Database Migration
-- Run this script to set up the multi-tenant schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
  phone_number VARCHAR(20) UNIQUE,     -- Twilio number routes here
  greeting TEXT DEFAULT 'Hello, thank you for calling. How may I assist you today?',
  fallback_message TEXT DEFAULT 'I apologize, but I am unable to help with that request. Would you like to speak with a human representative?',
  timezone VARCHAR(50) DEFAULT 'UTC',
  business_hours JSONB DEFAULT '{"weekdays": {"open": "09:00", "close": "17:00"}, "weekend": {"open": "10:00", "close": "14:00"}}',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  content_type VARCHAR(50) NOT NULL,  -- pdf, txt, json, docx, md
  file_size INTEGER,
  chunk_count INTEGER DEFAULT 0,       -- Number of chunks in Pinecone
  pinecone_namespace VARCHAR(255),     -- company_{id} for vector isolation
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, indexed, failed
  error_message TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  indexed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_knowledge_docs_company ON knowledge_documents(company_id);
CREATE INDEX idx_knowledge_docs_status ON knowledge_documents(status);

-- ============================================
-- COMPANY SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  pricing TEXT,
  duration_minutes INTEGER,
  is_bookable BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_company ON company_services(company_id);

-- ============================================
-- UNIFIED INTERACTIONS TABLE
-- Replaces separate booking/complaint/feedback tables
-- ============================================
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'booking', 'complaint', 'feedback', 'inquiry'
  status VARCHAR(50) DEFAULT 'new',  -- new, in_progress, resolved, cancelled
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  service_id UUID REFERENCES company_services(id),
  data JSONB DEFAULT '{}',  -- Flexible schema for type-specific fields
  summary TEXT,
  transcript TEXT,
  sentiment VARCHAR(20),  -- positive, neutral, negative
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interactions_company ON interactions(company_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_phone ON interactions(customer_phone);
CREATE INDEX idx_interactions_created ON interactions(created_at DESC);

-- ============================================
-- CALL LOGS TABLE
-- Track all incoming calls
-- ============================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  twilio_call_sid VARCHAR(50) UNIQUE,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  direction VARCHAR(20) DEFAULT 'inbound',
  status VARCHAR(50),  -- completed, no-answer, busy, failed
  duration_seconds INTEGER,
  interaction_id UUID REFERENCES interactions(id),
  transcript TEXT,
  audio_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_call_logs_company ON call_logs(company_id);
CREATE INDEX idx_call_logs_started ON call_logs(started_at DESC);

-- ============================================
-- API KEYS TABLE
-- For company API access
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,  -- bcrypt hash of the API key
  name VARCHAR(100),
  permissions JSONB DEFAULT '["read"]',  -- read, write, admin
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_company ON api_keys(company_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that need auto-update
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_interactions_updated_at ON interactions;
CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- INSERT INTO companies (name, slug, phone_number, greeting, contact_email)
-- VALUES (
--   'Demo Company',
--   'demo',
--   '+1234567890',
--   'Hello and thank you for calling Demo Company! How may I assist you today?',
--   'support@demo.com'
-- );
