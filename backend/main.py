from contextlib import asynccontextmanager
from datetime import datetime
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import psycopg2

from core.storage import static_dir, sync_bundled_uploads, uploads_dir
from db import get_db
from dependencies.auth import get_restaurant_id
from routers import auth, menu, orders, branches, rewards, contact, faqs, admin
from routers import theme, chatbot, delivery, revenue_operator, events, carts
from routers import analytics, competitors, opportunities, experiments, missions

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Six Seven API", version="1.0.0", lifespan=lifespan)

_backend_dir = Path(__file__).resolve().parent
_static_dir = static_dir()
_uploads_dir = uploads_dir()

# A mounted volume is served ahead of /static so admin uploads survive redeploys.
# It is seeded from the repo's bundled images first, because an empty volume
# mounted over this path would otherwise hide every seeded menu photo.
if _uploads_dir.resolve() != (_static_dir / "uploads").resolve():
    _copied = sync_bundled_uploads()
    if _copied:
        logging.getLogger("uvicorn.error").info(
            "Seeded %s bundled image(s) into the uploads volume at %s", _copied, _uploads_dir
        )
    app.mount("/static/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
allowed_origins = [o.strip() for o in _frontend_origin.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_upload_cache_headers(request: Request, call_next):
    """Uploaded images have UUID-based filenames so they are safe to cache for 1 year."""
    response = await call_next(request)
    if request.url.path.startswith("/static/uploads/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response

app.include_router(auth.router,            prefix="/api/auth",             tags=["auth"])
app.include_router(menu.router,            prefix="/api/menu",             tags=["menu"])
app.include_router(orders.router,          prefix="/api/orders",           tags=["orders"])
app.include_router(branches.router,        prefix="/api/branches",         tags=["branches"])
app.include_router(rewards.router,         prefix="/api/rewards",          tags=["rewards"])
app.include_router(contact.router,         prefix="/api/contact",          tags=["contact"])
app.include_router(faqs.router,            prefix="/api/faqs",             tags=["faqs"])
app.include_router(admin.router,           prefix="/api/admin",            tags=["admin"])
app.include_router(theme.router,           prefix="/api/theme",            tags=["theme"])
app.include_router(chatbot.router,         prefix="/api",                  tags=["chatbot"])
app.include_router(delivery.router,        prefix="/api",                  tags=["delivery"])
app.include_router(revenue_operator.router, prefix="/api/v1",              tags=["revenue-operator"])
app.include_router(events.router,           prefix="/api/v1",              tags=["events"])
app.include_router(carts.router,            prefix="/api/v1",              tags=["carts"])
app.include_router(analytics.router,        prefix="/api/v1",              tags=["analytics"])
app.include_router(competitors.router,      prefix="/api/v1",              tags=["competitors"])
app.include_router(opportunities.router,    prefix="/api/v1",              tags=["opportunities"])
app.include_router(experiments.router,      prefix="/api/v1",              tags=["experiments"])
app.include_router(missions.router,         prefix="/api/v1",              tags=["missions"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/settings")
def public_settings(restaurant_id: int = Depends(get_restaurant_id)):
    """Public site settings for the current tenant (resolved from hostname)."""
    PUBLIC_KEYS = {
        # contact / store
        "phone", "email", "address", "hours", "whatsapp",
        "instagram_url", "facebook_url", "twitter_url", "tiktok_url",
        "delivery_charge", "min_order_amount", "restaurant_open",
        "announcement", "announcement_active", "maps_embed", "tagline", "brand_name",
        "currency", "currency_symbol", "delivery_radius_km", "cash_on_delivery",
        "global_discount_percent", "global_discount_excluded_categories",
        # editable site copy — every one of these is surfaced by RestaurantContext,
        # so anything left out here silently falls back to the built-in default.
        "closed_message", "footer_tagline", "menu_subtitle",
        "contact_reply_time", "contact_hours_note",
        "deals_section_title", "deals_section_subtitle",
        "featured_section_title", "featured_section_subtitle",
        "promo_headline", "promo_body",
    }
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT key, value FROM settings WHERE restaurant_id = %s",
                (restaurant_id,),
            )
            rows = cur.fetchall()
    data = {r[0]: r[1] for r in rows if r[0] in PUBLIC_KEYS}
    defaults = {
        "brand_name": "Six Seven",
        "instagram_url": "https://instagram.com/sixseven.pk",
        "facebook_url": "https://facebook.com/sixseven.pk",
        "address": "75 CCA, DD Block, DHA Phase 4, Lahore",
        "maps_embed": "https://www.google.com/maps?q=31.4641372,74.3822137&z=16&output=embed",
    }
    for key, value in defaults.items():
        if not str(data.get(key) or "").strip():
            data[key] = value
    return data


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.exception_handler(psycopg2.OperationalError)
async def db_operational_error_handler(request: Request, exc: psycopg2.OperationalError):
    return JSONResponse(
        status_code=503,
        content={"error": "Database temporarily unavailable"},
    )


@app.exception_handler(psycopg2.InterfaceError)
async def db_interface_error_handler(request: Request, exc: psycopg2.InterfaceError):
    return JSONResponse(
        status_code=503,
        content={"error": "Database temporarily unavailable"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
