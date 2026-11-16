#! /usr/bin/env python
"""Regenerate tests/golden.json from ephem (needs `pip install -r requirements_cli.txt`).

The JS port in public/solar.js is checked against these numbers by tests/solar.test.js.
"""
import json
import sys
from datetime import date as Date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from utils import PLANETS  # noqa: E402

DATES = [
    Date(1600, 3, 1), Date(1800, 7, 4), Date(1900, 1, 1), Date(1950, 6, 15), Date(1999, 12, 31),
    Date(2000, 1, 1), Date(2010, 5, 5), Date(2024, 1, 1), Date(2026, 9, 20), Date(2035, 11, 11),
    Date(2100, 2, 28), Date(2200, 8, 8), Date(2500, 4, 4), Date(3000, 1, 1),
]
DATES += [Date(2026, 9, 20) + timedelta(days=170 * k) for k in range(1, 7)]


def main() -> None:
    dates = []
    for day in DATES:
        planets = {}
        for planet in PLANETS:
            planet.compute(day)
            planets[planet.name] = {"hlon": round(float(planet.hlon), 6), "ra": round(float(planet.ra), 6)}
        dates.append({"date": day.isoformat(), "planets": planets})
    out = {
        "_comment": "Reference values produced by ephem (utils.solar_system_json without rounding): "
                    "compute(date) at 00:00 UTC, radians. Regenerate with tests/make_golden.py.",
        "dates": dates,
    }
    Path(__file__).with_name("golden.json").write_text(json.dumps(out, indent=1) + "\n")


if __name__ == "__main__":
    main()
