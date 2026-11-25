import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'navy';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-semibold',
    md: 'text-sm px-3 py-1 rounded-full font-semibold',
  };

  const variantStyles = {
    success: 'bg-white text-royal border border-royal',
    warning: 'bg-white text-navy border border-navy',
    danger: 'bg-white text-navy border border-navy',
    info: 'bg-white text-navy border border-navy',
    neutral: 'bg-white text-navy border border-navy',
    navy: 'bg-white text-navy border border-navy',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
