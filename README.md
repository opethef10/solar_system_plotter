# Solar System Plotter

## Overview
This project provides tools to visualize the solar system in either heliocentric or geocentric views using a polar coordinate system. Users can plot celestial positions for a specific date or generate an animated GIF showing movements over time.

## Features
- **Heliocentric and Geocentric Views**: Choose between visualizing planetary positions relative to the Sun or Earth.
- **Custom Date Input**: Specify the date for plotting celestial bodies.
- **GIF Generation**: Create animations for a specified time range and interval.
- **User-Friendly Output**: Plots are either displayed interactively or saved in an `output` directory.

## Requirements
The project requires the following third-party Python packages:

- `ephem`
- `imageio`
- `matplotlib`

Install the dependencies using the `requirements.txt` file:

```bash
pip install -r requirements.txt
```

## Installation
1. Clone this repository:
   ```bash
   git clone git@github.com:opethef10/solar_system_plotter.git
   cd solar_system_plotter
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Command-Line Arguments
| Argument        | Description                                                   | Default                       |
|-----------------|---------------------------------------------------------------|-------------------------------|
| `--geocentric`  | Plot the geocentric view (default is heliocentric).            | `False`                       |
| `--date`        | Date to plot (format: `%Y-%m-%d %H:%M:%S`).                   | Current UTC time              |
| `--gif`         | Create a GIF animation.                                       | `False`                       |
| `--duration`    | Total number of days to include in the animation (GIF mode).  | `1000`                        |
| `--interval`    | Interval in days between frames in the GIF (GIF mode).        | `5`                           |

### Examples

1. **Plot a heliocentric view for the current date:**
   ```bash
   python __main__.py
   ```

2. **Plot a geocentric view for a specific date:**
   ```bash
   python __main__.py --geocentric --date "2024-01-01 00:00:00"
   ```

3. **Generate a heliocentric GIF for 100 days with a 10-day interval:**
   ```bash
   python __main__.py --gif --duration 100 --interval 10
   ```

## Output
Plots and GIFs are saved in the `output` directory under the project folder. The filenames include the type of view (`geo` or `solar`) and the date.

## Implementation Details
- **Heliocentric View**: Plots planets around the Sun at their ecliptic longitudes.
- **Geocentric View**: Plots planets around Earth using right ascension values.
- **GIF Creation**: Saves frames in memory and compiles them into a GIF using `imageio`.

## Notes
- The Moon's radius is fixed at `0.5` for visualization purposes in geocentric plots.
- The script uses `ephem` to compute celestial positions accurately.

## License
This project is licensed under the MIT License. See `LICENSE` for details.
