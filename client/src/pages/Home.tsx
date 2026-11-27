import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Github, MapPin } from 'lucide-react';
import { useDocumentMeta, useQuery } from '../lib/hooks';
import { useSite } from '../lib/site';
import type { Experience, Project, Service, Skill, Stats } from '../lib/types';
import { ArrowLink, Button, Eyebrow, Metric, Reveal, SectionHeading, Skeleton, Tag } from '../components/ui';

const HeroScene = lazy(() => import('../components/HeroScene'));

function groupSkills(skills: Skill[]): Array<[string, Skill[]]> {
  const groups = new Map<string, Skill[]>();
  for (const skill of skills) {
    const key = skill.category || 'Core';
    groups.set(key, [...(groups.get(key) ?? []), skill]);
  }
  return [...groups.entries()];
}

export default function Home() {
  const { settings } = useSite();
  const stats = useQuery<Stats>('/stats');
  const featured = useQuery<Project[]>('/projects?featured=true');
  const skills = useQuery<Skill[]>('/skills');
  const services = useQuery<Service[]>('/services');
  const experience = useQuery<Experience[]>('/experience');

  useDocumentMeta({
    title: `${settings.profile.name} — ${settings.profile.title}`,
    description: settings.seo.description,
    image: settings.seo.ogImage,
  });

  const projects = (featured.data ?? []).slice(0, 4);
  const grouped = groupSkills(skills.data ?? []);
  const topServices = (services.data ?? []).slice(0, 4);
  const latestRole = (experience.data ?? [])[0];
  const counts = stats.data;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="shell">
          <div className="hero-inner">
            <div className="hero-copy">
              <Eyebrow>
                {settings.profile.title} <span aria-hidden>·</span> {settings.profile.location}
              </Eyebrow>
              <h1 className="display-1">
                {settings.profile.name.split(' ')[0]}{' '}
                <em className="hero-title-accent">{settings.profile.name.split(' ').slice(1).join(' ')}</em>
              </h1>
              <p className="hero-tagline">{settings.profile.tagline}</p>
              <div className="hero-actions">
                <Button to="/work" icon={<ArrowRight size={16} aria-hidden />}>
                  View selected work
                </Button>
                <Button to="/contact" variant="outline">
                  Start a project
                </Button>
              </div>
              <p className="hero-availability">
                <span className="status-dot" aria-hidden />
                {settings.profile.availability}
              </p>
            </div>

            <div className="hero-visual">
              <Suspense fallback={<div className="hero-fallback" aria-hidden />}>
                <HeroScene />
              </Suspense>
            </div>
          </div>

          <div className="hero-stats">
            <Metric value={counts ? String(counts.projects).padStart(2, '0') : '—'} label="Projects" />
            <Metric value={counts ? String(counts.skills).padStart(2, '0') : '—'} label="Technologies" />
            <Metric value={counts ? String(counts.posts).padStart(2, '0') : '—'} label="Essays" />
            <Metric value={counts ? String(counts.services).padStart(2, '0') : '—'} label="Services" />
          </div>
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────── */}
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-item">
              {(skills.data ?? []).slice(0, 9).map((skill) => (
                <span key={`${copy}-${skill.id}`}>{skill.name}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Selected work ────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            index="01"
            eyebrow="Selected work"
            title="Products, not demos."
            description="Interfaces and systems built to survive real usage — from on-chain experiments to production dashboards."
            action={<ArrowLink to="/work">All projects</ArrowLink>}
          />

          {featured.loading ? (
            <div className="work-grid">
              <div className="surface" style={{ padding: '1.5rem' }}><Skeleton lines={5} /></div>
              <div className="surface" style={{ padding: '1.5rem' }}><Skeleton lines={5} /></div>
            </div>
          ) : projects.length === 0 ? (
            <p className="muted">Project work is being catalogued. In the meantime, the writing covers the engineering approach.</p>
          ) : (
            <div className="work-grid">
              {projects.map((project, index) => (
                <Reveal key={project.id} delay={index * 70}>
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
                        <ArrowLink to={`/work/${project.slug}`}>Case study</ArrowLink>
                        {project.github_url ? (
                          <a href={project.github_url} target="_blank" rel="noreferrer noopener">
                            <Github size={14} aria-hidden /> Source
                          </a>
                        ) : null}
                        {project.live_url ? (
                          <a href={project.live_url} target="_blank" rel="noreferrer noopener">
                            <ArrowUpRight size={14} aria-hidden /> Live
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────── */}
      <section className="section hairline-top">
        <div className="shell">
          <SectionHeading
            index="02"
            eyebrow="Capabilities"
            title="The stack I think in."
            description="A focused toolkit, used deliberately. Depth over breadth, with the fundamentals doing the heavy lifting."
            action={<ArrowLink to="/skills">Full skill map</ArrowLink>}
          />

          {skills.loading ? (
            <Skeleton lines={6} />
          ) : (
            <div className="skill-grid">
              {grouped.slice(0, 4).map(([category, items], groupIndex) => (
                <Reveal key={category} delay={groupIndex * 60} className="skill-group">
                  <p className="skill-cat">{category}</p>
                  {items.slice(0, 5).map((skill) => (
                    <div key={skill.id} className="skill-row">
                      <div className="skill-row-head">
                        <span>{skill.name}</span>
                        <span>{skill.level}%</span>
                      </div>
                      <div className="skill-bar">
                        <div className="skill-fill" style={{ width: `${Math.min(100, Math.max(0, skill.level))}%` }} />
                      </div>
                    </div>
                  ))}
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────── */}
      {topServices.length > 0 ? (
        <section className="section hairline-top">
          <div className="shell">
            <SectionHeading
              index="03"
              eyebrow="Services"
              title="How we can work together."
              description="Engagements are scoped tightly, delivered in the open and measured against outcomes."
              action={<ArrowLink to="/services">All services</ArrowLink>}
            />
            <div className="service-list">
              {topServices.map((service, index) => (
                <Reveal key={service.id} delay={index * 50} className="service-row">
                  <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="service-title">{service.title}</h3>
                  <div className="service-body">
                    <p>{service.summary}</p>
                    {service.features?.length ? (
                      <div className="service-features">
                        {service.features.slice(0, 4).map((feature) => (
                          <Tag key={feature}>{feature}</Tag>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Experience ───────────────────────────────────── */}
      {latestRole ? (
        <section className="section hairline-top">
          <div className="shell">
            <SectionHeading
              index="04"
              eyebrow="Currently"
              title="Where the work happens."
              action={<ArrowLink to="/experience">Full history</ArrowLink>}
            />
            <div className="timeline">
              <Reveal className="timeline-item">
                <p className="timeline-period">
                  {latestRole.start_date} — {latestRole.is_current ? 'Present' : latestRole.end_date}
                </p>
                <h3 className="timeline-role">{latestRole.position}</h3>
                <p className="timeline-org">
                  {latestRole.organization}
                  {latestRole.location ? ` · ${latestRole.location}` : ''}
                </p>
                <p className="timeline-body">{latestRole.description}</p>
                <div className="tag-row">
                  {(latestRole.technologies ?? []).map((tech) => (
                    <Tag key={tech}>{tech}</Tag>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="section hairline-top">
        <div className="shell">
          <Reveal className="cta-panel">
            <Eyebrow>Next step</Eyebrow>
            <h2 className="display-2">Have something exacting in mind?</h2>
            <p className="lede">
              Tell me about the product, the constraints and the timeline. I reply to every serious enquiry — usually
              within {settings.contact.responseTime.toLowerCase()}.
            </p>
            <div className="cta-actions">
              <Button to="/contact" icon={<ArrowRight size={16} aria-hidden />}>
                Start the conversation
              </Button>
              <Button to="/resume" variant="outline">
                Read the résumé
              </Button>
            </div>
            <p className="hero-availability">
              <MapPin size={13} aria-hidden /> {settings.profile.location}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
