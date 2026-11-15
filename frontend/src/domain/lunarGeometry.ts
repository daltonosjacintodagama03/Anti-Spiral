/** Selenographic coordinates (east-positive) from the NASA SVS mooninfo tables.
 * Unit vector axes: x=90°E, y=north, z=0° longitude. No terrain or refraction. */
export type Pole = 'south' | 'north';
export type Vector = readonly [number, number, number];
export interface LunarSample {
  timestamp: string;
  subsolar: { lon: number; lat: number };
  subearth: { lon: number; lat: number };
  earthDistanceKm: number;
}
export const MOON_RADIUS_KM = 1737.4;
export const CAP_LATITUDE_DEG = 80;
const RAD = Math.PI / 180;
export function direction(lonDeg: number, latDeg: number): Vector {
  return [Math.sin(lonDeg * RAD) * Math.cos(latDeg * RAD), Math.sin(latDeg * RAD), Math.cos(lonDeg * RAD) * Math.cos(latDeg * RAD)];
}
export function dot(a: Vector, b: Vector) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function earthElevationDeg(normal: Vector, earth: Vector, distanceKm: number) {
  const cosine = Math.max(-1, Math.min(1, dot(normal, earth)));
  const radiusRatio = MOON_RADIUS_KM / distanceKm;
  return Math.asin((cosine - radiusRatio) / Math.sqrt(1 + radiusRatio ** 2 - 2 * radiusRatio * cosine)) / RAD;
}
/** Instantaneous surface-area fraction, not a fraction of time. Equal-area quadrature
 * in sin(latitude); longitude integration is analytic. Sphere, center > horizon.
 * Solar rays are parallel; the SVS table does not provide Sun-Moon distance. */
export function polarVisibleFraction(pole: Pole, bodyLatitudeDeg: number, radiusRatio = 0, strips = 4096) {
  const sign = pole === 'south' ? -1 : 1;
  const edge = Math.sin(CAP_LATITUDE_DEG * RAD);
  const bodySin = Math.sin(bodyLatitudeDeg * RAD), bodyCos = Math.cos(bodyLatitudeDeg * RAD);
  let sum = 0;
  for (let i = 0; i < strips; i++) {
    const s = sign * (edge + (1 - edge) * (i + .5) / strips);
    const amplitude = Math.sqrt(1 - s * s) * bodyCos;
    const base = s * bodySin;
    if (amplitude < 1e-14) { sum += base > radiusRatio ? 1 : 0; continue; }
    const threshold = (radiusRatio - base) / amplitude;
    sum += threshold >= 1 ? 0 : threshold <= -1 ? 1 : Math.acos(threshold) / Math.PI;
  }
  return sum / strips;
}
