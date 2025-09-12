#! /usr/bin/env python
from datetime import date as Date, timedelta
import json
import unittest

from flask_app import app

class APITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_default_request(self):
        """Test /api with no query parameters"""
        response = self.app.get("/api")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_date_parameter(self):
        """Test /api with a specific date"""
        date_str = Date.today().isoformat()
        response = self.app.get(f"/api?date={date_str}")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, list)

    def test_gif_mode(self):
        """Test /api with gif=true, duration, interval"""
        response = self.app.get("/api?gif=true&duration=10&interval=2")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 10 // 2 + 1)

    def test_gif_false_ignores_duration_interval(self):
        """Test /api with gif=false, duration and interval should be ignored"""
        response = self.app.get("/api?gif=false&duration=1000&interval=50")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 1)

    def test_gif_uppercase(self):
        """Test /api with GIF parameter in uppercase"""
        response = self.app.get("/api?gif=TRUE&duration=4&interval=2")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 4 // 2 + 1)

    def test_zero_or_negative_values(self):
        """Test /api with zero or negative duration/interval"""
        response = self.app.get("/api?gif=true&duration=0&interval=2")
        self.assertEqual(response.status_code, 400)
        response = self.app.get("/api?gif=true&duration=10&interval=0")
        self.assertEqual(response.status_code, 400)
        response = self.app.get("/api?gif=true&duration=-5&interval=2")
        self.assertEqual(response.status_code, 400)

    def test_numeric_string_values(self):
        """Test /api with numeric string parameters"""
        response = self.app.get("/api?gif=true&duration=10.0&interval=2.0")
        self.assertEqual(response.status_code, 400)

    def test_extra_query_params(self):
        """Test /api ignores unknown query parameters"""
        response = self.app.get("/api?gif=true&duration=4&interval=2&foo=bar&abc=123")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 4 // 2 + 1)

    def test_gif_variations(self):
        """Test different representations of gif parameter"""
        for value in ["True", "TRUE", "tRuE", "false", "FALSE", "FaLsE"]:
            response = self.app.get(f"/api?gif={value}&duration=4&interval=2")
            self.assertEqual(response.status_code, 200)

    def test_duration_smaller_than_interval(self):
        """Test duration smaller than interval, should return 1 entry"""
        response = self.app.get("/api?gif=true&duration=2&interval=10")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 1)

    def test_invalid_date(self):
        """Test /api with invalid date format"""
        response = self.app.get("/api?date=2025-99-99")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn("error", data)

    def test_default_date_with_gif(self):
        """Test /api with GIF mode and no date (should use today)"""
        response = self.app.get("/api?gif=true&duration=4&interval=2")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 4 // 2 + 1)

    def test_invalid_duration_interval(self):
        """Test /api with non-integer duration and interval"""
        response = self.app.get("/api?gif=true&duration=abc&interval=xyz")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn("error", data)

    def test_duration_exceeds_max(self):
        """Test /api with duration exceeding MAX_NUM_DAYS"""
        response = self.app.get(f"/api?gif=true&duration=10000&interval=1")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn("error", data)

    def test_interval_exceeds_max(self):
        """Test /api with interval exceeding MAX_INTERVAL"""
        response = self.app.get(f"/api?gif=true&duration=10&interval=100")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn("error", data)

    def test_overflow_duration(self):
        """Test /api with a duration that would exceed Date.max"""
        date_str = "9999-12-30"
        duration = 1000
        interval = 1
        response = self.app.get(f"/api?gif=true&date={date_str}&duration={duration}&interval={interval}")
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
