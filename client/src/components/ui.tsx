import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Inbox, Loader2 } from 'lucide-react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ── Motion ─────────────────────────────────────────────────────────── */

/** Scroll reveal driven by IntersectionObserver; CSS handles reduce-motion. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────── */

type Variant = 'gold' | 'outline' | 'quiet';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  to?: string;
  href?: string;
  className?: string;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = 'gold',
  to,
  href,
  className,
  loading,
  icon,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn('btn', `btn-${variant}`, className);
  const body = (
    <>
      {loading ? <Loader2 size={15} className="spin" aria-hidden /> : null}
      <span>{children}</span>
      {icon ?? null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener">
        {body}
      </a>
    );
  }
  return (
    <button className={classes} {...rest} disabled={rest.disabled || loading}>
      {body}
    </button>
  );
}

/* ── Typographic furniture ──────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow', className)}>{children}</p>;
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  align = 'left',
  action,
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
}) {
  return (
    <div className={cn('section-heading', align === 'center' && 'section-heading--center')}>
      <div>
        {(eyebrow || index) && (
          <Eyebrow>
            {index ? <span className="eyebrow-index">{index}</span> : null}
            {eyebrow}
          </Eyebrow>
        )}
        <h2 className="display-2">{title}</h2>
        {description ? <p className="lede">{description}</p> : null}
      </div>
      {action ? <div className="section-heading-action">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="shell">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="display-1">{title}</h1>
          {lede ? <p className="lede lede--wide">{lede}</p> : null}
          {children ? <div className="page-header-extra">{children}</div> : null}
        </Reveal>
      </div>
    </header>
  );
}

/* ── Primitives ─────────────────────────────────────────────────────── */

export function Badge({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'muted' }) {
  return <span className={cn('badge', tone === 'muted' && 'badge--muted')}>{children}</span>;
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}

export function Divider() {
  return <div className="rule" role="presentation" />;
}

export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('skeleton-stack', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton" style={{ width: `${100 - index * 9}%` }} />
      ))}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <Loader2 className="spin" size={18} aria-hidden />
      <p>{label}…</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state state--empty">
      <Inbox size={20} aria-hidden />
      <p className="state-title">{title}</p>
      {description ? <p className="state-body">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <AlertTriangle size={18} aria-hidden />
      <p className="state-title">Something went wrong</p>
      <p className="state-body">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Alert({ tone, children }: { tone: 'success' | 'error' | 'info'; children: ReactNode }) {
  return (
    <div className={cn('alert', `alert--${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function ArrowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="arrow-link">
      <span>{children}</span>
      <ArrowRight size={15} aria-hidden />
    </Link>
  );
}

export function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="metric">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

/** Field wrapper used by every form in the app. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
