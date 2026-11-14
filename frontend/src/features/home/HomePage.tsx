import { useEffect } from 'react';
import { ArrowDown, BookOpen, Database, Rocket, Telescope } from 'lucide-react';
import { PersonaCard } from './PersonaCard';
import './home.css';

const PERSONAS = [
  { icon: Rocket, title: 'Planejador', text: 'Compare locais de pouso por relevo, iluminação e comunicação. Encontre condições para missões mais seguras.', cta: 'Planejar missão', to: '/acesso?perfil=planeje' },
  { icon: BookOpen, title: 'Estudante', text: 'Investigue dados reais sobre a Lua, o Sol e a Terra. Aprenda explorando o ambiente lunar.', cta: 'Começar a estudar', to: '/acesso?perfil=estude' },
  { icon: Telescope, title: 'Entusiasta', text: 'Descubra por que o Polo Sul Lunar é tão especial e explore as possibilidades da próxima fronteira.', cta: 'Explorar a Lua', to: '/acesso?perfil=explore' },
];

const REFS = [
  { label: 'NASA Moon Trek', href: 'https://trek.nasa.gov/moon/' },
  { label: 'LRO / LOLA', href: 'https://lunar.gsfc.nasa.gov/lola.html' },
  { label: 'JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' },
  { label: 'NAIF SPICE', href: 'https://naif.jpl.nasa.gov/naif/' },
];

export default function HomePage() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal-on-scroll'));
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    elements.forEach((element) => element.classList.add('is-pending'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero__sky" aria-hidden />
        <div className="hero__earth" aria-hidden><span /></div>
        <div className="hero__ridge" aria-hidden />
        <div className="container hero__content">
          <div className="hero__copy">
            <span className="hero__eyebrow"><span /> NAVEGADOR DE LOCAIS DE POUSO LUNAR</span>
            <h1>O próximo passo<br />da humanidade começa <em>na Lua.</em></h1>
            <p>Explore o Polo Sul Lunar com dados científicos. Compare terrenos, iluminação e visibilidade da Terra para planejar, estudar ou simplesmente descobrir.</p>
            <a className="hero__explore" href="#perfis">Escolha como explorar <ArrowDown size={16} /></a>
          </div>
          <div className="hero__coordinates" aria-hidden="true"><span>REGIÃO DE INTERESSE</span><strong>POLO SUL</strong><small>89,9° S&nbsp; · &nbsp;0° E</small></div>
          <div className="personas reveal-on-scroll" id="perfis">
            {PERSONAS.map((p, index) => <PersonaCard key={p.to} {...p} index={index} />)}
          </div>
        </div>
      </section>
      <section className="info">
        <div className="container info__grid reveal-on-scroll">
          <div id="sobre">
            <span className="info__eyebrow">A MISSÃO</span>
            <h2>Conhecimento para ir mais longe.</h2>
            <p>Ferramenta interativa para explorar e avaliar locais de pouso no Polo Sul Lunar, integrando dados científicos confiáveis para apoiar decisões de missão e pesquisa.</p>
          </div>
          <div id="dados">
            <span className="info__eyebrow"><Database size={13} /> DADOS DE REFERÊNCIA</span>
            <h2>Ciência por trás da exploração.</h2>
            <ul>
              {REFS.map((r) => (
                <li key={r.label}><a href={r.href} target="_blank" rel="noreferrer">{r.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
