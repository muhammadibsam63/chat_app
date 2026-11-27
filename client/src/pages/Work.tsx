import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { GithubIcon } from '../components/BrandIcons';
import { queryString } from '../lib/api';
import { useDocumentMeta, useQuery } from '../lib/hooks';
import { useSite } from '../lib/site';
import type { CaseStudy, Project } from '../lib/types';
import {
  ArrowLink,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Eyebrow,
  PageHeader,
  Reveal,
  Skeleton,
  Tag,
} from '../components/ui';

function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <Reveal delay={index * 60}>
      <article className="surface surface-hover project-card">
        <Link to={`/work/${project.slug}`} className="project-card-media" aria-label={project.title}>
          {project.gallery?.[0] ? (
            <img src={project.gallery[0]} alt={`${project.title} preview`} loading="lazy" />
          ) : (
            <span className="project-card-glyph">{project.title.slice(0, 1)}</span>
          )}
        </Link>
        <div className="project-card-body">
          <div className="project-card-top">
            <span className="project-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="badge badge--muted">{project.category}</span>
          </div>
          <h3 className="project-title">
            <Link to={`/work/${project.slug}`}>{project.title}</Link>
          </h3>
          <p className="project-summary">{project.summary}</p>
          <div className="tag-row">
            {(project.technologies ?? []).slice(0, 4).map((tech) => (
              <Tag key={tech}>{tech}</Tag>
            ))}
          </div>
          <div className="card-links">
            <ArrowLink to={`/work/${project.slug}`}>Read the build</ArrowLink>
            {project.live_url ? (
              <a href={project.live_url} target="_blank" rel="noreferrer noopener">
                <ArrowUpRight size={14} aria-hidden /> Live
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export function ProjectList() {
  const { settings } = useSite();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('All');

  useDocumentMeta({
    title: 'Work — Projects & Systems',
    description: 'Selected full-stack projects by Muhammad Ibsam, spanning Web3 applications, product dashboards and interface engineering.',
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const path = `/projects${queryString({
    q: debounced || undefined,
    category: category === 'All' ? undefined : category,
  })}`;
  const { data, meta, loading, error, reload } = useQuery<Project[]>(path, [path]);

  const categories = Array.isArray(meta.categories) ? (meta.categories as string[]) : [];
  const projects = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Built, shipped, documented."
        lede={`${settings.profile.name.split(' ')[0]} builds full-stack products where interface craft and system design meet. Each project below is documented with the constraints it was built against.`}
      />

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className="filter-bar">
          <div className="chip-row" role="group" aria-label="Filter by category">
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
            placeholder="Search projects…"
            aria-label="Search projects"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="work-grid">
            <div className="surface" style={{ padding: '1.5rem' }}><Skeleton lines={5} /></div>
            <div className="surface" style={{ padding: '1.5rem' }}><Skeleton lines={5} /></div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects match that filter"
            description="Try a different category or clear the search to see the full catalogue."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="work-grid">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

interface ProjectPayload {
  project: Project;
  caseStudy: CaseStudy | null;
  related: Project[];
}

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, reload } = useQuery<ProjectPayload>(slug ? `/projects/${slug}` : null, [slug]);

  useDocumentMeta({
    title: data ? `${data.project.title} — Case Study` : 'Project',
    description: data?.project.seo_description || data?.project.summary,
    image: data?.project.gallery?.[0],
    type: 'article',
  });

  if (loading) {
    return (
      <section className="shell" style={{ paddingBlock: '4rem' }}>
        <Skeleton lines={8} />
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="shell" style={{ paddingBlock: '4rem' }}>
        <ErrorState message={error ?? 'This project could not be found.'} onRetry={reload} />
        <div style={{ marginTop: '1.5rem' }}>
          <ArrowLink to="/work">Back to all work</ArrowLink>
        </div>
      </section>
    );
  }

  const { project, caseStudy, related } = data;

  return (
    <>
      <header className="page-header">
        <div className="shell">
          <Link to="/work" className="arrow-link" style={{ marginBottom: '1.2rem' }}>
            <ArrowLeft size={14} aria-hidden /> All work
          </Link>
          <Eyebrow>
            {project.category} · {project.year || 'Undated'}
          </Eyebrow>
          <h1 className="display-1">{project.title}</h1>
          <p className="lede lede--wide">{project.subtitle || project.summary}</p>
          <div className="hero-actions" style={{ marginTop: '1.6rem' }}>
            {project.live_url ? (
              <Button href={project.live_url} icon={<ArrowUpRight size={15} aria-hidden />}>
                View live product
              </Button>
            ) : null}
            {project.github_url ? (
              <Button href={project.github_url} variant="outline">
                <GithubIcon size={15} /> Source code
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {project.gallery?.[0] ? (
          <div className="article-cover">
            <img src={project.gallery[0]} alt={`${project.title} interface`} loading="lazy" />
          </div>
        ) : null}

        <div className="detail-layout">
          <div>
            <dl className="detail-meta">
              <div>
                <dt>Role</dt>
                <dd>{project.role || 'Design & engineering'}</dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>{project.duration || project.year || '—'}</dd>
              </div>
              <div>
                <dt>Stack</dt>
                <dd>{(project.technologies ?? []).slice(0, 3).join(', ') || '—'}</dd>
              </div>
            </dl>

            <div className="prose">
              {paragraphs(project.description || project.summary).map((part, index) => (
                <p key={index}>{part}</p>
              ))}
            </div>

            {caseStudy ? (
              <div style={{ marginTop: '2.5rem' }}>
                <Eyebrow>Case study</Eyebrow>
                <h2 className="display-2">{caseStudy.title}</h2>
                {caseStudy.subtitle ? <p className="lede">{caseStudy.subtitle}</p> : null}

                {caseStudy.metrics?.length ? (
                  <div className="hero-stats">
                    {caseStudy.metrics.map((metric) => (
                      <div className="metric" key={metric.label}>
                        <span className="metric-value">{metric.value}</span>
                        <span className="metric-label">{metric.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="prose" style={{ marginTop: '2rem' }}>
                  {caseStudy.problem ? (
                    <>
                      <h2>The problem</h2>
                      {paragraphs(caseStudy.problem).map((part, index) => (
                        <p key={`p-${index}`}>{part}</p>
                      ))}
                    </>
                  ) : null}
                  {caseStudy.approach ? (
                    <>
                      <h2>The approach</h2>
                      {paragraphs(caseStudy.approach).map((part, index) => (
                        <p key={`a-${index}`}>{part}</p>
                      ))}
                    </>
                  ) : null}
                  {caseStudy.outcome ? (
                    <>
                      <h2>The outcome</h2>
                      {paragraphs(caseStudy.outcome).map((part, index) => (
                        <p key={`o-${index}`}>{part}</p>
                      ))}
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {project.gallery?.length > 1 ? (
              <div className="gallery">
                {project.gallery.slice(1).map((image) => (
                  <img key={image} src={image} alt={`${project.title} detail`} loading="lazy" />
                ))}
              </div>
            ) : null}
          </div>

          <aside className="detail-aside">
            <div className="surface" style={{ padding: '1.4rem' }}>
              <Eyebrow>Technologies</Eyebrow>
              <div className="tag-row" style={{ marginTop: '0.8rem' }}>
                {(project.technologies ?? []).map((tech) => (
                  <Tag key={tech}>{tech}</Tag>
                ))}
              </div>
            </div>
            {project.seo_description ? (
              <div className="surface" style={{ padding: '1.4rem' }}>
                <Eyebrow>In one line</Eyebrow>
                <p className="project-summary" style={{ marginTop: '0.6rem' }}>
                  {project.seo_description}
                </p>
              </div>
            ) : null}
            <div className="surface" style={{ padding: '1.4rem' }}>
              <Eyebrow>Interested?</Eyebrow>
              <p className="project-summary" style={{ marginTop: '0.6rem' }}>
                Similar problems are welcome — start with a short brief.
              </p>
              <div style={{ marginTop: '0.9rem' }}>
                <Button to="/contact" variant="outline">
                  Start a project
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <div style={{ marginTop: 'clamp(3rem, 6vw, 4.5rem)' }}>
            <Eyebrow>More work</Eyebrow>
            <div className="work-grid" style={{ marginTop: '1.2rem' }}>
              {related.slice(0, 2).map((item, index) => (
                <ProjectCard key={item.id} project={item} index={index} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

export function CaseStudies() {
  const { data, loading, error, reload } = useQuery<CaseStudy[]>('/case-studies');

  useDocumentMeta({
    title: 'Case Studies',
    description: 'Detailed engineering case studies: the problem, the approach and the measured outcome.',
  });

  const studies = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Case studies"
        title="Decisions, documented."
        lede="Every project is a set of trade-offs. These write-ups explain what the constraints were, what was chosen and what changed as a result."
      />

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : studies.length === 0 ? (
          <EmptyState
            title="Case studies are being written"
            description="The engineering write-ups for these projects are in progress. The project pages already contain the full build notes."
            action={<Button to="/work">Browse projects</Button>}
          />
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {studies.map((study, index) => (
              <Reveal key={study.id} delay={index * 60}>
                <article className="surface haircard" style={{ padding: 'clamp(1.4rem, 3vw, 2.2rem)' }}>
                  <div className="project-card-top">
                    <Badge>{study.project_slug || 'Case study'}</Badge>
                    <span className="project-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h2 className="project-title" style={{ marginTop: '0.8rem' }}>
                    {study.title}
                  </h2>
                  {study.subtitle ? <p className="project-summary">{study.subtitle}</p> : null}
                  <div className="prose" style={{ marginTop: '1rem' }}>
                    {study.problem ? <p>{study.problem}</p> : null}
                  </div>
                  {study.metrics?.length ? (
                    <div className="hero-stats">
                      {study.metrics.map((metric) => (
                        <div className="metric" key={metric.label}>
                          <span className="metric-value">{metric.value}</span>
                          <span className="metric-label">{metric.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {study.project_slug ? (
                    <div style={{ marginTop: '1rem' }}>
                      <ArrowLink to={`/work/${study.project_slug}`}>Open the project</ArrowLink>
                    </div>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
