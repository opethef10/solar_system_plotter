#! /usr/bin/env python
from datetime import timedelta
from io import BytesIO
from pathlib import Path

import imageio.v2 as imageio
import matplotlib.pyplot as plt

from utils import parse_args, solar_system_json, plot_from_json

MAIN_DIR = Path(__file__).parent
OUTPUT_DIR = MAIN_DIR / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)


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
            # It's faster and doesn't require cleaning up the file afterward
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
