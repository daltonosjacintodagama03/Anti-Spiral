import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CircleUserRound, Menu, X } from 'lucide-react';
import { useAuth } from '@/features/auth/auth';
import './layout.css';

const LINKS = [
  { to: '/#sobre', label: 'Sobre' },
  { to: '/#dados', label: 'Dados científicos' },
  { to: '/acesso?perfil=explore', label: 'Explorar a Lua' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { session, setSession } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand" onClick={() => setOpen(false)}>Luna Navigator</Link>
        <button className="header__toggle" aria-expanded={open} aria-controls="main-nav" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        <nav id="main-nav" className={`header__nav ${open ? 'is-open' : ''}`} aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.label} to={l.to} onClick={() => setOpen(false)}>{l.label}</NavLink>
          ))}
          {session ? <button className="header__user" onClick={() => { setSession(null); navigate('/'); }}><CircleUserRound size={24} aria-hidden /> <span>{session.name}</span><span className="header__logout">Sair</span></button> : <Link className="header__login" to="/acesso">Entrar</Link>}
        </nav>
      </div>
    </header>
  );
}
