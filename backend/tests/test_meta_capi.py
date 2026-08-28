import os

from services.meta_capi import EVENT_NAME_MAP, build_payload, is_enabled, should_forward


BASE = {
    "eventId": "e-123",
    "eventTime": 1756000000,
    "eventSourceUrl": "/menu",
    "clientIp": "203.0.113.9",
    "userAgent": "Mozilla/5.0",
}


def test_only_optimisable_events_are_forwarded():
    assert should_forward("item_added_to_cart", {})
    assert should_forward("checkout_started", {})
    # browsing noise stays first-party
    assert not should_forward("item_impression", {})
    assert not should_forward("page_viewed", {})
    assert not should_forward("chat_opened", {})


def test_purchase_only_forwards_on_confirmed_step():
    assert should_forward("checkout_step_completed", {"step": "ORDER_CONFIRMED"})
    assert not should_forward("checkout_step_completed", {"step": "ADDRESS"})
    assert not should_forward("checkout_step_completed", {})


def test_purchase_payload_reports_rupees_not_cents():
    payload = build_payload({
        **BASE,
        "eventName": "checkout_step_completed",
        "orderId": "9001",
        "properties": {"step": "ORDER_CONFIRMED", "total": 1374.0, "currency": "PKR"},
    })
    event = payload["data"][0]
    assert event["event_name"] == "Purchase"
    assert event["custom_data"]["value"] == 1374.0
    assert event["custom_data"]["currency"] == "PKR"
    assert event["custom_data"]["order_id"] == "9001"
    # dedup key must match the browser pixel's eventID
    assert event["event_id"] == "e-123"
    assert event["action_source"] == "website"


def test_add_to_cart_multiplies_price_by_quantity():
    payload = build_payload({
        **BASE,
        "eventName": "item_added_to_cart",
        "itemId": 449,
        "properties": {"displayedPrice": 1224, "quantity": 2, "name": "Triple Stack"},
    })
    custom = payload["data"][0]["custom_data"]
    assert custom["value"] == 2448
    assert custom["content_ids"] == ["449"]
    assert custom["content_name"] == "Triple Stack"


def test_click_and_browser_ids_reach_user_data():
    payload = build_payload({
        **BASE,
        "eventName": "checkout_started",
        "fbc": "fb.1.1756000000000.abc123",
        "fbp": "fb.1.1755000000000.987654321",
        "properties": {"displayedTotal": 1224, "itemCount": 1},
    })
    user_data = payload["data"][0]["user_data"]
    assert user_data["fbc"] == "fb.1.1756000000000.abc123"
    assert user_data["fbp"] == "fb.1.1755000000000.987654321"
    assert user_data["client_ip_address"] == "203.0.113.9"


def test_personal_identifiers_are_hashed_never_sent_raw():
    payload = build_payload({
        **BASE,
        "eventName": "checkout_started",
        "email": " Person@Example.COM ",
        "properties": {"displayedTotal": 500, "itemCount": 1},
    })
    user_data = payload["data"][0]["user_data"]
    assert "person@example.com" not in str(payload)
    # sha256 of the trimmed, lowercased address
    assert user_data["em"] == "542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345"


def test_events_without_matching_signals_are_dropped():
    assert build_payload({
        "eventId": "e-1", "eventTime": 1, "eventName": "checkout_started",
        "properties": {"displayedTotal": 500},
    }) is None


def test_events_without_a_value_are_dropped():
    assert build_payload({
        **BASE, "eventName": "checkout_started", "properties": {"itemCount": 1},
    }) is None


def test_disabled_without_credentials(monkeypatch):
    monkeypatch.delenv("META_CAPI_ACCESS_TOKEN", raising=False)
    assert not is_enabled()
    monkeypatch.setenv("META_CAPI_ACCESS_TOKEN", "tok")
    monkeypatch.setenv("META_PIXEL_ID", "850716231340911")
    assert is_enabled()


def test_event_map_matches_browser_pixel_names():
    assert set(EVENT_NAME_MAP.values()) == {"AddToCart", "InitiateCheckout", "Purchase"}
