import { NavLink } from 'react-router-dom';
import { LayoutGrid, Users, Layers, FileUp, Sun, Moon, Monitor, X, Database } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api } from '../../lib/api';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/plans', label: 'Plans', icon: Layers },
  { to: '/import', label: 'Import', icon: FileUp },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--ink)" />
        <path d="M6 17h5l3-7 4 13 3-6h5" fill="none" stroke="var(--inverse)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">SaaSPulse</span>
    </div>
  );
}

function DbStatus() {
  const { data, error } = useFetch((signal) => api.health({ signal }), []);
  const db = data?.db;
  let tone = 'bg-muted';
  let text = 'Checking connection…';
  if (error) {
    tone = 'bg-down';
    text = 'API offline';
  } else if (db) {
    tone = db.state !== 'connected' ? 'bg-down' : db.inMemory ? 'bg-s4' : 'bg-up';
    text = db.state !== 'connected' ? `MongoDB ${db.state}` : db.inMemory ? 'In-memory MongoDB' : `MongoDB · ${db.name}`;
  }
  return (
    <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-2" title={db?.inMemory ? 'Data resets when the server restarts. Set MONGODB_URI to keep it.' : undefined}>
      <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden />
          <span className="truncate">{text}</span>
        </div>
        {db?.inMemory && <p className="mt-0.5 text-[11.5px] text-muted leading-snug">Data resets on restart</p>}
      </div>
    </div>
  );
}

function ThemeSwitch({ theme, setTheme }) {
  const opts = [
    { v: 'light', icon: Sun, label: 'Light' },
    { v: 'dark', icon: Moon, label: 'Dark' },
    { v: 'system', icon: Monitor, label: 'System' },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          role="radio"
          aria-checked={theme === v}
          title={label}
          onClick={() => setTheme(v)}
          className={`flex h-7 flex-1 items-center justify-center rounded-md ${theme === v ? 'bg-surface text-ink border border-line shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-muted hover:text-ink border border-transparent'}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Sidebar({ open, onClose, theme, setTheme }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden anim-fade-in" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-hover lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-2.5 pt-2" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors ${
                  isActive ? 'bg-hover text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-ink' : 'text-muted group-hover:text-ink-2'}`} strokeWidth={2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-line p-2.5">
          <DbStatus />
          <ThemeSwitch theme={theme} setTheme={setTheme} />
        </div>
      </aside>
    </>
  );
}
