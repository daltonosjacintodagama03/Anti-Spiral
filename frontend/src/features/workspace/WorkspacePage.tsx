import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, FileBarChart2, FileText, LayoutDashboard, LogOut, MapPin, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { useAuth } from '@/features/auth/auth';
import PolarOverview from './PolarOverview';
import PositionAnalysis from './PositionAnalysis';
import MissionWorkspace from './MissionWorkspace';
import './workspace.css';
export type Mode='planeje'|'estude'|'explore';
const sections=[
  {id:'visao-geral',label:'Visão geral',icon:LayoutDashboard},
  {id:'sol-terra',label:'Análise de Sol e Terra',icon:Sun},
  {id:'requisitos',label:'Requisitos da missão',icon:SlidersHorizontal},
  {id:'locais',label:'Análise de locais',icon:MapPin},
  {id:'resultados',label:'Resultados',icon:FileBarChart2},
  {id:'relatorios',label:'Relatórios',icon:FileText},
];
const profiles={planeje:'Planejador de missão',estude:'Educador / Estudante',explore:'Público / Entusiasta'};
export default function WorkspacePage({mode}:{mode:Mode}) {
  const {session,logout}=useAuth();const {section:requested}=useParams();const navigate=useNavigate();const location=useLocation();
  const [error,setError]=useState('');const section=sections.find(item=>item.id===requested)??sections[0];const base=`/${mode}`;
  return <div className="workspace-app"><aside className="workspace-sidebar" aria-label="Área de trabalho"><Link to="/" className="workspace-brand" aria-label="Luna Navigator — início"><span><Moon size={21}/></span><strong>Luna Navigator</strong></Link>
    <nav className="workspace-nav" aria-label="Navegação do perfil">{sections.map(({id,label,icon:Icon})=><NavLink key={id} to={`${base}${id==='visao-geral'?'':`/${id}`}${location.search}`} end className={({isActive})=>`workspace-nav__link ${isActive?'is-active':''}`}><Icon size={17}/><span>{label}</span></NavLink>)}</nav></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="workspace-topbar__crumb"><span>MISSÃO LUNAR</span><b>/</b>{section.label}</div><div className="workspace-user"><Bell size={17}/><span className="workspace-avatar">{session?.name.slice(0,1)}</span><span className="workspace-user__copy"><strong>{session?.name}</strong><small>{profiles[mode]}</small></span><button className="workspace-logout" aria-label="Encerrar sessão" onClick={()=>{void logout().then(()=>navigate('/')).catch(cause=>setError(cause.message));}}><LogOut size={15}/></button></div></header>
    <main className="workspace-content">{error&&<p role="alert">{error}</p>}{section.id!=='visao-geral'&&<div className="workspace-heading"><h1>{section.label}</h1></div>}
      {section.id==='visao-geral'&&<PolarOverview/>}
      {section.id==='sol-terra'&&<PositionAnalysis/>}
      {['requisitos','locais','resultados','relatorios'].includes(section.id)&&<MissionWorkspace key={session?.id} section={section.id} base={base}/>}
    </main></div></div>;
}
