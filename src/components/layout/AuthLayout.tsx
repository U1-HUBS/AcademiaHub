import React from 'react';
import { School } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  showEyebrow?: boolean;
  cardClassName?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, description, children, showEyebrow = true, cardClassName = '' }) => (
  <div className="auth-layout credential-theme">
    <div className="auth-brand">
      <div className="auth-brand-inner">
        <div className="flex items-center gap-3">
          <span className="portal-mark grid size-11 shrink-0 place-items-center rounded-xl shadow-sm">
            <School className="size-5" aria-hidden="true" />
          </span>
          <span className="auth-brand-copy flex flex-col items-start">
            <span className="auth-brand-name">AUTOMATE</span>
            <span className="auth-brand-subtitle">Academic Management System</span>
          </span>
        </div>
      </div>
    </div>

    <main className="auth-content" aria-labelledby="auth-heading">
      <div className={`auth-card ${cardClassName}`}>
        <header className="auth-card-header">
          {showEyebrow && <p className="auth-eyebrow">Secure university portal</p>}
          <h1 id="auth-heading">{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </main>
  </div>
);
