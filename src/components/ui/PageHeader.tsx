import React from 'react';
import { twMerge } from 'tailwind-merge';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dashboard';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title, subtitle, badge, actions, className, variant = 'default',
}) => {
  const dashboard = variant === 'dashboard';

  return (
    <header className={twMerge(
      'flex flex-col justify-between gap-4',
      dashboard ? 'dashboard-heading xl:flex-row xl:items-center' : 'border-b border-slate-200 pb-5 sm:flex-row sm:items-center',
      className,
    )}>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className={twMerge('min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl', dashboard ? 'text-white' : 'text-navy')}>
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <div className={twMerge('max-w-prose break-words text-sm leading-relaxed', dashboard ? 'text-emerald-50/85' : 'text-slate-600')}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
};
