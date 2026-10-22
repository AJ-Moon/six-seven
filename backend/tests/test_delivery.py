import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from routers.delivery import DeliveryCheckRequest, haversine_km, parse_delivery_settings
from routers.orders import CreateOrderRequest


class DeliveryValidationTests(unittest.TestCase):
    def test_radius_defaults_to_three_kilometres(self):
        self.assertEqual(
            parse_delivery_settings({"restaurant_lat": "31.4641372", "restaurant_lng": "74.3822137"})[2],
            3,
        )

    def test_missing_or_invalid_store_location_fails_closed(self):
        for settings in ({}, {"restaurant_lat": "bad", "restaurant_lng": "74.38"}):
            with self.subTest(settings=settings), self.assertRaises(HTTPException) as raised:
                parse_delivery_settings(settings)
            self.assertEqual(raised.exception.status_code, 503)

    def test_askari_ten_is_outside_three_kilometres(self):
        self.assertGreater(haversine_km(31.4641372, 74.3822137, 31.5356, 74.4166), 3)

    def test_invalid_customer_coordinates_are_rejected(self):
        with self.assertRaises(ValidationError):
            DeliveryCheckRequest(customerLat=95, customerLng=74)
        with self.assertRaises(ValidationError):
            CreateOrderRequest(items=[{"menuItemId": 1, "quantity": 1}], customerLat=95, customerLng=74)


if __name__ == "__main__":
    unittest.main()
