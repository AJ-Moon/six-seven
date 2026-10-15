#!/usr/bin/env python3
"""Load Six Seven's current menu, branding and store settings.

Food menu content is transcribed from Pricing.docx. Prices are Pakistani Rupees,
stored as price_cents = rupees * 100 so the existing money helpers keep working.
Re-running this is safe: menu rows are matched on (restaurant_id, name).
"""
import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from db import get_db  # noqa: E402

RID = int(os.getenv("DEFAULT_RESTAURANT_ID", "1"))
IMG = "/static/uploads"


def option(option_id: str, name: str, price_rs: int = 0, description: str = "", image: str = "") -> dict:
    row = {
        "id": option_id,
        "name": name,
        "priceDeltaCents": price_rs * 100,
    }
    if description:
        row["description"] = description
    if image:
        row["image"] = image
    return row


def group(
    group_id: str,
    name: str,
    options: list[dict],
    *,
    required: bool = False,
    min_selections: int | None = None,
    max_selections: int | None = None,
    allow_repeats: bool = False,
    depends_on: dict | None = None,
) -> dict:
    row = {
        "id": group_id,
        "name": name,
        "required": required,
        "minSelections": min_selections if min_selections is not None else (1 if required else 0),
        "maxSelections": max_selections if max_selections is not None else (1 if required else len(options)),
        "allowRepeats": allow_repeats,
        "options": options,
    }
    if depends_on:
        row["dependsOn"] = depends_on
    return row


SAUCE_OPTIONS = [
    option("garlic-mayo", "Garlic Mayo", description="Creamy and mellow"),
    option("chipotle", "Chipotle", description="Smoky and mild"),
    option("atomic", "Atomic", description="Blazing hot"),
    option("six-seven-special", "67 Special", description="Tangy house blend"),
]

PICK_TWO_SAUCES = group(
    "sauces",
    "Pick 2 sauces",
    SAUCE_OPTIONS,
    required=True,
    min_selections=2,
    max_selections=2,
    allow_repeats=True,
)
PICK_ONE_SAUCE = group("sauce", "Pick 1 sauce", SAUCE_OPTIONS, required=True)
OPTIONAL_JALAPENOS = group("jalapenos", "Jalapenos", [option("jalapenos", "Add jalapenos")])
CHEESE_ADDON = group("cheese", "Cheese", [option("cheese", "Add cheese", 130)])
BEEF_TOPPINGS = group(
    "toppings",
    "Free toppings",
    [
        option("lettuce", "Lettuce"),
        option("pickles", "Pickles"),
        option("jalapenos", "Jalapenos"),
        option("onion", "Onion"),
        option("tomato", "Tomato"),
    ],
    max_selections=5,
)
FRIED_EGG = group("fried-egg", "Fried egg", [option("fried-egg", "Add fried egg", 100)])
MEAL_UPGRADE = group(
    "meal",
    "Make it a meal",
    [
        option(
            "make-meal",
            "Add fries + signature drink",
            630,
            "Drink choice will be confirmed by Six Seven until the drinks menu is updated.",
            f"{IMG}/meal-upgrade.webp",
        )
    ],
)
MEAL_FRIES = group(
    "meal-fries",
    "Meal fries",
    [option("plain-fries", "Plain fries"), option("masala-fries", "6-7 masala fries")],
    required=True,
    depends_on={"groupId": "meal", "optionId": "make-meal"},
)
BREAD_CHOICE = group(
    "bread",
    "Bread",
    [option("white", "White bread"), option("bran", "Bran bread")],
    required=True,
)
SANDWICH_TOPPINGS = group(
    "sandwich-toppings",
    "Free extras",
    [option("pickles", "Pickles"), option("jalapenos", "Jalapenos")],
    max_selections=2,
)
KIDS_SAUCE = group("kids-sauce", "Sauce", [option("mayo", "Mayo"), option("ketchup", "Ketchup")], required=True)
KIDS_MEAL = group("kids-meal", "Kids meal", [option("kids-meal", "Add fries + kids drink", 400)])
FLAVOUR_OPTIONS = group(
    "flavour",
    "Choose a Flavour",
    [
        option("chocolate-drip", "Chocolate Drip", 0, "Finished with warm chocolate"),
        option("oreo-crunch", "Oreo Crunch", 40, "Loaded with chocolate and Oreo crunch"),
        option("dairy-desire", "Dairy Desire", 140, "Creamy dairy-style topping"),
        option("kitkat-crunch", "KitKat Crunch", 140, "Loaded with chocolate and KitKat crunch"),
        option("kinder-bueno", "Kinder Bueno", 440, "Loaded with Kinder Bueno"),
    ],
    required=True,
)
ICE_CREAM_ADDON = group(
    "ice-cream",
    "Vanilla ice cream",
    [option("one-scoop", "1 scoop", 130), option("two-scoops", "2 scoops", 250)],
)
EXTRA_SWEET_SAUCE = group("extra-sauce", "Extra sauce dip", [option("extra-sauce", "Extra sauce dip", 130)])


