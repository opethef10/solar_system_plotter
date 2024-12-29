#! /usr/bin/env python
import argparse
from datetime import datetime, timedelta, UTC
from io import BytesIO
from pathlib import Path

from ephem import Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Uranus, Neptune
import imageio.v2 as imageio
import matplotlib.pyplot as plt


MAIN_DIR = Path(__file__).parent
OUTPUT_DIR = MAIN_DIR / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)

DEFAULT_NUM_DAYS = 1000
DEFAULT_INTERVAL = 5

DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
DATE_FILE_FORMAT = '%Y%m%d_%H%M%S'

TITLE_FONT_SIZE = 10
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
        type=lambda s: datetime.strptime(s, DATE_FORMAT).replace(tzinfo=UTC),
        default=datetime.now(UTC),
        help=f'Date to plot (format: {DATE_FORMAT})'
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


def solar_system_figure(date: datetime = datetime.now(UTC), planets: tuple = PLANETS) -> plt.Figure:
    """Generate a polar plot of the solar system."""

    fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})
    ax.set_title(f'Solar system at {date} UTC', fontsize=TITLE_FONT_SIZE)

    # Radius is used to plot the planets at different distances from the Earth
    # The Sun is at the center of the plot and the planets are in the order of the tuple
    for radius, planet in enumerate(planets):
        planet.compute(date)

        if planet.name == "Moon":
            marker = '*'
            label = "Sun"
        elif planet.name == "Sun":
            marker = 'x'
            label = "Earth"
        else:
            label = planet.name
            marker = 'o'
        ax.plot(planet.hlon, radius, marker=marker, label=label)

    ax.legend(loc='upper center', bbox_to_anchor=BBOX, fontsize=LEGEND_FONT_SIZE)
    ax.set_yticklabels([])
    return fig


def geocentric_figure(date: datetime = datetime.now(UTC), planets: tuple = PLANETS) -> plt.Figure:
    """Generate a polar plot of the geocentric view of the solar system."""

    fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})
    ax.set_title(f'Geocentric view at {date} UTC', fontsize=TITLE_FONT_SIZE)

    # Radius is used to plot the planets at different distances from the Earth
    # Because of the geocentric view, the Earth is at the center of the plot
    # The Moon is very close to the Earth, so we plot it at a radius of 0.5
    for radius, planet in enumerate(planets):
        planet.compute(date)
        if planet.name == "Moon":
            marker = 'x'
            radius = 0.5
        elif planet.name == "Sun":
            marker = '*'
        else:
            marker = 'o'
        ax.plot(planet.ra, radius, marker=marker, label=planet.name)

    ax.legend(loc='upper center', bbox_to_anchor=BBOX, fontsize=LEGEND_FONT_SIZE)
    ax.set_yticklabels([])
    return fig


if __name__ == '__main__':
    args = parse_args()
    formatted_date = args.date.strftime(DATE_FILE_FORMAT)

    if args.gif:
        images = []
        for day in range(0, args.duration, args.interval):
            date = args.date + timedelta(days=day)

            # Print the progress
            total = args.duration // args.interval
            current = day // args.interval + 1
            print(f"Generating plot {current}/{total}\r", end='')

            if args.geocentric:
                fig = geocentric_figure(date)
            else:
                fig = solar_system_figure(date)

            # Save the figure to a buffer instead of a file
            # It's faster and doesn't require cleaning up the file afterwards
            buffer = BytesIO()
            fig.savefig(buffer)
            img = imageio.imread(buffer.getvalue())
            images.append(img)
            plt.close(fig)

        if args.geocentric:
            save_path = OUTPUT_DIR / f"geo_{formatted_date}.gif"
        else:
            save_path = OUTPUT_DIR / f"solar_{formatted_date}.gif"
        imageio.mimsave(save_path, images)
        print()
        print(f"Saved gif to {save_path}")

    else:
        if args.geocentric:
            fig = geocentric_figure(args.date)
        else:
            fig = solar_system_figure(args.date)
        plt.show()
