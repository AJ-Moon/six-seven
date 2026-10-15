import unittest

from fastapi import HTTPException

from scripts.seed_six_seven import DEAL_MENU
from services.commerce import RequestedLine, price_menu_lines


class DealCursor:
    def __init__(self, item):
        self.item = item
        self.query = ""

    def execute(self, query, params):
        self.query = query

    def fetchall(self):
        if "FROM settings" in self.query:
            return [
                ("global_discount_percent", "15"),
                ("global_discount_excluded_categories", "Burgers"),
            ]
        item = self.item
        return [(
            101, item["name"], item["category"], "PKR", item["price_rs"] * 100,
            None, None, 0, True, item["customizations"],
        )]


def first_valid_choices(item):
    selected = []
    choices = {}
    for config in item["customizations"]:
        dependency = config.get("dependsOn")
        if dependency and dependency["optionId"] != choices.get(dependency["groupId"]):
            continue
        if not config["required"]:
            continue
        option = config["options"][0]
        choices[config["id"]] = option["id"]
        selected.append({
            "groupId": config["id"],
            "optionId": option["id"],
            "quantity": config["minSelections"],
        })
    return tuple(selected)


class DealPricingTests(unittest.TestCase):
    def test_every_deal_is_full_price_with_global_discount_enabled(self):
        expected = {
            "The Solo Feast": 1349,
            "The Family Feast": 3999,
            "Double Trouble": 1699,
            "Coffee Lovers' Heaven": 1599,
            "Coffee & Crunch Deal": 1099,
        }
        self.assertEqual({item["name"]: item["price_rs"] for item in DEAL_MENU}, expected)
        for item in DEAL_MENU:
            with self.subTest(item=item["name"]):
                cursor = DealCursor(item)
                lines = price_menu_lines(
                    cursor, 1,
                    [RequestedLine(101, 1, customizations=first_valid_choices(item))],
                )
                self.assertEqual(lines[0].net_unit_price_cents, item["price_rs"] * 100)
                self.assertEqual(lines[0].gross_unit_price_cents, item["price_rs"] * 100)

    def test_required_deal_choices_cannot_be_skipped(self):
        for item in DEAL_MENU:
            with self.subTest(item=item["name"]):
                with self.assertRaises(HTTPException) as raised:
                    price_menu_lines(DealCursor(item), 1, [RequestedLine(101, 1)])
                self.assertEqual(raised.exception.status_code, 422)

    def test_chicken_burger_requires_two_sauces_even_if_same(self):
        item = DEAL_MENU[0]
        with self.assertRaises(HTTPException):
            price_menu_lines(
                DealCursor(item), 1,
                [RequestedLine(101, 1, customizations=(
                    {"groupId": "burger-1", "optionId": "mighty-double-zinger"},
                    {"groupId": "drink", "optionId": "coke"},
                ))],
            )
        self.assertEqual(
            price_menu_lines(
                DealCursor(item), 1,
                [RequestedLine(101, 1, customizations=first_valid_choices(item))],
            )[0].net_unit_price_cents,
            134900,
        )


if __name__ == "__main__":
    unittest.main()
