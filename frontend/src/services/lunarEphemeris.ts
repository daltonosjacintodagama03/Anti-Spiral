import { MOON_RADIUS_KM, polarVisibleFraction, type LunarSample, type Pole } from '@/domain/lunarGeometry';

export const EPHEMERIS_YEAR = 2026;
export const EPHEMERIS_START = '2026-01-01';
export const EPHEMERIS_END = '2026-12-31';
export const EPHEMERIS_SOURCE = 'https://svs.gsfc.nasa.gov/5587/';
export const HOUR_MS = 3_600_000;
type Row = [number, number, number, number, number];
export interface Ephemeris { year: number; source: string; sourceSha256: string; rows: Row[] }
let cached: Ephemeris | undefined;
let pending: Promise<Ephemeris> | undefined;
export function validateEphemeris(value: unknown): Ephemeris {
  const data = value as Ephemeris | null;
  if (!data || data.year !== EPHEMERIS_YEAR || typeof data.source !== 'string' || !/^[a-f0-9]{64}$/.test(data.sourceSha256) || !Array.isArray(data.rows) || data.rows.length !== 8760) throw new Error('Tabela NASA incompleta ou com cobertura inesperada.');
  for (const row of data.rows) {
    if (!Array.isArray(row) || row.length !== 5 || row.some(n => !Number.isFinite(n)) || Math.abs(row[0]) > 180 || Math.abs(row[1]) > 90 || Math.abs(row[2]) > 180 || Math.abs(row[3]) > 90 || row[4] < 300000 || row[4] > 450000) throw new Error('A tabela NASA contém coordenadas ou unidades inválidas.');
  }
  return data;
}
export function loadEphemeris(): Promise<Ephemeris> {
  if (cached) return Promise.resolve(cached);
  if (!pending) pending = fetch(`${import.meta.env.BASE_URL}data/moon-2026.json`).then(async response => {
    if (!response.ok) throw new Error('Não foi possível carregar as efemérides NASA.');
    cached = validateEphemeris(await response.json());
    return cached;
  }).finally(() => { pending = undefined; });
  return pending;
}
export function getLunarSample(data: Ephemeris, date: string, hour: number): LunarSample {
  const timestamp = `${date}T${String(hour).padStart(2, '0')}:00:00Z`;
  const instant = Date.parse(timestamp);
  const index = (instant - Date.UTC(EPHEMERIS_YEAR, 0, 1)) / HOUR_MS;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(index) || !data.rows[index] || new Date(instant).toISOString() !== timestamp.replace('Z', '.000Z')) throw new Error('Instante fora da cobertura NASA carregada.');
  const [sunLon, sunLat, earthLon, earthLat, distance] = data.rows[index];
  return { timestamp, subsolar: { lon: sunLon, lat: sunLat }, subearth: { lon: earthLon, lat: earthLat }, earthDistanceKm: distance };
}

/** Mean visible surface area across the 24 hourly NASA samples of a UTC day.
 * This is an equally weighted sample mean, not continuous duration integration,
 * a union of visible places, or a guarantee of an operational radio link. */
export function getDailyPolarSummary(data: Ephemeris, date: string, pole: Pole) {
  let sunlight = 0, earth = 0;
  for (let hour = 0; hour < 24; hour++) {
    const sample = getLunarSample(data, date, hour);
    sunlight += polarVisibleFraction(pole, sample.subsolar.lat);
    earth += polarVisibleFraction(pole, sample.subearth.lat, MOON_RADIUS_KM / sample.earthDistanceKm);
  }
  return { sunlight: sunlight / 24, earth: earth / 24, sampleCount: 24, dayUtc: date };
}