def size_group(options: list[dict]) -> dict:
    return group("size", "Size", options, required=True)


CHICKEN_BURGER_OPTIONS = [PICK_TWO_SAUCES, OPTIONAL_JALAPENOS, CHEESE_ADDON, MEAL_UPGRADE, MEAL_FRIES]
BEEF_STACK_OPTIONS = [BEEF_TOPPINGS, MEAL_UPGRADE, MEAL_FRIES]
CHICKEN_WRAP_OPTIONS = [PICK_TWO_SAUCES, OPTIONAL_JALAPENOS, CHEESE_ADDON, MEAL_UPGRADE, MEAL_FRIES]
SWEET_OPTIONS = [FLAVOUR_OPTIONS, ICE_CREAM_ADDON, EXTRA_SWEET_SAUCE]


def menu_item(
    category: str,
    subcategory: str,
    name: str,
    price_rs: int,
    description: str,
    slug: str | None,
    *,
    popular: bool = False,
    featured: bool = False,
    spicy: bool = False,
    customizations: list[dict] | None = None,
) -> dict:
    return {
        "category": category,
        "subcategory": subcategory,
        "name": name,
        "price_rs": price_rs,
        "description": description,
        "image_slug": slug,
        "popular": popular,
        "featured": featured,
        "spicy": spicy,
        "customizations": customizations or [],
    }


SINGLE_BURGER_WRAP_CHOICES = [
    option("mighty-zinger", "Mighty Zinger"),
    option("mighty-grilled-chicken", "Mighty Grilled Chicken"),
    option("single-stack", "Single Stack beef burger"),
    option("crispy-chicken-wrap", "Crispy Chicken Wrap"),
    option("grilled-chicken-wrap", "Grilled Chicken Wrap"),
]
DOUBLE_BURGER_CHOICES = [
    option("mighty-double-zinger", "Mighty Double Zinger"),
    option("mighty-double-grilled-chicken", "Mighty Double Grilled Chicken"),
    option("double-stack", "Double Stack beef burger"),
    option("mushroom-melt", "Mushroom Melt beef burger"),
    option("smoky-barbecue-melt", "Smoky Barbecue Melt beef burger"),
]
COFFEE_CHOICES = [
    option(slug, name)
    for slug, name in [
        ("espresso", "Espresso"), ("americano", "Americano"),
        ("latte", "Latte"), ("cappuccino", "Cappuccino"),
        ("spanish-latte", "Spanish Latte"), ("vanilla-latte", "Vanilla Latte"),
        ("caramel-latte", "Caramel Latte"), ("tiramisu-latte", "Tiramisu Latte"),
        ("popcorn-latte", "Popcorn Latte"), ("mocha", "Mocha"),
        ("pistachio-latte", "Pistachio Latte"),
        ("iced-americano", "Iced Americano"), ("iced-latte", "Iced Latte"),
        ("iced-spanish-latte", "Iced Spanish Latte"), ("iced-mocha", "Iced Mocha"),
    ]
]


