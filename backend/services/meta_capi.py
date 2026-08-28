"""Server-side mirror of the browser Meta pixel (Conversions API).

The browser pixel loses a large share of its events to iOS privacy settings,
Safari's tracking prevention and ad blockers. Sending the same events from
here recovers them. Meta de-duplicates the two copies by ``event_id``, which
is the same UUID ``frontend/src/lib/analytics.ts`` stamps on every event and
passes to the pixel as ``eventID`` — so a browser event and its server twin
count once.

Disabled unless META_CAPI_ACCESS_TOKEN is set, so this is inert until the
token is configured in the environment.
"""

import hashlib
import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"

# Only events Meta can actually optimise against are forwarded. PageView and
# browsing events are deliberately excluded: high volume, no optimisation value.
EVENT_NAME_MAP = {
    "item_added_to_cart": "AddToCart",
    "checkout_started": "InitiateCheckout",
    "checkout_step_completed": "Purchase",  # only when step == ORDER_CONFIRMED
}


def is_enabled() -> bool:
    return bool(os.getenv("META_CAPI_ACCESS_TOKEN") and os.getenv("META_PIXEL_ID"))


def should_forward(event_name: str, properties: dict[str, Any]) -> bool:
    if event_name not in EVENT_NAME_MAP:
        return False
    if event_name == "checkout_step_completed":
        return properties.get("step") == "ORDER_CONFIRMED"
    return True


def _hashed(value: Optional[str]) -> Optional[str]:
    """Meta requires SHA-256 of the lowercased, trimmed value."""
    if not value:
        return None
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _build_user_data(metadata: dict[str, Any]) -> dict[str, Any]:
    user_data: dict[str, Any] = {}
    if ip := metadata.get("clientIp"):
        user_data["client_ip_address"] = ip
    if ua := metadata.get("userAgent"):
        user_data["client_user_agent"] = ua
    # fbc is derived from the fbclid Meta appends to the ad's landing URL; fbp
    # is the pixel's own first-party cookie. Together they are the strongest
    # match signals available without collecting personal data.
    if fbc := metadata.get("fbc"):
        user_data["fbc"] = fbc
    if fbp := metadata.get("fbp"):
        user_data["fbp"] = fbp
    if email := _hashed(metadata.get("email")):
        user_data["em"] = email
    if phone := _hashed(metadata.get("phone")):
        user_data["ph"] = phone
    return user_data


def build_payload(metadata: dict[str, Any]) -> Optional[dict[str, Any]]:
    event_name = metadata.get("eventName", "")
    properties: dict[str, Any] = metadata.get("properties") or {}
    if not should_forward(event_name, properties):
        return None

    user_data = _build_user_data(metadata)
    if not user_data:
        # Meta rejects events with no matching parameters at all.
        return None

    custom_data: dict[str, Any] = {"currency": properties.get("currency") or "PKR"}
    if event_name == "item_added_to_cart":
        price = properties.get("displayedPrice")
        quantity = properties.get("quantity") or 1
        if isinstance(price, (int, float)):
            custom_data["value"] = price * quantity
        if item_id := metadata.get("itemId"):
            custom_data["content_ids"] = [str(item_id)]
            custom_data["content_type"] = "product"
        if name := properties.get("name"):
            custom_data["content_name"] = name
    elif event_name == "checkout_started":
        custom_data["value"] = properties.get("displayedTotal")
        custom_data["num_items"] = properties.get("itemCount")
    else:  # Purchase
        custom_data["value"] = properties.get("total")
        if order_id := metadata.get("orderId"):
            custom_data["order_id"] = str(order_id)

    if custom_data.get("value") is None:
        return None

    event: dict[str, Any] = {
        "event_name": EVENT_NAME_MAP[event_name],
        "event_time": metadata["eventTime"],
        "event_id": metadata["eventId"],
        "action_source": "website",
        "user_data": user_data,
        "custom_data": custom_data,
    }
    if url := metadata.get("eventSourceUrl"):
        event["event_source_url"] = url
    return {"data": [event]}


def forward_event(cursor, tenant_id: int, metadata: dict[str, Any]) -> None:
    """Job handler. Raises on transport failure so the worker retries."""
    if not is_enabled():
        logger.debug("Meta CAPI disabled; skipping event %s", metadata.get("eventId"))
        return

    payload = build_payload(metadata)
    if payload is None:
        return

    pixel_id = os.getenv("META_PIXEL_ID", "")
    token = os.getenv("META_CAPI_ACCESS_TOKEN", "")
    if test_code := os.getenv("META_CAPI_TEST_EVENT_CODE"):
        payload["test_event_code"] = test_code

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{pixel_id}/events"
    response = httpx.post(
        url, params={"access_token": token}, json=payload, timeout=10.0
    )
    if response.status_code >= 400:
        # 4xx usually means a malformed payload, which a retry will not fix —
        # log it and let the job succeed rather than burning all attempts.
        if response.status_code < 500:
            logger.warning(
                "Meta CAPI rejected event %s: %s %s",
                metadata.get("eventId"), response.status_code, response.text[:400],
            )
            return
        response.raise_for_status()
