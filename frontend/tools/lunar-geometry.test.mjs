import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildSync } from 'esbuild';

function loadModule(path) {
  const { outputFiles } = buildSync({ entryPoints: [new URL(path, import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env.BASE_URL': '"/"' } });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const geometry = await loadModule('../src/domain/lunarGeometry.ts');
const service = await loadModule('../src/services/lunarEphemeris.ts');
const { direction, dot, earthElevationDeg, polarVisibleFraction, MOON_RADIUS_KM } = geometry;
const table = JSON.parse(readFileSync(new URL('../public/data/moon-2026.json', import.meta.url)));

test('known spherical directions and Earth parallax at the geometric horizon', () => {
  assert.equal(dot(direction(0, 0), direction(0, 0)), 1);
  assert.ok(Math.abs(dot(direction(90, 0), direction(0, 0))) < 1e-14);
  assert.ok(Math.abs(earthElevationDeg(direction(90, 0), direction(0, 0), 384400) + Math.atan(MOON_RADIUS_KM / 384400) * 180 / Math.PI) < 1e-10);
  assert.equal(earthElevationDeg(direction(0, 0), direction(0, 0), 384400), 90);
});

test('whole cap visibility uses surface area: equatorial light bisects both caps', () => {
  for (const pole of ['south', 'north']) {
    assert.equal(polarVisibleFraction(pole, 0), .5);
    assert.equal(polarVisibleFraction(pole, pole === 'north' ? 90 : -90), 1);
    assert.equal(polarVisibleFraction(pole, pole === 'north' ? -90 : 90), 0);
  }
  assert.ok(polarVisibleFraction('south', 0, MOON_RADIUS_KM / 384400) < .5);
});

test('cap integration convergence within 0.01 percentage point, chosen before acceptance', () => {
  for (const lat of [-6.568, -1.338, -.01, 0, .01, 1.338, 6.568]) {
    for (const parallax of [0, MOON_RADIUS_KM / 360502]) {
      const coarse = polarVisibleFraction('south', lat, parallax);
      const fine = polarVisibleFraction('south', lat, parallax, 65536);
      assert.ok(Math.abs(coarse - fine) < .0001, `latitude ${lat}, parallax ${parallax}`);
    }
  }
});

test('all 8760 NASA samples validate; exact first/last UTC and date transitions', () => {
  assert.equal(service.validateEphemeris(table), table);
  assert.equal(service.getLunarSample(table, '2026-01-01', 0).timestamp, '2026-01-01T00:00:00Z');
  assert.equal(service.getLunarSample(table, '2026-12-31', 23).timestamp, '2026-12-31T23:00:00Z');
  const first = service.getLunarSample(table, '2026-01-01', 12);
  // Actual source row displayed by NASA, not a generated reference.
  assert.deepEqual(first.subsolar, { lon: 26.456, lat: -1.338 });
  assert.deepEqual(first.subearth, { lon: -.336, lat: -6.568 });
  assert.equal(first.earthDistanceKm, 360502);
  for (const [date, hour] of [['2025-12-31', 23], ['2027-01-01', 0], ['2026-02-29', 0], ['2026-11-14', 24], ['2026-11-14', 1.5]]) assert.throws(() => service.getLunarSample(table, date, hour));
  assert.throws(() => service.validateEphemeris({ ...table, rows: table.rows.slice(1) }));
  const invalid = structuredClone(table); invalid.rows[0][0] = NaN;
  assert.throws(() => service.validateEphemeris(invalid));
});

test('NASA date selection changes direction; equal latitude preserves full-cap area', () => {
  const a = service.getLunarSample(table, '2026-11-14', 12);
  const b = service.getLunarSample(table, '2026-11-15', 12);
  assert.notDeepEqual(a.subsolar, b.subsolar);
  assert.notDeepEqual(a.subearth, b.subearth);
  // These real consecutive dates have equal solar latitude at source precision.
  // A full rotationally symmetric cap has equal lit area, despite changing longitude.
  assert.equal(a.subsolar.lat, b.subsolar.lat);
  assert.equal(polarVisibleFraction('south', a.subsolar.lat), polarVisibleFraction('south', b.subsolar.lat));
});

test('cross-check actual JPL Horizons observer elevations within 0.03 degree', () => {
  // Tolerance set for rounded SVS coordinates, parallel solar rays, and different
  // ephemeris/observational conventions; this is not full mission validation.
  const sample = service.getLunarSample(table, '2026-11-14', 12);
  const normal = direction(0, -89.5);
  const estimates = {
    sun: Math.asin(dot(normal, direction(sample.subsolar.lon, sample.subsolar.lat))) * 180 / Math.PI,
    earth: earthElevationDeg(normal, direction(sample.subearth.lon, sample.subearth.lat), sample.earthDistanceKm),
  };
  for (const body of ['sun', 'earth']) {
    const raw = JSON.parse(readFileSync(new URL(`../../docs/sources/horizons-${body}-2026-11-14.json`, import.meta.url)));
    const firstLine = raw.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n')[0];
    const elevation = Number(firstLine.split(',')[4]);
    assert.ok(Number.isFinite(elevation));
    assert.ok(Math.abs(estimates[body] - elevation) < .03, `${body}: SVS ${estimates[body]}, Horizons ${elevation}`);
  }
});


test('daily summary averages the entire UTC day rather than the selected instant', () => {
  // Known synthetic geometry used only in tests: each cap sees the bodies for
  // twelve hourly samples, then neither body for the other twelve samples.
  const rows = table.rows.map((row, index) => index < 24
    ? [0, index < 12 ? 90 : -90, 0, index < 12 ? 90 : -90, 384400]
    : row);
  const synthetic = { ...table, rows };
  for (const pole of ['south', 'north']) {
    const summary = service.getDailyPolarSummary(synthetic, '2026-01-01', pole);
    assert.equal(summary.sunlight, .5);
    assert.equal(summary.earth, .5);
    assert.equal(summary.sampleCount, 24);
    assert.equal(summary.dayUtc, '2026-01-01');
  }
  // At noon the North cap has zero visibility; the daily mean is still 50%.
  assert.equal(polarVisibleFraction('north', service.getLunarSample(synthetic, '2026-01-01', 12).subsolar.lat), 0);
});

test('daily summaries respect year coverage and do not borrow hours from another day', () => {
  const rows = table.rows.map((row, index) => index >= table.rows.length - 24
    ? [0, 90, 0, 90, 384400]
    : row);
  const lastDay = service.getDailyPolarSummary({ ...table, rows }, '2026-12-31', 'north');
  assert.equal(lastDay.sunlight, 1);
  assert.equal(lastDay.earth, 1);
  assert.equal(lastDay.sampleCount, 24);
  for (const day of ['2025-12-31', '2027-01-01', '2026-02-29']) assert.throws(() => service.getDailyPolarSummary(table, day, 'south'));
});
