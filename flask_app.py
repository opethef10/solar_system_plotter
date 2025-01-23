#! /usr/bin/env python

from datetime import date as Date
from io import BytesIO
import json

import matplotlib.pyplot as plt
from flask import Flask, request, jsonify, send_file
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

from utils import solar_system_json, plot_from_json, create_gif, DEFAULT_NUM_DAYS, DEFAULT_INTERVAL

app = Flask(__name__)
plt.switch_backend("Agg")


@app.route("/")
def index():
    """Home route to render a simple HTML page"""
    return app.send_static_file("index.html")


@app.route("/api")
def api():
    """API route to return JSON data for the solar system at a given date"""
    date_str = request.args.get("date", Date.today().isoformat())

    try:
        date = Date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    # Generate JSON data for the given date
    data = solar_system_json(date)
    return jsonify(json.loads(data))


@app.route("/plot")
def plot():
    """Route to generate and return a plot as an image"""
    date_str = request.args.get("date", Date.today().isoformat())
    geocentric = request.args.get("geocentric", "false").lower() == "true"

    try:
        date = Date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    # Generate JSON data for the given date
    data = solar_system_json(date)
    fig, ax = plt.subplots(subplot_kw={"projection": "polar"})
    plot_from_json(ax, data, geocentric)

    # Save the plot to a buffer
    buffer = BytesIO()
    FigureCanvas(fig).print_png(buffer)
    buffer.seek(0)

    # Return the image as a response
    return send_file(buffer, mimetype="image/png")


@app.route("/plot_gif")
def plot_gif():
    """Route to generate and return a plot as an image."""
    try:
        date = Date.fromisoformat(request.args.get("date", Date.today().isoformat()))
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        duration = int(request.args.get("duration", DEFAULT_NUM_DAYS))
        interval = int(request.args.get("interval", DEFAULT_INTERVAL))
    except ValueError:
        return jsonify({"error": "Duration and interval must be integers."}), 400

    if not 0 < duration <= 1000:
        return jsonify({"error": "Duration should be between 1-1000 days."}), 400
    if interval <= 0:
        return jsonify({"error": "Interval should be positive"}), 400
    if duration / interval > 200:
        return jsonify({"error": "Duration divided by interval cannot exceed 200."}), 400

    geocentric = request.args.get("geocentric", "false").lower() == "true"

    buffer = create_gif(date, duration, interval, geocentric)

    return send_file(buffer, mimetype="image/gif")


# Run the Flask app when this script is executed
if __name__ == "__main__":
    app.run(debug=True)
