'use strict';
// Run with: npm test   (needs `npm install` once for astronomy-engine)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const S = require('../public/solar.js');
const golden = require('./golden.json');

const TWO_PI = 2 * Math.PI;
const toDeg = (r) => (r * 180) / Math.PI;
function angularDiffDeg(a, b) {
  const d = Math.abs(a - b) % TWO_PI;
  return toDeg(d > Math.PI ? TWO_PI - d : d);
}

// --- Accuracy against ephem -----------------------------------------------------------------

test('positions match ephem within 0.05 degrees (1600-3000)', () => {
  // Measured worst case is ~0.013 deg; 0.05 deg leaves headroom for library updates.
  const TOLERANCE_DEG = 0.05;
  for (const ref of golden.dates) {
    const [frame] = S.computeSolarSystem({ date: ref.date });
    for (const p of frame.planets) {
      const want = ref.planets[p.name];
      assert.ok(angularDiffDeg(p.ra, want.ra) < TOLERANCE_DEG, `${ref.date} ${p.name} ra`);
      if (p.name !== 'Moon') { // the Moon entry is drawn at the centre, its hlon is never used
        assert.ok(angularDiffDeg(p.hlon, want.hlon) < TOLERANCE_DEG, `${ref.date} ${p.name} hlon`);
      }
    }
  }
});

// --- Shape of the data (same as the old /api JSON) ------------------------------------------

test('frame has the same shape as the old API response', () => {
  const [frame] = S.computeSolarSystem({ date: '2026-09-20' });
  assert.equal(frame.date, '2026-09-20');
  assert.deepEqual(frame.planets.map((p) => p.name),
    ['Moon', 'Mercury', 'Venus', 'Sun', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']);
  assert.deepEqual(frame.planets.map((p) => p.radius), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(frame.planets[0].geo_radius, 0.5);
  assert.equal(frame.planets[0].heliocentric_label, 'Sun');
  assert.equal(frame.planets[3].heliocentric_label, 'Earth');
  for (const p of frame.planets) {
    for (const angle of [p.hlon, p.ra]) {
      assert.ok(Number.isFinite(angle) && angle >= 0 && angle < TWO_PI);
    }
  }
});

// --- Ports of the cases in the old tests.py -------------------------------------------------

test('default request returns a list', () => {
  const data = S.computeSolarSystem();
  assert.ok(Array.isArray(data) && data.length > 0);
});

test('gif mode returns duration/interval + 1 frames', () => {
  assert.equal(S.computeSolarSystem({ date: '2026-01-01', gif: true, duration: 10, interval: 2 }).length, 6);
});

test('gif=false ignores duration and interval', () => {
  assert.equal(S.computeSolarSystem({ date: '2026-01-01', gif: false, duration: 1000, interval: 50 }).length, 1);
});

test('gif flag is case-insensitive when given as a string', () => {
  for (const v of ['True', 'TRUE', 'tRuE']) {
    assert.equal(S.computeSolarSystem({ date: '2026-01-01', gif: v, duration: 4, interval: 2 }).length, 3);
  }
  for (const v of ['false', 'FALSE', 'FaLsE']) {
    assert.equal(S.computeSolarSystem({ date: '2026-01-01', gif: v, duration: 4, interval: 2 }).length, 1);
  }
});

test('duration smaller than interval returns one frame', () => {
  assert.equal(S.computeSolarSystem({ date: '2026-01-01', gif: true, duration: 2, interval: 10 }).length, 1);
});

test('frames step by interval days', () => {
  const frames = S.computeSolarSystem({ date: '2026-01-30', gif: true, duration: 6, interval: 3 });
  assert.deepEqual(frames.map((f) => f.date), ['2026-01-30', '2026-02-02', '2026-02-05']);
});

test('zero, negative and out-of-range values are rejected', () => {
  const bad = [
    { duration: 0, interval: 2 }, { duration: 10, interval: 0 }, { duration: -5, interval: 2 },
    { duration: 10000, interval: 1 }, { duration: 10, interval: 100 },
  ];
  for (const b of bad) {
    assert.throws(() => S.computeSolarSystem({ date: '2026-01-01', gif: true, ...b }), Error, JSON.stringify(b));
  }
});

test('non-integer duration/interval are rejected', () => {
  assert.throws(() => S.computeSolarSystem({ gif: true, duration: '10.0', interval: '2.0' }), /integers/);
  assert.throws(() => S.computeSolarSystem({ gif: true, duration: 'abc', interval: 'xyz' }), /integers/);
});

test('invalid dates are rejected', () => {
  for (const d of ['2025-99-99', '2025-02-30', '2026-1-1', 'not-a-date', '0000-01-01']) {
    assert.throws(() => S.computeSolarSystem({ date: d }), /Invalid date format/, d);
  }
  assert.doesNotThrow(() => S.computeSolarSystem({ date: '2024-02-29' }));
});

test('a range running past year 9999 is rejected', () => {
  assert.throws(() => S.computeSolarSystem({ date: '9999-12-30', gif: true, duration: 1000, interval: 1 }),
    /maximum allowed year/);
});

test('extreme dates (years 1 and 9999) still produce finite numbers', () => {
  for (const d of ['0001-01-01', '0099-12-31', '9999-12-31']) {
    const [frame] = S.computeSolarSystem({ date: d });
    assert.equal(frame.date, d);
    assert.ok(frame.planets.every((p) => Number.isFinite(p.hlon) && Number.isFinite(p.ra)), d);
  }
});

// --- Browser-style loading ------------------------------------------------------------------

test('works when loaded as plain <script> tags (no require/module)', () => {
  const ctx = { console };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', 'public', p), 'utf8');
  vm.runInContext(read('vendor/astronomy.browser.min.js'), ctx);
  vm.runInContext(read('solar.js'), ctx);
  const [frame] = ctx.SolarSystem.computeSolarSystem({ date: '2026-09-20' });
  assert.equal(frame.planets.length, 9);
});
