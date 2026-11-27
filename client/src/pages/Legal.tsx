import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../lib/hooks';
import { useSite } from '../lib/site';
import { ArrowLink, Button, Eyebrow, PageHeader } from '../components/ui';

function LegalBody({ sections }: { sections: Array<{ heading: string; body: string[] }> }) {
  return (
    <div className="prose prose--article">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function Privacy() {
  const { settings } = useSite();
  useDocumentMeta({ title: 'Privacy Policy', description: 'How this site handles data, analytics and contact messages.' });

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        lede="What is collected, why it exists and how long it is kept. Written to be read, not to hide behind."
      />
      <section className="shell shell--narrow" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <LegalBody
          sections={[
            {
              heading: 'What is collected',
              body: [
                'When you submit the contact form, the name, email address, subject and message you provide are stored so the enquiry can be answered. The submission time and a coarse request fingerprint are recorded to prevent spam.',
                'Page views are recorded in aggregate — path, referrer and timestamp. No advertising identifiers, cross-site trackers or third-party analytics scripts are used.',
              ],
            },
            {
              heading: 'How it is used',
              body: [
                'Contact messages are used solely to reply to your enquiry. Aggregate analytics are used to understand which pages are useful so the site can be improved.',
                `Your data is never sold, rented or shared with third parties for marketing. If you would prefer your message deleted after it has been answered, email ${settings.profile.email} and it will be removed.`,
              ],
            },
            {
              heading: 'Cookies and storage',
              body: [
                'The public site sets no advertising cookies. A session cookie is issued only after an administrator signs in to the content console; it is HTTP-only, SameSite-protected and expires automatically.',
                'Browser storage is limited to interface preferences such as reduced-motion detection, which never leaves your device.',
              ],
            },
            {
              heading: 'Retention and security',
              body: [
                'Contact messages are retained while they are operationally useful and can be archived or deleted at any time through the administration console.',
                'Access to stored data is restricted to authenticated administrators. Passwords are hashed, sessions are validated server-side and administrative actions are logged.',
              ],
            },
            {
              heading: 'Your rights',
              body: [
                `You may request access to, correction of, or deletion of any data associated with your enquiry by writing to ${settings.profile.email}. Requests are answered within a reasonable period.`,
              ],
            },
          ]}
        />
        <div style={{ marginTop: '2rem' }}>
          <ArrowLink to="/legal/terms">Read the terms of use</ArrowLink>
        </div>
      </section>
    </>
  );
}

export function Terms() {
  const { settings } = useSite();
  useDocumentMeta({ title: 'Terms & Conditions', description: 'Terms covering the use of this website and its content.' });

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms & conditions"
        lede="The practical rules for using this site and the material published on it."
      />
      <section className="shell shell--narrow" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <LegalBody
          sections={[
            {
              heading: 'Use of this site',
              body: [
                'This website is the portfolio and engineering notebook of Muhammad Ibsam. You may read, link to and quote short excerpts with attribution.',
                'Automated scraping at a volume that degrades service, attempts to bypass authentication, or any use intended to disrupt the site is not permitted.',
              ],
            },
            {
              heading: 'Intellectual property',
              body: [
                'Written content, interface design and source code published here remain the property of their author unless stated otherwise. Project names and client marks belong to their respective owners.',
                'Code shared in public repositories is governed by the licence declared in that repository.',
              ],
            },
            {
              heading: 'No warranty',
              body: [
                'Content is provided for information only. Technical write-ups describe decisions made in a specific context and are not a guarantee of fitness for another project.',
                'The site is provided "as is" without warranties of any kind, to the extent permitted by law.',
              ],
            },
            {
              heading: 'Engagements',
              body: [
                'Nothing on this site constitutes a binding offer. Any professional engagement is governed exclusively by a separate written agreement covering scope, fees, ownership and confidentiality.',
              ],
            },
            {
              heading: 'Contact',
              body: [`Questions about these terms can be sent to ${settings.profile.email}.`],
            },
          ]}
        />
        <div style={{ marginTop: '2rem' }}>
          <ArrowLink to="/legal/privacy">Read the privacy policy</ArrowLink>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  useDocumentMeta({ title: 'Page not found', description: 'This page does not exist.' });

  return (
    <section className="shell notfound">
      <Eyebrow>Error 404</Eyebrow>
      <h1 className="display-hero">
        Off the <em>grid</em>.
      </h1>
      <p className="lede lede--wide">
        This route does not exist — or it moved. The work, the writing and the contact form are all still one click away.
      </p>
      <div className="hero-actions">
        <Button to="/">Return home</Button>
        <Button to="/work" variant="outline">
          Browse the work
        </Button>
      </div>
      <div className="notfound-links">
        <Link to="/about">About</Link>
        <Link to="/writing">Writing</Link>
        <Link to="/lab">Lab</Link>
        <Link to="/resume">Résumé</Link>
        <Link to="/contact">Contact</Link>
      </div>
    </section>
  );
}
