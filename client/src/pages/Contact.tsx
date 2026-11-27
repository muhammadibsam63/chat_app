import { useState, type FormEvent } from 'react';
import { Mail, MapPin, Send, Timer } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { useDocumentMeta } from '../lib/hooks';
import { useSite } from '../lib/site';
import { Alert, Button, Eyebrow, Field, PageHeader, Reveal } from '../components/ui';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  company: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const EMPTY: FormState = { name: '', email: '', subject: '', message: '', company: '' };

function validate(values: FormState): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = 'Please tell me your name.';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'A valid email address is required.';
  if (values.subject.trim().length < 3) errors.subject = 'A short subject helps me route this.';
  if (values.message.trim().length < 20) errors.message = 'At least 20 characters, please — context matters.';
  return errors;
}

export default function Contact() {
  const { settings } = useSite();
  const [values, setValues] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useDocumentMeta({
    title: 'Contact',
    description: 'Start a project conversation with Muhammad Ibsam — full-stack web development from Karachi, Pakistan.',
  });

  const update = (key: keyof FormState, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await api.post('/contact', {
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
        company: values.company,
      });
      setSent(true);
      setValues(EMPTY);
    } catch (error) {
      if (error instanceof ApiClientError) {
        const details = error.details as { fields?: Record<string, string> } | undefined;
        if (details?.fields) {
          setErrors(details.fields as Errors);
        }
        setServerError(error.message);
      } else {
        setServerError('The message could not be sent. Please try again, or email directly.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Contact" title={settings.contact.heading} lede={settings.contact.blurb} />

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className="contact-layout">
          <Reveal>
            {sent ? (
              <div className="surface" style={{ padding: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
                <Eyebrow>Message received</Eyebrow>
                <h2 className="display-2">Thank you — it is in the queue.</h2>
                <p className="lede">
                  Your message is stored securely and the notification is on its way. Expect a reply{' '}
                  {settings.contact.responseTime.toLowerCase()}.
                </p>
                <div style={{ marginTop: '1.4rem', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                  <Button to="/work">Browse the work</Button>
                  <Button variant="outline" onClick={() => setSent(false)}>
                    Send another message
                  </Button>
                </div>
              </div>
            ) : (
              <form className="surface contact-form" onSubmit={onSubmit} noValidate>
                <div className="form-grid">
                  <Field label="Your name" htmlFor="contact-name" error={errors.name}>
                    <input
                      id="contact-name"
                      className="input"
                      name="name"
                      autoComplete="name"
                      value={values.name}
                      onChange={(event) => update('name', event.target.value)}
                      aria-invalid={Boolean(errors.name)}
                      required
                    />
                  </Field>
                  <Field label="Email address" htmlFor="contact-email" error={errors.email}>
                    <input
                      id="contact-email"
                      className="input"
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={values.email}
                      onChange={(event) => update('email', event.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      required
                    />
                  </Field>
                </div>

                <Field label="Subject" htmlFor="contact-subject" error={errors.subject}>
                  <input
                    id="contact-subject"
                    className="input"
                    name="subject"
                    value={values.subject}
                    onChange={(event) => update('subject', event.target.value)}
                    aria-invalid={Boolean(errors.subject)}
                    required
                  />
                </Field>

                <Field
                  label="Project details"
                  htmlFor="contact-message"
                  hint="Scope, stack, constraints and timeline — whatever you already know."
                  error={errors.message}
                >
                  <textarea
                    id="contact-message"
                    className="textarea"
                    name="message"
                    rows={7}
                    value={values.message}
                    onChange={(event) => update('message', event.target.value)}
                    aria-invalid={Boolean(errors.message)}
                    required
                  />
                </Field>

                {/* Honeypot: hidden from users and assistive tech, catches naive bots. */}
                <div className="honeypot" aria-hidden="true">
                  <label htmlFor="contact-company">Company</label>
                  <input
                    id="contact-company"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.company}
                    onChange={(event) => update('company', event.target.value)}
                  />
                </div>

                {serverError ? <Alert tone="error">{serverError}</Alert> : null}

                <div className="form-actions">
                  <Button type="submit" loading={submitting} icon={<Send size={15} aria-hidden />}>
                    {submitting ? 'Sending' : 'Send message'}
                  </Button>
                  <span className="field-hint">Your details are never shared or sold.</span>
                </div>
              </form>
            )}
          </Reveal>

          <aside className="contact-aside">
            <div className="surface" style={{ padding: '1.5rem' }}>
              <Eyebrow>Direct</Eyebrow>
              <ul className="contact-list">
                <li>
                  <Mail size={15} aria-hidden />
                  <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>
                </li>
                <li>
                  <MapPin size={15} aria-hidden />
                  <span>{settings.contact.location}</span>
                </li>
                <li>
                  <Timer size={15} aria-hidden />
                  <span>{settings.contact.responseTime}</span>
                </li>
              </ul>
            </div>
            <div className="surface" style={{ padding: '1.5rem' }}>
              <Eyebrow>Good fit</Eyebrow>
              <ul className="contact-list contact-list--plain">
                <li>Full-stack product builds</li>
                <li>Interface systems and design engineering</li>
                <li>Web3 and blockchain integrations</li>
                <li>Performance and accessibility remediation</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
