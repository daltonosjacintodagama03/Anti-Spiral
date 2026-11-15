import { useState, type FormEvent } from 'react';
import type { PositionRequest, PositionResult } from '@/services/position-contract';
import { analyzePositions } from '@/services/positions';
import ScenarioResult from './ScenarioResult';
import ScenarioComparison from './ScenarioComparison';
import './position-analysis.css';
const initial: PositionRequest = { latitude_deg:-89.5, longitude_deg:0, start_utc:'2026-11-14T12:00:00Z', duration_hours:24, step_minutes:60 };
function ScenarioForm({ name, draft, setDraft, busy, submit }: { name:string; draft:PositionRequest; setDraft:(value:PositionRequest)=>void; busy:boolean; submit:()=>void }) {
  function field(key:keyof PositionRequest, value:string) { setDraft({...draft,[key]:key==='start_utc'?`${value}:00Z`:Number(value)}); }
  return <form onSubmit={(event:FormEvent)=>{event.preventDefault();submit();}}><fieldset disabled={busy}><legend>Cenário {name} — local e intervalo UTC</legend>
    <label>Latitude (°)<input name="latitude" type="number" min="-89.999999" max="89.999999" step="any" value={draft.latitude_deg} onChange={event=>field('latitude_deg',event.target.value)} required /></label>
    <label>Longitude este (°)<input name="longitude" type="number" min="-360" max="360" step="any" value={draft.longitude_deg} onChange={event=>field('longitude_deg',event.target.value)} required /></label>
    <label>Início (UTC)<input name="start" type="datetime-local" min="2026-01-01T00:00" max="2026-12-31T23:00" value={draft.start_utc.slice(0,16)} onChange={event=>field('start_utc',event.target.value)} required /></label>
    <label>Duração (horas)<input name="duration" type="number" min="1" max="168" value={draft.duration_hours} onChange={event=>field('duration_hours',event.target.value)} required /></label>
    <label>Passo (minutos)<input name="step" type="number" min="1" max="60" value={draft.step_minutes} onChange={event=>field('step_minutes',event.target.value)} required /></label>
    <button type="submit">Analisar Sol e Terra{name==='B'?' — B':''}</button>
  </fieldset></form>;
}
export default function PositionAnalysis() {
  const [a,setA]=useState<PositionResult>(),[b,setB]=useState<PositionResult>();
  const [draftA,setDraftA]=useState(initial),[draftB,setDraftB]=useState<PositionRequest>();
  const [dirtyA,setDirtyA]=useState(false),[dirtyB,setDirtyB]=useState(false);
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[errorTarget,setErrorTarget]=useState('A');
  async function execute(name:'A'|'B') {
    const draft=name==='A'?draftA:draftB!;
    setBusy(name);setError('');setErrorTarget(name);
    if(name==='A'){setA(undefined);setB(undefined);}else setB(undefined);
    try {const result=await analyzePositions(draft);if(name==='A'){setA(result);setDirtyA(false);}else{setB(result);setDirtyB(false);}}
    catch(cause){setError(cause instanceof Error?cause.message:'Falha ao contactar a API.');}
    finally{setBusy('');}
  }
  function duplicate(delay:number) {
    if(!a)return;
    const start=new Date(Date.parse(a.request.start_utc)+delay*3600000).toISOString().replace('.000Z','Z');
    setDraftB({...a.request,start_utc:start});setB(undefined);setDirtyB(false);
  }
  return <>
    <section className="workspace-panel position-analysis" aria-label="Cenário A">
      <h2>Análise real de Sol e Terra</h2>
      <p>Coordenadas lunares: norte e este positivos. Horizonte geométrico, sem relevo. Altitude assumida na superfície de referência (0 km). Limites: 2026, 7 dias, 200 amostras; pólos exactos não suportados.</p>
      <ScenarioForm name="A" draft={draftA} setDraft={value=>{setDraftA(value);setDirtyA(true);}} busy={!!busy} submit={()=>void execute('A')} />
      <div aria-live="polite">{busy==='A'&&<p>Consulta do cenário A em curso; pode demorar até 50 segundos.</p>}{error&&errorTarget==='A'&&<p role="alert">{error}</p>}</div>
      {a&&<>{dirtyA&&<p role="status">Os parâmetros foram alterados. O resultado abaixo pertence à consulta anterior; volte a analisar.</p>}<ScenarioResult key={a.run_id} result={a} /><div className="scenario-actions"><button disabled={!!busy} onClick={()=>duplicate(24)}>Duplicar e adiar +24 h</button><button disabled={!!busy} onClick={()=>duplicate(0)}>Duplicar para alterar local</button></div></>}
    </section>
    {draftB&&<section className="workspace-panel position-analysis" aria-label="Cenário B"><h2>Cenário B</h2><p>A cópia preserva os parâmetros da execução A; só a alteração escolhida é aplicada. Confirme e analise para obter novos resultados.</p><ScenarioForm name="B" draft={draftB} setDraft={value=>{setDraftB(value);setDirtyB(true);}} busy={!!busy||!a} submit={()=>void execute('B')} /><div aria-live="polite">{busy==='B'&&<p>Consulta do cenário B em curso; pode demorar até 50 segundos.</p>}{error&&errorTarget==='B'&&<p role="alert">{error}</p>}</div>{b&&<>{dirtyB&&<p role="status">Os parâmetros B foram alterados; resultado e comparação pertencem à consulta anterior.</p>}<ScenarioResult key={b.run_id} result={b} /></>}</section>}
    {a&&b&&<ScenarioComparison a={a} b={b} />}
  </>;
}
