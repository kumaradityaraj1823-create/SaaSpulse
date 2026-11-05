import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import Sidebar, { Logo } from './Sidebar';
import CommandMenu from './CommandMenu';
import { useTheme } from '../../lib/hooks';

export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const location = useLocation();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} theme={theme} setTheme={setTheme} />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-page/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setNavOpen(true)} className="-ml-1.5 rounded-md p-1.5 text-ink-2 hover:bg-hover lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Logo />
          </div>
          <button
            onClick={() => setCmdOpen(true)}
            className="ml-auto flex h-8 w-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface text-[13px] text-muted hover:border-line-strong sm:w-72 sm:justify-start sm:px-2.5 lg:ml-0"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Search customers…</span>
            <kbd className="ml-auto hidden rounded border border-line px-1.5 text-[11px] sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<div className="h-[60vh]" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
