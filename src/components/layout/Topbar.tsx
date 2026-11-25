import React from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/RoleBadge';
import { Button } from '../ui/Button';

interface TopbarProps {
  menuOpen: boolean;
  onOpenMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ menuOpen, onOpenMenu }) => {
  const { user, logout } = useAuth();

  const initials = user?.fullName.trim().split(/\s+/).filter(Boolean)
    .map(part => part.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <header className="portal-topbar no-print sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b bg-white max-[359px]:gap-1 max-[359px]:px-2">
      <div className="flex min-w-0 items-center gap-2 max-[359px]:gap-1">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-primary lg:hidden"
          aria-label="Open navigation"
          aria-controls="portal-navigation"
          aria-expanded={menuOpen}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <span className="truncate text-sm font-bold tracking-tight text-primary max-[359px]:text-[13px] lg:hidden">AUTOMATE</span>
        <span className="hidden text-sm font-semibold text-slate-600 lg:block">Academic workspace</span>
      </div>

      {user && (
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
            <div aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-royal text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="max-w-48 truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="max-w-48 truncate text-xs text-slate-600">{user.idNumber}</p>
            </div>
          </div>
          <div className="shrink-0">
            <RoleBadge role={user.role} showIcon={false} />
          </div>
          {user.role === 'student' && (
            <Link to="/change-password" aria-label="Change password"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-[#142D59] hover:bg-blue-50">
              <KeyRound className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={logout}
            icon={<LogOut className="size-4" />}
            className="min-w-9 gap-1.5 px-2 md:px-3"
            aria-label="Sign out"
          >
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </div>
      )}
    </header>
  );
};
