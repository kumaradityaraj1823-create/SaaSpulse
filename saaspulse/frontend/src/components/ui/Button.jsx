import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-ink text-inverse hover:opacity-90 border border-transparent',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-hover',
  ghost: 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent',
  danger: 'bg-down text-white hover:opacity-90 border border-transparent',
  'danger-ghost': 'text-down hover:bg-down-bg border border-transparent',
};
const SIZES = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[13.5px] gap-2',
  icon: 'h-8 w-8 justify-center',
};

export default function Button({ variant = 'secondary', size = 'md', loading, icon: Icon, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center shrink-0 rounded-lg font-medium transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" strokeWidth={2} /> : null}
      {children}
    </button>
  );
}