def deal_burger_groups(count: int, choices: list[dict]) -> list[dict]:
    groups = []
    for slot in range(1, count + 1):
        choice_id = f"burger-{slot}"
        label = "Double-patty burger" if count == 1 else f"Burger or wrap {slot}"
        groups.append(group(choice_id, label, choices, required=True))
        for choice in choices:
            if choice["id"] == "single-stack" or choice["id"] in {
                "double-stack", "mushroom-melt", "smoky-barbecue-melt"
            }:
                continue
            groups.append(group(
                f"{choice_id}-{choice['id']}-sauces",
                f"Choose 2 sauces for {choice['name']}",
                SAUCE_OPTIONS,
                required=True, min_selections=2, max_selections=2, allow_repeats=True,
                depends_on={"groupId": choice_id, "optionId": choice["id"]},
            ))
    return groups


def deal_coffee_groups(count: int) -> list[dict]:
    return [
        group(f"coffee-{slot}", f"Coffee {slot}", COFFEE_CHOICES, required=True)
        for slot in range(1, count + 1)
    ]


DEAL_MENU = [
    menu_item(
        "Deals", "Burgers", "The Solo Feast", 1349,
        "Choose any double-patty beef or chicken burger, plus plain fries and a 350ml Coke or Sprite. Choose two sauces with chicken burgers. Fixed deal price; no additional 15% discount.",
        "/images/deals/solo-feast.png", featured=True,
        customizations=deal_burger_groups(1, DOUBLE_BURGER_CHOICES) + [
            group("drink", "350ml drink", [option("coke", "Coke"), option("sprite", "Sprite")], required=True),
        ],
    ),
    menu_item(
        "Deals", "Sharing", "The Family Feast", 3999,
        "Choose four single-patty beef or chicken burgers or chicken wraps. Includes four Golden Tenders with two sauce dips, one plain fries, one curly fries, a 1.5L Coke or Sprite, and one free chocolate-drip waffle or mini pancakes. Fixed deal price; no additional 15% discount.",
        "/images/deals/family-feast.png", featured=True,
        customizations=deal_burger_groups(4, SINGLE_BURGER_WRAP_CHOICES) + [
            group("tender-sauces", "Choose 2 tender sauces", SAUCE_OPTIONS, required=True, min_selections=2, max_selections=2, allow_repeats=True),
            group("drink", "1.5L drink", [option("coke", "Coke"), option("sprite", "Sprite")], required=True),
            group("dessert", "Free dessert", [option("waffle", "Chocolate Drip waffle"), option("mini-pancakes", "Chocolate Drip mini pancakes")], required=True),
        ],
    ),
    menu_item(
        "Deals", "Sharing", "Double Trouble", 1699,
        "Choose two single-patty beef or chicken burgers or chicken wraps. Includes one plain fries and a 1L Coke or Sprite. Choose two sauces with chicken burgers or wraps. Fixed deal price; no additional 15% discount.",
        "/images/deals/double-trouble.png", featured=True,
        customizations=deal_burger_groups(2, SINGLE_BURGER_WRAP_CHOICES) + [
            group("drink", "1L drink", [option("coke", "Coke"), option("sprite", "Sprite")], required=True),
        ],
    ),
    menu_item(
        "Deals", "Coffee", "Coffee Lovers' Heaven", 1599,
        "Choose any two hot or iced coffees and one chocolate-drip waffle or mini pancakes. Fixed deal price; no additional 15% discount.",
        "/images/deals/coffee-lovers-heaven.png", featured=True,
        customizations=deal_coffee_groups(2) + [
            group("dessert", "Dessert", [option("waffle", "Chocolate Drip waffle"), option("mini-pancakes", "Chocolate Drip mini pancakes")], required=True),
        ],
    ),
    menu_item(
        "Deals", "Coffee", "Coffee & Crunch Deal", 1099,
        "Choose a Tikka or Fajita grilled sandwich on white or bran bread, plus any hot or iced coffee. Fixed deal price; no additional 15% discount.",
        "/images/deals/coffee-crunch-deal.png", featured=True,
        customizations=[
            group("sandwich", "Grilled sandwich", [option("tikka", "Tikka Grilled Sandwich"), option("fajita", "Fajita Grilled Sandwich")], required=True),
            BREAD_CHOICE,
            *deal_coffee_groups(1),
        ],
    ),
]


