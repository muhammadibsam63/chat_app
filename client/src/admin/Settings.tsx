import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { useQuery } from '../lib/hooks';

type Section = Record<string, unknown>;
type SettingsData = Record<string, Section>;

const SECTIONS: Array<{ key: string; title: string; hint: string }> = [
  { key: 'profile', title: 'Profile', hint: 'Identity, biography and availability shown across the site.' },
  { key: 'socials', title: 'Social links', hint: 'Full URLs. Leave a field empty to hide that icon.' },
  { key: 'seo', title: 'SEO & metadata', hint: 'Default title, description and social preview image.' },
  { key: 'contact', title: 'Contact', hint: 'How visitors reach you, and the response promise.' },
  { key: 'footer', title: 'Footer', hint: 'Closing note and legal line.' },
];

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0b0f16] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#f5c542]/60 focus:outline-none';

function labelFor(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase());
}

function isNested(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function SettingsPanel() {
  const { data, loading, error: loadError, reload } = useQuery<SettingsData>('/admin/settings');
  const [draft, setDraft] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  function update(section: string, key: string, value: unknown) {
    setDraft((current) => (current ? { ...current, [section]: { ...current[section], [key]: value } } : current));
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload: SettingsData = {};
      for (const section of SECTIONS) {
        if (draft[section.key]) payload[section.key] = draft[section.key];
      }
      await api.put('/admin/settings', payload);
      setNotice('Settings saved. The public site now reflects these values.');
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to save settings');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !draft) return <p className="admin-empty">Loading settings…</p>;
  if (loadError) return <p className="admin-empty admin-empty--error">{loadError}</p>;
  if (!draft) return <p className="admin-empty">No settings available.</p>;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Operations</p>
          <h1>Site settings</h1>
          <p className="admin-muted">Content stored in the database and served through the public API.</p>
        </div>
        <button type="button" className="admin-primary" onClick={() => void save()} disabled={busy}>
          <Save size={15} /> {busy ? 'Saving…' : 'Save settings'}
        </button>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}

      {SECTIONS.map((section) => {
        const values = draft[section.key] ?? {};
        return (
          <section key={section.key} className="admin-card">
            <div className="admin-card-head">
              <h2>{section.title}</h2>
              <span className="admin-muted">{section.hint}</span>
            </div>
            <div className="admin-form">
              {Object.entries(values).map(([key, value]) => {
                if (isNested(value)) {
                  return (
                    <label key={key} className="admin-field--wide">
                      <span>{labelFor(key)} (JSON)</span>
                      <textarea
                        rows={4}
                        className={`${inputClass} font-mono text-xs`}
                        value={JSON.stringify(value, null, 2)}
                        onChange={(event) => {
                          try {
                            update(section.key, key, JSON.parse(event.target.value));
                          } catch {
                            /* keep the previous parsed value while typing */
                          }
                        }}
                      />
                    </label>
                  );
                }
                if (Array.isArray(value)) {
                  return (
                    <label key={key} className="admin-field--wide">
                      <span>{labelFor(key)} — one per line</span>
                      <textarea
                        rows={4}
                        className={inputClass}
                        value={value.map((entry) => String(entry)).join('\n')}
                        onChange={(event) =>
                          update(
                            section.key,
                            key,
                            event.target.value
                              .split('\n')
                              .map((line) => line.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </label>
                  );
                }
                if (typeof value === 'boolean') {
                  return (
                    <label key={key}>
                      <span>{labelFor(key)}</span>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={value}
                        onChange={(event) => update(section.key, key, event.target.checked)}
                      />
                    </label>
                  );
                }
                const text = value === null || value === undefined ? '' : String(value);
                const long = text.length > 90;
                return (
                  <label key={key} className={long ? 'admin-field--wide' : ''}>
                    <span>{labelFor(key)}</span>
                    {long ? (
                      <textarea
                        rows={4}
                        className={inputClass}
                        value={text}
                        onChange={(event) => update(section.key, key, event.target.value)}
                      />
                    ) : (
                      <input
                        className={inputClass}
                        value={text}
                        onChange={(event) => update(section.key, key, event.target.value)}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
