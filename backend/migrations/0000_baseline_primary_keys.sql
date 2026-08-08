-- Baseline integrity fix: core tenant/catalog tables were created without
-- primary key constraints, which blocks foreign keys from Phase 0/1 tables
-- (customers, carts, order_line_items, analytics_events, etc.) referencing them.
-- Safe to apply: ids on these tables are already unique and non-null.
--
-- Guarded per table because a database created fresh from schema_reference.py
-- already declares these primary keys inline. Applying them unconditionally
-- aborted the very first migration on any new deployment with
-- "multiple primary keys for table ... are not allowed".
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['restaurants', 'menu_items', 'branches'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM pg_constraint
               WHERE conrelid = ('public.' || t)::regclass AND contype = 'p'
           )
        THEN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I PRIMARY KEY (id)', t, t || '_pkey');
        END IF;
    END LOOP;
END $$;
