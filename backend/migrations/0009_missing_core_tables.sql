-- Two tables the application code reads and writes but that were never created
-- by any earlier migration or by schema_reference.DDL's fast path:
--
--   points_transactions — routers/orders.py, routers/rewards.py and routers/admin.py
--     all INSERT into it. The admin "mark delivered" path awards loyalty points
--     inside a single transaction, so the missing table aborted the whole status
--     update and no customer ever accumulated points.
--
--   chat_sessions — routers/chatbot.py creates/loads a session on every request,
--     so POST /api/chat failed with a 500 before reaching the model.

CREATE TABLE IF NOT EXISTS points_transactions (
    id            SERIAL PRIMARY KEY,
    user_id       TEXT NOT NULL,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id      VARCHAR(20),
    type          VARCHAR(50) NOT NULL,
    points        INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS points_transactions_user_idx
    ON points_transactions (restaurant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id       TEXT,
    cart          JSONB NOT NULL DEFAULT '[]'::jsonb,
    stage         VARCHAR(50) NOT NULL DEFAULT 'browsing',
    guest_info    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- services/analytics_jobs.py prunes by (restaurant_id, updated_at).
CREATE INDEX IF NOT EXISTS chat_sessions_prune_idx
    ON chat_sessions (restaurant_id, updated_at);
