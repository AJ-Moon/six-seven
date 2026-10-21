import unittest

from pydantic import ValidationError

from routers.orders import CreateOrderRequest


class PaymentMethodTests(unittest.TestCase):
    def test_card_on_delivery_is_rejected(self):
        with self.assertRaises(ValidationError):
            CreateOrderRequest(items=[{"menuItemId": 1, "quantity": 1}], paymentMethod="card")

    def test_remaining_payment_methods_are_accepted(self):
        for method in ("cash", "online_transfer", "pay_on_pickup"):
            with self.subTest(method=method):
                order = CreateOrderRequest(items=[{"menuItemId": 1, "quantity": 1}], paymentMethod=method)
                self.assertEqual(order.paymentMethod, method)


if __name__ == "__main__":
    unittest.main()
