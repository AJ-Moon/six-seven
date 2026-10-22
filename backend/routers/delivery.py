"""Delivery radius check endpoint — uses Haversine formula, no external libraries."""
import math
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db import get_db
from dependencies.auth import get_restaurant_id

router = APIRouter()


# ─── Haversine ────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    d_lat = (lat2 - lat1) * math.pi / 180
    d_lng = (lng2 - lng1) * math.pi / 180
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1 * math.pi / 180)
        * math.cos(lat2 * math.pi / 180)
        * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Endpoint ─────────────────────────────────────────────────────────────────

from typing import Optional

class DeliveryCheckRequest(BaseModel):
    customerLat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    customerLng: float = Field(ge=-180, le=180, allow_inf_nan=False)
    restaurantId: Optional[int] = None


def parse_delivery_settings(settings: dict[str, str]) -> tuple[float, float, float]:
    try:
        latitude = float(settings["restaurant_lat"])
        longitude = float(settings["restaurant_lng"])
        radius_km = float(settings.get("delivery_radius_km") or "3")
        if not all(math.isfinite(value) for value in (latitude, longitude, radius_km)):
            raise ValueError("non-finite delivery setting")
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180 and radius_km > 0):
            raise ValueError("invalid delivery setting")
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Delivery is temporarily unavailable") from exc
    return latitude, longitude, radius_km


@router.post("/check-delivery")
def check_delivery(
    body: DeliveryCheckRequest,
    restaurant_id: int = Depends(get_restaurant_id),
):
    """
    Check whether a customer coordinate is within the restaurant's delivery radius.
    Returns { withinRadius, distanceKm }.
    """
    rid = body.restaurantId if body.restaurantId is not None else restaurant_id

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT key, value FROM settings
                WHERE restaurant_id = %s
                  AND key IN ('restaurant_lat', 'restaurant_lng', 'delivery_radius_km')
                """,
                (rid,),
            )
            rows = cur.fetchall()

    settings: dict[str, str] = {r[0]: r[1] for r in rows}

    rest_lat, rest_lng, radius_km = parse_delivery_settings(settings)

    distance = haversine_km(body.customerLat, body.customerLng, rest_lat, rest_lng)
    within = distance <= radius_km

    return {
        "withinRadius": within,
        "distanceKm": round(distance, 2),
        "radiusKm": radius_km,
        "configured": True,
    }
