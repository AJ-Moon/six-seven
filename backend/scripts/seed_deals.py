#!/usr/bin/env python3
"""Upsert the five fixed-price deals without reseeding the rest of the menu."""
import json

from seed_six_seven import DEAL_MENU, RID, SETTINGS, get_db


def main() -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            for display_order, item in enumerate(DEAL_MENU, start=1):
                cur.execute(
                    "SELECT id FROM menu_items WHERE restaurant_id=%s AND category='Deals' AND name=%s ORDER BY id LIMIT 1",
                    (RID, item["name"]),
                )
                existing = cur.fetchone()
                values = (
                    item["subcategory"], item["description"], item["price_rs"],
                    item["price_rs"] * 100, item["image_slug"],
                    json.dumps(item["customizations"]), display_order,
                )
                if existing:
                    cur.execute(
                        """UPDATE menu_items
                           SET category='Deals', subcategory=%s, description=%s,
                               price=%s, price_cents=%s, image=%s, customizations=%s::jsonb,
                               display_order=%s, sale_price=NULL, sale_price_cents=NULL,
                               currency='PKR', is_available=TRUE, is_featured=TRUE
                           WHERE id=%s AND restaurant_id=%s""",
                        (*values, existing[0], RID),
                    )
                else:
                    cur.execute(
                        """INSERT INTO menu_items
                           (restaurant_id, category, name, subcategory, description,
                            price, price_cents, image, customizations, display_order,
                            currency, is_available, is_featured)
                           VALUES (%s,'Deals',%s,%s,%s,%s,%s,%s,%s::jsonb,%s,'PKR',TRUE,TRUE)""",
                        (RID, item["name"], *values),
                    )

            for key in ("deals_section_title", "deals_section_subtitle"):
                cur.execute(
                    """INSERT INTO settings (restaurant_id, key, value)
                       VALUES (%s,%s,%s)
                       ON CONFLICT (restaurant_id, key)
                       DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()""",
                    (RID, key, SETTINGS[key]),
                )
            cur.execute(
                """INSERT INTO settings (restaurant_id, key, value)
                   VALUES (%s, 'global_discount_excluded_categories', 'Deals, Combo Meal')
                   ON CONFLICT (restaurant_id, key) DO UPDATE
                   SET value = CASE
                       WHEN 'deals' = ANY(
                           regexp_split_to_array(lower(settings.value), '\\s*,\\s*')
                       ) THEN settings.value
                       ELSE concat_ws(', ', nullif(settings.value, ''), 'Deals')
                   END, updated_at = NOW()""",
                (RID,),
            )
    print(f"deals live: {len(DEAL_MENU)}")


if __name__ == "__main__":
    main()
