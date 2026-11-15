import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, EyeOff, LockKeyhole, Moon, Rocket, Telescope } from 'lucide-react';
import { useAuth, type Access } from './auth';
import './auth.css';

const PROFILES: { id: Access; title: string; description: string; Icon: typeof Rocket }[] = [
  { id: 'planeje', title: 'Planejador', description: 'Avalie locais e planeje missões lunares.', Icon: Rocket },
  { id: 'estude', title: 'Estudante', description: 'Aprenda com dados científicos da Lua.', Icon: BookOpen },
  { id: 'explore', title: 'Entusiasta', description: 'Explore o Polo Sul Lunar no seu ritmo.', Icon: Telescope },
];

export default function AuthPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
  const initial = params.get('perfil') as Access;
  const [profile, setProfile] = useState<Access>(PROFILES.some((p) => p.id === initial) ? initial : 'explore');
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  if (session) return <Navigate to={`/${session.access}`} replace />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const name = String(data.get('name') || '').trim();
    if (password.length < 8) { setError('Use uma senha com pelo menos 8 caracteres.'); return; }
    setError('');
    setSession({ name: name || email.split('@')[0], email, access: profile });
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from || `/${profile}`, { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-visual__stars" />
        <div className="auth-visual__moon" />
        <div className="auth-visual__horizon" />
        <Link className="auth-visual__brand" to="/"><Moon size={22} /> sai-moon</Link>
        <div className="auth-visual__caption"><span>POLO SUL LUNAR · 89,9° S</span><h2>Um novo horizonte<br />começa aqui.</h2><p>Explore dados reais. Descubra possibilidades além da Terra.</p></div>
        <span className="auth-visual__credit">NAVEGADOR DE EXPLORAÇÃO LUNAR</span>
      </div>
      <div className="auth-panel">
        <Link to="/" className="auth-back"><ArrowLeft size={16} /> Voltar ao início</Link>
        <div className="auth-form-wrap">
          <span className="auth-eyebrow">SUA PRÓXIMA MISSÃO</span>
          <h1>{register ? 'Crie sua conta' : 'Boas-vindas de volta'}</h1>
          <p className="auth-intro">{register ? 'Crie seu acesso e comece a explorar.' : 'Entre na sua conta para continuar sua exploração.'}</p>
          <form onSubmit={submit}>
            {register && <label className="auth-label">Nome completo<input name="name" type="text" autoComplete="name" placeholder="Como podemos chamar você?" required /></label>}
            <label className="auth-label">E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></label>
            <label className="auth-label">Senha <span className="auth-hint">Mínimo de 8 caracteres</span><span className="auth-password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder="••••••••••" minLength={8} required /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
            <fieldset className="auth-profiles"><legend>Seu perfil de acesso</legend>{PROFILES.map(({ id, title, description, Icon }) => <button className={`auth-profile ${profile === id ? 'is-selected' : ''}`} type="button" key={id} onClick={() => setProfile(id)} aria-pressed={profile === id}><span className="auth-profile__icon"><Icon size={19} /></span><span className="auth-profile__copy"><strong>{title}</strong><small>{description}</small></span><span className="auth-profile__check">{profile === id && <Check size={14} />}</span></button>)}</fieldset>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">{register ? 'Criar conta' : 'Entrar'} <ArrowRight size={18} /></button>
          </form>
          <p className="auth-switch">{register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <button type="button" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Entrar' : 'Cadastre-se'}</button></p>
          <p className="auth-secure"><LockKeyhole size={14} /> Acesso seguro à sua jornada lunar</p>
        </div>
        <p className="auth-terms">Ao continuar, você concorda com nossos <a href="#termos">Termos de uso</a> e <a href="#privacidade">Política de privacidade</a>.</p>
      </div>
    </section>
  );
}
