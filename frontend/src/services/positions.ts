import type { PositionRequest, PositionResult } from './position-contract';
export async function analyzePositions(request: PositionRequest): Promise<PositionResult> {
  const response = await fetch('/api/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(60000) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map((item: { msg: string }) => item.msg).join('; ') : 'Não foi possível executar a consulta.');
  return data;
}
