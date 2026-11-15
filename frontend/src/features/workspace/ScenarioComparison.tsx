import { useState } from 'react';
import type { PositionResult } from '@/services/position-contract';
import { ElevationChart, hours } from './ScenarioResult';
const metrics = [
  { label: 'Duração de luz', body:'sun', key:'visible_seconds' },
  { label: 'Maior escuridão', body:'sun', key:'longest_invisible_seconds' },
  { label: 'Terra visível', body:'earth', key:'visible_seconds' },
  { label: 'Maior interrupção terrestre', body:'earth', key:'longest_invisible_seconds' },
  { label: 'Sol e Terra simultâneos', body:'combined', key:'visible_seconds' },
  { label: 'Maior janela conjunta', body:'combined', key:'longest_visible_seconds' },
] as const;
export default function ScenarioComparison({ a, b }: { a: PositionResult; b: PositionResult }) {
  const [axis,setAxis]=useState<'elapsed'|'utc'>('elapsed');
  const [metric,setMetric]=useState(0);
  const reasons = [
    a.request.duration_hours!==b.request.duration_hours ? 'duração diferente' : '',
    a.request.step_minutes!==b.request.step_minutes ? 'passo diferente' : '',
    a.model!==b.model ? 'modelo diferente' : '',
    a.visibility_rule!==b.visibility_rule ? 'regra de visibilidade diferente' : '',
    a.engine_version!==b.engine_version ? 'versão do motor diferente' : '',
    [a,b].some(result=>Object.values(result.visibility.summary).some(summary=>summary.coverage_fraction < 1-1e-10)) ? 'cobertura incompleta' : '',
  ].filter(Boolean);
  const selected=metrics[metric];
  const av=a.visibility.summary[selected.body][selected.key], bv=b.visibility.summary[selected.body][selected.key];
  return <section className="workspace-panel position-analysis" aria-label="Comparação de cenários">
    <h2>Comparação A × B</h2><p>Resultados imutáveis das execuções {a.run_id} e {b.run_id}. Os deltas são B − A; valores de duração em horas.</p>
    {[['A',a],['B',b]].map(([label,value])=>{const result=value as PositionResult;return <p key={label as string}><strong>Cenário {label as string}</strong>: {result.request.latitude_deg}°, {result.request.longitude_deg}° · {result.request.start_utc} · {result.request.duration_hours} h · passo {result.request.step_minutes} min · {result.model}/{result.visibility_rule}.</p>;})}
    {reasons.length>0 && <p role="alert">Comparação directa e ordenação bloqueadas: {reasons.join(', ')}. Iguale os parâmetros nos formulários e recalcule. Os gráficos permanecem disponíveis para inspecção.</p>}
    <label>Eixo temporal<select value={axis} onChange={event=>setAxis(event.target.value as 'elapsed'|'utc')}><option value="elapsed">Tempo desde a aterragem</option><option value="utc">UTC</option></select></label>
    <ElevationChart results={[a,b]} axis={axis} />
    <div className="position-analysis__table"><table><caption>Métricas por execução; deltas disponíveis apenas para configurações compatíveis</caption><thead><tr><th>Métrica</th><th>A</th><th>B</th><th>Diferença B − A</th></tr></thead><tbody>{metrics.map(item=>{const x=a.visibility.summary[item.body][item.key], y=b.visibility.summary[item.body][item.key];return <tr key={item.label}><th>{item.label}</th><td>{hours(x)}</td><td>{hours(y)}</td><td>{reasons.length?'Incompatível':`${y-x>=0?'+':''}${hours(y-x)}`}</td></tr>;})}
      {(['sun','earth','combined'] as const).map(body=>{const x=a.visibility.summary[body].visible_fraction_total*100, y=b.visibility.summary[body].visible_fraction_total*100;return <tr key={body}><th>Fracção disponível — {body}</th><td>{x.toFixed(2)}%</td><td>{y.toFixed(2)}%</td><td>{reasons.length?'Incompatível':`${y-x>=0?'+':''}${(y-x).toFixed(2)} pontos percentuais`}</td></tr>;})}
      <tr><th>Elevação solar máxima amostrada</th><td>{a.visibility.max_sun_elevation_deg?.toFixed(6)}°</td><td>{b.visibility.max_sun_elevation_deg?.toFixed(6)}°</td><td>{reasons.length?'Incompatível':`${a.visibility.max_sun_elevation_deg===null || b.visibility.max_sun_elevation_deg===null ? 'Desconhecido' : ((b.visibility.max_sun_elevation_deg)-(a.visibility.max_sun_elevation_deg)).toFixed(6)+'°'}`}</td></tr>
    </tbody></table></div>
    <label>Ordenar por métrica<select disabled={!!reasons.length} value={metric} onChange={event=>setMetric(Number(event.target.value))}>{metrics.map((item,i)=><option key={item.label} value={i}>{item.label} — crescente</option>)}</select></label>
    {!reasons.length && <p>Ordem crescente de {selected.label.toLowerCase()}: {av===bv?'A = B (iguais)':av<bv?'A, B':'B, A'}. Esta ordenação não constitui recomendação de segurança.</p>}
  </section>;
}
