import { lazy, useCallback, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { DataVersionContext } from './lib/hooks';

// Each page is loaded on demand, so the first screen downloads less JavaScript
const Overview = lazy(() => import('./pages/Overview'));
const Customers = lazy(() => import('./pages/Customers'));
const Plans = lazy(() => import('./pages/Plans'));
const Import = lazy(() => import('./pages/Import'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  // Bumped after every write so all screens refetch fresh data
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const dataVersion = useMemo(() => ({ version, bump }), [version, bump]);

  return (
    <DataVersionContext.Provider value={dataVersion}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="customers" element={<Customers />} />
              <Route path="plans" element={<Plans />} />
              <Route path="import" element={<Import />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </DataVersionContext.Provider>
  );
}
