import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, Gauge, RotateCcw, Type } from 'lucide-react';
import { queryString } from '../lib/api';
import { useDocumentMeta, useQuery, formatDate } from '../lib/hooks';
import type { BlogPost, Testimonial } from '../lib/types';
import {
  ArrowLink,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Eyebrow,
  Field,
  PageHeader,
  Reveal,
  Skeleton,
  Tag,
} from '../components/ui';

/* ── Blog ───────────────────────────────────────────────────────────── */

export function Blog() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('All');

  useDocumentMeta({
    title: 'Writing',
    description: 'Engineering notes on interface architecture, Web3 products and shipping maintainable front ends.',
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const path = `/blog${queryString({
    q: debounced || undefined,
    category: category === 'All' ? undefined : category,
  })}`;
  const { data, meta, loading, error, reload } = useQuery<BlogPost[]>(path, [path]);

  const posts = data ?? [];
  const categories = Array.isArray(meta.categories) ? (meta.categories as string[]) : [];

  return (
    <>
      <PageHeader
        eyebrow="Writing"
        title="Notes from the build."
        lede="Engineering essays on the decisions that are invisible in a screenshot: state, structure, performance and trade-offs."
      />

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className="filter-bar">
          <div className="chip-row" role="group" aria-label="Filter by topic">
            <button
              type="button"
              className={`chip ${category === 'All' ? 'is-active' : ''}`}
              aria-pressed={category === 'All'}
              onClick={() => setCategory('All')}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip ${category === item ? 'is-active' : ''}`}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="input search-input"
            placeholder="Search essays…"
            aria-label="Search essays"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <Skeleton lines={7} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : posts.length === 0 ? (
          <EmptyState
            title="No essays match that search"
            description="Try a different topic, or read the case studies instead."
            action={<Button to="/case-studies">Case studies</Button>}
          />
        ) : (
          <div className="post-list">
            {posts.map((post, index) => (
              <Reveal key={post.id} delay={index * 50}>
                <article className="post-row">
                  <div className="post-row-meta">
                    <span>{post.published_at ? formatDate(post.published_at) : 'Draft'}</span>
                    <span className="dot" aria-hidden />
                    <span>{post.read_minutes} min read</span>
                  </div>
                  <h2 className="post-row-title">
                    <Link to={`/writing/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="project-summary">{post.excerpt}</p>
                  <div className="tag-row">
                    <Badge tone="muted">{post.category}</Badge>
                    {(post.tags ?? []).slice(0, 3).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function renderContent(content: string) {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block, index) => {
    if (block.startsWith('### ')) return <h3 key={index}>{block.slice(4)}</h3>;
    if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
    if (block.startsWith('> ')) return <blockquote key={index}>{block.slice(2)}</blockquote>;
    if (/^[-*]\s/m.test(block) && block.split('\n').every((line) => /^[-*]\s/.test(line))) {
      return (
        <ul key={index}>
          {block.split('\n').map((line, lineIndex) => (
            <li key={lineIndex}>{line.replace(/^[-*]\s/, '')}</li>
          ))}
        </ul>
      );
    }
    return <p key={index}>{block}</p>;
  });
}

export function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, reload } = useQuery<{ post: BlogPost; related: BlogPost[] }>(
    slug ? `/blog/${slug}` : null,
    [slug],
  );

  useDocumentMeta({
    title: data?.post.seo_title || data?.post.title || 'Essay',
    description: data?.post.seo_description || data?.post.excerpt,
    image: data?.post.cover_image,
    type: 'article',
  });

  if (loading) {
    return (
      <section className="shell" style={{ paddingBlock: '4rem' }}>
        <Skeleton lines={9} />
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="shell" style={{ paddingBlock: '4rem' }}>
        <ErrorState message={error ?? 'This essay could not be found.'} onRetry={reload} />
        <div style={{ marginTop: '1.5rem' }}>
          <ArrowLink to="/writing">All essays</ArrowLink>
        </div>
      </section>
    );
  }

  const { post, related } = data;

  return (
    <>
      <header className="page-header">
        <div className="shell shell--narrow">
          <Link to="/writing" className="arrow-link" style={{ marginBottom: '1.2rem' }}>
            <ArrowLeft size={14} aria-hidden /> Writing
          </Link>
          <Eyebrow>{post.category}</Eyebrow>
          <h1 className="display-1">{post.title}</h1>
          <div className="post-row-meta" style={{ marginTop: '1rem' }}>
            <span>{post.published_at ? formatDate(post.published_at) : 'Draft'}</span>
            <span className="dot" aria-hidden />
            <span>{post.read_minutes} min read</span>
            <span className="dot" aria-hidden />
            <span>{post.views} views</span>
          </div>
        </div>
      </header>

      <section className="shell shell--narrow" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {post.cover_image ? (
          <div className="article-cover">
            <img src={post.cover_image} alt="" loading="lazy" />
          </div>
        ) : null}
        <div className="prose prose--article">{renderContent(post.content || post.excerpt)}</div>
        <div className="tag-row" style={{ marginTop: '2rem' }}>
          {(post.tags ?? []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        {related.length > 0 ? (
          <div style={{ marginTop: '3rem' }}>
            <Eyebrow>Keep reading</Eyebrow>
            <div style={{ display: 'grid', gap: '0.8rem', marginTop: '0.8rem' }}>
              {related.map((item) => (
                <Link key={item.id} to={`/writing/${item.slug}`} className="related-row">
                  <span>{item.title}</span>
                  <ArrowRight size={15} aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

/* ── Developer lab ──────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.replace('#', '').trim();
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

function luminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number | null {
  const a = luminance(foreground);
  const b = luminance(background);
  if (a === null || b === null) return null;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const EASING_PRESETS = [
  { label: 'Editorial', value: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { label: 'Sharp', value: 'cubic-bezier(0.7, 0, 0.3, 1)' },
  { label: 'Spring-ish', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { label: 'Linear', value: 'linear' },
];

export function Lab() {
  useDocumentMeta({
    title: 'Developer Lab',
    description: 'Small, working tools built for the craft: a modular type scale, a WCAG contrast checker and an easing visualiser.',
  });

  const [ratio, setRatio] = useState(1.25);
  const [base, setBase] = useState(17);
  const scale = useMemo(() => [2, 1, 0, -1, -2].map((step) => base * ratio ** step), [base, ratio]);

  const [foreground, setForeground] = useState('#f5c542');
  const [background, setBackground] = useState('#10141c');
  const contrast = contrastRatio(foreground, background);

  const [easing, setEasing] = useState(EASING_PRESETS[0].value);
  const [run, setRun] = useState(0);

  const validContrast = contrast ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Developer lab"
        title="Tools I actually use."
        lede="Three small instruments for interface work. They run entirely in the browser — no data leaves this page."
      />

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className="lab-grid">
          {/* Type scale */}
          <Reveal className="surface lab-card">
            <div className="lab-head">
              <Type size={16} aria-hidden />
              <h2 className="lab-title">Modular type scale</h2>
            </div>
            <div className="lab-controls">
              <Field label={`Ratio · ${ratio.toFixed(3)}`} htmlFor="lab-ratio">
                <input
                  id="lab-ratio"
                  type="range"
                  min={1.1}
                  max={1.618}
                  step={0.005}
                  value={ratio}
                  onChange={(event) => setRatio(Number(event.target.value))}
                />
              </Field>
              <Field label={`Base size · ${base}px`} htmlFor="lab-base">
                <input
                  id="lab-base"
                  type="range"
                  min={13}
                  max={22}
                  step={1}
                  value={base}
                  onChange={(event) => setBase(Number(event.target.value))}
                />
              </Field>
            </div>
            <div className="lab-output">
              {scale.map((size, index) => (
                <p key={index} className="lab-type-row">
                  <span className="lab-type-sample" style={{ fontSize: `${size.toFixed(1)}px` }}>
                    Gold standard
                  </span>
                  <span className="lab-type-size">{size.toFixed(1)}px</span>
                </p>
              ))}
            </div>
          </Reveal>

          {/* Contrast */}
          <Reveal delay={60} className="surface lab-card">
            <div className="lab-head">
              <Gauge size={16} aria-hidden />
              <h2 className="lab-title">Contrast checker</h2>
            </div>
            <div className="lab-controls lab-controls--row">
              <Field label="Text" htmlFor="lab-fg">
                <input
                  id="lab-fg"
                  type="color"
                  className="color-input"
                  value={foreground}
                  onChange={(event) => setForeground(event.target.value)}
                />
              </Field>
              <Field label="Surface" htmlFor="lab-bg">
                <input
                  id="lab-bg"
                  type="color"
                  className="color-input"
                  value={background}
                  onChange={(event) => setBackground(event.target.value)}
                />
              </Field>
            </div>
            <div
              className="lab-swatch"
              style={{ background, color: foreground }}
              aria-label="Contrast preview"
            >
              <p style={{ margin: 0, fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.6rem' }}>
                Aa — IBSAM®
              </p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                Body copy preview at 14px
              </p>
            </div>
            <div className="lab-result">
              <span className="lab-ratio">{contrast ? `${contrast.toFixed(2)}:1` : '—'}</span>
              <div className="tag-row">
                <Tag>{validContrast >= 4.5 ? 'AA normal ✓' : 'AA normal ✗'}</Tag>
                <Tag>{validContrast >= 3 ? 'AA large ✓' : 'AA large ✗'}</Tag>
                <Tag>{validContrast >= 7 ? 'AAA ✓' : 'AAA ✗'}</Tag>
              </div>
            </div>
          </Reveal>

          {/* Easing */}
          <Reveal delay={120} className="surface lab-card">
            <div className="lab-head">
              <RotateCcw size={16} aria-hidden />
              <h2 className="lab-title">Easing visualiser</h2>
            </div>
            <div className="chip-row">
              {EASING_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`chip ${easing === preset.value ? 'is-active' : ''}`}
                  aria-pressed={easing === preset.value}
                  onClick={() => {
                    setEasing(preset.value);
                    setRun((value) => value + 1);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="lab-track">
              <span
                key={`${easing}-${run}`}
                className="lab-ball"
                style={{ transitionTimingFunction: easing }}
              />
            </div>
            <div className="lab-controls">
              <Field label="Curve" htmlFor="lab-curve">
                <input id="lab-curve" className="input" readOnly value={easing} />
              </Field>
              <Button variant="outline" onClick={() => setRun((value) => value + 1)}>
                Replay
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ── Testimonials ───────────────────────────────────────────────────── */

export function Testimonials() {
  const { data, loading, error, reload } = useQuery<Testimonial[]>('/testimonials');

  useDocumentMeta({
    title: 'Testimonials',
    description: 'Words from collaborators and clients.',
  });

  const items = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Testimonials"
        title="Words from collaborators."
        lede="Quotes are published here only with permission, and they link back to the work they describe."
      />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No testimonials published yet"
            description="Rather than inventing quotes, this page stays honest until real feedback is collected and approved."
            action={<Button to="/work">Read the work instead</Button>}
          />
        ) : (
          <div className="quote-grid">
            {items.map((item, index) => (
              <Reveal key={item.id} delay={index * 60}>
                <figure className="surface quote-card">
                  <span className="quote-mark" aria-hidden>
                    “
                  </span>
                  <blockquote className="quote-body">{item.quote}</blockquote>
                  <figcaption>
                    <span className="quote-name">{item.author}</span>
                    <span className="quote-role">
                      {[item.role, item.company].filter(Boolean).join(' · ')}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ── Shared clock icon usage guard ──────────────────────────────────── */

export const ClockIcon = Clock;
