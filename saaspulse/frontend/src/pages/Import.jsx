import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Download, CheckCircle2, AlertCircle, FileText, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useDataVersion } from '../lib/hooks';
import { formatDate, formatNumber } from '../lib/format';
import { PageHeader } from '../components/ui/misc';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const COLUMNS = [
  ['name', 'Required', 'Full name'],
  ['email', 'Required', 'Must be unique'],
  ['plan', 'Required', 'Name of an existing, non-archived plan'],
  ['company', 'Optional', ''],
  ['city', 'Optional', ''],
  ['signup_date', 'Optional', 'YYYY-MM-DD. Defaults to today'],
  ['status', 'Optional', 'active or churned. Defaults to active'],
  ['churn_date', 'Optional', 'YYYY-MM-DD, for churned customers'],
];

function Step({ n, title, active, done, children }) {
  return (
    <section className={`rounded-xl border bg-surface ${active ? 'border-line-strong' : 'border-line'}`}>
      <header className="flex items-center gap-3 px-5 py-4">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold tnum ${
            done ? 'bg-up-bg text-up' : active ? 'bg-ink text-inverse' : 'bg-hover text-muted'
          }`}
        >
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
        </span>
        <h2 className={`text-[14px] font-semibold ${active || done ? 'text-ink' : 'text-muted'}`}>{title}</h2>
      </header>
      {children && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

export default function Import() {
  const toast = useToast();
  const { bump } = useDataVersion();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowAll(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const choose = async (f) => {
    if (!f) return;
    reset();
    if (!/\.csv$/i.test(f.name)) return setError('Choose a .csv file. Excel users: File → Save As → CSV.');
    if (f.size > 5 * 1024 * 1024) return setError('This file is larger than 5 MB. Split it into smaller files.');
    setFile(f);
    setBusy(true);
    try {
      const res = await api.importCustomers(f, true);
      setPreview(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const res = await api.importCustomers(file, false);
      setResult(res.data);
      toast(`Imported ${res.data.summary.imported} customers`);
      bump();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const rows = preview ? (showAll ? preview.rows : [...preview.rows.filter((r) => !r.ok), ...preview.rows.filter((r) => r.ok)].slice(0, 12)) : [];
  const step = result ? 3 : preview ? 2 : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Import customers"
        description="Add many customers at once from a spreadsheet. You'll see every row checked before anything is saved."
        actions={
          <Button icon={Download} onClick={() => (window.location.href = api.templateUrl())}>
            Download template
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Step n={1} title="Choose a CSV file" active={step === 1} done={step > 1}>
            {step === 1 ? (
              <>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    choose(e.dataTransfer.files?.[0]);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
                    dragging ? 'border-focus bg-hover' : 'border-line-strong hover:bg-surface-2'
                  }`}
                >
                  <FileUp className="h-5 w-5 text-muted" />
                  <span className="text-[13.5px] text-ink">{busy ? 'Checking your file…' : <>Drop a CSV here, or <span className="underline underline-offset-2">browse</span></>}</span>
                  <span className="text-[12.5px] text-muted">Up to 5 MB and 5,000 rows</span>
                  <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
                </label>
                {error && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-down-bg px-3 py-2 text-[13px] text-down">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
                  <FileText className="h-4 w-4 shrink-0 text-muted" />
                  <span className="truncate">{file?.name}</span>
                </span>
                {!result && (
                  <Button size="sm" variant="ghost" onClick={reset}>
                    Choose another
                  </Button>
                )}
              </div>
            )}
          </Step>

          <Step n={2} title="Review rows" active={step === 2} done={step > 2}>
            {preview && !result && (
              <>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
                  <span className="flex items-center gap-1.5 text-ink">
                    <CheckCircle2 className="h-4 w-4 text-up" /> {formatNumber(preview.summary.valid)} ready to import
                  </span>
                  {preview.summary.invalid > 0 && (
                    <span className="flex items-center gap-1.5 text-ink">
                      <AlertCircle className="h-4 w-4 text-down" /> {formatNumber(preview.summary.invalid)} will be skipped
                    </span>
                  )}
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-left text-[12px] text-muted">
                        <th className="h-8 px-3 font-medium">Row</th>
                        <th className="h-8 px-3 font-medium">Customer</th>
                        <th className="h-8 px-3 font-medium">Plan</th>
                        <th className="hidden h-8 px-3 font-medium sm:table-cell">Signed up</th>
                        <th className="h-8 px-3 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.line} className="border-b border-line last:border-b-0 align-top">
                          <td className="px-3 py-2 tnum text-muted">{r.line}</td>
                          <td className="max-w-[220px] px-3 py-2">
                            <span className="block truncate text-ink">{r.name || '—'}</span>
                            <span className="block truncate text-[12px] text-muted">{r.email || '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-ink-2">{r.plan || '—'}</td>
                          <td className="hidden px-3 py-2 tnum text-ink-2 sm:table-cell">{formatDate(r.signupDate)}</td>
                          <td className="px-3 py-2">
                            {r.ok ? <span className="text-up">Ready</span> : <span className="text-down">{r.problems.join('. ')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 12 && (
                  <button onClick={() => setShowAll((s) => !s)} className="mt-2 text-[12.5px] text-ink-2 underline underline-offset-2 hover:text-ink">
                    {showAll ? 'Show fewer rows' : `Show all ${formatNumber(preview.rows.length)} rows`}
                  </button>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button onClick={reset}>Cancel</Button>
                  <Button variant="primary" loading={busy} disabled={preview.summary.valid === 0} onClick={commit}>
                    {preview.summary.valid === 0 ? 'Nothing to import' : `Import ${formatNumber(preview.summary.valid)} customer${preview.summary.valid === 1 ? '' : 's'}`}
                  </Button>
                </div>
              </>
            )}
          </Step>

          <Step n={3} title="Done" active={step === 3} done={false}>
            {result && (
              <div className="space-y-3">
                <p className="text-[13.5px] text-ink">
                  {formatNumber(result.summary.imported)} customers were added
                  {result.summary.invalid > 0 && `, ${formatNumber(result.summary.invalid)} rows were skipped`}. Revenue charts now include them from their signup dates.
                </p>
                <div className="flex gap-2">
                  <Link to="/customers" className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[13.5px] font-medium text-inverse hover:opacity-90">
                    View customers
                  </Link>
                  <Button icon={RotateCcw} onClick={reset}>
                    Import another file
                  </Button>
                </div>
              </div>
            )}
          </Step>
        </div>

        <aside className="h-fit rounded-xl border border-line bg-surface p-5">
          <h2 className="text-[14px] font-semibold text-ink">File format</h2>
          <p className="mt-1 text-[12.5px] text-ink-2">The first row must be column names. Column order doesn’t matter.</p>
          <dl className="mt-4 divide-y divide-line text-[12.5px]">
            {COLUMNS.map(([name, req, note]) => (
              <div key={name} className="py-2">
                <dt className="flex items-center justify-between">
                  <code className="text-ink">{name}</code>
                  <span className={req === 'Required' ? 'text-ink-2' : 'text-muted'}>{req}</span>
                </dt>
                {note && <dd className="mt-0.5 text-muted">{note}</dd>}
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
