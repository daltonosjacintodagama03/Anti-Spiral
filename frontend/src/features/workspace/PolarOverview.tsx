import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Globe2, Radio, RotateCcw, Sun } from 'lucide-react';
import { direction, MOON_RADIUS_KM, type LunarSample, type Pole } from '@/domain/lunarGeometry';
import { EPHEMERIS_END, EPHEMERIS_START, getDailyPolarSummary, getLunarSample, loadEphemeris, type Ephemeris } from '@/services/lunarEphemeris';
import './polar-overview.css';

type Layer = 'light' | 'earth';
const DAY = 86_400_000;
const utcDay = () => new Date().toISOString().slice(0, 10);
const inCoverage = (date: string) => date >= EPHEMERIS_START && date <= EPHEMERIS_END;
const initialDay = () => inCoverage(utcDay()) ? utcDay() : EPHEMERIS_START;
const dayNumber = (date: string) => Date.parse(`${date}T12:00:00Z`) / DAY;
const percent = (fraction: number) => `${(fraction * 100).toLocaleString('pt-PT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
const degrees = (value: number) => `${value.toLocaleString('pt-PT', { maximumFractionDigits: 3 })}°`;

function OverviewMetric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Sun }) {
  return <article className="metric-card"><span className="metric-card__icon"><Icon size={18} aria-hidden="true" /></span><span className="metric-card__label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function MoonCanvas({ sample, pole, layer }: { sample: LunarSample | null; pole: Pole; layer: Layer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureRef = useRef<ImageData>();
  const projectionRef = useRef<{ pole: Pole; normals: Float32Array; colors: Uint8ClampedArray }>();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      const scratch = document.createElement('canvas');
      scratch.width = image.width; scratch.height = image.height;
      const context = scratch.getContext('2d');
      if (!context) { setFailed(true); return; }
      context.drawImage(image, 0, 0);
      textureRef.current = context.getImageData(0, 0, image.width, image.height);
      setLoaded(true);
    };
    image.onerror = () => { if (!disposed) setFailed(true); };
    image.src = `${import.meta.env.BASE_URL}textures/lroc_color_2k.jpg`;
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    const texture = textureRef.current;
    if (!canvas || !texture || !loaded) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const size = 560, radius = size / 2 - 3;
    const frame = context.createImageData(size, size);
    const latitude = (pole === 'south' ? -65 : 65) * Math.PI / 180;
    const sin = Math.sin(latitude), cos = Math.cos(latitude);
    const sun = sample ? direction(sample.subsolar.lon, sample.subsolar.lat) : null;
    const earth = sample ? direction(sample.subearth.lon, sample.subearth.lat) : null;
    // Reproject only on texture/pole changes; changing the date updates light only.
    if (projectionRef.current?.pole !== pole) {
      const normals = new Float32Array(size * size * 3);
      const colors = new Uint8ClampedArray(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const nx = (x + .5 - size / 2) / radius;
        const ny = -(y + .5 - size / 2) / radius;
        const squared = nx * nx + ny * ny;
        if (squared > 1) continue;
        const nz = Math.sqrt(1 - squared);
        const worldY = ny * cos + nz * sin, worldZ = nz * cos - ny * sin;
        const lon = Math.atan2(nx, worldZ);
        const lat = Math.asin(Math.max(-1, Math.min(1, worldY)));
        const u = Math.min(texture.width - 1, Math.floor((lon / (2 * Math.PI) + .5) * texture.width));
        const v = Math.min(texture.height - 1, Math.floor((.5 - lat / Math.PI) * texture.height));
        const source = (v * texture.width + u) * 4, pixel = y * size + x;
        normals[pixel * 3] = nx; normals[pixel * 3 + 1] = worldY; normals[pixel * 3 + 2] = worldZ;
        colors[pixel * 4] = texture.data[source]; colors[pixel * 4 + 1] = texture.data[source + 1]; colors[pixel * 4 + 2] = texture.data[source + 2];
        colors[pixel * 4 + 3] = Math.min(255, (1 - squared) * 60000);
      }
      projectionRef.current = { pole, normals, colors };
    }
    const { normals, colors } = projectionRef.current;
    const earthThreshold = sample ? MOON_RADIUS_KM / sample.earthDistanceKm : 0;
    for (let pixel = 0; pixel < size * size; pixel++) {
      const target = pixel * 4;
      if (colors[target + 3] === 0) continue;
      const nx = normals[pixel * 3], worldY = normals[pixel * 3 + 1], worldZ = normals[pixel * 3 + 2];
      const light = sun ? nx * sun[0] + worldY * sun[1] + worldZ * sun[2] : 0;
      const cameraDepth = worldY * sin + worldZ * cos;
      const shade = layer === 'light' && sun ? .10 + .90 * Math.max(0, light) : .4 + .6 * cameraDepth;
      const tint = layer === 'earth' && earth && nx * earth[0] + worldY * earth[1] + worldZ * earth[2] > earthThreshold ? .38 : 0;
      frame.data[target] = colors[target] * shade * (1 - tint);
      frame.data[target + 1] = colors[target + 1] * shade + tint * 100;
      frame.data[target + 2] = colors[target + 2] * shade + tint * 160;
      frame.data[target + 3] = colors[target + 3];
    }
    context.putImageData(frame, 0, 0);
    // Explicit 80° boundary; the percentages describe this cap, not the full disk.
    context.beginPath();
    for (let i = 0; i <= 180; i++) {
      const [x, y, z] = direction(i * 2, pole === 'south' ? -80 : 80);
      const py = y * cos - z * sin;
      const px = size / 2 + x * radius, screenY = size / 2 - py * radius;
      if (i === 0) context.moveTo(px, screenY); else context.lineTo(px, screenY);
    }
    context.strokeStyle = '#e6f3ff'; context.lineWidth = 1.3; context.setLineDash([4, 4]); context.stroke();
  }, [sample, pole, layer, loaded]);
  return <div className="polar-moon"><canvas ref={canvasRef} width={560} height={560} role="img" aria-label={`Lua sobre o pólo ${pole === 'south' ? 'sul' : 'norte'}. ${sample ? `${sample.timestamp}. ${layer === 'light' ? 'Luz solar' : 'Visibilidade terrestre'} geométrica NASA. O tracejado delimita a região de 80 a 90 graus.` : 'Efemérides indisponíveis: apenas textura, sem condições calculadas.'}`} />{!loaded && <p role="status">{failed ? 'Textura indisponível. Consulte os cartões acima.' : 'A carregar a superfície lunar…'}</p>}<span className="polar-pin" style={{ top: pole === 'south' ? '71%' : '29%' }}><i /><b>{pole === 'south' ? 'S' : 'N'}</b><small>Pólo {pole === 'south' ? 'Sul' : 'Norte'}</small></span></div>;
}

export default function PolarOverview() {
  const [date, setDate] = useState(initialDay);
  const pole: Pole = 'south';
  const [layer, setLayer] = useState<Layer>('light');
  const [table, setTable] = useState<Ephemeris | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    loadEphemeris().then(data => { if (active) setTable(data); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Falha ao carregar os dados NASA.'); });
    return () => { active = false; };
  }, [retry]);
  const sample = useMemo(() => table ? getLunarSample(table, date, 12) : null, [table, date]);
  const dailyMetrics = useMemo(() => table ? getDailyPolarSummary(table, date, pole) : null, [table, date, pole]);
  const offset = dayNumber(date) - dayNumber(EPHEMERIS_START);
  function shift(days: number) { const next = new Date((dayNumber(date) + days) * DAY).toISOString().slice(0, 10); if (inCoverage(next)) setDate(next); }
  return <>
    <section className="metric-grid" aria-label="Resumo diário da região lunar">
      <OverviewMetric label="Região" value="Polo Sul" note="Área de interesse" icon={Globe2} />
      <OverviewMetric label="Iluminação média" value={dailyMetrics ? percent(dailyMetrics.sunlight) : '—'} note="Área com Sol visível · média diária UTC" icon={Sun} />
      <OverviewMetric label="Comunicação com a Terra" value={dailyMetrics ? percent(dailyMetrics.earth) : '—'} note="Área com Terra visível · média diária UTC" icon={Radio} />
    </section>
    <section className="polar-overview" aria-label="Visualização do Polo Sul Lunar">
    {!table && <div className="polar-data-state" role={error ? 'alert' : 'status'}>{error || 'A carregar as efemérides reais NASA de 2026…'}{error && <button onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>}</div>}
    <div className="polar-timeline"><div className="polar-date-controls"><button disabled={date === EPHEMERIS_START} onClick={() => shift(-1)} aria-label="Dia anterior"><ChevronLeft size={19} /></button><label className="polar-date-field"><CalendarDays size={18} aria-hidden="true" /><span>Data da observação</span><input aria-label="Data da observação" type="date" value={date} min={EPHEMERIS_START} max={EPHEMERIS_END} onChange={e => { const next = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(next) && inCoverage(next) && !Number.isNaN(Date.parse(`${next}T12:00:00Z`))) setDate(next); }} /></label><button disabled={date === EPHEMERIS_END} onClick={() => shift(1)} aria-label="Dia seguinte"><ChevronRight size={19} /></button><button className="polar-today" disabled={!inCoverage(utcDay())} onClick={() => setDate(utcDay())} title="Disponível dentro da cobertura de 2026"><RotateCcw size={14} aria-hidden="true" />Hoje</button></div><div className="polar-year"><div><span>Jan 2026</span><span>Explorar o ano</span><span>Dez 2026</span></div><input type="range" min={0} max={364} step={1} value={offset} aria-label="Dia do ano 2026" aria-valuetext={date} onChange={e => setDate(new Date((dayNumber(EPHEMERIS_START) + Number(e.target.value)) * DAY).toISOString().slice(0, 10))} /></div></div>
    <div className="polar-stage"><div className="polar-layer-control" role="group" aria-label="Camada lunar"><button aria-pressed={layer === 'light'} onClick={() => setLayer('light')}><Sun size={16} /> Iluminação</button><button aria-pressed={layer === 'earth'} onClick={() => setLayer('earth')}><Radio size={16} /> Terra</button></div><MoonCanvas sample={sample} pole={pole} layer={layer} /><div className="polar-stage-caption"><span><i className={layer} />{!sample ? 'Sem dados temporais' : layer === 'light' ? 'Luz solar · esfera sem relevo' : 'Azul · centro da Terra visível'}</span><span>Tracejado: limite de 80°</span></div></div>
    <details className="polar-provenance"><summary>Fontes, valores e método de cálculo</summary><p>Os cartões de Iluminação média e Comunicação com a Terra mostram a média da percentagem de área polar com o centro do Sol ou da Terra acima do horizonte nas 24 amostras horárias do dia UTC seleccionado (00:00–23:00). Cada hora tem o mesmo peso. Por exemplo, 60% significa que, em média nessas amostras, 60% da área tem visibilidade; não significa que cada ponto comunica durante 60% do dia ou que 60% dos pontos têm uma ligação garantida. A comunicação representa apenas linha de visada geométrica, sem relevo ou modelo de rádio. A Lua representa as 12:00 UTC do dia seleccionado; os cartões resumem as 24 amostras horárias desse dia no Polo Sul.</p><p>Cobertura: 1 de Janeiro a 31 de Dezembro de 2026, uma amostra por hora. A mudança de dia/hora selecciona uma linha real da tabela NASA, sem interpolação ou chamadas por frame.</p>{sample && <dl><dt>Instante</dt><dd>{sample.timestamp}</dd><dt>Ponto subsolar (longitude E, latitude N)</dt><dd>{degrees(sample.subsolar.lon)}, {degrees(sample.subsolar.lat)}</dd><dt>Ponto subterrestre (longitude E, latitude N)</dt><dd>{degrees(sample.subearth.lon)}, {degrees(sample.subearth.lat)}</dd><dt>Distância Terra–Lua, centro a centro</dt><dd>{sample.earthDistanceKm.toLocaleString('pt-PT')} km</dd></dl>}<p>Percentagens calculadas por área da calota completa, incluindo a parte que a câmara não mostra. Modelo esférico de raio 1 737,4 km; centro acima de 0°. A cor da textura é real; o relevo não foi calculado. O brilho residual nocturno serve apenas para tornar a superfície legível. Eclipses, disco solar/terrestre e sombras topográficas não estão incluídos.</p><p><a href="https://svs.gsfc.nasa.gov/5587/" target="_blank" rel="noreferrer">Efemérides: NASA SVS · Moon Phase and Libration 2026 ↗</a> · <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">Textura: NASA / GSFC / Arizona State University ↗</a></p><p><a href={`${import.meta.env.BASE_URL}data/moon-2026.json`} download>Descarregar tabela utilizada</a> · <a href="https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=resources" target="_blank" rel="noreferrer">Recursos do challenge ↗</a></p>{table && <p className="polar-checksum">SHA-256 da tabela NASA original: {table.sourceSha256}</p>}</details>
  </section></>;
}
