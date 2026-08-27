import unittest

from fastapi import HTTPException

from services.commerce import RequestedLine, price_menu_lines


class FakeCursor:
    def __init__(self, rows, settings_rows=None):
        self.rows = rows
        self.settings_rows = settings_rows or []
        self.last_query = ""
        self.executed = []

    def execute(self, query, params):
        self.last_query = query
        self.executed.append((query, params))

    def fetchall(self):
        if "FROM settings" in self.last_query:
            return self.settings_rows
        return self.rows


class CommercePricingTests(unittest.TestCase):
    def test_uses_database_sale_price_and_cost_snapshot(self):
        cursor = FakeCursor([(7, "Pizza", "pizza", "USD", 1500, 1200, 500, 75, True, [])])
        lines = price_menu_lines(cursor, 3, [RequestedLine(7, 2)])
        self.assertEqual(lines[0].net_unit_price_cents, 1200)
        self.assertEqual(lines[0].line_revenue_cents, 2400)
        self.assertEqual(lines[0].line_margin_cents, 1250)
        self.assertEqual(cursor.executed[-1][1], (3, [7]))

    def test_rejects_missing_tenant_item(self):
        cursor = FakeCursor([])
        with self.assertRaises(HTTPException) as raised:
            price_menu_lines(cursor, 3, [RequestedLine(99, 1)])
        self.assertEqual(raised.exception.status_code, 422)

    def test_rejects_unavailable_item(self):
        cursor = FakeCursor([(7, "Pizza", "pizza", "USD", 1500, None, 500, 0, False, [])])
        with self.assertRaises(HTTPException) as raised:
            price_menu_lines(cursor, 3, [RequestedLine(7, 1)])
        self.assertEqual(raised.exception.status_code, 409)

    def test_prices_required_customizations(self):
        customizations = [
            {
                "id": "size",
                "name": "Size",
                "required": True,
                "minSelections": 1,
                "maxSelections": 1,
                "options": [
                    {"id": "small", "name": "Small", "priceDeltaCents": 0},
                    {"id": "large", "name": "Large", "priceDeltaCents": 30000},
                ],
            }
        ]
        cursor = FakeCursor([(7, "Tenders", "Chicken Tenders", "PKR", 67000, None, 20000, 0, True, customizations)])
        with self.assertRaises(HTTPException):
            price_menu_lines(cursor, 3, [RequestedLine(7, 1)])

        lines = price_menu_lines(
            cursor,
            3,
            [RequestedLine(7, 1, customizations=({"groupId": "size", "optionId": "large"},))],
        )
        self.assertEqual(lines[0].net_unit_price_cents, 97000)
        self.assertEqual(lines[0].customizations[0]["optionName"], "Large")


if __name__ == "__main__":
    unittest.main()
