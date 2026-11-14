import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import './ui.css';

type Variant = 'primary' | 'ghost';

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`btn btn--${variant} ${className}`} {...rest} />;
}

export function LinkButton({ variant = 'primary', className = '', ...rest }: LinkProps & { variant?: Variant }) {
  return <Link className={`btn btn--${variant} ${className}`} {...rest} />;
}
