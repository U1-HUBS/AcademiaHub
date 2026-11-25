import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) menuRef.current?.close();
    };

    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const openMenu = () => {
    const menu = menuRef.current;
    if (!menu || menu.open) return;
    menu.showModal();
    setMenuOpen(true);
  };

  const navigateFromMenu = () => {
    menuRef.current?.close();
    requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  };

  return (
    <div className="portal-shell flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-primary"
        onClick={event => {
          event.preventDefault();
          mainRef.current?.focus();
          mainRef.current?.scrollIntoView({ block: 'start' });
        }}
      >
        Skip to content
      </a>

      <div className={`no-print hidden shrink-0 lg:sticky lg:top-0 lg:block lg:h-dvh ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}>
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(value => !value)} />
      </div>

      <dialog
        id="portal-navigation"
        ref={menuRef}
        aria-label="Portal navigation"
        className="portal-drawer no-print"
        onClose={() => setMenuOpen(false)}
        onClick={event => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <button
          type="button"
          onClick={() => menuRef.current?.close()}
          className="portal-nav-control absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-lg"
          aria-label="Close navigation"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <Sidebar onItemClick={navigateFromMenu} />
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar menuOpen={menuOpen} onOpenMenu={openMenu} />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="portal-main mx-auto w-full max-w-[96rem] flex-1 space-y-6"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
