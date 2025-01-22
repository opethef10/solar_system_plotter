#! /usr/bin/env python

import matplotlib.pyplot as plt

from utils import parse_args, solar_system_json, plot_from_json, create_anim

if __name__ == '__main__':
    args = parse_args()

    if args.gif:
        anim = create_anim(args.date, args.duration, args.interval, args.geocentric)

    else:
        data = solar_system_json(args.date)
        fig, ax = plt.subplots(subplot_kw={'projection': 'polar'})
        plot_from_json(ax, data, geocentric=args.geocentric)

    plt.show()
