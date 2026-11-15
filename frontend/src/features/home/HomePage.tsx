import { Link } from 'react-router-dom';
import { PersonaCard } from './PersonaCard';
import { LanderIcon } from './LanderIcon';
import './home.css';
import './home-motion.css';

const REFS = [
  { label: 'NASA Moon Trek', href: 'https://trek.nasa.gov/moon/' },
  { label: 'LRO / LOLA', href: 'https://lunar.gsfc.nasa.gov/lola.html' },
  { label: 'JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' },
  { label: 'NAIF SPICE', href: 'https://naif.jpl.nasa.gov/naif/' },
];

function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 11v24" />
      <path d="M24 13c-3.5-2.2-8-3-13-3v22c5 0 9.5.8 13 3" />
      <path d="M24 13c3.5-2.2 8-3 13-3v22c-5 0-9.5.8-13 3" />
    </svg>
  );
}

function TelescopeIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 18l18 7 4-10-18-7-4 10Z" />
      <path d="M30 15l8 3" />
      <path d="M12 20l-4 2" />
      <path d="M22 24l-6 14" />
      <path d="M24 23l8 15" />
      <path d="M18 38h14" />
      <circle cx="18" cy="39" r="1.5" />
      <circle cx="30" cy="39" r="1.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="12" cy="12" r="10.3" />
      <circle cx="12" cy="9" r="3.2" />
      <path d="M5.8 18.2c1.4-2.4 3.6-3.7 6.2-3.7s4.8 1.3 6.2 3.7" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="home-page">
      <a href="#conteudo-inicio" className="skip-link">Saltar para o conteúdo</a>
      <header className="home-header">
        <div className="home-header__inner">
          <Link to="/" className="home-header__brand">Lunar Navigator</Link>
          <nav className="home-header__nav" aria-label="Principal">
            <a href="#sobre">About</a>
            <a href="#dados">Technology</a>
            <a href="#perfis">Moon</a>
            <span className="home-header__divider" aria-hidden="true" />
            <span className="home-header__user" aria-label="Utilizador">
              <UserIcon />
              <span>Agus Salman</span>
            </span>
          </nav>
        </div>
      </header>

      <main id="conteudo-inicio">
        <section className="hero" aria-label="Início">
          <div className="hero__bg" aria-hidden="true" />
          <div className="hero__moon-sphere" aria-hidden="true" />
          <div className="hero__shade hero__shade--h" aria-hidden="true" />
          <div className="hero__shade hero__shade--v" aria-hidden="true" />
          <div className="hero__stars" aria-hidden="true" />
          <div className="hero__content">
            <div className="hero__left">
              <p className="hero__eyebrow">NAVEGADOR DE LOCAIS DE POUSO LUNAR</p>
              <h1 className="hero__title">O SUL DA LUA</h1>
              <p className="hero__intro">
                O Polo Sul Lunar oferece recursos únicos e desafios extremos.
                <br />
                O Lunar Landing Site Navigator ajuda você a identificar os melhores
                <br />
                locais para pouso e exploração, com dados confiáveis sobre relevo,
                <br />
                iluminação, comunicação e visibilidade da Terra.
              </p>

              <div className="personas" id="perfis">
                <PersonaCard
                  index={0}
                  icon={<LanderIcon />}
                  titleLines={['PLANEJADORES E', 'EXPLORADORES DE MISSÃO']}
                  description="Compare relevo, iluminação e comunicação para escolher locais de pouso mais seguros."
                  cta="Planeje"
                  to="/planeje"
                />
                <PersonaCard
                  index={1}
                  icon={<BookIcon />}
                  titleLines={['EDUCADORES E', 'ESTUDANTES']}
                  description="Explore dados reais da Lua para apoiar aulas, pesquisas e aprendizado."
                  cta="Estude"
                  to="/estude"
                />
                <PersonaCard
                  index={2}
                  icon={<TelescopeIcon />}
                  titleLines={['PÚBLICO E', 'ENTUSIASTAS']}
                  description="Descubra o Polo Sul Lunar e seu papel no futuro da exploração espacial."
                  cta="Explore"
                  to="/explore"
                />
              </div>
            </div>

            <div className="hero__visual" aria-hidden="true">
              <div className="hero-moon">
                <span className="hero-moon__halo" />
                <span className="hero-moon__orbit hero-moon__orbit--a" />
                <span className="hero-moon__orbit hero-moon__orbit--b" />
                <div className="hero-moon__body">
                  <span className="hero-moon__texture" />
                  <span className="hero-moon__crater hero-moon__crater--1" />
                  <span className="hero-moon__crater hero-moon__crater--2" />
                  <span className="hero-moon__crater hero-moon__crater--3" />
                  <span className="hero-moon__crater hero-moon__crater--4" />
                  <span className="hero-moon__crater hero-moon__crater--5" />
                  <span className="hero-moon__shade" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="info-band" aria-label="Informações">
          <div className="info-band__grid">
            <div className="info-band__col" id="sobre">
              <h2 className="info-band__heading info-band__heading--regular">SOBRE O PROJETO</h2>
              <p className="info-band__text">
                Ferramenta interativa para explorar e avaliar locais de pouso no Polo Sul Lunar, integrando dados científicos confiáveis para apoiar decisões de missão e pesquisa.
              </p>
            </div>
            <div className="info-band__divider" aria-hidden="true" />
            <div className="info-band__col" id="dados">
              <h2 className="info-band__heading info-band__heading--bold">DADOS E REFERÊNCIAS</h2>
              <p className="info-band__refs">
                {REFS.map((r, i) => (
                  <span key={r.label}>
                    <a href={r.href} target="_blank" rel="noreferrer">{r.label}</a>
                    {i < REFS.length - 1 ? <span className="info-band__sep"> </span> : null}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer__line" aria-hidden="true" />
        <div className="home-footer__inner">
          <span>LUNAR LANDING SITE NAVIGATOR</span>
          <span className="home-footer__divider" aria-hidden="true" />
          <span>NASA SPACE APPS CHALLENGE - 2026</span>
        </div>
      </footer>
    </div>
  );
}
