import { useEffect, useState } from 'react';
import type { PositionResult } from '@/services/position-contract';
export const hours = (seconds: number) => `${(seconds / 3600).toFixed(2)} h`;
export const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
const names: Record<string, string> = { sunrise: 'Nascer do Sol', sunset: 'Pôr do Sol', earthrise: 'Nascer da Terra', earthset: 'Pôr da Terra' };

export function ElevationChart({ results, axis = 'elapsed', cursor, labels }: { results: PositionResult[]; axis?: 'elapsed' | 'utc'; cursor?: string; labels?: string[] }) {
  const first = Math.min(...results.map(result => Date.parse(result.samples[0].timestamp_utc)));
  const coordinate = (time: string, result: PositionResult) => Date.parse(time) - (axis === 'elapsed' ? Date.parse(result.samples[0].timestamp_utc) : first);
  const maximum = Math.max(1, ...results.map(result => coordinate(result.samples.at(-1)!.timestamp_utc, result)));
  const values = results.flatMap(result => result.samples.flatMap(sample => [sample.sun.elevation_deg, sample.earth.elevation_deg]));
  const lower = Math.min(-1, ...values) - 0.5, upper = Math.max(1, ...values) + 0.5;
  const x = (time: string, result: PositionResult) => 55 + coordinate(time, result) / maximum * 630;
  const y = (elevation: number) => 170 - (elevation - lower) / (upper - lower) * 140;
  return <figure><figcaption>Elevação (°) — {axis === 'elapsed' ? 'horas desde o início de cada cenário' : 'UTC'}. Sol: linha contínua; Terra: tracejada. {results.map((_,index)=>`${labels?.[index]??String.fromCharCode(65+index)}: ${['azul','laranja','verde','violeta'][index]}`).join('; ')}.</figcaption>
    <svg viewBox="0 0 720 210" role="img" aria-label="Séries de elevação do Sol e Terra; valores equivalentes nas tabelas de cada cenário">
      <text x="2" y="30">{upper.toFixed(1)}°</text><text x="2" y="175">{lower.toFixed(1)}°</text>
      <line x1="55" x2="685" y1={y(0)} y2={y(0)} stroke="#94a3b8" /><text x="55" y={y(0)-5}>Horizonte 0°</text>
      {results.map((result, index) => <g key={result.run_id}>{(['sun', 'earth'] as const).map(body => <polyline key={body} fill="none" stroke={['#60a5fa','#fb923c','#4ade80','#c084fc'][index%4]} strokeWidth="2.5" strokeDasharray={body === 'earth' ? '7 4' : undefined} points={result.samples.map(sample => `${x(sample.timestamp_utc, result)},${y(sample[body].elevation_deg)}`).join(' ')} />)}</g>)}
      {cursor && <line x1={x(cursor, results[0])} x2={x(cursor, results[0])} y1="25" y2="175" stroke="#f8fafc" strokeDasharray="3" />}
      <text x="55" y="200">{axis === 'elapsed' ? '0 h' : new Date(first).toISOString()}</text>
      <text x="685" y="200" textAnchor="end">{axis === 'elapsed' ? `${(maximum/3600000).toFixed(1)} h` : new Date(first+maximum).toISOString()}</text>
    </svg></figure>;
}

