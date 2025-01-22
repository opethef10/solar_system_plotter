import argparse
from datetime import date as Date, timedelta
from functools import cache
from io import BytesIO
import json

from ephem import Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Uranus, Neptune
import imageio.v2 as imageio
from matplotlib import pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.axes import Axes


DEFAULT_NUM_DAYS = 1000
DEFAULT_INTERVAL = 5
FPS = 15

TITLE_FONT_SIZE = 11
TITLE_Y = 1.07
LEGEND_FONT_SIZE = "small"
BBOX = (1.21, 0.8)

PLANETS = Moon(), Mercury(), Venus(), Sun(), Mars(), Jupiter(), Saturn(), Uranus(), Neptune()


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments for the script."""

    parser = argparse.ArgumentParser(description='Plot the solar system')
    parser.add_argument(
        '--geocentric',
        action='store_true',
        help='Plot the geocentric view'
    )
    parser.add_argument(
        '--date',
        type=Date.fromisoformat,
        default=Date.today(),
        help='Date to plot (format: yyyy-mm-dd)'
    )
    parser.add_argument(
        '--gif',
        action='store_true',
        help='Create a gif'
    )
    parser.add_argument(
        '--duration', type=int, default=DEFAULT_NUM_DAYS,
        help='Number of days to plot'
    )
    parser.add_argument(
        '--interval', type=int, default=DEFAULT_INTERVAL,
        help='Number of days between plots'
    )
    return parser.parse_args()


@cache
def solar_system_json(date: Date) -> str:
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
    return json.dumps(data)


def plot_from_json(ax: Axes, data: str, geocentric: bool=False) -> Axes:
    """Generate a matplotlib figure from JSON data."""
    data = json.loads(data)  # Convert the JSON string back to a dictionary
    title_prefix = "Geocentric view" if geocentric else "Solar system"
    ax.set_title(f"{title_prefix} at {data['date']}", fontsize=TITLE_FONT_SIZE, y=TITLE_Y)

    for planet in data["planets"]:
        marker = 'o'
        if planet["name"] == "Moon":
            marker = 'x' if geocentric else '*'
        elif planet["name"] == "Sun":
            marker = '*' if geocentric else 'x'
        angle = planet["ra"] if geocentric else planet["hlon"]
        radius = planet["geo_radius"] if geocentric else planet["radius"]
        label = planet["geocentric_label"] if geocentric else planet["heliocentric_label"]
        ax.plot(angle, radius, marker=marker, label=label)

    ax.legend(loc='upper center', bbox_to_anchor=BBOX, fontsize=LEGEND_FONT_SIZE)
    ax.set_yticklabels([])
    return ax


@cache
def create_anim(date: Date, duration: int, interval: int, geocentric: bool) -> FuncAnimation:
    """Create a gif of the solar system for a given date."""
    date_range = [
        date + timedelta(days=day)
        for day in range(0, duration, interval)
    ]

    fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})

    def update_plot(date):
        """Update the plot for the given date."""
        ax.clear()
        data = solar_system_json(date)
        return plot_from_json(ax, data, geocentric=geocentric)

    anim = FuncAnimation(
        fig,
        update_plot,
        frames=date_range,
        interval=1 / FPS,
        repeat=True
    )

    return anim


@cache
def _create_frames(date: Date, duration: int, interval: int, geocentric: bool) -> list:
    date_range = [date + timedelta(days=i) for i in range(0, duration, interval)]
    fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})
    frames = []

    for frame_date in date_range:
        ax.clear()
        data = solar_system_json(frame_date)
        plot_from_json(ax, data, geocentric)
        buf = BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        frames.append(imageio.imread(buf))
        buf.close()

    return frames

def create_gif(date: Date, duration: int, interval: int, geocentric: bool) -> BytesIO:
    frames = _create_frames(date, duration, interval, geocentric)
    buffer = BytesIO()
    imageio.mimsave(buffer, frames, format='gif', fps=FPS, loop=0)
    buffer.seek(0)
    return buffer
