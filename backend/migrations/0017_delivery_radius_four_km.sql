INSERT INTO settings (restaurant_id, key, value)
SELECT id, 'delivery_radius_km', '4'
FROM restaurants
WHERE name = 'Six Seven'
ON CONFLICT (restaurant_id, key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
