import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="figure-display text-[64px] text-muted">404</p>
      <h1 className="mt-2 text-[18px] font-semibold text-ink">This page doesn’t exist</h1>
      <Link to="/" className="mt-4 text-[13.5px] text-ink-2 underline underline-offset-2 hover:text-ink">
        Go to Overview
      </Link>
    </div>
  );
}
