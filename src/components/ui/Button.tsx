import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  isLoading?: boolean;
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-xs gap-2',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-12 px-6 text-base gap-3',
};

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white',
  accent: 'bg-royal text-white',
  outline: 'border border-navy bg-white text-navy',
  ghost: 'text-navy',
  danger: 'bg-navy text-white',
};

function buttonClassName(variant: Variant, size: Size, className?: string) {
  return twMerge(
    'portal-button inline-flex min-w-0 items-center justify-center rounded-lg py-2 text-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    sizes[size],
    variants[variant],
    className,
  );
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', isLoading = false, icon, className, disabled, ...props
}) => (
  <button
    {...props}
    data-variant={variant}
    className={buttonClassName(variant, size, className)}
    aria-busy={isLoading || undefined}
    disabled={disabled || isLoading}
  >
    {isLoading ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" /> : (
      icon && <span className="shrink-0" aria-hidden="true">{icon}</span>
    )}
    <span>{children}</span>
  </button>
);

export const ButtonLink: React.FC<LinkProps & ButtonStyleProps> = ({
  children, variant = 'primary', size = 'md', icon, className, ...props
}) => (
  <Link {...props} data-variant={variant} className={buttonClassName(variant, size, className)}>
    {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
    <span>{children}</span>
  </Link>
);
