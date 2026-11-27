import { useDocumentMeta, useQuery, formatDate } from '../lib/hooks';
import { useSite } from '../lib/site';
import type {
  Achievement,
  Certification,
  Education as EducationType,
  Experience as ExperienceType,
  ResumeRecord,
  Service,
  Skill,
  Stats,
} from '../lib/types';
import {
  ArrowLink,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Eyebrow,
  PageHeader,
  Reveal,
  SectionHeading,
  Skeleton,
  Tag,
} from '../components/ui';

/* ── About ──────────────────────────────────────────────────────────── */

export function About() {
  const { settings } = useSite();
  const stats = useQuery<Stats>('/stats');
  const skills = useQuery<Skill[]>('/skills');

  useDocumentMeta({
    title: 'About',
    description: settings.profile.shortBio,
    image: settings.profile.photo,
  });

  const grouped = (skills.data ?? []).reduce<Record<string, Skill[]>>((acc, skill) => {
    const key = skill.category || 'Core';
    acc[key] = [...(acc[key] ?? []), skill];
    return acc;
  }, {});

  return (
    <>
      <PageHeader eyebrow="About" title={settings.profile.name} lede={settings.profile.shortBio} />

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className="detail-layout">
          <div>
            <div className="prose">
              {(settings.profile.bio || settings.profile.shortBio)
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((part, index) => (
                  <p key={index}>{part}</p>
                ))}
            </div>

            <div style={{ marginTop: '2.2rem' }}>
              <Eyebrow>Interests</Eyebrow>
              <div className="tag-row" style={{ marginTop: '0.7rem' }}>
                {(settings.profile.interests ?? []).map((interest) => (
                  <Tag key={interest}>{interest}</Tag>
                ))}
              </div>
            </div>

            <div className="hero-stats">
              <div className="metric">
                <span className="metric-value">{stats.data ? stats.data.projects : '—'}</span>
                <span className="metric-label">Projects</span>
              </div>
              <div className="metric">
                <span className="metric-value">{stats.data ? stats.data.skills : '—'}</span>
                <span className="metric-label">Technologies</span>
              </div>
              <div className="metric">
                <span className="metric-value">{stats.data ? stats.data.posts : '—'}</span>
                <span className="metric-label">Essays</span>
              </div>
              <div className="metric">
                <span className="metric-value">{settings.profile.location.split(',')[0]}</span>
                <span className="metric-label">Based in</span>
              </div>
            </div>

            <div style={{ marginTop: '2.2rem', display: 'grid', gap: '0.9rem' }}>
              <Eyebrow>Working toolkit</Eyebrow>
              {Object.entries(grouped).slice(0, 5).map(([category, items]) => (
                <div key={category}>
                  <p className="skill-cat" style={{ marginBottom: '0.4rem' }}>
                    {category}
                  </p>
                  <div className="tag-row">
                    {items.map((skill) => (
                      <Tag key={skill.id}>{skill.name}</Tag>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="detail-aside">
            <div className="surface" style={{ padding: '1.4rem' }}>
              {settings.profile.photo ? (
                <img
                  src={settings.profile.photo}
                  alt={settings.profile.name}
                  style={{ width: '100%', borderRadius: '12px', display: 'block' }}
                  loading="lazy"
                />
              ) : (
                <div
                  style={{
                    aspectRatio: '4 / 5',
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(150deg, #151a24, #0b0e14)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontSize: '3rem',
                    color: 'rgba(245,197,66,0.5)',
                  }}
                  aria-hidden
                >
                  MI
                </div>
              )}
              <p className="quote-name" style={{ marginTop: '0.9rem' }}>
                {settings.profile.name}
              </p>
              <p className="quote-role">{settings.profile.title}</p>
              <div style={{ marginTop: '1rem' }}>
                <Badge>{settings.profile.availability}</Badge>
              </div>
            </div>
            <div className="surface" style={{ padding: '1.4rem' }}>
              <Eyebrow>Contact</Eyebrow>
              <p className="project-summary" style={{ marginTop: '0.5rem' }}>
                <a href={`mailto:${settings.profile.email}`}>{settings.profile.email}</a>
              </p>
              <p className="project-summary">{settings.profile.location}</p>
              <div style={{ marginTop: '0.9rem' }}>
                <ArrowLink to="/contact">Send a message</ArrowLink>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/* ── Skills ─────────────────────────────────────────────────────────── */

export function Skills() {
  const { data, loading, error, reload } = useQuery<Skill[]>('/skills');

  useDocumentMeta({
    title: 'Skills & Stack',
    description: 'The technologies and disciplines used daily: React, Next.js, Node.js, TypeScript, Firebase and Web3 tooling.',
  });

  const skills = data ?? [];
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const key = skill.category || 'Core';
    acc[key] = [...(acc[key] ?? []), skill];
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title="Depth where it matters."
        lede="An honest map of the toolkit — grouped by discipline, with self-assessed proficiency rather than invented badges."
      />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={10} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : skills.length === 0 ? (
          <EmptyState title="Skills are not published yet" />
        ) : (
          <div className="skill-grid">
            {Object.entries(grouped).map(([category, items], groupIndex) => (
              <Reveal key={category} delay={groupIndex * 60} className="skill-group">
                <p className="skill-cat">{category}</p>
                {items.map((skill) => (
                  <div className="skill-row" key={skill.id}>
                    <div className="skill-row-head">
                      <span>{skill.name}</span>
                      <span>{skill.level}%</span>
                    </div>
                    <div className="skill-bar">
                      <div
                        className="skill-fill"
                        style={{ width: `${Math.min(100, Math.max(0, skill.level))}%` }}
                      />
                    </div>
                    {skill.description ? <p className="field-hint">{skill.description}</p> : null}
                  </div>
                ))}
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ── Experience ─────────────────────────────────────────────────────── */

export function Experience() {
  const { data, loading, error, reload } = useQuery<ExperienceType[]>('/experience');

  useDocumentMeta({ title: 'Experience', description: 'Professional experience and engineering engagements.' });

  const roles = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Experience"
        title="The record."
        lede="Engagements, roles and the work delivered. Only verified history is published here."
      />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : roles.length === 0 ? (
          <EmptyState
            title="No roles published yet"
            description="Professional history is added through the console only when it can be verified. Project work is available in the meantime."
            action={<Button to="/work">See the work</Button>}
          />
        ) : (
          <div className="timeline">
            {roles.map((role, index) => (
              <Reveal key={role.id} delay={index * 60} className="timeline-item">
                <p className="timeline-period">
                  {role.start_date} — {role.is_current ? 'Present' : role.end_date || '—'}
                </p>
                <h2 className="timeline-role">{role.position}</h2>
                <p className="timeline-org">
                  {role.organization}
                  {role.location ? ` · ${role.location}` : ''}
                </p>
                <p className="timeline-body">{role.description}</p>
                {role.technologies?.length ? (
                  <div className="tag-row">
                    {role.technologies.map((tech) => (
                      <Tag key={tech}>{tech}</Tag>
                    ))}
                  </div>
                ) : null}
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ── Services ───────────────────────────────────────────────────────── */

export function Services() {
  const { data, loading, error, reload } = useQuery<Service[]>('/services');

  useDocumentMeta({
    title: 'Services',
    description: 'Full-stack product engineering, interface development, performance work and Web3 integration.',
  });

  const services = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Engagements, scoped precisely."
        lede="Clear deliverables, honest estimates and code you can maintain after handover."
      />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : services.length === 0 ? (
          <EmptyState title="Services are being finalised" />
        ) : (
          <div className="service-list">
            {services.map((service, index) => (
              <Reveal key={service.id} delay={index * 50} className="service-row">
                <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2 className="service-title">{service.title}</h2>
                  <p className="project-summary" style={{ marginTop: '0.4rem' }}>
                    {service.summary}
                  </p>
                </div>
                <div className="service-body">
                  <p>{service.description || service.summary}</p>
                  {service.features?.length ? (
                    <div className="service-features">
                      {service.features.map((feature) => (
                        <Tag key={feature}>{feature}</Tag>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <div className="cta-panel" style={{ marginTop: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <Eyebrow>Availability</Eyebrow>
          <h2 className="display-2">Need a second opinion before you build?</h2>
          <p className="lede">
            A short technical review of an existing product often saves weeks. Send the repository and the goal.
          </p>
          <div className="cta-actions">
            <Button to="/contact">Request a review</Button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Education ──────────────────────────────────────────────────────── */

export function Education() {
  const { data, loading, error, reload } = useQuery<EducationType[]>('/education');

  useDocumentMeta({ title: 'Education', description: 'Academic background and formal training.' });

  const entries = data ?? [];

  return (
    <>
      <PageHeader eyebrow="Education" title="Foundations." lede="Formal study and continued technical training." />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Education records are not published"
            description="Academic details are added only when verified. The skills map shows the working knowledge instead."
            action={<Button to="/skills">View skills</Button>}
          />
        ) : (
          <div className="work-grid">
            {entries.map((entry, index) => (
              <Reveal key={entry.id} delay={index * 60}>
                <article className="surface" style={{ padding: '1.6rem', height: '100%' }}>
                  <div className="project-card-top">
                    <Badge tone="muted">{entry.start_date} — {entry.end_date || 'Present'}</Badge>
                  </div>
                  <h2 className="project-title" style={{ marginTop: '0.7rem' }}>
                    {entry.qualification}
                  </h2>
                  <p className="project-summary">
                    {entry.institution}
                    {entry.field ? ` · ${entry.field}` : ''}
                  </p>
                  {entry.description ? <p className="project-summary">{entry.description}</p> : null}
                  {entry.location ? <p className="card-meta">{entry.location}</p> : null}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ── Achievements ───────────────────────────────────────────────────── */

export function Achievements() {
  const { data, loading, error, reload } = useQuery<Achievement[]>('/achievements');

  useDocumentMeta({ title: 'Achievements', description: 'Verified milestones and recognition.' });

  const items = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Achievements"
        title="Milestones, earned."
        lede="Only verifiable milestones are listed. Nothing is invented for the sake of a fuller page."
      />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing published here yet"
            description="Achievements are added through the console when they can be evidenced."
          />
        ) : (
          <div className="timeline">
            {items.map((item, index) => (
              <Reveal key={item.id} delay={index * 50} className="timeline-item">
                <p className="timeline-period">{item.achieved_at || '—'}</p>
                <h2 className="timeline-role">{item.title}</h2>
                <p className="timeline-org">{item.organization}</p>
                <p className="timeline-body">{item.description}</p>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ── Certifications ─────────────────────────────────────────────────── */

export function Certifications() {
  const { data, loading, error, reload } = useQuery<Certification[]>('/certifications');

  useDocumentMeta({ title: 'Certifications', description: 'Verified certifications and credentials.' });

  const items = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Certifications"
        title="Credentials."
        lede="Certifications are listed with issuer and verification links — never as decorative badges."
      />
      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {loading ? (
          <Skeleton lines={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No certifications published"
            description="This space stays empty until a credential can be verified with a public link."
          />
        ) : (
          <div className="work-grid">
            {items.map((item, index) => (
              <Reveal key={item.id} delay={index * 60}>
                <article className="surface" style={{ padding: '1.6rem', height: '100%' }}>
                  <div className="project-card-top">
                    <Badge tone="muted">{item.issued_at || 'Credential'}</Badge>
                  </div>
                  <h2 className="project-title" style={{ marginTop: '0.7rem' }}>
                    {item.name}
                  </h2>
                  <p className="project-summary">{item.issuer}</p>
                  {item.description ? <p className="project-summary">{item.description}</p> : null}
                  {item.credential_url ? (
                    <div className="card-links">
                      <a href={item.credential_url} target="_blank" rel="noreferrer noopener">
                        Verify credential
                      </a>
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

/* ── Resume ─────────────────────────────────────────────────────────── */

export function Resume() {
  const { settings } = useSite();
  const resume = useQuery<ResumeRecord | null>('/resume');
  const experience = useQuery<ExperienceType[]>('/experience');
  const education = useQuery<EducationType[]>('/education');
  const skills = useQuery<Skill[]>('/skills');

  useDocumentMeta({
    title: 'Résumé',
    description: `Résumé of ${settings.profile.name}, ${settings.profile.title} based in ${settings.profile.location}.`,
  });

  const roles = experience.data ?? [];
  const studies = education.data ?? [];
  const skillList = skills.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Résumé"
        title="The short version."
        lede="Download the document, or read the same record here — it is generated from the same data the rest of the site uses."
      >
        <div className="hero-actions">
          {resume.data ? (
            <Button href={resume.data.url} icon={<ArrowLink to="/contact">Contact</ArrowLink>}>
              Download PDF
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            Print / save as PDF
          </Button>
          <Button to="/contact" variant="outline">
            Contact
          </Button>
        </div>
      </PageHeader>

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {resume.loading ? <Skeleton lines={4} /> : null}

        <div className="surface" style={{ padding: 'clamp(1.5rem, 3vw, 2.4rem)' }}>
          <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
            <div>
              <Eyebrow>Curriculum vitae</Eyebrow>
              <h2 className="display-2" style={{ marginBottom: '0.2rem' }}>
                {settings.profile.name}
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {settings.profile.title} · {settings.profile.location} · {settings.profile.email}
              </p>
            </div>
          </div>

          <div className="prose">
            <p>{settings.profile.bio || settings.profile.shortBio}</p>
          </div>

          {roles.length > 0 ? (
            <>
              <h3 className="skill-cat" style={{ marginTop: '2rem' }}>
                Experience
              </h3>
              <div className="timeline" style={{ marginTop: '1rem' }}>
                {roles.map((role) => (
                  <div key={role.id} className="timeline-item">
                    <p className="timeline-period">
                      {role.start_date} — {role.is_current ? 'Present' : role.end_date || '—'}
                    </p>
                    <p className="timeline-role" style={{ fontSize: '1.2rem' }}>
                      {role.position} · {role.organization}
                    </p>
                    <p className="timeline-body">{role.description}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {studies.length > 0 ? (
            <>
              <h3 className="skill-cat" style={{ marginTop: '2rem' }}>
                Education
              </h3>
              <div style={{ display: 'grid', gap: '0.9rem', marginTop: '0.8rem' }}>
                {studies.map((entry) => (
                  <div key={entry.id}>
                    <p className="quote-name">
                      {entry.qualification} — {entry.institution}
                    </p>
                    <p className="quote-role">
                      {entry.start_date} — {entry.end_date || 'Present'}
                      {entry.field ? ` · ${entry.field}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {skillList.length > 0 ? (
            <>
              <h3 className="skill-cat" style={{ marginTop: '2rem' }}>
                Technical skills
              </h3>
              <div className="tag-row" style={{ marginTop: '0.8rem' }}>
                {skillList.map((skill) => (
                  <Tag key={skill.id}>{skill.name}</Tag>
                ))}
              </div>
            </>
          ) : null}

          {resume.data ? (
            <p className="field-hint" style={{ marginTop: '2rem' }}>
              Uploaded {formatDate(resume.data.created_at)} · {resume.data.original_name}
            </p>
          ) : (
            <p className="field-hint" style={{ marginTop: '2rem' }}>
              No PDF has been uploaded yet. The record above is the live source of truth and can be printed from this
              page.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
