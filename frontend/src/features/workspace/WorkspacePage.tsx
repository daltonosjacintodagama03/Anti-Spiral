import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowRight, Bell, BookOpen, Check, Compass, Download, FileBarChart2, FileText, Gauge, Globe2, LayoutDashboard, LogOut, MapPin, Moon, Search, Settings2, SlidersHorizontal, Telescope, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/auth';
import { useSites } from '@/services/useSites';
import type { LandingSite } from '@/types/site';
import { LunarMap } from './LunarMap';
import './workspace.css';

export type Mode = 'planeje' | 'estude' | 'explore';
type Section = { id: string; label: string; icon: typeof LayoutDashboard };

const SECTIONS: Record<Mode, Section[]> = {
  planeje: [
    { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'requisitos', label: 'Requisitos da missão', icon: SlidersHorizontal },
    { id: 'locais', label: 'Análise de locais', icon: MapPin },
    { id: 'resultados', label: 'Resultados', icon: FileBarChart2 },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
  ],
  estude: [
    { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'aprender', label: 'Aprender', icon: BookOpen },
    { id: 'dados', label: 'Dados lunares', icon: Activity },
    { id: 'locais', label: 'Explorar locais', icon: MapPin },
  ],
  explore: [
    { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'explorar', label: 'Mapa lunar', icon: Compass },
    { id: 'simulador', label: 'Simulador', icon: Gauge },
  ],
};

const ROLE_NAME: Record<Mode, string> = {
  planeje: 'Planejador de missão', estude: 'Educador / Estudante', explore: 'Público / Entusiasta',
};
const ROLE_INTRO: Record<Mode, string> = {
  planeje: 'Compare locais candidatos e organize os critérios da sua missão.',
  estude: 'Aprenda como relevo, iluminação e comunicação moldam a exploração lunar.',
  explore: 'Descubra a região polar sul e experimente cenários de exploração.',
};

const SECTION_TITLES: Record<string, string> = {
  'visao-geral': 'Visão geral', requisitos: 'Defina os requisitos da missão', locais: 'Análise de locais',
  resultados: 'Locais candidatos para comparação', relatorios: 'Relatórios da missão',
  aprender: 'Aprender sobre a Lua', dados: 'Dados para explorar', explorar: 'Explore o Polo Sul Lunar', simulador: 'Simulador de missão',
};

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Activity }) {
  return <article className="metric-card"><span className="metric-card__icon"><Icon size={18} /></span><span className="metric-card__label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function CandidateRows({ sites, selectedId, onSelect, query = '' }: { sites: LandingSite[]; selectedId: string | null; onSelect: (id: string) => void; query?: string }) {
  const visible = sites.filter((site) => site.name.toLowerCase().includes(query.toLowerCase()));
  if (!visible.length) return <p className="workspace-empty">Nenhum local corresponde à busca.</p>;
  return <div className="candidate-list">{visible.map((site, index) => <button className={`candidate-row ${selectedId === site.id ? 'is-selected' : ''}`} key={site.id} onClick={() => onSelect(site.id)} aria-pressed={selectedId === site.id}>
    <span className={`candidate-dot candidate-dot--${index + 1}`} />
    <span className="candidate-row__name"><strong>{site.name}</strong><small>{site.xKm.toFixed(0)} km E · {site.yKm.toFixed(0)} km N</small></span>
    <span className="candidate-stat"><small>Inclinação</small><strong>{site.slopeDeg}°</strong></span>
    <span className="candidate-stat"><small>Iluminação</small><strong>{site.illuminationPct}%</strong></span>
    <span className="candidate-stat"><small>Visibilidade da Terra</small><strong>{site.earthVisibilityPct}%</strong></span>
  </button>)}</div>;
}

