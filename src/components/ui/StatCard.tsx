import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; isPositive?: boolean };
  color?: 'navy' | 'blue' | 'emerald' | 'amber' | 'purple';
}

const tones = {
  navy: 'bg-emerald-50 text-primary',
  blue: 'bg-teal-50 text-teal-800',
  emerald: 'bg-green-50 text-green-800',
  amber: 'bg-amber-50 text-amber-800',
  purple: 'bg-violet-50 text-violet-800',
};

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon, trend, color = 'navy',
}) => (
  <div className="portal-panel flex flex-col gap-3 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 break-words text-xs font-semibold leading-snug text-slate-600 sm:text-sm">{title}</p>
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg sm:size-9 ${tones[color]}`} aria-hidden="true">
        {icon}
      </span>
    </div>
    <div>
      <p className="break-words text-2xl font-bold tabular-nums tracking-tight text-primary sm:text-3xl">{value}</p>
      {(subtitle || trend) && (
        <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 break-words text-xs leading-snug text-slate-600">
          {trend && <span className={trend.isPositive ? 'font-semibold text-emerald-800' : 'font-semibold text-rose-700'}>{trend.value}</span>}
          {subtitle && <span>{subtitle}</span>}
        </p>
      )}
    </div>
  </div>
);
