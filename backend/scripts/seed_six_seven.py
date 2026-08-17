#!/usr/bin/env python3
"""Load the real Six Seven Cafe menu, branding and store settings.

Transcribed from the printed menu (Menu images/Menu.png). Prices are Pakistani
Rupees, stored as price_cents = rupees * 100 so the existing money helpers keep
working unchanged. Re-running this is safe: menu rows are matched on
(restaurant_id, name) and updated in place.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from db import get_db  # noqa: E402

RID = int(os.getenv("DEFAULT_RESTAURANT_ID", "1"))
IMG = "/static/uploads"

# (category, name, price_rs, description, image_slug, popular, featured)
MENU = [
    # ── Coffee ───────────────────────────────────────────────────────────────
    ("Coffee", "Espresso", 300, "A bold, full-bodied double shot pulled fresh to order.", "espresso", False, False),
    ("Coffee", "Americano", 450, "Hot or iced. Espresso lengthened with hot water for a clean, smooth finish.", "americano", True, False),
    ("Coffee", "Latte", 550, "Hot or iced. Silky steamed milk over a rich espresso base.", "latte", True, True),
    ("Coffee", "Cappuccino", 550, "Hot or iced. Equal parts espresso, steamed milk and airy foam.", "latte", True, False),
    ("Coffee", "Spanish Latte", 650, "Hot or iced. Sweetened condensed milk gives this latte its creamy depth.", "latte", True, True),
    ("Coffee", "Vanilla Latte", 650, "Hot or iced. Smooth vanilla stirred through espresso and steamed milk.", "latte", False, False),
    ("Coffee", "Caramel Latte", 650, "Hot or iced. Buttery caramel and espresso, finished with milk.", "latte", True, False),
    ("Coffee", "Tiramisu Latte", 650, "Hot or iced. Cocoa and mascarpone notes for a dessert-style coffee.", "latte", False, False),
    ("Coffee", "Popcorn Latte", 650, "Hot or iced. Our playful buttered-popcorn twist on a classic latte.", "latte", False, True),
    ("Coffee", "Mocha", 650, "Hot or iced. Chocolate and espresso, the way it should be.", "mocha-frappe", True, False),
    ("Coffee", "Pistachio Latte", 750, "Hot or iced. Roasted pistachio blended into a velvety latte.", "latte", True, True),

    # ── Frappes ──────────────────────────────────────────────────────────────
    ("Frappes", "Vanilla Frappe", 800, "Blended ice, milk and vanilla, topped with fresh cream.", "caramel-frappe", False, False),
    ("Frappes", "Caramel Frappe", 800, "Blended caramel and coffee, crowned with cream and a caramel drizzle.", "caramel-frappe", True, True),
    ("Frappes", "Mocha Frappe", 800, "Chocolate and coffee blended smooth, topped with cream.", "mocha-frappe", True, False),
    ("Frappes", "Pistachio Frappe", 900, "Our richest frappe — real pistachio, blended and topped with cream.", "pistachio-frappe", True, True),

    # ── Food & Snacks ────────────────────────────────────────────────────────
    ("Food & Snacks", "Big 67 Burger", 700, "Our signature oversized zinger burger, filled with lettuce and a sauce of your choice.", "big-67-burger", True, True),
    ("Food & Snacks", "Mighty Wrap", 700, "Our 12 inch wrap gets as mighty as one can, filled with lettuce and a sauce of your choice.", "mighty-wrap", True, True),
    ("Food & Snacks", "Chicken Strips", 700, "4 chicken strips served with two sauces of your choice.", "chicken-strips", True, False),
    ("Food & Snacks", "Loaded Fries", 600, "Crispy fries loaded with sauces, jalapenos & cheese.", "loaded-fries", True, True),
    ("Food & Snacks", "Cheese Balls", 500, "4 golden cheese balls, crispy & warm.", "cheese-balls", False, False),

    # ── Combo ────────────────────────────────────────────────────────────────
    ("Combo Meal", "The 67 Combo", 1250, "Burger or wrap along with our crispy fries and a refreshing signature drink.", "combo-meal", True, True),

    # ── Iced Teas ────────────────────────────────────────────────────────────
    ("Iced Teas", "Peach Iced Tea", 400, "Brewed tea over ice with sweet peach.", "peach-iced-tea", True, False),
    ("Iced Teas", "Strawberry Iced Tea", 400, "Brewed tea over ice with ripe strawberry.", "strawberry-iced-tea", False, False),
    ("Iced Teas", "Passion Fruit Iced Tea", 400, "Brewed tea over ice with tangy passion fruit.", "passion-fruit-iced-tea", False, False),

    # ── Signature Drinks ─────────────────────────────────────────────────────
    ("Signature Drinks", "Peach Breeze", 550, "Peach, citrus and soda over crushed ice — light and refreshing.", "peach-breeze", True, True),
    ("Signature Drinks", "Strawberry Rush", 550, "Strawberry and soda layered over ice for a sweet-tart lift.", "strawberry-rush", True, False),
    ("Signature Drinks", "Mango Burst", 550, "Alphonso-style mango, shaken and poured over ice.", "mango-burst", True, True),
    ("Signature Drinks", "Berry Cola", 550, "Mixed berries stirred into chilled cola with fresh lemon.", "berry-cola", False, False),

    # ── Smoothies ────────────────────────────────────────────────────────────
    ("Smoothies", "Blackberry Smoothie", 700, "Thick-blended blackberry — fruit forward and creamy.", "blackberry-smoothie", False, False),
    ("Smoothies", "Strawberry Smoothie", 700, "Thick-blended strawberry — sweet, smooth and cold.", "strawberry-smoothie", True, False),
    ("Smoothies", "Mango Smoothie", 700, "Thick-blended mango — our sunniest drink on the menu.", "mango-smoothie", True, True),

    # ── Desserts ─────────────────────────────────────────────────────────────
    ("Desserts", "Chocolatey Mini Pancakes", 500, "Warm mini pancakes drowned in melted chocolate.", "chocolatey-mini-pancakes", True, False),
    ("Desserts", "Oreo Mini Pancakes", 550, "Mini pancakes with chocolate and crushed Oreo.", "oreo-mini-pancakes", True, True),
    ("Desserts", "Kitkat Mini Pancakes", 650, "Mini pancakes loaded with chocolate and Kitkat chunks.", "kitkat-mini-pancakes", True, True),
    ("Desserts", "Chocolatey Waffles", 500, "A warm Belgian-style waffle under a blanket of chocolate.", "chocolatey-waffles", False, False),
    ("Desserts", "Oreo Waffles", 550, "Chocolate waffle finished with crushed Oreo.", "oreo-waffles", True, False),
    ("Desserts", "Kitkat Waffles", 650, "Chocolate waffle piled with Kitkat chunks.", "kitkat-waffles", True, True),

    # ── Add Ons ──────────────────────────────────────────────────────────────
    ("Add Ons", "Sauce Dip", 67, "Chipotle, Atomic, Garlic Mayo or our Signature Mixed Hot Sauce.", None, False, False),
    ("Add Ons", "Extra Cheese", 67, "An extra helping of melted cheese.", None, False, False),
    ("Add Ons", "Cheese Slice", 67, "One slice of cheese.", None, False, False),
    ("Add Ons", "Water", 100, "Chilled bottled water.", None, False, False),
    ("Add Ons", "Ice Cream Scoop", 100, "A scoop of vanilla ice cream for your dessert.", None, False, False),
]

SETTINGS = {
    "phone": "0324-6756767",
    "email": "contact@sixseven.pk",
    "address": "75 CCA, DD Block, DHA Phase 4, Lahore",
    "hours": "Mon-Thu: 12 PM-1:30 AM; Fri: 2 PM-2:30 AM; Sat: 12 PM-2:30 AM; Sun: 5 PM-1:30 AM",
    "whatsapp": "923246756767",
    "instagram_url": "https://instagram.com/six7coffee",
    "facebook_url": "https://facebook.com/six7coffee",
    "brand_name": "Six Seven",
    "tagline": "Good Food. Good Coffee. Good Mood.",
    "currency": "PKR",
    "currency_symbol": "Rs.",
    "delivery_charge": "150",
    "min_order_amount": "500",
    "restaurant_open": "true",
    "delivery_radius_km": "5",
    "restaurant_lat": "31.4641372",
    "restaurant_lng": "74.3822137",
    # Loyalty: earn 1 point per Rs. 1 spent; each point is worth 5 paisa, so
    # 1000 points redeems Rs. 50 — a 5% return, with Rs. 50 the smallest payout.
    "points_per_dollar": "1",
    "points_value_cents": "5",
    "min_redeem_points": "1000",
    "rewards_enabled": "true",
    # Keep this factual: there is no free-delivery threshold in the pricing code,
    # so the banner must not promise one. Delivery is a flat Rs. 150 inside 5 km.
    "announcement": "Open late · Fri from 2 PM · Sun from 5 PM · Delivery across DHA",
    "announcement_active": "true",
    "maps_embed": "https://www.google.com/maps?q=31.4641372,74.3822137&z=16&output=embed",
    "cash_on_delivery": "true",

    # Site copy — all editable from Admin → Settings.
    "menu_subtitle": "Specialty coffee, loaded snacks, frappes and desserts — made fresh to order.",
    "footer_tagline": "Great coffee. Comfort food. Refreshing drinks. Irresistible desserts. "
                      "Made with quality ingredients and served with warm hospitality.",
    "closed_message": "We're closed right now. Online ordering opens Friday at 2 PM, Sunday at 5 PM, and 12 PM on other days.",
    "contact_reply_time": "We usually reply within a few hours",
    "contact_hours_note": "Mon-Thu: 12 PM-1:30 AM; Fri: 2 PM-2:30 AM; Sat: 12 PM-2:30 AM; Sun: 5 PM-1:30 AM",
    "deals_section_title": "Combos & Deals",
    "deals_section_subtitle": "Get more for less — our combo pairs a burger or wrap with fries and a signature drink.",
    "featured_section_title": "Fan Favourites",
    "featured_section_subtitle": "The ones our regulars keep coming back for.",
    "promo_headline": "Order Online, Your Way",
    "promo_body": "Browse the full menu, customise your order, and get it delivered across "
                  "DHA — or collect it fresh from our DHA Phase 4 counter.",
}

THEME = {
    "restaurant_name": "Six Seven",
    "hero_text": "Good Food. Good Coffee. Good Mood.",
    "hero_subtext": "Specialty coffee, loaded snacks and desserts — made fresh in DHA Phase 4 and delivered across Lahore.",
    "primary_color": "#E36616",
    "secondary_color": "#035B5C",
    "accent_color": "#FDF1D7",
    "logo_url": "/images/six-seven-logo.png",
    "hero_image_url": f"{IMG}/hero-spread.webp",
    "slogan": "Good Food. Good Coffee. Good Mood.",
    "layout_style": "classic",
    "font_family": "Inter",
}


def main() -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE restaurants SET name = %s WHERE id = %s", ("Six Seven", RID))

            # ── menu ──────────────────────────────────────────────────────────
            cur.execute("SELECT id, name FROM menu_items WHERE restaurant_id = %s", (RID,))
            existing = {name: mid for mid, name in cur.fetchall()}
            keep: set[int] = set()

            for order, (cat, name, rs, desc, slug, popular, featured) in enumerate(MENU, start=1):
                image = f"{IMG}/{slug}.webp" if slug else ""
                cents = rs * 100
                if name in existing:
                    mid = existing[name]
                    cur.execute(
                        """UPDATE menu_items
                              SET category=%s, description=%s, price=%s, price_cents=%s,
                                  currency='PKR', image=%s, is_popular=%s, is_featured=%s,
                                  is_available=TRUE, display_order=%s, rating=%s
                            WHERE id=%s AND restaurant_id=%s""",
                        (cat, desc, rs, cents, image, popular, featured, order, 4.8, mid, RID),
                    )
                else:
                    cur.execute(
                        """INSERT INTO menu_items
                             (restaurant_id, category, name, description, price, price_cents,
                              currency, image, rating, is_popular, is_featured, is_available,
                              display_order, packaging_cost_cents)
                           VALUES (%s,%s,%s,%s,%s,%s,'PKR',%s,%s,%s,%s,TRUE,%s,0)
                           RETURNING id""",
                        (RID, cat, name, desc, rs, cents, image, 4.8, popular, featured, order),
                    )
                    mid = cur.fetchone()[0]
                keep.add(mid)

            # retire demo items that are not on the printed menu
            cur.execute(
                "UPDATE menu_items SET is_available = FALSE WHERE restaurant_id = %s AND NOT (id = ANY(%s))",
                (RID, list(keep)),
            )
            cur.execute(
                "DELETE FROM menu_items WHERE restaurant_id = %s AND NOT (id = ANY(%s)) "
                "AND id NOT IN (SELECT DISTINCT menu_item_id FROM order_line_items WHERE menu_item_id IS NOT NULL)",
                (RID, list(keep)),
            )

            # ── settings ──────────────────────────────────────────────────────
            for k, v in SETTINGS.items():
                cur.execute(
                    """INSERT INTO settings (restaurant_id, key, value) VALUES (%s,%s,%s)
                       ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value""",
                    (RID, k, v),
                )

            # ── theme ─────────────────────────────────────────────────────────
            cols = ", ".join(THEME)
            ph = ", ".join(["%s"] * len(THEME))
            upd = ", ".join(f"{c} = EXCLUDED.{c}" for c in THEME)
            cur.execute(
                f"""INSERT INTO theme_settings (restaurant_id, {cols}) VALUES (%s, {ph})
                    ON CONFLICT (restaurant_id) DO UPDATE SET {upd}""",
                (RID, *THEME.values()),
            )

            # ── the single branch ─────────────────────────────────────────────
            cur.execute("DELETE FROM branches WHERE restaurant_id = %s", (RID,))
            cur.execute(
                """INSERT INTO branches (restaurant_id, name, address, city, phone, hours, is_open, is_default, maps_url)
                   VALUES (%s,%s,%s,%s,%s,%s,TRUE,TRUE,%s)""",
                (RID, "Six Seven — DHA Phase 4", "75 CCA, DD Block, DHA Phase 4",
                 "Lahore", "0324-6756767",
                 "Mon-Thu: 12 PM-1:30 AM; Fri: 2 PM-2:30 AM; Sat: 12 PM-2:30 AM; Sun: 5 PM-1:30 AM",
                 "https://maps.google.com/?q=31.4641372,74.3822137"),
            )

            cur.execute("SELECT count(*) FROM menu_items WHERE restaurant_id=%s AND is_available", (RID,))
            print(f"menu items live: {cur.fetchone()[0]}")

    print("Six Seven data loaded.")


if __name__ == "__main__":
    main()
