from datetime import date as Date
from functools import cache

from ephem import Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Uranus, Neptune


# Constants both for Flask and __main__.py
DEFAULT_NUM_DAYS = 1000
MAX_NUM_DAYS = 1000
DEFAULT_INTERVAL = 5
MAX_INTERVAL = 20

# Ephem planet classes
PLANETS = Moon(), Mercury(), Venus(), Sun(), Mars(), Jupiter(), Saturn(), Uranus(), Neptune()


@cache
def solar_system_json(date: Date) -> dict:
    """Generate JSON data for the solar system at a given date."""
    data = {"date": date.isoformat(), "planets": []}

    for radius, planet in enumerate(PLANETS):
        planet.compute(date)
        if planet.name == "Sun":
            heliocentric_label = "Earth"
        elif planet.name == "Moon":
            heliocentric_label = "Sun"
        else:
            heliocentric_label = planet.name
        data["planets"].append({
            "name": planet.name,
            "geocentric_label": planet.name,
            "heliocentric_label": heliocentric_label,
            "radius": radius,
            "geo_radius": 0.5 if planet.name == "Moon" else radius,
            "hlon": round(planet.hlon, 2),  # Heliocentric longitude
            "ra": round(planet.ra, 2)   # Right ascension
        })
    return data


