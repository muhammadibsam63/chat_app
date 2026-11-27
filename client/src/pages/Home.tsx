import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useDocumentMeta, useQuery } from '../lib/hooks';
import { useSite } from '../lib/site';
import type { Experience, Project, Service, Stats } from '../lib/types';
import { Button, Eyebrow, Reveal, SectionHeading, Skeleton, Tag } from '../components/ui';
import TechConstellation from '../components/TechConstellation';

const HeroScene = lazy(() => import('../components/HeroScene'));

/** The projects endpoint may return a bare array or a wrapped collection. */
function asProjects(value: unknown): Project[] {
  if (Array.isArray(value)) return value as Project[];
  const record = value as { projects?: Project[]; rows?: Project[] } | null;
  return record?.projects ?? record?.rows ?? [];
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export default function Home() {
  const { settings } = useSite();
  const profile = settings?.profile;
  const stats = useQuery<Stats>('/stats');
  const featured = useQuery<unknown>('/projects?featured=true');
  const allProjects = useQuery<unknown>('/projects');
  const services = useQuery<Service[]>('/services');
  const experience = useQuery<Experience[]>('/experience');

  useDocumentMeta({
    title: 'Muhammad Ibsam — Full-Stack Web Developer',
    description:
      'IBSAM® — the portfolio of Muhammad Ibsam, a full-stack web developer in Karachi building interfaces, APIs and interactive experiences with React, Node.js and Three.js.',
  });

  const featuredList = asProjects(featured.data);
  const showcase = (featuredList.length ? featuredList : asProjects(allProjects.data)).slice(0, 3);
  const loadingWork = featured.loading && allProjects.loading;

  const resumeHref = profile?.resumeUrl || undefined;
  const intro =
    profile?.shortBio ||
    'I build web products end to end — considered interfaces, dependable APIs and interactive experiences that stay fast on a phone. Currently open to internship opportunities while shipping projects of my own.';

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <Eyebrow>{profile?.title ?? 'Full-Stack Web Developer'} · {profile?.location ?? 'Karachi, Pakistan'}</Eyebrow>

            <h1 className="display-mega hero-name">
              <span className="hero-title-line">MUHAMMAD</span>
              <span className="hero-title-line gold-text">
                IBSAM<span className="brand-reg">®</span>
              </span>
            </h1>

            <p className="hero-tagline">Digital experiences. Engineered with intent.</p>
            <p className="hero-intro">{intro}</p>

            <div className="hero-actions">
              <Button to="/work" icon={<ArrowUpRight size={16} aria-hidden />}>
                Explore my work
              </Button>
              <Button to="/about" variant="outline">
                About me
              </Button>
              {resumeHref ? (
                <Button href={resumeHref} variant="quiet">
                  Download CV
                </Button>
              ) : (
                <Button to="/resume" variant="quiet">
                  Download CV
                </Button>
              )}
            </div>

            <p className="hero-availability">
              <span className="status-dot" aria-hidden />
              {profile?.availability || 'Open to internship opportunities'}
            </p>

            <dl className="hero-stats">
              <div>
                <dt>Projects shipped</dt>
                <dd>{stats.data?.projects ?? '—'}</dd>
              </div>
              <div>
                <dt>Case studies</dt>
                <dd>{stats.data?.caseStudies ?? '—'}</dd>
              </div>
              <div>
                <dt>Technologies</dt>
                <dd>{stats.data?.skills ?? '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="hero-visual">
            <Suspense fallback={<div className="hero-fallback" aria-hidden />}>
              <HeroScene />
            </Suspense>
            <p className="scroll-cue" aria-hidden>
              Scroll to enter
            </p>
          </div>
        </div>
      </section>

      {/* ── Statement ────────────────────────────────────────────────── */}
      <section className="section statement">
        <div className="shell">
          <div className="statement-copy">
            <Reveal>
              <Eyebrow>01 — Position</Eyebrow>
              <h2 className="display-2">
                Building beyond <span className="outline-text">the interface.</span>
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="lede">
                A website is the smallest part of the work. What matters is the data model underneath, the
                latency on a slow connection, the way a form explains itself when something breaks, and
                whether the thing still makes sense six months later.
              </p>
              <p className="lede">
                I work across that whole span — React and TypeScript on the surface, Node and SQL behind it,
                and WebGL where motion genuinely helps someone understand something.
              </p>
            </Reveal>
          </div>
          <div className="statement-side">
            <div className="haircard">
              <p className="eyebrow eyebrow--plain">Currently</p>
              <p>Studying, training at SMIT, and shipping personal products.</p>
            </div>
            <div className="haircard">
              <p className="eyebrow eyebrow--plain">Focus</p>
              <p>Full-stack engineering, Web3 and interactive front-end work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Selected work ────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            index="02"
            eyebrow="Selected work"
            title="Things I have built"
            description="Each project is documented as a case study: the problem, the decisions, and what actually shipped."
            action={<Link className="arrow-link" to="/work">All projects <ArrowUpRight size={15} aria-hidden /></Link>}
          />

          {loadingWork ? (
            <div className="skeleton-stack">
              <Skeleton lines={4} />
              <Skeleton lines={4} />
            </div>
          ) : showcase.length ? (
            <div className="work-editorial">
              {showcase.map((project, index) => (
                <Reveal as="article" key={project.id} delay={index * 60}>
                  <Link to={`/work/${project.slug}`} className={`project-row${index % 2 ? ' project-row--flip' : ''}`}>
                    <div className="project-row-media" aria-hidden>
                      {project.gallery?.[0] ? (
                        <img src={project.gallery[0]} alt="" loading="lazy" />
                      ) : (
                        <span className="project-glyph">{project.title.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="project-row-body">
                      <span className="project-row-index">{pad(index + 1)}</span>
                      <h3 className="project-row-title">{project.title}</h3>
                      <p className="project-row-sub">{project.subtitle || project.category}</p>
                      <p className="project-row-summary">{project.summary}</p>
                      <div className="tag-row">
                        {(project.technologies ?? []).slice(0, 4).map((tech) => (
                          <Tag key={tech}>{tech}</Tag>
                        ))}
                      </div>
                      <div className="project-row-foot">
                        <span className="mono">{project.year || '—'}</span>
                        <span className="arrow-link">
                          Read the case study <ArrowUpRight size={15} aria-hidden />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="muted">
              Projects are being documented. <Link to="/contact">Get in touch</Link> to see work in progress.
            </p>
          )}
        </div>
      </section>

      {/* ── Technology ───────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            index="03"
            eyebrow="Technology"
            title="The stack, honestly labelled"
            description="Core means I use it regularly and would defend the choice. Familiar means I have shipped with it. Learning means it is in progress — no invented percentages."
            action={<Link className="arrow-link" to="/skills">Full breakdown <ArrowUpRight size={15} aria-hidden /></Link>}
          />
          <TechConstellation />
        </div>
      </section>

      {/* ── Journey ──────────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            index="04"
            eyebrow="Journey"
            title="How I got here"
            description="Education, training and self-directed work — no invented employment history."
            action={<Link className="arrow-link" to="/experience">Full timeline <ArrowUpRight size={15} aria-hidden /></Link>}
          />
          {(experience.data ?? []).length ? (
            <ol className="timeline">
              {(experience.data ?? []).slice(0, 4).map((item, index) => (
                <Reveal as="li" key={item.id} delay={index * 50}>
                  <div className="timeline-item">
                    <p className="timeline-period">
                      {item.start_date}
                      {item.is_current ? ' — Present' : item.end_date ? ` — ${item.end_date}` : ''}
                    </p>
                    <h3 className="timeline-role">{item.position}</h3>
                    <p className="timeline-org">{item.organization}</p>
                    <p className="timeline-body">{item.description}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          ) : (
            <p className="muted">Timeline entries are being added in the studio.</p>
          )}
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────── */}
      {(services.data ?? []).length ? (
        <section className="section">
          <div className="shell">
            <SectionHeading index="05" eyebrow="Services" title="How I can help" />
            <div className="service-list">
              {(services.data ?? []).slice(0, 4).map((service, index) => (
                <Reveal as="article" key={service.id} delay={index * 50}>
                  <div className="service-row">
                    <span className="service-index">{pad(index + 1)}</span>
                    <div className="service-body">
                      <h3 className="service-title">{service.title}</h3>
                      <p>{service.summary}</p>
                      {service.features?.length ? (
                        <ul className="service-features">
                          {service.features.slice(0, 3).map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <div className="cta-panel glass-gold">
            <Eyebrow>06 — Next</Eyebrow>
            <h2 className="display-2">
              Let&apos;s build something <span className="gold-text">worth the effort.</span>
            </h2>
            <p className="lede">
              Available for internships and freelance work. Tell me what you are trying to ship and I will
              tell you honestly whether I am the right person for it.
            </p>
            <div className="cta-actions">
              <Button to="/contact" icon={<ArrowUpRight size={16} aria-hidden />}>
                Start a conversation
              </Button>
              <Button to="/resume" variant="outline">
                View résumé
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
