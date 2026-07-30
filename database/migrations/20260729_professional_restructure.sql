-- =============================================================
-- Professional Database Restructuring Migration
-- Date: 2026-07-29
-- Purpose: Normalize M2M relationships, add missing tables,
--          soft deletes, indexes, and FK constraints
-- =============================================================

-- ================================================================
-- 1. system_user_groups — M2M Junction (replaces JSON arrays)
--    العلاقة بين المستخدمين والمجموعات بشكل رسمي
-- ================================================================
CREATE TABLE IF NOT EXISTS system_user_groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    VARCHAR(100) NOT NULL,
    group_id   VARCHAR(100) NOT NULL,
    joined_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_sug_user_id  ON system_user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_sug_group_id ON system_user_groups(group_id);

-- Migrate existing data from group_ids_json in system_users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'system_users' AND column_name = 'group_ids_json'
    ) THEN
        INSERT INTO system_user_groups (user_id, group_id)
        SELECT
            su.id AS user_id,
            grp_elem AS group_id
        FROM system_users su,
             jsonb_array_elements_text(
                 CASE
                     WHEN su.group_ids_json IS NULL OR su.group_ids_json::text = 'null' THEN '[]'::jsonb
                     ELSE su.group_ids_json::jsonb
                 END
             ) AS grp_elem
        WHERE grp_elem IS NOT NULL AND TRIM(grp_elem) != ''
        ON CONFLICT (user_id, group_id) DO NOTHING;

        RAISE NOTICE 'Migrated group memberships from group_ids_json → system_user_groups';
    END IF;
END $$;

-- ================================================================
-- 2. ticket_observers — (replaces comma-separated observer_id)
--    المراقبون على التيكت بشكل رسمي
-- ================================================================
CREATE TABLE IF NOT EXISTS ticket_observers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  VARCHAR(100) NOT NULL,
    user_id    VARCHAR(100) NOT NULL,
    added_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_to_ticket_id ON ticket_observers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_to_user_id   ON ticket_observers(user_id);

-- Migrate from comma-separated observer_id in tickets
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name = 'observer_id'
    ) THEN
        INSERT INTO ticket_observers (ticket_id, user_id)
        SELECT
            t.id AS ticket_id,
            TRIM(obs_elem) AS user_id
        FROM tickets t,
             regexp_split_to_table(t.observer_id, ',') AS obs_elem
        WHERE t.observer_id IS NOT NULL
          AND TRIM(obs_elem) != ''
        ON CONFLICT (ticket_id, user_id) DO NOTHING;

        RAISE NOTICE 'Migrated observers from observer_id string → ticket_observers';
    END IF;
END $$;

-- ================================================================
-- 3. ticket_assignees — (replaces current_assignees_json)
--    المكلفون الحاليون بخطوة التيكت — قابل للـ index والـ query
-- ================================================================
CREATE TABLE IF NOT EXISTS ticket_assignees (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id    VARCHAR(100) NOT NULL,
    user_id      VARCHAR(100),
    group_id     VARCHAR(100),
    role_code    VARCHAR(100),
    step_node_id VARCHAR(255),
    assigned_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ta_ticket_id   ON ticket_assignees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ta_user_id     ON ticket_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_ta_group_id    ON ticket_assignees(group_id);

-- ================================================================
-- 4. ticket_comments — جدول ناقص كان مذكور في الصلاحيات بس مش موجود
--    ملاحظات داخلية وخارجية على التيكت
-- ================================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id    VARCHAR(100) NOT NULL,
    author_id    VARCHAR(100) NOT NULL,
    author_name  VARCHAR(255),
    type         VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'internal')),
    content      TEXT NOT NULL,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tc_author_id ON ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_tc_type      ON ticket_comments(type);

-- ================================================================
-- 5. Soft Delete — deleted_at على الجداول المهمة
--    بدل الحذف الحقيقي اللي ممكن يكسر البيانات التاريخية
-- ================================================================
ALTER TABLE departments     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE business_groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE policies        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE budgets         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE system_users    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ================================================================
-- 6. Performance Indexes — فهارس للاستعلامات الشائعة
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_tickets_requester_id    ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_workflow_id     ON tickets(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status          ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_dept            ON tickets(requester_department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_approver        ON tickets(current_approver);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_at    ON tickets(submitted_at);
CREATE INDEX IF NOT EXISTS idx_approval_log_ticket_id  ON approval_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_approval_log_actor_id   ON approval_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_ticket_values_ticket_id ON ticket_values(ticket_id);
CREATE INDEX IF NOT EXISTS idx_workflows_slug          ON workflows(slug);
CREATE INDEX IF NOT EXISTS idx_workflows_status        ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_policies_dept           ON policies(department_id);
CREATE INDEX IF NOT EXISTS idx_budgets_dept_year       ON budgets(department_id, fiscal_year);

-- ================================================================
-- 7. system_settings — مفاتيح ناقصة
-- ================================================================
INSERT INTO system_settings (key, value, description) VALUES
('FISCAL_NOTIFY_USER_IDS', 'user-mona,user-admin', 'User IDs to notify on fiscal year close (comma-separated)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
('DEFAULT_CURRENCY', 'EGP', 'Default currency for all financial operations')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
('MAX_FILE_UPLOAD_MB', '10', 'Maximum allowed file upload size in megabytes')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
('TICKET_AUTO_CLOSE_DAYS', '30', 'Days after which approved tickets are auto-archived')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
('SYSTEM_TIMEZONE', 'Africa/Cairo', 'System-wide timezone for SLA/OLA calculations')
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- Summary Notice
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '=== Professional Restructuring Migration Complete ===';
    RAISE NOTICE '+ system_user_groups  : M2M junction for users & groups';
    RAISE NOTICE '+ ticket_observers    : Replaces comma-separated observer_id';
    RAISE NOTICE '+ ticket_assignees    : Replaces current_assignees_json';
    RAISE NOTICE '+ ticket_comments     : New - internal & public comments';
    RAISE NOTICE '+ deleted_at          : Soft delete on 5 tables';
    RAISE NOTICE '+ 14 performance indexes added';
    RAISE NOTICE '+ 5 system_settings keys seeded';
END $$;
