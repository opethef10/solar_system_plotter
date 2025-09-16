#! /usr/bin/env python

from datetime import date as Date, timedelta
from http import HTTPStatus

from flask import Flask, request, jsonify

from utils import solar_system_json, DEFAULT_NUM_DAYS, DEFAULT_INTERVAL, MAX_NUM_DAYS, MAX_INTERVAL

app = Flask(__name__)
app.json.compact = True


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
            return jsonify({"error": f"Duration should be between 1-{MAX_NUM_DAYS} days."}), HTTPStatus.BAD_REQUEST
        if not 0 < interval <= MAX_INTERVAL:
            return jsonify({"error": f"Interval should be between 1-{MAX_INTERVAL} days."}), HTTPStatus.BAD_REQUEST
        if duration / interval > MAX_NUM_DAYS:
            return jsonify({"error": f"Duration divided by interval cannot exceed {MAX_NUM_DAYS}."}), HTTPStatus.BAD_REQUEST
        try:
            last_date = date + timedelta(days=duration)
        except OverflowError:
            return jsonify({"error": f"Resulting date exceeds the maximum allowed year {Date.max}."}), HTTPStatus.BAD_REQUEST

        datalist = []
        current_date = date
        while current_date <= last_date:
            data = solar_system_json(current_date)
            datalist.append(data)
            current_date += timedelta(days=interval)
    else:
        datalist = [solar_system_json(date)]

    return jsonify(datalist)


# Run the Flask app when this script is executed
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
