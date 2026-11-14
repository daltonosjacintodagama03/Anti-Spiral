export interface LandingSite {
  id: string;
  name: string;
  /** Posição relativa ao polo sul, em km (x = leste, y = norte). */
  xKm: number;
  yKm: number;
  slopeDeg: number;
  illuminationPct: number;
  earthVisibilityPct: number;
}
