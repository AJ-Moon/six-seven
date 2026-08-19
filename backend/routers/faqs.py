from fastapi import APIRouter, Depends
from db import get_db
from dependencies.auth import get_restaurant_id

router = APIRouter()

DEFAULT_FAQS = [
    {
        "id": 1,
        "question": "What are your online ordering hours?",
        "answer": "Online orders are accepted Mon-Thu 12 PM-1:30 AM, Friday 2 PM-2:30 AM, Saturday 12 PM-2:30 AM, and Sunday 5 PM-1:30 AM.",
        "category": "Orders",
        "orderIndex": 1,
    },
    {
        "id": 2,
        "question": "Do you offer delivery and pickup?",
        "answer": "Yes. Delivery is available within the configured delivery radius, and pickup is available from the Six Seven branch shown at checkout.",
        "category": "Orders",
        "orderIndex": 2,
    },
    {
        "id": 3,
        "question": "How can I pay?",
        "answer": "Delivery orders can be paid by cash on delivery, card on delivery, or online transfer. Pickup orders can be paid at the branch.",
        "category": "Payments",
        "orderIndex": 3,
    },
    {
        "id": 4,
        "question": "Where is Six Seven located?",
        "answer": "Six Seven is located at 75 CCA, DD Block, DHA Phase 4, Lahore.",
        "category": "Locations",
        "orderIndex": 4,
    },
]

DEFAULT_CONTENT = {
    "privacy": {
        "title": "Privacy Policy",
        "content": (
            "Six Seven collects the information needed to process orders, contact customers about their orders, "
            "and improve the website experience. This may include name, phone number, email address, delivery "
            "address, order details, and basic website analytics.\n\n"
            "We do not sell customer information. Order information may be shared only with staff and service "
            "providers needed to prepare, deliver, support, or secure an order.\n\n"
            "Customers can contact Six Seven through the website or social channels to ask about their order or "
            "request updates to their information."
        ),
    },
    "terms": {
        "title": "Terms of Service",
        "content": (
            "By placing an order with Six Seven, you confirm that your contact and delivery details are accurate. "
            "Orders are accepted during published ordering hours and may be declined if an item is unavailable, "
            "the restaurant is closed, or the delivery address is outside the delivery radius.\n\n"
            "Prices, availability, delivery charges, offers, and operating hours may change without prior notice. "
            "Any issue with an order should be reported as soon as possible so our team can help resolve it."
        ),
    },
    "about": {
        "title": "About Six Seven",
        "content": (
            '{"tagline":"Good Food. Good Coffee. Good Mood.",'
            '"story_paragraph_1":"Six Seven is a Lahore cafe built around fresh comfort food, specialty drinks, and a relaxed neighborhood feel.",'
            '"story_paragraph_2":"From burgers and loaded snacks to iced teas, coffees, smoothies, and frappes, every order is made to feel easy, satisfying, and fresh."}'
        ),
    },
    "careers": {
        "title": "Careers",
        "content": '{"jobs":[],"benefits":[]}',
    },
    "franchise": {
        "title": "Franchise",
        "content": '{"intro_text":"For franchise and partnership inquiries, contact Six Seven through the website or @sixseven.pk.","features":[]}',
    },
}


def _default_content(slug: str):
    fallback = DEFAULT_CONTENT.get(slug)
    if not fallback:
        fallback = {
            "title": slug.replace("-", " ").title(),
            "content": "This page is being updated. Please contact Six Seven for the latest information.",
        }
    return {
        "slug": slug,
        "title": fallback["title"],
        "content": fallback["content"],
        "updatedAt": None,
        "updated_at": None,
    }


@router.get("/")
def get_faqs(restaurant_id: int = Depends(get_restaurant_id)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, question, answer, category, order_index FROM faqs "
                "WHERE restaurant_id = %s ORDER BY order_index, id",
                (restaurant_id,),
            )
            rows = cur.fetchall()
    if not rows:
        return DEFAULT_FAQS
    return [{"id": r[0], "question": r[1], "answer": r[2], "category": r[3], "orderIndex": r[4]} for r in rows]


@router.get("/content/{slug}")
def get_content(slug: str, restaurant_id: int = Depends(get_restaurant_id)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT slug, title, content, updated_at FROM content_pages WHERE restaurant_id = %s AND slug = %s",
                (restaurant_id, slug),
            )
            row = cur.fetchone()
    if not row or not str(row[2] or "").strip() or str(row[2] or "").strip().startswith("Update your"):
        return _default_content(slug)
    updated_at = row[3].strftime("%B %d, %Y") if row[3] else None
    return {"slug": row[0], "title": row[1], "content": row[2], "updatedAt": updated_at, "updated_at": updated_at}
