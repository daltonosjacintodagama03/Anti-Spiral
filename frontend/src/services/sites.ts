import type { LandingSite } from '@/types/site';

/**
 * TEMPORÁRIO: dados de demonstração.
 * Substituir por chamada HTTP quando a API do backend estiver disponível
 * (ex.: GET /sites). Os valores abaixo NÃO são medições reais.
 */
const DEMO_SITES: LandingSite[] = [
  { id: 'a', name: 'Candidato A', xKm: 12, yKm: 28, slopeDeg: 4.2, illuminationPct: 78, earthVisibilityPct: 61 },
  { id: 'b', name: 'Candidato B', xKm: -25, yKm: 14, slopeDeg: 7.8, illuminationPct: 66, earthVisibilityPct: 44 },
  { id: 'c', name: 'Candidato C', xKm: 31, yKm: -18, slopeDeg: 3.1, illuminationPct: 52, earthVisibilityPct: 72 },
  { id: 'd', name: 'Candidato D', xKm: -9, yKm: -35, slopeDeg: 5.6, illuminationPct: 85, earthVisibilityPct: 38 },
];

export async function getSites(): Promise<LandingSite[]> {
  await new Promise((r) => setTimeout(r, 400));
  return DEMO_SITES;
}
