import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, Users, Layers, FileUp, UserPlus, CornerDownLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounced, useEscape } from '../../lib/hooks';
import { formatINR } from '../../lib/format';

const PAGES = [
  { id: 'p-overview', label: 'Overview', icon: LayoutGrid, to: '/' },
  { id: 'p-customers', label: 'Customers', icon: Users, to: '/customers' },
  { id: 'p-new', label: 'Add a customer', icon: UserPlus, to: '/customers?new=1' },
  { id: 'p-plans', label: 'Plans', icon: Layers, to: '/plans' },
  { id: 'p-import', label: 'Import customers from CSV', icon: FileUp, to: '/import' },
];

export default function CommandMenu({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const dq = useDebounced(q, 180);
  useEscape(onClose, open);

  useEffect(() => {
    if (open) {
      setQ('');
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || dq.trim().length < 2) return setResults([]);
    const ctrl = new AbortController();
    api
      .customers({ search: dq.trim(), limit: 6, sort: '-mrr' }, { signal: ctrl.signal })
      .then((r) => setResults(r.data))
      .catch(() => {});
    return () => ctrl.abort();
  }, [dq, open]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => !term || p.label.toLowerCase().includes(term));
    const customers = (term.length >= 2 ? results : []).map((c) => ({
      id: c.id,
      label: c.name,
      sub: `${c.company || c.email} · ${c.plan?.name} · ${formatINR(c.mrr)}`,
      icon: Users,
      to: `/customers?open=${c.id}`,
      group: 'Customers',
    }));
    return [...pages.map((p) => ({ ...p, group: 'Go to' })), ...customers];
  }, [q, results]);

  useEffect(() => setIndex(0), [items.length]);

  if (!open) return null;

  const go = (item) => {
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && items[index]) {
      go(items[index]);
    }
  };

  let lastGroup = null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 anim-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-[0_24px_60px_-12px_rgba(0,0,0,0.3)] anim-pop-in">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search customers or jump to a page"
            className="h-12 flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
            aria-label="Search"
          />
          <kbd className="rounded border border-line px-1.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
          {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">No customers match “{q}”.</li>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                {header && <div className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-muted">{header}</div>}
                <button
                  role="option"
                  aria-selected={i === index}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${i === index ? 'bg-hover' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">{item.label}</span>
                    {item.sub && <span className="block truncate text-[12px] text-muted">{item.sub}</span>}
                  </span>
                  {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}
