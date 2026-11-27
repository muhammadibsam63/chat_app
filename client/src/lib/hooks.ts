import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError, api } from './api';

interface QueryState<T> {
  data: T | null;
  meta: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T | null) => void;
}

/** Small data hook: abortable fetch, loading/error state and a manual reload. */
export function useQuery<T>(path: string | null, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(path)
      .then((result) => {
        if (cancelled || !mounted.current) return;
        setData(result.data);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (cancelled || !mounted.current) return;
        setError(err instanceof ApiClientError ? err.message : 'Unable to load content');
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, meta, loading, error, reload, setData };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return reduced;
}

export function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      setSupported(Boolean(gl));
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

interface MetaInput {
  title: string;
  description?: string;
  image?: string;
  type?: string;
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/** Per-page SEO: title, description, Open Graph, Twitter card and canonical URL. */
export function useDocumentMeta({ title, description, image, type = 'website' }: MetaInput): void {
  useEffect(() => {
    const fullTitle = title.includes('IBSAM') ? title : `${title} — IBSAM®`;
    document.title = fullTitle;
    if (description) {
      upsertMeta('meta[name="description"]', 'name', 'description', description);
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
      upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    if (image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [title, description, image, type]);
}

/** Records one anonymous pageview per route change (session id in sessionStorage). */
export function usePageView(path: string): void {
  useEffect(() => {
    if (path.startsWith('/admin')) return;
    let sessionId = sessionStorage.getItem('ibsam_sid');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('ibsam_sid', sessionId);
    }
    const timer = window.setTimeout(() => {
      void api
        .post('/analytics/pageview', { path, referrer: document.referrer || undefined, sessionId })
        .catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [path]);
}

export function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
