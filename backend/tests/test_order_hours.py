import unittest
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from routers.orders import _orders_open_now


KARACHI = ZoneInfo("Asia/Karachi")


class OrderHoursTests(unittest.TestCase):
    def test_opening_windows_and_overnight_boundaries(self):
        cases = [
            ("2026-09-21 11:59", False),  # Monday
            ("2026-09-21 12:00", True),
            ("2026-09-22 00:59", True),
            ("2026-09-22 01:00", False),
            ("2026-09-25 00:59", True),  # Thursday night into Friday
            ("2026-09-25 01:00", False),
            ("2026-09-25 16:59", False),
            ("2026-09-25 17:00", True),
            ("2026-09-26 01:59", True),
            ("2026-09-26 02:00", False),
            ("2026-09-26 17:00", True),
            ("2026-09-27 02:00", False),
            ("2026-09-27 17:00", True),
            ("2026-09-28 01:59", True),  # Sunday night into Monday
            ("2026-09-28 02:00", False),
        ]
        for timestamp, expected in cases:
            with self.subTest(timestamp=timestamp):
                local = datetime.strptime(timestamp, "%Y-%m-%d %H:%M").replace(tzinfo=KARACHI)
                self.assertEqual(_orders_open_now(local), expected)
                self.assertEqual(_orders_open_now(local.astimezone(timezone.utc)), expected)


if __name__ == "__main__":
    unittest.main()
