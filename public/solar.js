/*
 * Client-side replacement for utils.py (ephem) and the /api route of api/index.py (Flask).
 *
 * Positions come from astronomy-engine (https://github.com/cosinekitty/astronomy, MIT).
 * In the browser it is loaded from vendor/astronomy.browser.min.js and exposed as the
 * global `Astronomy`; under Node (tests) it is required as a package.
 *
 * The data shape is identical to what the Flask API returned, so script.js needs no changes
 * in how it draws:
 *   [{ date: "YYYY-MM-DD", planets: [{ name, geocentric_label, heliocentric_label,
 *                                       radius, geo_radius, hlon, ra }, ...] }, ...]
 * where angles are in radians in [0, 2π).
 */
(function (global) {
  'use strict';

  const A = global.Astronomy || require('astronomy-engine');

  // Same constants as utils.py
  const DEFAULT_NUM_DAYS = 1000;
  const MAX_NUM_DAYS = 1000;
  const DEFAULT_INTERVAL = 5;
  const MAX_INTERVAL = 20;

  const TWO_PI = 2 * Math.PI;
  const DAY_MS = 86400000;

  // Order matters: the index is the plot radius, exactly as in utils.py.
  //   geo:   body whose geocentric right ascension is plotted in the geocentric view
  //   helio: body whose heliocentric longitude is plotted in the heliocentric view
  //          (ephem's "Sun" entry is drawn as the Earth, and its "Moon" entry as the Sun at the centre)
  const BODIES = [
    { name: 'Moon',    geo: A.Body.Moon,    helio: null,           helioLabel: 'Sun' },
    { name: 'Mercury', geo: A.Body.Mercury, helio: A.Body.Mercury, helioLabel: 'Mercury' },
    { name: 'Venus',   geo: A.Body.Venus,   helio: A.Body.Venus,   helioLabel: 'Venus' },
    { name: 'Sun',     geo: A.Body.Sun,     helio: A.Body.Earth,   helioLabel: 'Earth' },
    { name: 'Mars',    geo: A.Body.Mars,    helio: A.Body.Mars,    helioLabel: 'Mars' },
    { name: 'Jupiter', geo: A.Body.Jupiter, helio: A.Body.Jupiter, helioLabel: 'Jupiter' },
    { name: 'Saturn',  geo: A.Body.Saturn,  helio: A.Body.Saturn,  helioLabel: 'Saturn' },
    { name: 'Uranus',  geo: A.Body.Uranus,  helio: A.Body.Uranus,  helioLabel: 'Uranus' },
    { name: 'Neptune', geo: A.Body.Neptune, helio: A.Body.Neptune, helioLabel: 'Neptune' },
  ];

  function normalizeAngle(rad) {
    const r = rad % TWO_PI;
    return r < 0 ? r + TWO_PI : r;
  }

  // ephem reports these angles against the equinox *of date* (not J2000), so a plot for the year
  // 2026 is rotated ~0.36 deg from J2000 and one for 3000 by ~14 deg. astronomy-engine works in
  // J2000 internally, so each vector is rotated into the frame of date to match.

  /** Heliocentric ecliptic longitude (radians, ecliptic of date). `rot` is Rotation_EQJ_ECT(time). */
  function heliocentricLongitude(body, time, rot) {
    const v = A.RotateVector(rot, A.HelioVector(body, time));
    return normalizeAngle(Math.atan2(v.y, v.x));
  }

  /** Geocentric right ascension (radians, equator of date). `rot` is Rotation_EQJ_EQD(time). */
  function geocentricRightAscension(body, time, rot) {
    const v = A.RotateVector(rot, A.GeoVector(body, time, true));
    return normalizeAngle(Math.atan2(v.y, v.x));
  }

  /** Equivalent of utils.solar_system_json(date). `date` is a JS Date at 00:00 UTC. */
  function solarSystemData(date) {
    const time = A.MakeTime(date);
    const rotEcliptic = A.Rotation_EQJ_ECT(time);
    const rotEquator = A.Rotation_EQJ_EQD(time);
    return {
      date: date.toISOString().slice(0, 10),
      planets: BODIES.map((b, radius) => ({
        name: b.name,
        geocentric_label: b.name,
        heliocentric_label: b.helioLabel,
        radius: radius,
        geo_radius: b.name === 'Moon' ? 0.5 : radius,
        // The Moon entry is drawn at radius 0 (the Sun), where the angle is meaningless.
        hlon: b.helio === null ? 0 : heliocentricLongitude(b.helio, time, rotEcliptic),
        ra: geocentricRightAscension(b.geo, time, rotEquator),
      })),
    };
  }

  /** Parse "YYYY-MM-DD" into a Date at 00:00 UTC (years 1-9999), or throw like the API did. */
  function parseIsoDate(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
    const bad = new Error('Invalid date format. Use YYYY-MM-DD.');
    if (!m) throw bad;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1) throw bad;
    const dt = new Date(0);
    dt.setUTCFullYear(y, mo - 1, d); // avoids Date.UTC's 0-99 -> 1900s quirk
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) throw bad;
    return dt;
  }

  /** Strict integer parsing: "10" and 10 are fine, "10.0" and "abc" are not. */
  function parseInteger(value) {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())) return parseInt(value, 10);
    throw new Error('Duration and interval must be integers.');
  }

  /**
   * Equivalent of the /api route. Returns an array of frames (one frame unless `gif` is true).
   * Throws an Error with the same messages the API used to return in its 400 responses.
   */
  function computeSolarSystem(options) {
    const opts = options || {};
    const date = parseIsoDate(opts.date === undefined ? new Date().toISOString().slice(0, 10) : opts.date);
    const gif = opts.gif === true || String(opts.gif).toLowerCase() === 'true';
    const duration = parseInteger(opts.duration === undefined ? DEFAULT_NUM_DAYS : opts.duration);
    const interval = parseInteger(opts.interval === undefined ? DEFAULT_INTERVAL : opts.interval);

    if (!gif) return [solarSystemData(date)];

    if (!(duration > 0 && duration <= MAX_NUM_DAYS)) {
      throw new Error(`Duration should be between 1-${MAX_NUM_DAYS} days.`);
    }
    if (!(interval > 0 && interval <= MAX_INTERVAL)) {
      throw new Error(`Interval should be between 1-${MAX_INTERVAL} days.`);
    }
    if (duration / interval > MAX_NUM_DAYS) {
      throw new Error(`Duration divided by interval cannot exceed ${MAX_NUM_DAYS}.`);
    }
    const last = new Date(date.getTime() + duration * DAY_MS);
    if (last.getUTCFullYear() > 9999) {
      throw new Error('Resulting date exceeds the maximum allowed year 9999-12-31.');
    }

    const frames = [];
    for (let t = date.getTime(); t <= last.getTime(); t += interval * DAY_MS) {
      frames.push(solarSystemData(new Date(t)));
    }
    return frames;
  }

  const api = {
    computeSolarSystem,
    solarSystemData,
    parseIsoDate,
    DEFAULT_NUM_DAYS,
    MAX_NUM_DAYS,
    DEFAULT_INTERVAL,
    MAX_INTERVAL,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SolarSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
