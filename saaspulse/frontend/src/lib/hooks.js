import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ── Data version: bump after any write so every screen refetches ── */
export const DataVersionContext = createContext({ version: 0, bump: () => {} });
export const useDataVersion = () => useContext(DataVersionContext);

/**
 * useFetch(fn, deps) — runs fn(signal) when deps or the global data version change.
 * Keeps the previous data visible while refetching (no flashing skeletons).
 */
export function useFetch(fn, deps = []) {
  const { version } = useDataVersion();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current(ctrl.signal)
      .then((res) => setState({ data: res, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}

export function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ── Theme ── */
const THEME_KEY = 'saaspulse.theme';
const readTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'system';
  } catch {
    return 'system';
  }
};

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage unavailable */
    }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  return [theme, setTheme];
}

/** Close on Escape */
export function useEscape(onEscape, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => e.key === 'Escape' && onEscape();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onEscape, active]);
}
