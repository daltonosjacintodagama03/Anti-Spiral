import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  titleLines: [string, string];
  description: string;
  cta: string;
  to: string;
  index: number;
}

export function PersonaCard({ icon, titleLines, description, cta, to, index }: Props) {
  return (
    <article className="persona-card" style={{ ['--stagger' as string]: `${index * 100}ms` }}>
      <div className="persona-card__icon-circle">{icon}</div>
      <div className="persona-card__body">
        <h2 className="persona-card__title">
          <span>{titleLines[0]}</span>
          <span>{titleLines[1]}</span>
        </h2>
        <p className="persona-card__desc">{description}</p>
        <Link to={to} className="persona-card__button">{cta}</Link>
      </div>
    </article>
  );
}
