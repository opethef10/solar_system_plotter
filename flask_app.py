#! /usr/bin/env python

from datetime import date as Date, timedelta
from http import HTTPStatus
import json

from flask import Flask, request, jsonify
from flask_compress import Compress

from utils import solar_system_json, DEFAULT_NUM_DAYS, DEFAULT_INTERVAL, MAX_NUM_DAYS, MAX_INTERVAL

app = Flask(__name__)
app.json.compact = True
Compress(app)


@app.route("/")
def index():
    """Home route to render a simple HTML page"""
    return app.send_static_file("index.html")


@app.route("/api")
def api():
    """API route to return JSON data for the solar system at a given date"""
    try:
        date = Date.fromisoformat(request.args.get("date", Date.today().isoformat()))
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), HTTPStatus.BAD_REQUEST

    gif = request.args.get("gif", "false").lower() == "true"
    try:
        duration = int(request.args.get("duration", DEFAULT_NUM_DAYS))
        interval = int(request.args.get("interval", DEFAULT_INTERVAL))
    except ValueError:
        return jsonify({"error": "Duration and interval must be integers."}), HTTPStatus.BAD_REQUEST

    if gif:
        if not 0 < duration <= MAX_NUM_DAYS:
            return jsonify({"error": "Duration should be between 1-1000 days."}), HTTPStatus.BAD_REQUEST
        if not 0 < interval <= MAX_INTERVAL:
            return jsonify({"error": "Interval should be between 1-20 days."}), HTTPStatus.BAD_REQUEST
        if duration / interval > MAX_NUM_DAYS:
            return jsonify({"error": "Duration divided by interval cannot exceed 1000."}), HTTPStatus.BAD_REQUEST


    # Generate JSON data for the given date
    datalist = []
    if gif:
        for i in range(duration // interval):
            try:
                data = solar_system_json(date)
                datalist.append(json.loads(data))
                date += timedelta(days=interval)
            except OverflowError:
                return jsonify({"error": "Resulting date exceeds the maximum allowed year 9999."}), HTTPStatus.BAD_REQUEST
    else:
        data = solar_system_json(date)
        datalist.append(json.loads(data))
    return jsonify(datalist)


# Run the Flask app when this script is executed
if __name__ == "__main__":
    app.run(debug=True)
