import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from db import get_db
from dependencies.auth import get_restaurant_id
from core.money import cents_to_float
from services.commerce import effective_sale_price_cents, load_global_discount_config

router = APIRouter()

CATEGORY_ORDER = [
    "Burgers",
    "Chicken Tenders",
    "Loaded Fries",
    "Fries",
    "Wraps",
    "Grilled Sandwiches",
    "Fresh Salads",
    "Little 6-7",
    "Sweet Side",
    "Signature Drinks",
    "Iced Teas",
    "Smoothies",
    "Frappes",
    "Iced Coffees",
    "Hot Coffees",
    "Coffee",
    "Desserts",
    "Food & Snacks",
    "Combo Meal",
    "Add Ons",
]


def _category_order_sql(column: str = "category") -> str:
    clauses = []
    for index, category in enumerate(CATEGORY_ORDER):
        escaped = category.replace("'", "''")
        clauses.append(f"WHEN {column} = '{escaped}' THEN {index}")
    clauses_sql = " ".join(clauses)
    return f"CASE {clauses_sql} ELSE {len(CATEGORY_ORDER)} END"


def _row_to_item(r, global_discount: tuple[int, set[str]] | None = None):
    global_discount_percent, excluded_categories = global_discount or (0, set())
    gross_cents = int(r[13])
    explicit_sale_cents = int(r[14]) if r[14] is not None else None
    sale_cents = effective_sale_price_cents(
        gross_cents,
        explicit_sale_cents,
        r[1] or "",
        global_discount_percent,
        excluded_categories,
    )
    return {
        "id": r[0], "category": r[1], "name": r[2], "description": r[3],
        "price": float(r[4]),
        "salePrice": cents_to_float(sale_cents) if sale_cents is not None else None,
        "image": r[6], "rating": float(r[7]),
        "isSpicy": r[8], "isPopular": r[9], "isFeatured": r[10],
        "subcategory": r[11] or "",
        "customizations": r[12] if isinstance(r[12], list) else json.loads(r[12] or "[]"),
    }


@router.get("/categories")
def get_categories(response: Response, restaurant_id: int = Depends(get_restaurant_id)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT category FROM menu_items "
                "WHERE restaurant_id = %s AND is_available = TRUE "
                "GROUP BY category "
                f"ORDER BY {_category_order_sql()}, category",
                (restaurant_id,),
            )
            rows = cur.fetchall()
    response.headers["Cache-Control"] = "public, max-age=300"
    return [r[0] for r in rows]


@router.get("")
@router.get("/")
def get_menu(
    response: Response,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    restaurant_id: int = Depends(get_restaurant_id),
):
    query = (
        """SELECT id, category, name, description, price, sale_price, image, rating,
                  is_spicy, is_popular, is_featured, subcategory, customizations,
                  COALESCE(price_cents, round(price * 100)::bigint),
                  COALESCE(sale_price_cents,
                           CASE WHEN sale_price IS NULL THEN NULL ELSE round(sale_price * 100)::bigint END)
           """
        "FROM menu_items WHERE restaurant_id = %s AND is_available = TRUE"
    )
    params: list = [restaurant_id]
    if category and category != "all":
        query += " AND category = %s"
        params.append(category)
    if search:
        query += " AND name ILIKE %s"
        params.append(f"%{search}%")
    if sort == "price-low":
        query += " ORDER BY price ASC"
    elif sort == "price-high":
        query += " ORDER BY price DESC"
    elif sort == "rating":
        query += " ORDER BY rating DESC"
    else:
        query += f" ORDER BY {_category_order_sql()}, display_order ASC NULLS LAST, is_popular DESC"
    with get_db() as conn:
        with conn.cursor() as cur:
            global_discount = load_global_discount_config(cur, restaurant_id)
            cur.execute(query, params)
            rows = cur.fetchall()
    response.headers["Cache-Control"] = "public, max-age=300"
    return [_row_to_item(r, global_discount) for r in rows]


@router.get("/{item_id}")
def get_menu_item(item_id: int, restaurant_id: int = Depends(get_restaurant_id)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, category, name, description, price, sale_price, image, rating,
                          is_spicy, is_popular, is_featured, subcategory, customizations,
                          COALESCE(price_cents, round(price * 100)::bigint),
                          COALESCE(sale_price_cents,
                                   CASE WHEN sale_price IS NULL THEN NULL ELSE round(sale_price * 100)::bigint END)
                   """
                "FROM menu_items WHERE id = %s AND restaurant_id = %s AND is_available = TRUE",
                (item_id, restaurant_id),
            )
            row = cur.fetchone()
            global_discount = load_global_discount_config(cur, restaurant_id)
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return _row_to_item(row, global_discount)