MENU = [
    menu_item("Burgers", "Chicken Burgers", "Mighty Zinger", 730, "Crispy chicken fillet, iceberg lettuce and your choice of 2 sauces. Optional jalapenos are free.", "mighty-zinger", popular=True, featured=True, customizations=CHICKEN_BURGER_OPTIONS),
    menu_item("Burgers", "Chicken Burgers", "Mighty Double Zinger", 1080, "Double crispy chicken, iceberg lettuce and your choice of 2 sauces. Optional jalapenos are free.", "mighty-double-zinger", popular=True, customizations=CHICKEN_BURGER_OPTIONS),
    menu_item("Burgers", "Chicken Burgers", "Mighty Grilled Chicken", 730, "Grilled chicken, iceberg, tomato, onion and your choice of 2 sauces. Optional jalapenos are free.", "mighty-grilled-chicken", customizations=CHICKEN_BURGER_OPTIONS),
    menu_item("Burgers", "Chicken Burgers", "Mighty Double Grilled Chicken", 1080, "Double grilled chicken, iceberg, tomato, onion and your choice of 2 sauces. Optional jalapenos are free.", "mighty-double-grilled-chicken", customizations=CHICKEN_BURGER_OPTIONS),
    menu_item("Burgers", "Australian Beef", "Single Stack", 730, "1 beef patty, cheese and 67 Signature Sauce dip. Free lettuce, pickles, jalapenos, onion and tomato available.", "single-stack", featured=True, customizations=BEEF_STACK_OPTIONS),
    menu_item("Burgers", "Australian Beef", "Double Stack", 1270, "2 beef patties, double cheese and 67 Signature Sauce dip. Free toppings available. Fried egg optional.", "double-stack", popular=True, featured=True, customizations=[BEEF_TOPPINGS, FRIED_EGG, MEAL_UPGRADE, MEAL_FRIES]),
    menu_item("Burgers", "Australian Beef", "Triple Stack", 1530, "3 beef patties, triple cheese and 67 Signature Sauce dip. Free lettuce, pickles, jalapenos, onion and tomato available.", "triple-stack", customizations=BEEF_STACK_OPTIONS),
    menu_item("Burgers", "6-7 Beef Specials", "Mushroom Melt", 1230, "Double beef, cheese and house-made mushroom sauce.", "mushroom-melt", featured=True, customizations=[MEAL_UPGRADE, MEAL_FRIES]),
    menu_item("Burgers", "6-7 Beef Specials", "Smoky Barbecue Melt", 1370, "Double beef, cheese, iceberg, caramelised onions, BBQ sauce and garlic sauce.", "smoky-barbecue-melt", spicy=True, customizations=[MEAL_UPGRADE, MEAL_FRIES]),
    menu_item("Chicken Tenders", "Golden Tenders", "Golden Tenders", 670, "Crispy golden-fried chicken with 2 sauce dips.", "golden-tenders", popular=True, customizations=[size_group([option("4-pieces", "4 pieces"), option("6-pieces", "6 pieces", 300)]), PICK_TWO_SAUCES, MEAL_UPGRADE, MEAL_FRIES]),
    menu_item("Chicken Tenders", "Cheesy Tenders", "Cheesy Tenders", 830, "Crispy tenders loaded with warm cheese sauce.", "cheesy-tenders", customizations=[size_group([option("4-pieces", "4 pieces"), option("6-pieces", "6 pieces", 300)]), MEAL_UPGRADE, MEAL_FRIES]),
    menu_item("Loaded Fries", "Loaded Fries", "Fully Loaded Chicken Fries", 830, "Fries, chicken, cheese sauce, jalapenos and 2 sauces.", "fully-loaded-chicken-fries", popular=True, featured=True, customizations=[PICK_TWO_SAUCES]),
    menu_item("Fries", "Fries", "Classic Fries", 330, "Golden crispy fries.", "classic-fries"),
    menu_item("Fries", "Fries", "6-7 Masala Fries", 330, "Golden fries tossed in house seasoning.", "six-seven-masala-fries"),
    menu_item("Fries", "Fries", "Saucy Fries", 400, "Classic fries with 1 sauce dip.", "saucy-fries", customizations=[PICK_ONE_SAUCE]),
    menu_item("Fries", "Fries", "Cheesy Fries", 530, "Classic fries loaded with warm cheese sauce.", "cheesy-fries", popular=True),
    menu_item("Fries", "Fries", "Curly Fries", 430, "Seasoned spiral-cut fries.", "curly-fries"),
    menu_item("Wraps", "10-Inch Wraps", "Crispy Chicken Wrap", 730, "Crispy chicken, iceberg and choice of 2 sauces. Optional jalapenos are free.", "crispy-chicken-wrap", popular=True, customizations=CHICKEN_WRAP_OPTIONS),
    menu_item("Wraps", "10-Inch Wraps", "Grilled Chicken Wrap", 730, "Grilled chicken, iceberg, tomato, onion and choice of 2 sauces. Optional jalapenos are free.", "grilled-chicken-wrap", customizations=CHICKEN_WRAP_OPTIONS),
    menu_item("Grilled Sandwiches", "Grilled Sandwiches", "Tikka Grilled Sandwich", 599, "White or bran bread with chicken, mustard mayo, ketchup, olives, iceberg, capsicum, onion and tomato.", "grilled-sandwich", customizations=[BREAD_CHOICE, CHEESE_ADDON, SANDWICH_TOPPINGS]),
    menu_item("Grilled Sandwiches", "Grilled Sandwiches", "Fajita Grilled Sandwich", 599, "White or bran bread with chicken, mustard mayo, ketchup, olives, iceberg, capsicum, onion and tomato.", "grilled-sandwich", customizations=[BREAD_CHOICE, CHEESE_ADDON, SANDWICH_TOPPINGS]),
    menu_item("Fresh Salads", "Fresh Salads", "Grilled Chicken Salad", 670, "Fresh vegetables and greens with grilled chicken, olives and a light olive-oil dressing.", "grilled-chicken-salad", customizations=[size_group([option("medium", "Medium"), option("large", "Large", 360)])]),
    menu_item("Fresh Salads", "Fresh Salads", "Creamy Russian Salad", 870, "Creamy fruit, vegetables and pasta finished with toppings of your choice.", "creamy-russian-salad", customizations=[size_group([option("medium", "Medium"), option("large", "Large", 360)])]),
    menu_item("Little 6-7", "For Kids Under 12", "Mini Chicken Dog", 530, "Crispy chicken strips, iceberg and mayo or ketchup.", "mini-chicken-dog", customizations=[KIDS_SAUCE, KIDS_MEAL]),
    menu_item("Little 6-7", "For Kids Under 12", "6-Piece Chicken Nuggets", 530, "Six crispy golden nuggets with mayo or ketchup.", "chicken-nuggets", customizations=[KIDS_SAUCE, KIDS_MEAL]),
    menu_item("Little 6-7", "For Kids Under 12", "3-Piece Kids Tenders", 530, "Three crispy tenders with mayo or ketchup.", "kids-tenders", customizations=[KIDS_SAUCE, KIDS_MEAL]),
    menu_item("Sweet Side", "Choose. Load. Love.", "Mini Pancakes", 530, "Warm mini pancakes finished with your choice of flavour: Chocolate Drip, Dairy Desire, Oreo Crunch, KitKat Crunch or Kinder Bueno.", "mini-pancakes", popular=True, customizations=SWEET_OPTIONS),
    menu_item("Sweet Side", "Choose. Load. Love.", "Waffle", 530, "A crisp waffle finished with your choice of flavour: Chocolate Drip, Dairy Desire, Oreo Crunch, KitKat Crunch or Kinder Bueno.", "waffle", customizations=SWEET_OPTIONS),

    menu_item("Signature Drinks", "Signature Drinks", "Peach Breeze", 550, "Peach, citrus and soda over crushed ice.", "peach-breeze", popular=True, featured=True),
    menu_item("Signature Drinks", "Signature Drinks", "Strawberry Rush", 550, "Strawberry and soda layered over ice.", "strawberry-rush", popular=True),
    menu_item("Signature Drinks", "Signature Drinks", "Mango Burst", 550, "Mango shaken and poured over ice.", "mango-burst", popular=True, featured=True),
    menu_item("Signature Drinks", "Signature Drinks", "Berry Cola", 550, "Mixed berries stirred into chilled cola with fresh lemon.", "berry-cola"),
    menu_item("Iced Teas", "Iced Teas", "Peach Iced Tea", 400, "Brewed tea over ice with sweet peach.", "peach-iced-tea", popular=True),
    menu_item("Iced Teas", "Iced Teas", "Strawberry Iced Tea", 400, "Brewed tea over ice with ripe strawberry.", "strawberry-iced-tea"),
    menu_item("Iced Teas", "Iced Teas", "Passion Fruit Iced Tea", 400, "Brewed tea over ice with tangy passion fruit.", "passion-fruit-iced-tea"),
    menu_item("Smoothies", "Smoothies", "Blackberry Smoothie", 700, "Thick-blended blackberry, fruit-forward and creamy.", "blackberry-smoothie"),
    menu_item("Smoothies", "Smoothies", "Strawberry Smoothie", 700, "Thick-blended strawberry, sweet and cold.", "strawberry-smoothie", popular=True),
    menu_item("Smoothies", "Smoothies", "Mango Smoothie", 700, "Thick-blended mango smoothie.", "mango-smoothie", popular=True, featured=True),
    menu_item("Frappes", "Frappes", "Vanilla Frappe", 800, "Blended ice, milk and vanilla, topped with fresh cream.", "caramel-frappe"),
    menu_item("Frappes", "Frappes", "Caramel Frappe", 800, "Blended caramel and coffee with cream and caramel drizzle.", "caramel-frappe", popular=True, featured=True),
    menu_item("Frappes", "Frappes", "Mocha Frappe", 800, "Chocolate and coffee blended smooth, topped with cream.", "mocha-frappe", popular=True),
    menu_item("Frappes", "Frappes", "Pistachio Frappe", 900, "Real pistachio blended into a rich frappe.", "pistachio-frappe", popular=True, featured=True),
    menu_item("Iced Coffees", "Iced Coffees", "Iced Americano", 450, "Espresso lengthened over ice for a clean finish.", "americano", popular=True),
    menu_item("Iced Coffees", "Iced Coffees", "Iced Latte", 550, "Espresso and chilled milk over ice.", "latte", popular=True),
    menu_item("Iced Coffees", "Iced Coffees", "Iced Spanish Latte", 650, "Iced latte with sweetened condensed milk.", "latte", popular=True),
    menu_item("Iced Coffees", "Iced Coffees", "Iced Mocha", 650, "Chocolate, espresso and chilled milk.", "mocha-frappe"),
    menu_item("Hot Coffees", "Hot Coffees", "Espresso", 300, "A bold, full-bodied double shot pulled fresh to order.", "espresso"),
    menu_item("Hot Coffees", "Hot Coffees", "Americano", 450, "Espresso lengthened with hot water for a clean, smooth finish.", "americano", popular=True),
    menu_item("Hot Coffees", "Hot Coffees", "Latte", 550, "Silky steamed milk over a rich espresso base.", "latte", popular=True, featured=True),
    menu_item("Hot Coffees", "Hot Coffees", "Cappuccino", 550, "Equal parts espresso, steamed milk and airy foam.", "latte", popular=True),
    menu_item("Hot Coffees", "Hot Coffees", "Spanish Latte", 650, "Sweetened condensed milk gives this latte its creamy depth.", "latte", popular=True, featured=True),
    menu_item("Hot Coffees", "Hot Coffees", "Vanilla Latte", 650, "Smooth vanilla stirred through espresso and steamed milk.", "latte"),
    menu_item("Hot Coffees", "Hot Coffees", "Caramel Latte", 650, "Buttery caramel and espresso, finished with milk.", "latte", popular=True),
    menu_item("Hot Coffees", "Hot Coffees", "Tiramisu Latte", 650, "Cocoa and mascarpone notes for a dessert-style coffee.", "latte"),
    menu_item("Hot Coffees", "Hot Coffees", "Popcorn Latte", 650, "Buttered-popcorn twist on a classic latte.", "latte", featured=True),
    menu_item("Hot Coffees", "Hot Coffees", "Mocha", 650, "Chocolate and espresso, the way it should be.", "mocha-frappe", popular=True),
    menu_item("Hot Coffees", "Hot Coffees", "Pistachio Latte", 750, "Roasted pistachio blended into a velvety latte.", "latte", popular=True, featured=True),
    menu_item("Add Ons", "Extras", "Sauce Dip", 130, "Chipotle, Atomic, Garlic Mayo or 67 Special.", None, customizations=[PICK_ONE_SAUCE]),
    menu_item("Add Ons", "Extras", "Extra Cheese", 130, "An extra helping of melted cheese.", None),
    menu_item("Add Ons", "Extras", "Water", 100, "Chilled bottled water.", None),
    *DEAL_MENU,
]

