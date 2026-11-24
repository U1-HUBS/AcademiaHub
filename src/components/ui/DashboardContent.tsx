import React from 'react';
import { Button } from './Button';

interface DashboardContentProps {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ loading, failed, onRetry, children }) => {
  if (loading) {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading dashboard</span>
        <div aria-hidden="true" className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map(id => (
            <div key={id} className="portal-panel h-32 space-y-4 p-4 sm:p-5">
              <div className="h-3 w-2/3 rounded bg-slate-200" />
              <div className="h-7 w-1/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="portal-panel h-36" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="portal-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div role="alert">
          <p className="font-semibold text-slate-900">Dashboard data could not be loaded</p>
          <p className="mt-1 text-sm text-slate-600">Try loading the dashboard again.</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  return <div className="space-y-6">{children}</div>;
};
