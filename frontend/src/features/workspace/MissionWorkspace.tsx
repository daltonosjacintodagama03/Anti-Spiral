import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { MissionAnalysisRead, MissionAnalysisIndex, MissionSite, Requirements } from '@/services/position-contract';
import { api } from '@/services/http';
import ScenarioResult, { hours, percent, ElevationChart } from './ScenarioResult';
import RegionMap from './RegionMap';
import './mission-workspace.css';
const objectives=[['science','Exploração científica'],['resources','Prospeção de recursos'],['technology','Teste de tecnologia'],['astronomy','Observação astronómica']] as const;
const units={day:24,week:168,month:720,year:8760};
const initial:Required<Requirements>={name:'Análise polar',objectives:['science'],duration_value:1,duration_unit:'week',start_utc:`${new Date().toISOString().slice(0,16)}:00Z`,step_minutes:60,site_ids:['shackleton','nobile','gerlache','malapert'],minimum_light_pct:50,minimum_earth_pct:50,maximum_dark_hours:72,maximum_earth_outage_hours:72};
const labels:Record<string,string>={pending:'Por executar',running:'A executar',completed:'Concluída',failed:'Falhou',partial:'Parcial'};
function download(data:unknown,format:'json'|'csv'){
  const text=typeof data==='string'?data:JSON.stringify(data,null,2);
  const url=URL.createObjectURL(new Blob([text],{type:format==='json'?'application/json':'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`analise-missao.${format}`;link.click();URL.revokeObjectURL(url);
}
export default function MissionWorkspace({section,base}:{section:string;base:string}) {
  const [catalog,setCatalog]=useState<MissionSite[]>([]),[history,setHistory]=useState<MissionAnalysisIndex[]>([]);
  const [draft,setDraft]=useState(initial),[active,setActive]=useState<MissionAnalysisRead>();
  const [selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [metric,setMetric]=useState('light'),[cursorUtc,setCursorUtc]=useState(''),[mapLayer,setMapLayer]=useState<'sun'|'earth'>('sun');
  const alive=useRef(true);const [params]=useSearchParams();const navigate=useNavigate();const id=params.get('analysis');
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function refresh(){const list=await api<MissionAnalysisIndex[]>('/mission-analyses');if(alive.current)setHistory(list);}
  useEffect(()=>{let valid=true;setLoading(true);Promise.all([api<MissionSite[]>('/mission-sites'),api<MissionAnalysisIndex[]>('/mission-analyses')]).then(([sites,list])=>{if(valid){setCatalog(sites);setHistory(list);}}).catch(cause=>{if(valid)setError(cause.message);}).finally(()=>{if(valid)setLoading(false);});return()=>{valid=false;};},[]);
  useEffect(()=>{if(!id||busy)return;let valid=true;setError('');api<MissionAnalysisRead>(`/mission-analyses/${id}`).then(record=>{if(valid){setActive(record);setDraft({...initial,...record.requirements});setSelected(value=>record.results[value]?value:record.requirements.site_ids[0]);}}).catch(cause=>{if(valid){setError(cause.message);setActive(undefined);}});return()=>{valid=false;};},[id,busy]);
  async function execute(record:MissionAnalysisRead){
    setBusy(true);setError('');let current=record;
    try{
      for(const site of record.requirements.site_ids){
        if(!alive.current)break;
        if(current.results[site]?.status==='completed')continue;
        // Persisted before each provider query; completed sites are never repeated on resume.
        current=await api<MissionAnalysisRead>(`/mission-analyses/${record.id}/sites/${site}`,{method:'POST',signal:AbortSignal.timeout(65000)});
        if(alive.current)setActive(current);
      }
      if(alive.current)await refresh();
    }catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'A execução foi interrompida. Reabra e retome a análise.');}
    finally{if(alive.current)setBusy(false);}
  }
  async function create(){setError('');setBusy(true);try{
    const record=await api<MissionAnalysisRead>('/mission-analyses',{method:'POST',body:JSON.stringify(draft)});
    setActive(record);setSelected(record.requirements.site_ids[0]);navigate(`${base}/locais?analysis=${record.id}`);
    await execute(record);
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível guardar.');setBusy(false);}}
  function change<K extends keyof typeof draft>(key:K,value:(typeof draft)[K]){setDraft({...draft,[key]:value});}
  const completed=active?Object.values(active.results).filter(value=>value.analysis):[];
  const selectedItem=active?.results[selected];
  const sampleCount=Math.ceil(draft.duration_value*units[draft.duration_unit]*60/draft.step_minutes)+1;
  const comparable=new Set(completed.map(item=>{const run=item.analysis!;return JSON.stringify([run.engine_version,run.model,run.visibility_rule,run.request.duration_hours,run.request.step_minutes,run.request.start_utc]);})).size<=1&&completed.every(item=>Object.values(item.analysis!.visibility.summary).every(summary=>summary.coverage_fraction>=1-1e-10));
  const sorted=comparable?[...completed].sort((a,b)=>{
    const x=a.analysis!.visibility.summary,y=b.analysis!.visibility.summary;
    return metric==='dark'?x.sun.longest_invisible_seconds-y.sun.longest_invisible_seconds:metric==='earth'?y.earth.visible_seconds-x.earth.visible_seconds:metric==='combined'?y.combined.visible_seconds-x.combined.visible_seconds:y.sun.visible_seconds-x.sun.visible_seconds;
  }):completed;
  const sites=active?Object.values(active.results).map(value=>value.site):catalog.filter(value=>draft.site_ids.includes(value.id));
  const total=active?.requirements.site_ids.length??0;
  const mapTime=cursorUtc||active?.requirements.start_utc;
  const conditions=Object.fromEntries(completed.map(item=>{const sample=item.analysis!.samples.find(row=>row.timestamp_utc===mapTime);return [item.site.id,sample?sample[mapLayer].elevation_deg>0:undefined];}));
  return <div className="mission-workspace">
    <section className="workspace-panel mission-history"><label>Análises guardadas na minha conta<select aria-label="Análises guardadas" value={id??''} disabled={busy} onChange={event=>{if(event.target.value)navigate(`${base}/${section}?analysis=${event.target.value}`);}}><option value="">Seleccionar análise…</option>{history.map(record=><option key={record.id} value={record.id}>{record.name} · {labels[record.status]??record.status} · {record.created_at.slice(0,16)}</option>)}</select></label><p>Requisitos e resultados são privados da sua conta (até 20 análises guardadas). Os perfis de apresentação têm as mesmas permissões.</p></section>
    {loading&&<p role="status">A carregar catálogo e histórico…</p>}{error&&<p className="workspace-error" role="alert">{error}</p>}
    {section==='requisitos'&&<section className="workspace-panel mission-form"><h2>Requisitos da missão</h2><p>Os objectivos organizam a missão. Os limiares abaixo são verificados contra a geometria calculada, sem estimar electricidade, gelo ou segurança de aterragem.</p>
      <p>Guardar requisitos cria uma nova execução; análises anteriores permanecem imutáveis.</p><form onSubmit={event=>{event.preventDefault();void create();}}><fieldset disabled={busy||loading}><legend>Missão e objectivos</legend><label>Nome da análise<input required maxLength={120} value={draft.name} onChange={event=>change('name',event.target.value)}/></label>
      <div className="mission-options">{objectives.map(([value,label])=><label key={value}><input type="checkbox" checked={draft.objectives.includes(value)} onChange={event=>change('objectives',event.target.checked?[...draft.objectives,value]:draft.objectives.filter(item=>item!==value))}/>{label}</label>)}</div>
      <div className="mission-fields"><label>Início da missão (UTC)<input type="datetime-local" required min="2026-01-01T00:00" max="2028-12-31T23:00" value={draft.start_utc.slice(0,16)} onChange={event=>change('start_utc',`${event.target.value}:00Z`)}/></label>
      <div className="duration-pair"><label>Duração<input aria-label="Duração da missão" type="number" required min="1" max="730" step="1" value={draft.duration_value} onChange={event=>change('duration_value',Number(event.target.value))}/></label><label>Unidade<select aria-label="Unidade de duração" value={draft.duration_unit} onChange={event=>change('duration_unit',event.target.value as typeof draft.duration_unit)}><option value="day">Dia</option><option value="week">Semana</option><option value="month">Mês (30 dias)</option><option value="year">Ano (365 dias)</option></select></label></div>
      <label>Passo temporal<select value={draft.step_minutes} onChange={event=>change('step_minutes',Number(event.target.value))}>{[5,15,30,60,120,360,720,1440].map(value=><option key={value} value={value}>{value<60?`${value} min`:`${value/60} h`}</option>)}</select></label></div>
      <p role={sampleCount>5000?'alert':undefined}>{sampleCount} amostras por local. Máximo: 5000; até 2 anos, inteiramente entre 2026 e 2028. A resolução não é reduzida automaticamente.</p>
      </fieldset><fieldset disabled={busy||loading}><legend>Condições geométricas pretendidas</legend><div className="mission-fields">
      <label>Luz mínima (% do intervalo)<input type="number" required min="0" max="100" step="any" value={draft.minimum_light_pct} onChange={event=>change('minimum_light_pct',Number(event.target.value))}/></label>
      <label>Terra visível mínima (%)<input type="number" required min="0" max="100" step="any" value={draft.minimum_earth_pct} onChange={event=>change('minimum_earth_pct',Number(event.target.value))}/></label>
      <label>Escuridão contínua máxima (h)<input type="number" required min="0" max="17520" step="any" value={draft.maximum_dark_hours} onChange={event=>change('maximum_dark_hours',Number(event.target.value))}/></label>
      <label>Interrupção terrestre máxima (h)<input type="number" required min="0" max="17520" step="any" value={draft.maximum_earth_outage_hours} onChange={event=>change('maximum_earth_outage_hours',Number(event.target.value))}/></label>
      </div></fieldset><fieldset disabled={busy||loading}><legend>Comparar 2 a 4 pontos regionais</legend><div className="mission-options">{catalog.map(site=><label key={site.id}><input type="checkbox" checked={draft.site_ids.includes(site.id)} onChange={event=>change('site_ids',event.target.checked?[...draft.site_ids,site.id]:draft.site_ids.filter(value=>value!==site.id))}/><span>{site.name}<small>{site.latitude_deg}°, {site.longitude_deg}°</small></span></label>)}</div><p>Pontos de referência do Lunar Surface Data Book (2023), não locais de aterragem certificados. São comparados pontos, não médias de toda uma zona.</p></fieldset>
      <button type="submit" disabled={busy||loading||sampleCount>5000||!draft.objectives.length||draft.site_ids.length<2||draft.site_ids.length>4}>{busy?'A guardar e analisar…':'Guardar requisitos e analisar locais'}</button></form>
    </section>}
    {active&&section!=='requisitos'&&<><section className="workspace-panel mission-status"><h2>{active.name}</h2><p>{active.requirements.start_utc} · {active.requirements.duration_value} {{day:'dia(s)',week:'semana(s)',month:'mês(es) de 30 dias',year:'ano(s) de 365 dias'}[active.requirements.duration_unit??'week']} · passo {active.requirements.step_minutes} min · horizonte geométrico 0° · centros dos corpos.</p><p>Objectivos: {active.requirements.objectives.map(value=>objectives.find(item=>item[0]===value)?.[1]).join(', ')}.</p><p role="status">{labels[active.status]??active.status} · {completed.length}/{total} locais concluídos {busy?'— consulta ao Horizons em curso':''}</p><progress value={completed.length} max={total} aria-label="Progresso dos locais"/>
      <ul>{Object.values(active.results).map(item=><li key={item.site.id}>{item.site.name}: {labels[item.status]??item.status}{item.error&&<span role="alert"> — {item.error}</span>}</li>)}</ul>
      {active.status!=='completed'&&<button disabled={busy} onClick={()=>void execute(active)}>Retomar locais pendentes ou falhados</button>}
      <p>Uma execução interrompida pode ser retomada após 90 segundos. Resultados concluídos não são recalculados nem substituídos.</p></section>
      {(section==='resultados'||section==='locais')&&<section className="workspace-panel mission-comparison"><h2>Comparativo dos locais — dados reais</h2><label>Ordenar por<select disabled={!comparable} value={metric} onChange={event=>setMetric(event.target.value)}><option value="light">Duração de luz — maior primeiro</option><option value="earth">Terra visível — maior primeiro</option><option value="combined">Janela conjunta total — maior primeiro</option><option value="dark">Maior escuridão — menor primeiro</option></select></label><p>Não existe score geral de segurança. Os locais ainda não concluídos ficam fora da ordenação.</p>{!comparable&&<p role="alert">Ordenação bloqueada: versões, parâmetros ou cobertura incompatíveis. Crie uma nova execução homogénea para comparar.</p>}
      <div className="position-analysis__table"><table><caption>Parâmetros idênticos em todos os pontos; métricas referem-se ao intervalo da missão.</caption><thead><tr><th>Local</th><th>Luz</th><th>Terra</th><th>Maior escuridão</th><th>Maior interrupção terrestre</th><th>Sol e Terra</th><th>Limiares geométricos</th></tr></thead><tbody>{sorted.map(item=>{const s=item.analysis!.visibility.summary;return <tr key={item.site.id}><th><button onClick={()=>setSelected(item.site.id)}>{item.site.name}</button></th><td>{hours(s.sun.visible_seconds)} · {percent(s.sun.visible_fraction_total)}</td><td>{hours(s.earth.visible_seconds)} · {percent(s.earth.visible_fraction_total)}</td><td>{hours(s.sun.longest_invisible_seconds)}</td><td>{hours(s.earth.longest_invisible_seconds)}</td><td>{hours(s.combined.visible_seconds)}</td><td>{item.checks?.length===4&&item.checks.every(check=>check.met)?'Cumpre os 4 limiares':'Há limiares não cumpridos'}</td></tr>;})}</tbody></table></div>
      {completed.length>1&&<ElevationChart results={completed.map(item=>item.analysis!)} labels={completed.map(item=>item.site.name)} />}
      <label>Local em detalhe<select value={selected} onChange={event=>setSelected(event.target.value)}>{sites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
      <label>Condição dos marcadores<select value={mapLayer} onChange={event=>setMapLayer(event.target.value as typeof mapLayer)}><option value="sun">Centro do Sol acima do horizonte</option><option value="earth">Centro da Terra visível</option></select></label><RegionMap sites={sites} selected={selected} onSelect={setSelected} conditions={conditions} utc={mapTime} layer={mapLayer}/>
      {selectedItem&&<p>Coordenadas verificadas: {selectedItem.site.latitude_deg}°, {selectedItem.site.longitude_deg}°. <a href={selectedItem.site.source} target="_blank" rel="noreferrer">Fonte do ponto regional</a>. Inclinação e relevo: não calculados.</p>}
      {selectedItem?.analysis&&<><h3>Verificação dos requisitos — {selectedItem.site.name}</h3><ul>{(selectedItem.checks??[]).map(check=><li key={check.name}>{check.name}: {check.actual.toFixed(2)} {check.unit} · limiar {check.limit} {check.unit} · {check.met?'cumpre':'não cumpre'}</li>)}</ul><ScenarioResult key={selectedItem.analysis.run_id} result={selectedItem.analysis} onCursorChange={setCursorUtc}/></>}
      </section>}
      {section==='relatorios'&&<section className="workspace-panel mission-status"><h2>Exportar a execução guardada</h2><p>Exportação do snapshot da BD, incluindo requisitos, resultados, fontes e limitações; não utiliza inputs actualmente editados. O CSV inclui apenas locais concluídos; use também o JSON para parâmetros, proveniência e falhas.</p><button onClick={()=>download(active,'json')}>Exportar JSON</button><button onClick={()=>download(['Local,run_id,latitude_deg,longitude_deg,start_utc,duration_hours,step_minutes,model,visibility_rule,Luz_h,Terra_h,Escuridao_max_h,Janela_conjunta_h,Sol_conhecido_s,Sol_desconhecido_s,Terra_conhecida_s,Terra_desconhecida_s',...completed.map(item=>{const summary=item.analysis!.visibility.summary;return [item.site.name,item.analysis!.run_id,item.site.latitude_deg,item.site.longitude_deg,item.analysis!.request.start_utc,item.analysis!.request.duration_hours,item.analysis!.request.step_minutes,item.analysis!.model,item.analysis!.visibility_rule,summary.sun.visible_seconds/3600,summary.earth.visible_seconds/3600,summary.sun.longest_invisible_seconds/3600,summary.combined.visible_seconds/3600,summary.sun.known_seconds,summary.sun.unknown_seconds,summary.earth.known_seconds,summary.earth.unknown_seconds].join(',');})].join('\n'),'csv')}>Exportar CSV</button></section>}
    </>}
    {!active&&section!=='requisitos'&&!loading&&<section className="workspace-panel mission-status"><h2>Ainda não há uma análise aberta</h2><p>Seleccione uma execução guardada ou introduza requisitos para calcular os locais.</p><button onClick={()=>navigate(`${base}/requisitos`)}>Definir requisitos</button></section>}
  </div>;
}
