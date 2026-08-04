import { Link } from 'react-router-dom';

export type WelcomeMode = 'metro' | 'orrery';

export function WelcomeModeSwitch({
  active,
  variant = 'soft',
}: {
  active: WelcomeMode;
  variant?: 'soft' | 'slab';
}) {
  const shell = variant === 'slab' ? 'rounded-none border-2 border-ink' : 'rounded-pill border border-rule';
  const item = variant === 'slab' ? 'rounded-none' : 'rounded-pill';

  return (
    <nav aria-label="Choose welcome experience" className={`inline-flex min-h-11 items-stretch bg-paper p-1 ${shell}`}>
      <Link
        to="/"
        aria-current={active === 'metro' ? 'page' : undefined}
        className={`inline-flex min-h-9 items-center whitespace-nowrap px-3 font-mono text-xs uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-paper-3 ${item} ${
          active === 'metro' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
        }`}
      >
        Metro
      </Link>
      <Link
        to="/"
        aria-current={active === 'orrery' ? 'page' : undefined}
        className={`inline-flex min-h-9 items-center whitespace-nowrap px-3 font-mono text-xs uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-paper-3 ${item} ${
          active === 'orrery' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
        }`}
      >
        Orrery
      </Link>
    </nav>
  );
}
