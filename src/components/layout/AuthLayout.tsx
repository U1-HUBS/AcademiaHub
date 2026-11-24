import React from 'react';
import { School } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, description, children }) => (
  <div className="auth-layout credential-theme">
    <div className="auth-brand">
      <div className="auth-brand-inner">
        <div className="flex items-center gap-3">
          <span className="portal-mark grid size-10 shrink-0 place-items-center rounded-lg">
            <School className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-tight">AcademiaHub</span>
        </div>
        <p className="auth-brand-title">Academic Management System</p>
      </div>
    </div>

    <main className="auth-content" aria-labelledby="auth-heading">
      <div className="w-full max-w-md">
        <header className="mb-7 space-y-2">
          <h1 id="auth-heading" className="text-3xl font-bold tracking-tight text-[#142D59] sm:text-4xl">{title}</h1>
          <p className="max-w-prose text-sm leading-relaxed text-slate-600">{description}</p>
        </header>
        {children}
      </div>
    </main>
  </div>
);
