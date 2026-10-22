INSERT INTO settings (restaurant_id, key, value)
SELECT id, 'delivery_radius_km', '3'
FROM restaurants
WHERE name = 'Six Seven'
ON CONFLICT (restaurant_id, key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

UPDATE menu_items AS item
SET customizations = (
    SELECT jsonb_agg(
        CASE WHEN entry.value->>'id' = 'meal'
            THEN jsonb_set(
                entry.value,
                '{options,0,description}',
                to_jsonb('Choose your fries and signature drink below.'::text),
                true
            )
            ELSE entry.value
        END
        ORDER BY entry.ordinality
    )
    FROM jsonb_array_elements(item.customizations) WITH ORDINALITY AS entry(value, ordinality)
) || '[{
    "id": "meal-drink",
    "name": "Signature drink",
    "required": true,
    "minSelections": 1,
    "maxSelections": 1,
    "allowRepeats": false,
    "dependsOn": {"groupId": "meal", "optionId": "make-meal"},
    "options": [
        {"id": "peach-breeze", "name": "Peach Breeze", "priceDeltaCents": 0},
        {"id": "strawberry-rush", "name": "Strawberry Rush", "priceDeltaCents": 0},
        {"id": "mango-burst", "name": "Mango Burst", "priceDeltaCents": 0},
        {"id": "berry-cola", "name": "Berry Cola", "priceDeltaCents": 0}
    ]
}]'::jsonb
WHERE item.restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Six Seven')
  AND item.customizations @> '[{"id": "meal"}]'::jsonb
  AND NOT item.customizations @> '[{"id": "meal-drink"}]'::jsonb;
