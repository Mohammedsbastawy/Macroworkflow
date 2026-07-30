-- Enterprise Org Chart, Budgets, Policies & System Settings Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments Collection (Self-Referencing Tree)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Extended Users & Tickets Fields
ALTER TABLE directus_users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE directus_users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE directus_users ADD COLUMN IF NOT EXISTS direct_manager_id VARCHAR(255);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS direct_manager_id VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS budget_checked BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS policy_checked BOOLEAN DEFAULT FALSE;

-- 3. Budgets Collection (Decoupled Financial Module)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL DEFAULT 2026,
    quarter VARCHAR(10) NOT NULL DEFAULT 'Q1',
    allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'EGP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Policies Collection (Pre-submission Limits & Rules)
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    workflow_slug VARCHAR(255),
    max_amount_limit NUMERIC(15, 2),
    error_message_ar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. System Settings Collection (Feature Flags & Decoupled Configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

INSERT INTO system_settings (key, value, description) VALUES
('ENABLE_BUDGET_CHECKS', 'false', 'Enable department budget balance evaluation node')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
('ENABLE_POLICY_CHECKS', 'false', 'Enable pre-submission policy rules evaluation node')
ON CONFLICT (key) DO NOTHING;
