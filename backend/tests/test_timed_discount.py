from datetime import datetime

from services.commerce import effective_global_discount_percent, effective_sale_price_cents


def test_timed_discount_ends_at_pakistan_midnight():
    settings = {
        "global_discount_percent": "20",
        "global_discount_ends_at": "2026-11-29T00:00:00+05:00",
    }
    before = effective_global_discount_percent(settings, datetime.fromisoformat("2026-11-28T18:59:59+00:00"))
    at_cutoff = effective_global_discount_percent(settings, datetime.fromisoformat("2026-11-28T19:00:00+00:00"))
    assert before == 20
    assert at_cutoff == 0
    assert effective_sale_price_cents(73000, None, "Burgers", before, {"deals"}) == 58400
    assert effective_sale_price_cents(73000, None, "Burgers", at_cutoff, {"deals"}) is None
    assert effective_sale_price_cents(134900, None, "Deals", before, {"deals"}) is None


def test_unscheduled_discounts_and_individual_sales_still_work():
    assert effective_global_discount_percent({"global_discount_percent": "15"}) == 15
    assert effective_global_discount_percent({
        "global_discount_percent": "20", "global_discount_ends_at": "2026-11-29T00:00:00",
    }) == 0
    assert effective_sale_price_cents(73000, 65000, "Burgers", 0, set()) == 65000
