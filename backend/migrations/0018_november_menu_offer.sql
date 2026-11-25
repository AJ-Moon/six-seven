INSERT INTO settings (restaurant_id, key, value)
SELECT r.id, offer.key, offer.value
FROM restaurants r
CROSS JOIN (VALUES
    ('global_discount_percent', '20'),
    ('global_discount_ends_at', '2026-11-29T00:00:00+05:00')
) AS offer(key, value)
WHERE r.id = 1
ON CONFLICT (restaurant_id, key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

UPDATE settings
SET value = replace(value, 'The extra 15% menu discount does not apply.', 'Menu-wide discounts do not apply.'),
    updated_at = NOW()
WHERE restaurant_id = 1 AND key = 'deals_section_subtitle' AND value LIKE '%15% menu discount%';

UPDATE settings
SET value = replace(value, 'Australian beef burgers with 15% off on website and dine-in.',
                    'Australian beef, stacked fresh to order.'),
    updated_at = NOW()
WHERE restaurant_id = 1 AND key = 'hero_slides' AND value LIKE '%15% off%';

UPDATE menu_items
SET description = replace(description, 'Fixed deal price; no additional 15% discount.',
                          'Fixed deal price; menu-wide discounts do not apply.')
WHERE restaurant_id = 1 AND category = 'Deals' AND description LIKE '%additional 15% discount%';
