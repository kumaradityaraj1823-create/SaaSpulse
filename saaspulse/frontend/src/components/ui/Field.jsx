import { ChevronDown } from 'lucide-react';

const base =
  'w-full h-9 rounded-lg border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-focus focus:ring-3 focus:ring-focus/15 disabled:opacity-60';

export function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-[12.5px] text-down">{error}</p> : hint ? <p className="text-[12.5px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className = '', invalid, ...props }) {
  return <input {...props} aria-invalid={invalid || undefined} className={`${base} ${invalid ? 'border-down' : ''} ${className}`} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea {...props} className={`${base} h-auto min-h-20 py-2 resize-y ${className}`} />;
}

export function Select({ className = '', children, invalid, ...props }) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} aria-invalid={invalid || undefined} className={`${base} appearance-none pr-8 ${invalid ? 'border-down' : ''}`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
