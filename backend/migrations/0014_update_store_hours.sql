INSERT INTO settings (restaurant_id, key, value)
SELECT 1, hours.key, hours.value
FROM (VALUES
    ('hours', 'Mon-Thu: 12 PM-1 AM next day; Fri-Sun: 5 PM-2 AM next day (Pakistan time)'),
    ('contact_hours_note', 'Mon-Thu: 12 PM-1 AM next day; Fri-Sun: 5 PM-2 AM next day (Pakistan time)'),
    ('closed_message', 'We''re closed right now. Online ordering opens Mon-Thu at 12 PM and Fri-Sun at 5 PM (Pakistan time).')
) AS hours(key, value)
WHERE EXISTS (SELECT 1 FROM restaurants WHERE id = 1)
ON CONFLICT (restaurant_id, key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

UPDATE branches
SET hours = 'Mon-Thu: 12 PM-1 AM next day; Fri-Sun: 5 PM-2 AM next day (Pakistan time)'
WHERE restaurant_id = 1 AND is_default = TRUE;
