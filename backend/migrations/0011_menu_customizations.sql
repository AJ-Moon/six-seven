ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS subcategory varchar(100) DEFAULT '';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS customizations jsonb DEFAULT '[]'::jsonb;

ALTER TABLE cart_lines ADD COLUMN IF NOT EXISTS line_key text DEFAULT '';
ALTER TABLE cart_lines DROP CONSTRAINT IF EXISTS cart_lines_tenant_id_cart_id_menu_item_id_key;

UPDATE cart_lines
SET line_key = menu_item_id::text
WHERE line_key IS NULL OR line_key = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_lines_unique_line_key
    ON cart_lines (tenant_id, cart_id, line_key);