export default function ScenarioResult({ result, onCursorChange }: { result: PositionResult; onCursorChange?: (utc: string)=>void }) {
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (index >= result.samples.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndex(value => value + 1), 700);
    return () => clearTimeout(timer);
  }, [playing, index, result.samples.length]);
  const sample = result.samples[index];
  useEffect(()=>{onCursorChange?.(sample.timestamp_utc);},[sample.timestamp_utc,onCursorChange]);
  const visibility = result.visibility;
  return <div className="scenario-result">
    <h3>Resultado — {result.samples.length} instantes</h3>
    <p>Local: {result.request.latitude_deg}°, {result.request.longitude_deg}° · Início: {result.request.start_utc} · {result.request.duration_hours} h · passo {result.request.step_minutes} min · modelo {result.model} · regra {result.visibility_rule}.</p>
    <p>Execução: <code>{result.run_id}</code> · motor {result.engine_version}. {result.coordinate_frame}.</p>
    <div className="position-analysis__table"><table><caption>Durações integradas; percentagens relativas ao intervalo total, com cobertura explícita.</caption><thead><tr><th>Condição</th><th>Disponível</th><th>Fracção</th><th>Maior interrupção</th><th>Maior janela</th><th>Desconhecido</th><th>Cobertura</th></tr></thead><tbody>{(['sun', 'earth', 'combined'] as const).map(body => {
      const summary = visibility.summary[body];
      return <tr key={body}><th>{body === 'sun' ? 'Centro do Sol acima do horizonte' : body === 'earth' ? 'Centro da Terra visível' : 'Sol e Terra simultâneos'}</th><td>{hours(summary.visible_seconds)}</td><td>{percent(summary.visible_fraction_total)}</td><td>{hours(summary.longest_invisible_seconds)}</td><td>{hours(summary.longest_visible_seconds)}</td><td>{hours(summary.unknown_seconds)}</td><td>{percent(summary.coverage_fraction)}</td></tr>;
    })}</tbody></table></div>
    <p>Elevação solar máxima amostrada: {visibility.max_sun_elevation_deg?.toFixed(6) ?? 'desconhecida'}°. Luz e visibilidade geométrica não garantem electricidade ou ligação rádio.</p>
    <label>Timeline UTC — {sample.timestamp_utc}<input aria-label="Instante da timeline" type="range" min="0" max={result.samples.length-1} value={index} onChange={event => { setPlaying(false); setIndex(Number(event.target.value)); }} /></label>
    <button type="button" onClick={() => { if (!playing && index === result.samples.length-1) setIndex(0); setPlaying(!playing); }}>{playing ? 'Pausar' : 'Reproduzir'}</button>
    <p>Sol: azimute {sample.sun.azimuth_deg.toFixed(6)}°, elevação {sample.sun.elevation_deg.toFixed(6)}° · Terra: azimute {sample.earth.azimuth_deg.toFixed(6)}°, elevação {sample.earth.elevation_deg.toFixed(6)}°.</p>
    <figure><figcaption>Horizonte local: azimute 0° norte, 90° este, 180° sul, 270° oeste. Elevação vertical em graus; direcções dos centros, tamanhos ilustrativos.</figcaption><svg viewBox="0 0 720 270" role="img" aria-label={`Horizonte em ${sample.timestamp_utc}; posições numéricas apresentadas acima`}>
      <line x1="36" x2="684" y1="130" y2="130" stroke="#94a3b8" />
      {[-90, 0, 90].map(value => <text key={value} x="0" y={135-value}>{value}°</text>)}
      {[0,90,180,270,360].map(value => <text key={value} x={36+value*1.8} y="252" textAnchor="middle">{value}°</text>)}
      {(['sun','earth'] as const).map(body => <g key={body}><circle cx={36+sample[body].azimuth_deg*1.8} cy={130-sample[body].elevation_deg} r="7" fill={body==='sun' ? '#facc15' : '#60a5fa'} /><text x={Math.min(630,36+sample[body].azimuth_deg*1.8)} y={115-sample[body].elevation_deg}>{body==='sun'?'Sol':'Terra'}</text></g>)}
    </svg></figure>
    <ElevationChart results={[result]} cursor={sample.timestamp_utc} />
    <p>Próximos eventos: estimativas por interpolação linear, com passo de {result.request.step_minutes} min; não representam precisão física inferior à resolução das amostras.</p>
    <ul>{Object.entries(names).map(([kind, label]) => {
      const next = visibility.events.find(event => event.event_type === kind && Date.parse(event.time_utc) >= Date.parse(sample.timestamp_utc));
      return <li key={kind}>{label}: {next ? `${next.time_utc} (em ${hours((Date.parse(next.time_utc)-Date.parse(sample.timestamp_utc))/1000)})` : 'Não encontrado no intervalo restante.'}</li>;
    })}</ul>
    <details><summary>Eventos e janelas — detalhe técnico</summary><p>Interpolação linear entre amostras; o bracket não garante exactidão física. Eventos podem passar despercebidos entre amostras.</p>
      <div className="position-analysis__table"><table><caption>Eventos estimados</caption><thead><tr><th>Evento</th><th>UTC estimado</th><th>Bracket UTC</th><th>Método</th></tr></thead><tbody>{visibility.events.map((event,i)=><tr key={i}><td>{names[event.event_type]}</td><td>{event.time_utc}</td><td>{event.bracket_start_utc} — {event.bracket_end_utc}</td><td>{event.method}</td></tr>)}</tbody></table></div>
      {Object.keys(visibility.event_absence).map(kind=><p key={kind}>{names[kind]}: não encontrado no intervalo calculado.</p>)}
      <div className="position-analysis__table"><table><caption>Janelas UTC (visible = disponível, invisible = indisponível, unknown = desconhecido)</caption><thead><tr><th>Condição</th><th>Estado</th><th>Início</th><th>Fim</th><th>Duração</th></tr></thead><tbody>{visibility.windows.map((window,i)=><tr key={i}><td>{window.condition}</td><td>{window.state}</td><td>{window.start_utc}</td><td>{window.end_utc}</td><td>{hours(window.duration_seconds)}</td></tr>)}</tbody></table></div>
    </details>
    <details open><summary>Amostras UTC</summary><div className="position-analysis__table"><table><caption>Posições aparentes dos centros — UTC e graus. Página de 50 amostras que contém o cursor; use a timeline para consultar as restantes.</caption><thead><tr><th>Instante UTC</th><th>Sol: azimute (°)</th><th>Sol: elevação (°)</th><th>Terra: azimute (°)</th><th>Terra: elevação (°)</th></tr></thead><tbody>{result.samples.slice(Math.floor(index/50)*50,Math.floor(index/50)*50+50).map((row,offset) => <tr key={row.timestamp_utc} aria-current={Math.floor(index/50)*50+offset===index?'true':undefined}><td>{row.timestamp_utc}</td><td>{row.sun.azimuth_deg.toFixed(6)}</td><td>{row.sun.elevation_deg.toFixed(6)}</td><td>{row.earth.azimuth_deg.toFixed(6)}</td><td>{row.earth.elevation_deg.toFixed(6)}</td></tr>)}</tbody></table></div></details>
    <details><summary>Fontes e limitações</summary><p>{result.reference_surface_assumption}</p>{result.sources.map(source => <p key={`${source.body}-${source.response_sha256}`}><a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">JPL Horizons — {source.body}</a> · {source.retrieved_at}<br />SHA-256: <code>{source.response_sha256}</code></p>)}<ul>{result.limitations.map(text => <li key={text}>{text}</li>)}</ul></details>
  </div>;
}
