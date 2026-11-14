import { LinkButton } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container state">
      <h1>Página não encontrada</h1>
      <p>O endereço não existe ou foi movido.</p>
      <LinkButton to="/">Voltar ao início</LinkButton>
    </div>
  );
}
