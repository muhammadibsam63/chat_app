import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Radio } from 'lucide-react';
import SceneCanvas from '../components/SceneCanvas';
import { Badge, Button, EmptyState, Eyebrow, Loading, PageHeader, Reveal, Tag } from '../components/ui';
import { useDocumentMeta, useQuery } from '../lib/hooks';
import type { CaseStudy, Project } from '../lib/types';
import { createProjectUniverse, type UniverseNode } from '../three/scenes';
import type { SceneContext, SceneInstance } from '../three/engine';

function asProjects(value: unknown): Project[] {
  if (Array.isArray(value)) return value as Project[];
  const record = value as { projects?: Project[]; rows?: Project[] } | null;
  return record?.projects ?? record?.rows ?? [];
}

const pad = (value: number): string => String(value).padStart(2, '0');

/* ── Project index ─────────────────────────────────────────────────── */

export function ProjectList() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<unknown>('/projects');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [showUniverse, setShowUniverse] = useState(true);

  useDocumentMeta({
    title: 'Work — Projects & Case Studies',
    description:
      'Nine documented projects by Muhammad Ibsam across full-stack engineering, interactive 3D and e-commerce.',
  });

  const projects = asProjects(data);

  const categories = useMemo(() => {
    const unique = new Set(projects.map((project) => project.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [projects]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesCategory = category === 'All' || project.category === category;
      if (!matchesCategory) return false;
      if (!needle) return true;
      const haystack = [project.title, project.subtitle, project.summary, ...(project.technologies ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [projects, category, query]);

  const nodes = useMemo<UniverseNode[]>(
    () => projects.map((project, index) => ({ slug: project.slug, title: project.title, index: pad(index + 1) })),
    [projects],
  );

  const factory = useCallback(
    (ctx: SceneContext): SceneInstance => createProjectUniverse(ctx, nodes),
    [nodes],
  );

  return (
    <>
      <PageHeader
        eyebrow="Work · 01 — 09"
        title={
          <>
            Nine projects, <span className="outline-text">documented properly.</span>
          </>
        }
        lede="Each entry states what the project is, what it is built with, and what actually works today. Filter, search, or open the 3D universe and click a node."
      />

      <section className="section">
        <div className="shell">
          <div className="filter-bar">
            <div className="chip-row" role="group" aria-label="Filter by category">
              {categories.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip${category === option ? ' chip--active' : ''}`}
                  aria-pressed={category === option}
                  onClick={() => setCategory(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <label className="search-field">
              <span className="sr-only">Search projects</span>
              <input
                className="input search-input"
                type="search"
                placeholder="Search projects or technologies"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={`chip${showUniverse ? ' chip--active' : ''}`}
              aria-pressed={showUniverse}
              onClick={() => setShowUniverse((value) => !value)}
            >
              <Radio size={13} aria-hidden /> 3D universe
            </button>
          </div>

          {showUniverse && nodes.length ? (
            <div className="universe">
              <div className="universe-canvas">
                <SceneCanvas
                  factory={factory}
                  label="Interactive three-dimensional map of the nine projects"
                  onClick={(object) => {
                    const slug = String(object.userData.slug ?? '');
                    const target = projects.find((project) => project.slug === slug);
                    if (target) navigate(`/work/${target.slug}`);
                  }}
                  fallback={<div className="scene-fallback">Project universe</div>}
                />
                <p className="universe-hint">
                  Drag to orbit · click a node to open its case study · the list below works without WebGL
                </p>
              </div>
              <div className="universe-legend">
                {nodes.map((node, index) => (
                  <Link key={node.slug} to={`/work/${node.slug}`} className="universe-legend-item">
                    <span className="mono">{node.index}</span>
                    {node.title}
                    {filtered.includes(projects[index]) ? null : <span className="muted"> · filtered out</span>}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? <Loading label="Loading projects" /> : null}
          {error ? <EmptyState title="Could not load projects" description={error} /> : null}

          {!loading && !error ? (
            filtered.length ? (
              <div className="work-editorial">
                {filtered.map((project, index) => (
                  <Reveal as="article" key={project.id} delay={index * 40}>
                    <Link
                      to={`/work/${project.slug}`}
                      className={`project-row${index % 2 ? ' project-row--flip' : ''}`}
                    >
                      <div className="project-row-media" aria-hidden>
                        {project.gallery?.[0] ? (
                          <img src={project.gallery[0]} alt="" loading="lazy" />
                        ) : (
                          <span className="project-glyph">{project.title.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="project-row-body">
                        <span className="project-row-index">{pad(index + 1)}</span>
                        <h2 className="project-row-title">{project.title}</h2>
                        <p className="project-row-sub">{project.subtitle || project.category}</p>
                        <p className="project-row-summary">{project.summary}</p>
                        <div className="tag-row">
                          {(project.technologies ?? []).slice(0, 5).map((tech) => (
                            <Tag key={tech}>{tech}</Tag>
                          ))}
                        </div>
                        <div className="project-row-foot">
                          <Badge>{project.category}</Badge>
                          <span className="mono">{project.year}</span>
                          <span className="arrow-link">
                            Case study <ArrowUpRight size={15} aria-hidden />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No projects match that search"
                description="Try a different technology or clear the filters to see everything."
              />
            )
          ) : null}
        </div>
      </section>
    </>
  );
}

/* ── Project detail ────────────────────────────────────────────────── */

type DetailPayload = { project: Project; caseStudy: CaseStudy | null; related: Project[] };

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useQuery<DetailPayload>(`/projects/${slug ?? 'missing'}`);

  useDocumentMeta({
    title: data?.project ? `${data.project.title} — Case Study` : 'Case Study',
    description: data?.project?.summary ?? 'A documented project by Muhammad Ibsam.',
  });

  if (loading) return <Loading label="Loading case study" />;
  if (error || !data?.project) {
    return (
      <section className="section">
        <div className="shell">
          <EmptyState title="Case study not found" description="This project may have been renamed or unpublished." />
          <Button to="/work" variant="outline">
            Back to all work
          </Button>
        </div>
      </section>
    );
  }

  const { project, caseStudy, related } = data;

  return (
    <>
      <article>
        <header className="case-hero">
          <div className="shell">
            <Reveal>
              <Eyebrow>
                {project.category} · {project.year || 'Recent'}
              </Eyebrow>
              <h1 className="display-1">{project.title}</h1>
              {project.subtitle ? <p className="lede lede--wide">{project.subtitle}</p> : null}
              <div className="tag-row">
                {(project.technologies ?? []).map((tech) => (
                  <Tag key={tech}>{tech}</Tag>
                ))}
              </div>
              <div className="cta-actions">
                {project.live_url ? (
                  <Button href={project.live_url} icon={<ArrowUpRight size={16} aria-hidden />}>
                    Live demo
                  </Button>
                ) : null}
                {project.github_url ? (
                  <Button href={project.github_url} variant="outline">
                    Source
                  </Button>
                ) : null}
                <Button to="/work" variant="quiet">
                  All projects
                </Button>
              </div>
            </Reveal>
          </div>
        </header>

        <div className="shell detail-layout">
          <div className="detail-main">
            {project.summary ? (
              <section className="detail-block">
                <h2 className="display-3">Overview</h2>
                <p className="lede">{project.summary}</p>
              </section>
            ) : null}

            {project.description ? (
              <section className="detail-block">
                <h2 className="display-3">What it does</h2>
                {project.description.split('\n').filter(Boolean).map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </section>
            ) : null}

            {caseStudy?.problem ? (
              <section className="detail-block">
                <h2 className="display-3">The problem</h2>
                <p>{caseStudy.problem}</p>
              </section>
            ) : null}

            {caseStudy?.approach ? (
              <section className="detail-block">
                <h2 className="display-3">The approach</h2>
                <p>{caseStudy.approach}</p>
              </section>
            ) : null}

            {caseStudy?.outcome ? (
              <section className="detail-block">
                <h2 className="display-3">The outcome</h2>
                <p>{caseStudy.outcome}</p>
              </section>
            ) : null}

            {(project.gallery ?? []).length ? (
              <section className="detail-block">
                <h2 className="display-3">Screens</h2>
                <div className="gallery">
                  {(project.gallery ?? []).map((src) => (
                    <img key={src} src={src} alt={`${project.title} screen`} loading="lazy" />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="detail-aside">
            <div className="haircard">
              <p className="eyebrow eyebrow--plain">Role</p>
              <p>{project.role || 'Design and development'}</p>
            </div>
            <div className="haircard">
              <p className="eyebrow eyebrow--plain">Timeline</p>
              <p>{project.duration || project.year || 'Ongoing'}</p>
            </div>
            <div className="haircard">
              <p className="eyebrow eyebrow--plain">Stack</p>
              <p>{(project.technologies ?? []).join(' · ') || '—'}</p>
            </div>
            {caseStudy?.metrics?.length ? (
              <div className="haircard">
                <p className="eyebrow eyebrow--plain">Recorded facts</p>
                <dl className="detail-meta">
                  {caseStudy.metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt>{metric.label}</dt>
                      <dd>{metric.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </aside>
        </div>
      </article>

      {(related ?? []).length ? (
        <section className="section">
          <div className="shell">
            <h2 className="display-3">More work</h2>
            <div className="grid-editorial">
              {(related ?? []).map((item) => (
                <Link key={item.id} to={`/work/${item.slug}`} className="haircard surface-hover">
                  <span className="mono">{item.category}</span>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

/* ── Case study index ──────────────────────────────────────────────── */

export function CaseStudies() {
  const { data, loading, error } = useQuery<CaseStudy[]>('/case-studies');

  useDocumentMeta({
    title: 'Case Studies',
    description: 'Engineering case studies: problem, approach and outcome for each project.',
  });

  return (
    <>
      <PageHeader
        eyebrow="Case studies"
        title={
          <>
            Decisions, <span className="outline-text">not just screenshots.</span>
          </>
        }
        lede="Written records of what each project needed, what I chose, and what changed as a result."
      />
      <section className="section">
        <div className="shell">
          {loading ? <Loading label="Loading case studies" /> : null}
          {error ? <EmptyState title="Could not load case studies" description={error} /> : null}
          {!loading && !error ? (
            (data ?? []).length ? (
              <div className="grid-editorial">
                {(data ?? []).map((study) => (
                  <Reveal as="article" key={study.id}>
                    <Link to={`/work/${study.project_slug}`} className="haircard surface-hover">
                      <span className="mono">{study.project_slug}</span>
                      <h2>{study.title}</h2>
                      <p className="muted">{study.subtitle}</p>
                      <span className="arrow-link">
                        Read <ArrowUpRight size={15} aria-hidden />
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : (
              <EmptyState title="No case studies yet" description="Case studies are published from the studio." />
            )
          ) : null}
        </div>
      </section>
    </>
  );
}
