#! /usr/bin/env python
import argparse
from datetime import date as Date, timedelta
from functools import cache
from io import BytesIO
import json
from pathlib import Path

from ephem import Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Uranus, Neptune
import imageio.v2 as imageio
import matplotlib.pyplot as plt


MAIN_DIR = Path(__file__).parent
OUTPUT_DIR = MAIN_DIR / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)

DEFAULT_NUM_DAYS = 1000
DEFAULT_INTERVAL = 5

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
            "hlon": planet.hlon,  # Heliocentric longitude
            "ra": planet.ra,      # Right ascension
        })
    return json.dumps(data)


@cache
def plot_from_json(data: str, geocentric: bool=False, interactive: bool=True) -> plt.Figure:
    """Generate a matplotlib figure from JSON data."""
    data = json.loads(data)  # Convert the JSON string back to a dictionary
    if not interactive:
        # Plot using Matplotlib with a non-interactive backend
        plt.switch_backend("Agg")  # Use the Agg backend to avoid GUI issues
    fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})
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
    return fig


if __name__ == '__main__':
    args = parse_args()

    if args.gif:
        images = []
        for day in range(0, args.duration, args.interval):
            date = args.date + timedelta(days=day)

            # Print the progress
            total = args.duration // args.interval
            current = day // args.interval + 1
            percentage = int(current / total * 100)
            print(f"Generating plots {percentage}%\r", end='')

            data = solar_system_json(date)
            fig = plot_from_json(data, geocentric=args.geocentric)

            # Save the figure to a buffer instead of a file
            # It's faster and doesn't require cleaning up the file afterwards
            buffer = BytesIO()
            fig.savefig(buffer)
            img = imageio.imread(buffer.getvalue())
            images.append(img)
            plt.close(fig)

        formatted_date = args.date.isoformat()
        graph_format = "geocentric" if args.geocentric else "solar"
        save_path = OUTPUT_DIR / f"{graph_format}_{formatted_date}.gif"
        imageio.mimsave(save_path, images)
        print()
        print(f"Saved gif to {save_path}")

    else:
        data = solar_system_json(args.date)
        fig = plot_from_json(data, geocentric=args.geocentric)
        plt.show()