SETTINGS = {
    "phone": "0324-6756767",
    "email": "contact@sixseven.pk",
    "address": "75 CCA, DD Block, DHA Phase 4, Lahore",
    "hours": "Mon-Thu: 12 PM-1 AM next day; Fri-Sun: 5 PM-2 AM next day (Pakistan time)",
    "whatsapp": "923246756767",
    "instagram_url": "https://instagram.com/sixseven.pk",
    "facebook_url": "https://facebook.com/sixseven.pk",
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
    "points_per_dollar": "1",
    "points_value_cents": "5",
    "min_redeem_points": "1000",
    "rewards_enabled": "true",
    "announcement": "New food menu live · Mighty Zinger, Australian beef burgers, wraps, tenders and loaded fries",
    "announcement_active": "true",
    "maps_embed": "https://www.google.com/maps?q=31.4641372,74.3822137&z=16&output=embed",
    "cash_on_delivery": "true",
    "global_discount_percent": "15",
    "menu_subtitle": "Mighty zingers, Australian beef burgers, tenders, loaded fries, wraps, salads, sweets and drinks — made fresh to order.",
    "footer_tagline": "Mighty burgers, crispy tenders, loaded fries, specialty coffee and cold drinks from DHA Phase 4 Lahore.",
    "closed_message": "We're closed right now. Online ordering opens Mon-Thu at 12 PM and Fri-Sun at 5 PM (Pakistan time).",
    "contact_reply_time": "We usually reply within a few hours",
    "contact_hours_note": "Mon-Thu: 12 PM-1 AM next day; Fri-Sun: 5 PM-2 AM next day (Pakistan time)",
    "deals_section_title": "Featured Deals",
    "deals_section_subtitle": "Burgers, sharing meals and coffee combos at fixed prices. The extra 15% menu discount does not apply.",
    "featured_section_title": "Fresh From The New Menu",
    "featured_section_subtitle": "Mighty burgers, Australian beef stacks, crispy tenders and loaded fries.",
    "promo_headline": "Order Online, Your Way",
    "promo_body": "Browse the full food menu, choose your sauces, add a meal upgrade, and get it delivered across DHA or collect fresh from our DHA Phase 4 counter.",
    "global_discount_excluded_categories": "Deals, Combo Meal",
    "hero_slides": json.dumps(
        [
            {
                "image": "/images/six-seven-home-slide-beef-burgers.png",
                "headline": "The Best Beef Burgers in Town",
                "subtext": "Australian beef burgers with 15% off on website and dine-in.",
            },
            {
                "image": "/images/six-seven-home-slide-sandwiches-salads.png",
                "headline": "Fresh Meets Grilled",
                "subtext": "Grilled sandwiches and fresh, satisfying salads.",
            },
            {
                "image": "/images/six-seven-home-slide-loaded-fries-tenders.png",
                "headline": "Crispy Saucy Loaded",
                "subtext": "Golden tenders and fully loaded chicken fries.",
            },
        ],
        separators=(",", ":"),
    ),
}

