UPDATE settings
SET value = '15', updated_at = NOW()
WHERE restaurant_id = 1 AND key = 'global_discount_percent' AND value = '20';

UPDATE settings
SET value = replace(value, '20% off', '15% off'), updated_at = NOW()
WHERE restaurant_id = 1 AND key = 'hero_slides' AND value LIKE '%20% off%';

WITH placeholder AS (
    SELECT id
    FROM branches
    WHERE restaurant_id = 1
      AND (lower(name) LIKE '%flavor hub%'
           OR lower(address) LIKE '%new york%'
           OR phone LIKE '%555-01%')
    ORDER BY is_default DESC, id
    LIMIT 1
)
UPDATE branches
SET name = 'Six Seven DHA Phase 4',
    address = '75 CCA, DD Block, DHA Phase 4',
    city = 'Lahore',
    phone = '0324-6756767',
    hours = 'Mon-Thu 12 PM-1:30 AM; Fri 2 PM-2:30 AM; Sat 12 PM-2:30 AM; Sun 5 PM-1:30 AM',
    maps_url = 'https://maps.google.com/?q=31.4641372,74.3822137',
    is_open = TRUE,
    is_default = TRUE
WHERE id IN (SELECT id FROM placeholder);

INSERT INTO branches
    (restaurant_id, name, address, city, phone, hours, maps_url, is_open, is_default)
SELECT 1, 'Six Seven DHA Phase 4', '75 CCA, DD Block, DHA Phase 4',
       'Lahore', '0324-6756767',
       'Mon-Thu 12 PM-1:30 AM; Fri 2 PM-2:30 AM; Sat 12 PM-2:30 AM; Sun 5 PM-1:30 AM',
       'https://maps.google.com/?q=31.4641372,74.3822137', TRUE, TRUE
WHERE EXISTS (SELECT 1 FROM restaurants WHERE id = 1)
  AND NOT EXISTS (SELECT 1 FROM branches WHERE restaurant_id = 1);
