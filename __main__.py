#! /usr/bin/env python
import argparse
from datetime import date as Date, timedelta
import json

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.axes import Axes

from utils import solar_system_json, DEFAULT_NUM_DAYS, DEFAULT_INTERVAL

# Matplotlib settings
TITLE_FONT_SIZE = 11
TITLE_Y = 1.07
LEGEND_FONT_SIZE = "small"
BBOX = (1.21, 0.8)
FPS = 20


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

if __name__ == '__main__':
    args = parse_args()

    if args.gif:
        anim = create_anim(args.date, args.duration, args.interval, args.geocentric)

    else:
        data = solar_system_json(args.date)
        fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})
        plot_from_json(ax, data, geocentric=args.geocentric)

    plt.show()
