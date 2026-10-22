import unittest

from fastapi import HTTPException

from scripts.seed_six_seven import MEAL_ADDONS
from services.commerce import _price_selected_customizations


class MealDrinkTests(unittest.TestCase):
    def test_meal_requires_fries_and_signature_drink(self):
        selected = (
            {"groupId": "meal", "optionId": "make-meal"},
            {"groupId": "meal-fries", "optionId": "plain-fries"},
        )
        with self.assertRaises(HTTPException) as raised:
            _price_selected_customizations("Mighty Zinger", MEAL_ADDONS, selected)
        self.assertEqual(raised.exception.status_code, 422)

        modifier, details, _ = _price_selected_customizations(
            "Mighty Zinger",
            MEAL_ADDONS,
            selected + ({"groupId": "meal-drink", "optionId": "mango-burst"},),
        )
        self.assertEqual(modifier, 63000)
        self.assertIn("Mango Burst", [detail["optionName"] for detail in details])

    def test_drink_cannot_be_added_without_meal(self):
        with self.assertRaises(HTTPException) as raised:
            _price_selected_customizations(
                "Mighty Zinger",
                MEAL_ADDONS,
                ({"groupId": "meal-drink", "optionId": "peach-breeze"},),
            )
        self.assertEqual(raised.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