export default function WorkspacePage({ mode }: { mode: Mode }) {
  const { state, reload } = useSites();
  const { session, setSession } = useAuth();
  const { section: requestedSection } = useParams();
  const navigate = useNavigate();
  const sections = SECTIONS[mode];
  const section = sections.some((item) => item.id === requestedSection) ? requestedSection! : 'visao-geral';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [objective, setObjective] = useState('Exploração científica');
  const [duration, setDuration] = useState('Até 7 dias');
  const [energy, setEnergy] = useState('Média');
  const [communication, setCommunication] = useState('Média');
  const [energyWeight, setEnergyWeight] = useState(50);
  const [computed, setComputed] = useState(false);
  const [simulationDays, setSimulationDays] = useState(14);
  const [simulationMessage, setSimulationMessage] = useState('');
  const sites = state.status === 'ready' ? state.sites : [];
  const selectedSite = sites.find((site) => site.id === selectedId) ?? sites[0];
  const orderedSites = useMemo(() => [...sites].sort((a, b) => {
    const score = (site: LandingSite) => (site.illuminationPct * energyWeight + site.earthVisibilityPct * (100 - energyWeight)) / 100 - site.slopeDeg * 2;
    return score(b) - score(a);
  }), [sites, energyWeight]);
  const title = SECTION_TITLES[section] || SECTION_TITLES['visao-geral'];
  const base = `/${mode}`;

  function downloadReport() {
    const rows = [['Local', 'Inclinacao (graus)', 'Iluminacao (%)', 'Visibilidade da Terra (%)'], ...orderedSites.map((site) => [site.name, String(site.slopeDeg), String(site.illuminationPct), String(site.earthVisibilityPct)])];
    const content = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'luna-metrica-locais-demo.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="workspace-app">
    <aside className="workspace-sidebar" aria-label="Área de trabalho">
      <Link to="/" className="workspace-brand" aria-label="Luna Navigator — início"><span><Moon size={21} /></span><strong>Luna Navigator</strong></Link>
      <div className="workspace-sidebar__label">ESPAÇO DE TRABALHO</div>
      <nav className="workspace-nav" aria-label="Navegação do perfil">
        {sections.map(({ id, label, icon: Icon }) => <NavLink key={id} to={id === 'visao-geral' ? base : `${base}/${id}`} end className={({ isActive }) => `workspace-nav__link ${isActive ? 'is-active' : ''}`}><Icon size={17} /><span>{label}</span>{id === 'requisitos' && computed && <span className="workspace-nav__count">✓</span>}</NavLink>)}
      </nav>
      <div className="workspace-sidebar__foot"><span className="sidebar-moon" aria-hidden="true" /><small>PLANEJAMENTO HOJE.<br />NOVAS DESCOBERTAS AMANHÃ.</small></div>
    </aside>

    <div className="workspace-main">
      <header className="workspace-topbar">
        <div className="workspace-topbar__crumb"><span>MÓDULO {mode === 'planeje' ? '1' : mode === 'estude' ? '2' : '3'}</span><b>/</b>{title}</div>
        <div className="workspace-user"><span className="workspace-icon-button" role="img" aria-label="Notificações: nenhuma nova"><Bell size={17} /><span className="notification-dot" /></span><span className="workspace-avatar" aria-hidden="true">{(session?.name || 'U').slice(0, 1).toUpperCase()}</span><span className="workspace-user__copy"><strong>{session?.name || 'Visitante'}</strong><small>{ROLE_NAME[mode]}</small></span><button type="button" className="workspace-logout" onClick={() => { setSession(null); navigate('/'); }} aria-label="Encerrar sessão" title="Encerrar sessão"><LogOut size={15} /></button></div>
      </header>

      <main className="workspace-content">
        <div className="workspace-heading"><div><span className="workspace-eyebrow">{ROLE_NAME[mode].toUpperCase()}</span><h1>{section === 'visao-geral' ? `Olá, ${session?.name?.split(' ')[0] || 'explorador'}.` : title}</h1><p>{section === 'visao-geral' ? ROLE_INTRO[mode] : getSectionIntro(mode, section)}</p></div>
          {mode === 'planeje' && section === 'resultados' && <Button variant="ghost" onClick={downloadReport}><Download size={16} /> Exportar CSV</Button>}
        </div>

        <div className="workspace-demo-notice" role="note"><TriangleAlert size={16} /><span><strong>Ambiente demonstrativo.</strong> Os locais e métricas são dados de exemplo. Não use para decisões operacionais de missão.</span></div>

        {state.status === 'loading' && <div className="workspace-loading" aria-busy="true"><span className="loading-orbit" />Carregando dados de demonstração…</div>}
        {state.status === 'error' && <div className="workspace-error" role="alert"><p>{state.message}</p><Button onClick={reload}>Tentar novamente</Button></div>}
        {state.status === 'ready' && <>
          {section === 'visao-geral' && <Overview mode={mode} sites={sites} navigate={navigate} base={base} computed={computed} />}
          {mode === 'planeje' && section === 'requisitos' && <Requirements objective={objective} setObjective={setObjective} duration={duration} setDuration={setDuration} energy={energy} setEnergy={setEnergy} communication={communication} setCommunication={setCommunication} energyWeight={energyWeight} setEnergyWeight={setEnergyWeight} onSubmit={() => { setComputed(true); navigate(`${base}/resultados`); }} />}
          {mode === 'planeje' && section === 'locais' && <LocationAnalysis sites={sites} selectedId={selectedId} onSelect={setSelectedId} selectedSite={selectedSite} query={query} setQuery={setQuery} />}
          {mode === 'planeje' && section === 'resultados' && <Results sites={orderedSites} selectedId={selectedId} onSelect={setSelectedId} computed={computed} />}
          {mode === 'planeje' && section === 'relatorios' && <Reports sites={orderedSites} onDownload={downloadReport} computed={computed} />}
          {mode === 'estude' && section === 'aprender' && <Learning />}
          {mode === 'estude' && section === 'dados' && <DataCatalog sites={sites} />}
          {mode === 'estude' && section === 'locais' && <LocationAnalysis sites={sites} selectedId={selectedId} onSelect={setSelectedId} selectedSite={selectedSite} query={query} setQuery={setQuery} />}
          {mode === 'explore' && section === 'explorar' && <Explorer sites={sites} selectedId={selectedId} onSelect={setSelectedId} selectedSite={selectedSite} />}
          {mode === 'explore' && section === 'simulador' && <Simulator days={simulationDays} setDays={setSimulationDays} message={simulationMessage} onRun={() => setSimulationMessage(`Cenário ilustrativo de ${simulationDays} dias preparado. Estes dados não representam uma simulação física.`)} />}
        </>}
      </main>
    </div>
  </div>;
}

function getSectionIntro(mode: Mode, section: string) {
  const intro: Record<string, string> = {
    requisitos: 'Informe os parâmetros da missão para organizar uma comparação demonstrativa.',
    locais: mode === 'planeje' ? 'Inspecione as métricas de cada local candidato.' : 'Selecione um local e observe os indicadores disponíveis.',
    resultados: 'Ordenação preliminar baseada nos critérios selecionados e nos dados de exemplo.',
    relatorios: 'Exporte os dados demonstrativos para continuar a análise.',
    aprender: 'Conteúdo introdutório para entender as condições do Polo Sul Lunar.',
    dados: 'Consulte as variáveis disponíveis e as limitações deste protótipo.',
    explorar: 'Navegue pelos locais candidatos sobre um mapa esquemático.',
    simulador: 'Monte um cenário didático sem valor operacional ou científico.',
  };
  return intro[section] || ROLE_INTRO[mode];
}

function Overview({ mode, sites, navigate, base, computed }: { mode: Mode; sites: LandingSite[]; navigate: ReturnType<typeof useNavigate>; base: string; computed: boolean }) {
  const primary = mode === 'planeje' ? ['requisitos', 'Definir requisitos', 'Ajuste o objetivo e os pesos de comparação.', SlidersHorizontal] as const : mode === 'estude' ? ['aprender', 'Continuar aprendendo', 'Explore conceitos de iluminação e terreno.', BookOpen] as const : ['explorar', 'Abrir mapa lunar', 'Encontre os locais no mapa do Polo Sul.', Compass] as const;
  const PrimaryIcon = primary[3];
  return <>
    <section className="metric-grid" aria-label="Indicadores"><Metric label="Locais candidatos" value={String(sites.length).padStart(2, '0')} note="No conjunto demonstrativo" icon={MapPin} /><Metric label="Iluminação média" value={`${Math.round(sites.reduce((sum, site) => sum + site.illuminationPct, 0) / Math.max(sites.length, 1))}%`} note="Estimativa fictícia" icon={Activity} /><Metric label="Região" value="Polo Sul" note="Área de interesse" icon={Globe2} /></section>
    <section className="workspace-overview-grid"><article className="workspace-panel overview-primary"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">PRÓXIMA ETAPA</span><h2>{primary[1]}</h2><p>{primary[2]}</p></div><span className="overview-primary__icon"><PrimaryIcon size={22} /></span></div><Button onClick={() => navigate(`${base}/${primary[0]}`)}>Abrir módulo <ArrowRight size={16} /></Button></article>
      <article className="workspace-panel"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">ATIVIDADE</span><h2>{mode === 'planeje' ? 'Sua missão' : mode === 'estude' ? 'Seu aprendizado' : 'Sua exploração'}</h2></div></div><div className="activity-row"><span className="activity-status"><Check size={14} /></span><div><strong>{mode === 'planeje' ? (computed ? 'Comparação demonstrativa pronta' : 'Requisitos por definir') : mode === 'estude' ? 'Conteúdo disponível para explorar' : 'Mapa lunar pronto'}</strong><small>{mode === 'planeje' && computed ? 'Resultado local · sem processamento no servidor' : 'Nenhuma atividade foi salva no servidor'}</small></div></div><p className="workspace-footnote">Esta sessão é local e temporária.</p></article>
    </section>
    <section className="workspace-panel"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">LOCAIS EM DESTAQUE</span><h2>Compare as condições de exemplo</h2></div><button className="text-action" onClick={() => navigate(`${base}/${mode === 'planeje' ? 'locais' : mode === 'estude' ? 'locais' : 'explorar'}`)}>Ver locais <ArrowRight size={15} /></button></div><CandidateRows sites={sites.slice(0, 3)} selectedId={null} onSelect={(id) => navigate(`${base}/${mode === 'planeje' ? 'locais' : mode === 'estude' ? 'locais' : 'explorar'}?local=${id}`)} /></section>
  </>;
}

function Requirements({ objective, setObjective, duration, setDuration, energy, setEnergy, communication, setCommunication, energyWeight, setEnergyWeight, onSubmit }: { objective: string; setObjective: (value: string) => void; duration: string; setDuration: (value: string) => void; energy: string; setEnergy: (value: string) => void; communication: string; setCommunication: (value: string) => void; energyWeight: number; setEnergyWeight: (value: number) => void; onSubmit: () => void }) {
  return <section className="requirements-grid"><form className="workspace-panel requirements-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><div className="workspace-panel__head"><div><span className="workspace-eyebrow">CONFIGURAÇÃO</span><h2>Parâmetros de missão</h2><p>Estes valores organizam apenas a comparação local do protótipo.</p></div><Settings2 size={20} /></div>
    <label className="field-row">Objetivo<select value={objective} onChange={(event) => setObjective(event.target.value)}><option>Exploração científica</option><option>Prospeção de recursos</option><option>Teste de tecnologia</option><option>Observação astronômica</option></select></label>
    <label className="field-row">Duração na superfície<select value={duration} onChange={(event) => setDuration(event.target.value)}><option>Até 7 dias</option><option>Até 30 dias</option><option>Missão de longa duração</option></select></label>
    <label className="field-row">Necessidade de energia<select value={energy} onChange={(event) => setEnergy(event.target.value)}><option>Baixa</option><option>Média</option><option>Alta</option></select></label>
    <label className="field-row">Prioridade de comunicação<select value={communication} onChange={(event) => setCommunication(event.target.value)}><option>Baixa</option><option>Média</option><option>Alta</option></select></label>
    <label className="field-row">Região de interesse<select defaultValue="Polo Sul"><option>Polo Sul</option><option>Crateras permanentemente sombreadas</option><option>Terrenos elevados</option></select></label>
    <div className="criteria-control"><div className="criteria-control__labels"><strong>Peso dos critérios</strong><span>Energia <b>{energyWeight}%</b><i> · </i>Comunicação <b>{100 - energyWeight}%</b></span></div><input type="range" min="0" max="100" step="5" value={energyWeight} onChange={(event) => setEnergyWeight(Number(event.target.value))} aria-label="Peso da energia comparado à comunicação" /></div>
    <div className="inline-notice"><TriangleAlert size={15} /> A API ainda não processa critérios de locais lunares.</div><Button type="submit">Comparar locais <ArrowRight size={16} /></Button>
  </form><div className="requirements-preview"><div className="map-card__title"><span>REGIÃO DE ESTUDO</span><span className="map-north">N ↑</span></div><div className="requirements-map"><div className="study-radius" /><span className="study-center" /><span className="study-scale">50 km</span><span className="study-legend"><i /> Região de estudo<br /><i className="solid" /> Centro da região</span></div><div className="region-facts"><span><i>⌁</i><b>Terreno</b><small>Região de crateras</small></span><span><i>☼</i><b>Iluminação</b><small>Variável</small></span><span><i>△</i><b>Pontos de interesse</b><small>Formações geológicas</small></span></div></div></section>;
}

function LocationAnalysis({ sites, selectedId, onSelect, selectedSite, query, setQuery }: { sites: LandingSite[]; selectedId: string | null; onSelect: (id: string) => void; selectedSite?: LandingSite; query: string; setQuery: (value: string) => void }) {
  return <section className="analysis-layout"><div className="workspace-panel analysis-map-panel"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">MAPA ESQUEMÁTICO</span><h2>Região de estudo</h2></div><span className="map-north">N ↑</span></div><LunarMap sites={sites} selectedId={selectedId} onSelect={onSelect} /><p className="workspace-footnote">Coordenadas ilustrativas relativas ao polo; mapa sem cartografia orbital.</p></div><div className="workspace-panel analysis-details"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar local candidato" /></label><CandidateRows sites={sites} selectedId={selectedId} onSelect={onSelect} query={query} />{selectedSite && <div className="selected-summary"><span className="workspace-eyebrow">LOCAL SELECIONADO</span><h3>{selectedSite.name}</h3><p>Inclinação: <b>{selectedSite.slopeDeg}°</b></p><p>Iluminação: <b>{selectedSite.illuminationPct}%</b></p><p>Visibilidade da Terra: <b>{selectedSite.earthVisibilityPct}%</b></p></div>}</div></section>;
}

function Results({ sites, selectedId, onSelect, computed }: { sites: LandingSite[]; selectedId: string | null; onSelect: (id: string) => void; computed: boolean }) {
  return <><div className="results-summary"><span className="results-summary__icon"><Activity size={19} /></span><div><strong>{computed ? 'Comparação atualizada localmente' : 'Visão preliminar dos candidatos'}</strong><p>Ordenação demonstrativa com os indicadores disponíveis. Nenhuma recomendação operacional é produzida.</p></div></div><div className="results-grid"><div className="workspace-panel"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">CANDIDATOS</span><h2>Comparativo dos critérios</h2></div><span className="results-count">{sites.length} locais</span></div><div className="results-table-wrap"><table className="results-table"><thead><tr><th>Local</th><th>Energia / iluminação</th><th>Visibilidade da Terra</th><th>Terreno / inclinação</th></tr></thead><tbody>{sites.map((site, index) => <tr key={site.id} className={selectedId === site.id ? 'is-selected' : ''} onClick={() => onSelect(site.id)}><td><button className="table-site"><span className={`candidate-dot candidate-dot--${index + 1}`} />{site.name}<small>{index === 0 ? 'Maior prioridade no ordenamento' : 'Candidato para revisão'}</small></button></td><td><Meter value={site.illuminationPct} /></td><td><Meter value={site.earthVisibilityPct} /></td><td><Meter value={Math.max(0, 100 - site.slopeDeg * 10)} /></td></tr>)}</tbody></table></div></div><div className="workspace-panel results-map-panel"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">DISTRIBUIÇÃO</span><h2>Locais no mapa</h2></div></div><LunarMap sites={sites} selectedId={selectedId} onSelect={onSelect} /><div className="results-note"><Activity size={17} /><p>A classificação muda com os pesos selecionados em Requisitos.</p></div></div></div></>;
}
function Meter({ value }: { value: number }) { return <span className="meter" aria-label={`${Math.round(value)} por cento`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /><small>{Math.round(value)}%</small></span>; }

function Reports({ sites, onDownload, computed }: { sites: LandingSite[]; onDownload: () => void; computed: boolean }) {
  return <section className="workspace-panel report-card"><span className="report-card__icon"><FileBarChart2 size={23} /></span><div><span className="workspace-eyebrow">EXPORTAÇÃO</span><h2>Resumo de locais candidatos</h2><p>Arquivo CSV com inclinação, iluminação e visibilidade da Terra para cada local demonstrativo.</p><small>{sites.length} registros · {computed ? 'comparação local atualizada' : 'dados de exemplo'}</small></div><Button onClick={onDownload}><Download size={16} /> Baixar CSV</Button></section>;
}

function Learning() {
  const lessons = [
    ['01', 'Por que o Polo Sul?', 'A região reúne áreas iluminadas por longos períodos e crateras que podem preservar voláteis. A disponibilidade varia conforme o relevo e a estação.'],
    ['02', 'Luz e energia', 'A iluminação depende da topografia e da posição do Sol. Um valor médio não substitui uma análise temporal detalhada.'],
    ['03', 'Comunicação com a Terra', 'O relevo pode bloquear a linha de visada. Missões consideram antenas, relés orbitais e janelas de comunicação.'],
  ];
  return <div className="lesson-grid">{lessons.map(([number, title, text]) => <article className="lesson-card" key={number}><span>{number}</span><BookOpen size={19} /><h2>{title}</h2><p>{text}</p></article>)}</div>;
}
function DataCatalog({ sites }: { sites: LandingSite[] }) {
  return <><div className="data-source-notice"><TriangleAlert size={17} /><p><strong>Dados de exemplo nesta versão.</strong> Referências externas abaixo não estão ligadas a uma API de consulta.</p></div><div className="workspace-panel"><div className="workspace-panel__head"><div><span className="workspace-eyebrow">VARIÁVEIS</span><h2>O que aparece nesta demonstração</h2></div></div><div className="data-variable-grid"><span><strong>Inclinação</strong><small>Graus — valores de exemplo</small></span><span><strong>Iluminação</strong><small>Percentual — valores de exemplo</small></span><span><strong>Visibilidade da Terra</strong><small>Percentual — valores de exemplo</small></span><span><strong>Posição relativa</strong><small>Distância em km — esquemática</small></span></div><p className="workspace-footnote">Locais carregados nesta página: {sites.map((site) => site.name).join(', ') || 'nenhum'}.</p></div><div className="reference-links"><a href="https://trek.nasa.gov/moon/" target="_blank" rel="noreferrer">NASA Moon Trek <ArrowRight size={14} /></a><a href="https://lunar.gsfc.nasa.gov/lola.html" target="_blank" rel="noreferrer">LRO / LOLA <ArrowRight size={14} /></a><a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">JPL Horizons <ArrowRight size={14} /></a></div></>;
}
function Explorer({ sites, selectedId, onSelect, selectedSite }: { sites: LandingSite[]; selectedId: string | null; onSelect: (id: string) => void; selectedSite?: LandingSite }) {
  return <section className="explorer-layout"><div className="explorer-map"><LunarMap sites={sites} selectedId={selectedId} onSelect={onSelect} /><span className="explorer-map__caption">POLO SUL LUNAR · MAPA ESQUEMÁTICO</span></div><aside className="workspace-panel explorer-sidebar"><span className="workspace-eyebrow">EXPLORAÇÃO</span><h2>{selectedSite?.name || 'Escolha um local'}</h2><p>Selecione um marcador para consultar as métricas de demonstração disponíveis.</p><CandidateRows sites={sites} selectedId={selectedId} onSelect={onSelect} /><div className="explorer-fact"><Telescope size={18} /><p>As regiões permanentemente sombreadas podem conservar gelo de água. A confirmação depende de observações e medições.</p></div></aside></section>;
}
function Simulator({ days, setDays, message, onRun }: { days: number; setDays: (value: number) => void; message: string; onRun: () => void }) {
  return <section className="simulator-layout"><div className="workspace-panel simulator-controls"><span className="workspace-eyebrow">CENÁRIO DIDÁTICO</span><h2>Monte uma missão ilustrativa</h2><p>Explore como algumas variáveis podem ser discutidas no planejamento.</p><label className="field-row">Duração na superfície <span className="field-inline-value">{days} dias</span><input type="range" min="1" max="180" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label><label className="field-row">Consumo energético<select defaultValue="Equilibrado"><option>Baixo consumo</option><option>Equilibrado</option><option>Máxima autonomia</option></select></label><label className="field-row">Contato com a Terra<select defaultValue="Diário"><option>Diário</option><option>Semanal</option><option>Apenas emergências</option></select></label><Button onClick={onRun}>Simular cenário <ArrowRight size={16} /></Button>{message && <p className="simulation-feedback" role="status"><Check size={16} />{message}</p>}</div><div className="workspace-panel simulator-outcomes"><span className="workspace-eyebrow">RESULTADOS ESPERADOS</span><h2>Uma missão depende de vários fatores</h2><div className="outcome-item"><span>01</span><p><strong>Energia</strong><small>A iluminação e as reservas afetam a duração das operações.</small></p></div><div className="outcome-item"><span>02</span><p><strong>Comunicação</strong><small>O horizonte local pode afetar o contato direto com a Terra.</small></p></div><div className="outcome-item"><span>03</span><p><strong>Terreno</strong><small>Inclinação e obstáculos influenciam mobilidade e segurança.</small></p></div><p className="workspace-footnote">O simulador não calcula física, trajetórias nem riscos reais.</p></div></section>;
}
