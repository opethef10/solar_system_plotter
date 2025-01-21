#! /usr/bin/env python

from datetime import date as Date
from io import BytesIO
import json

from flask import Flask, request, jsonify, send_file
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

from utils import solar_system_json, plot_from_json

app = Flask(__name__)


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
    fig = plot_from_json(data, geocentric, interactive=False)

    # Save the plot to a buffer
    buffer = BytesIO()
    FigureCanvas(fig).print_png(buffer)
    buffer.seek(0)

    # Return the image as a response
    return send_file(buffer, mimetype="image/png")


# Run the Flask app when this script is executed
if __name__ == "__main__":
    app.run(debug=True)
