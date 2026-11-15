import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell() {
  const { pathname } = useLocation();
  if (pathname === '/acesso') return <main id="conteudo"><Outlet /></main>;
  if (/^\/(planeje|estude|explore)(\/|$)/.test(pathname)) return <><a href="#conteudo" className="skip-link">Saltar para o conteúdo</a><div id="conteudo"><Outlet /></div></>;
  if (pathname === '/') return <Outlet />;
  return (
    <>
      <a href="#conteudo" className="skip-link">Saltar para o conteúdo</a>
      <Header />
      <main id="conteudo"><Outlet /></main>
      <Footer />
    </>
  );
}
