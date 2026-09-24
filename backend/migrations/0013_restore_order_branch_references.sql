WITH default_branch AS (
    SELECT id
    FROM branches
    WHERE restaurant_id = 1
    ORDER BY is_default DESC, id
    LIMIT 1
)
UPDATE orders AS orders_to_repair
SET branch_id = default_branch.id
FROM default_branch
WHERE orders_to_repair.restaurant_id = 1
  AND orders_to_repair.branch_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM branches AS existing
      WHERE existing.id = orders_to_repair.branch_id
        AND existing.restaurant_id = orders_to_repair.restaurant_id
  );