THEME = {
    "restaurant_name": "Six Seven",
    "hero_text": "Good Food. Good Coffee. Good Mood.",
    "hero_subtext": "Mighty burgers, loaded fries, crispy tenders, wraps and coffee — made fresh in DHA Phase 4.",
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

            cur.execute("SELECT id, name FROM menu_items WHERE restaurant_id = %s", (RID,))
            existing = {name: mid for mid, name in cur.fetchall()}
            keep: set[int] = set()

            for display_order, item in enumerate(MENU, start=1):
                image = (item["image_slug"] if item["image_slug"].startswith("/")
                         else f"{IMG}/{item['image_slug']}.webp") if item["image_slug"] else ""
                cents = item["price_rs"] * 100
                customizations_json = item["customizations"]
                if item["name"] in existing:
                    mid = existing[item["name"]]
                    cur.execute(
                        """UPDATE menu_items
                              SET category=%s, subcategory=%s, description=%s, price=%s, price_cents=%s,
                                  currency='PKR', image=%s, is_spicy=%s, is_popular=%s, is_featured=%s,
                                  customizations=%s::jsonb, is_available=TRUE, display_order=%s, rating=%s
                            WHERE id=%s AND restaurant_id=%s""",
                        (
                            item["category"], item["subcategory"], item["description"], item["price_rs"], cents,
                            image, item["spicy"], item["popular"], item["featured"], json_dumps(customizations_json),
                            display_order, 0, mid, RID,
                        ),
                    )
                else:
                    cur.execute(
                        """INSERT INTO menu_items
                             (restaurant_id, category, subcategory, name, description, price, price_cents,
                              currency, image, rating, is_spicy, is_popular, is_featured, customizations,
                              is_available, display_order, packaging_cost_cents)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,'PKR',%s,%s,%s,%s,%s,%s::jsonb,TRUE,%s,0)
                           RETURNING id""",
                        (
                            RID, item["category"], item["subcategory"], item["name"], item["description"],
                            item["price_rs"], cents, image, 0, item["spicy"], item["popular"], item["featured"],
                            json_dumps(customizations_json), display_order,
                        ),
                    )
                    mid = cur.fetchone()[0]
                keep.add(mid)

            cur.execute(
                "UPDATE menu_items SET is_available = FALSE WHERE restaurant_id = %s AND NOT (id = ANY(%s))",
                (RID, list(keep)),
            )
            cur.execute(
                "DELETE FROM menu_items WHERE restaurant_id = %s AND NOT (id = ANY(%s)) "
                "AND id NOT IN (SELECT DISTINCT menu_item_id FROM order_line_items WHERE menu_item_id IS NOT NULL) "
                "AND id NOT IN (SELECT DISTINCT menu_item_id FROM cart_lines WHERE menu_item_id IS NOT NULL)",
                (RID, list(keep)),
            )

            for key, value in SETTINGS.items():
                cur.execute(
                    """INSERT INTO settings (restaurant_id, key, value) VALUES (%s,%s,%s)
                       ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value""",
                    (RID, key, value),
                )

            cols = ", ".join(THEME)
            ph = ", ".join(["%s"] * len(THEME))
            upd = ", ".join(f"{c} = EXCLUDED.{c}" for c in THEME)
            cur.execute(
                f"""INSERT INTO theme_settings (restaurant_id, {cols}) VALUES (%s, {ph})
                    ON CONFLICT (restaurant_id) DO UPDATE SET {upd}""",
                (RID, *THEME.values()),
            )

            branch_values = (
                "Six Seven - DHA Phase 4",
                "75 CCA, DD Block, DHA Phase 4",
                "Lahore",
                "0324-6756767",
                "Mon-Thu: 12 PM-1 AM next day; Fri-Sun: 5 PM-2 AM next day (Pakistan time)",
                "https://maps.google.com/?q=31.4641372,74.3822137",
            )
            cur.execute(
                "SELECT id FROM branches WHERE restaurant_id = %s ORDER BY is_default DESC, id LIMIT 1",
                (RID,),
            )
            branch_row = cur.fetchone()
            if branch_row:
                cur.execute(
                    """UPDATE branches
                       SET name=%s, address=%s, city=%s, phone=%s, hours=%s,
                           maps_url=%s, is_default=TRUE
                       WHERE id=%s AND restaurant_id=%s""",
                    (*branch_values, branch_row[0], RID),
                )
            else:
                cur.execute(
                    """INSERT INTO branches
                       (restaurant_id, name, address, city, phone, hours, maps_url, is_open, is_default)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE,TRUE)""",
                    (RID, *branch_values),
                )

            cur.execute("SELECT count(*) FROM menu_items WHERE restaurant_id=%s AND is_available", (RID,))
            print(f"menu items live: {cur.fetchone()[0]}")

    print("Six Seven data loaded.")


def json_dumps(value: object) -> str:
    import json

    return json.dumps(value, separators=(",", ":"))


if __name__ == "__main__":
    main()
