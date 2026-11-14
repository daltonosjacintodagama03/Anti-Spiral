import type { LucideIcon } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { ArrowUpRight } from 'lucide-react';

interface Props { icon: LucideIcon; title: string; text: string; cta: string; to: string; index?: number }

export function PersonaCard({ icon: Icon, title, text, cta, to, index = 0 }: Props) {
  return (
    <article className="persona" style={{ animationDelay: `${index * 110}ms` }}>
      <div className="persona__top"><span className="persona__icon"><Icon size={24} strokeWidth={1.7} aria-hidden /></span><span className="persona__number">0{index + 1}</span></div>
      <div className="persona__body">
        <h2>{title}</h2>
        <p>{text}</p>
        <LinkButton to={to} className="persona__cta">{cta}<ArrowUpRight size={17} /></LinkButton>
      </div>
    </article>
  );
}
