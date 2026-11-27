import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api, ApiClientError, queryString } from '../lib/api';
import { useQuery } from '../lib/hooks';
import { useRealtime } from './RealtimeContext';

type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'json' | 'date' | 'select' | 'url';

interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  options?: string[];
  hint?: string;
  min?: number;
  max?: number;
}

type Row = Record<string, unknown>;

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0b0f16] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#f5c542]/60 focus:outline-none';

function toDraft(fields: FieldDef[], row: Row | null): Row {
  const draft: Row = {};
  for (const field of fields) {
    const value = row ? row[field.name] : undefined;
    if (field.type === 'boolean') draft[field.name] = Boolean(value);
    else if (field.type === 'number') draft[field.name] = value === undefined || value === null ? 0 : Number(value);
    else if (field.type === 'json') {
      draft[field.name] = value === undefined || value === null ? '[]' : JSON.stringify(value, null, 2);
    } else draft[field.name] = value === undefined || value === null ? '' : String(value);
  }
  return draft;
}

function displayValue(field: FieldDef, row: Row): string {
  const value = row[field.name];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  const text = String(value);
  return text.length > 64 ? `${text.slice(0, 61)}…` : text;
}

function rowTitle(row: Row): string {
  for (const key of ['title', 'name', 'position', 'label', 'slug', 'subject', 'id']) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return 'Record';
}

interface EditorProps {
  resource: string;
  fields: FieldDef[];
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}

function Editor({ resource, fields, row, onClose, onSaved }: EditorProps) {
  const [draft, setDraft] = useState<Row>(() => toDraft(fields, row));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(name: string, value: unknown) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const raw = draft[field.name];
        if (field.type === 'boolean') payload[field.name] = Boolean(raw);
        else if (field.type === 'number') payload[field.name] = raw === '' || raw === null ? 0 : Number(raw);
        else if (field.type === 'json') {
          const text = String(raw ?? '').trim();
          payload[field.name] = text === '' ? [] : JSON.parse(text);
        } else {
          const text = String(raw ?? '').trim();
          payload[field.name] = text === '' ? null : text;
        }
      }
      if (row?.id) await api.patch(`/admin/content/${resource}/${String(row.id)}`, payload);
      else await api.post(`/admin/content/${resource}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to save this record');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal" role="dialog" aria-modal="true">
      <button type="button" className="admin-modal-scrim" aria-label="Close editor" onClick={onClose} />
      <div className="admin-modal-body">
        <header className="admin-modal-head">
          <h2>{row ? `Edit ${rowTitle(row)}` : `New record`}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="admin-form">
          {fields.map((field) => (
            <label key={field.name} className={field.type === 'textarea' || field.type === 'json' ? 'admin-field--wide' : ''}>
              <span>
                {field.label}
                {field.required && <em> *</em>}
              </span>
              {field.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(draft[field.name])}
                  onChange={(event) => update(field.name, event.target.checked)}
                  className="admin-checkbox"
                />
              ) : field.type === 'textarea' || field.type === 'json' ? (
                <textarea
                  rows={field.type === 'json' ? 5 : 4}
                  value={String(draft[field.name] ?? '')}
                  onChange={(event) => update(field.name, event.target.value)}
                  className={`${inputClass} font-mono text-xs`}
                  maxLength={field.maxLength}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(draft[field.name] ?? '')}
                  onChange={(event) => update(field.name, event.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={String(draft[field.name] ?? '')}
                  min={field.min}
                  max={field.max}
                  maxLength={field.maxLength}
                  onChange={(event) => update(field.name, event.target.value)}
                  className={inputClass}
                />
              )}
              {field.hint && <small>{field.hint}</small>}
            </label>
          ))}
        </div>

        {error && <p className="admin-error">{error}</p>}

        <footer className="admin-modal-foot">
          <button type="button" className="admin-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : row ? 'Save changes' : 'Create record'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function ContentManager() {
  const { resource = 'projects' } = useParams();
  const { pulse } = useRealtime();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setSearchInput('');
    setEditing(null);
    setCreating(false);
  }, [resource]);

  const path = `/admin/content/${resource}${queryString({ page, limit: 20, q: search })}`;
  const { data, meta, loading, error: loadError, reload } = useQuery<Row[]>(path, [pulse]);

  const fields = useMemo<FieldDef[]>(() => (meta.fields as FieldDef[] | undefined) ?? [], [meta.fields]);
  const label = String(meta.label ?? resource);
  const total = Number(meta.total ?? 0);
  const pages = Math.max(1, Number(meta.pages ?? 1));
  const rows = data ?? [];
  const columns = fields.filter((field) => field.type !== 'textarea' && field.type !== 'json').slice(0, 5);

  async function remove(row: Row) {
    if (!row.id) return;
    if (!window.confirm(`Delete this record permanently? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.del(`/admin/content/${resource}/${String(row.id)}`);
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Content</p>
          <h1>{label}</h1>
          <p className="admin-muted">{total} record{total === 1 ? '' : 's'}</p>
        </div>
        <button type="button" className="admin-primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> New
        </button>
      </header>

      <div className="admin-toolbar">
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <Search size={14} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            aria-label={`Search ${label}`}
          />
        </form>
        <button type="button" className="admin-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      {(error || loadError) && <p className="admin-error">{error ?? loadError}</p>}

      {loading && rows.length === 0 ? (
        <p className="admin-empty">Loading records…</p>
      ) : rows.length === 0 ? (
        <p className="admin-empty">No records found. Create the first one.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((field) => (
                  <th key={field.name}>{field.label}</th>
                ))}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  {columns.map((field) => (
                    <td key={field.name}>{displayValue(field, row)}</td>
                  ))}
                  <td className="admin-row-actions">
                    <button type="button" onClick={() => setEditing(row)} aria-label="Edit record">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => void remove(row)} aria-label="Delete record">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="admin-ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className="admin-ghost" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </div>
      )}

      {(creating || editing) && fields.length > 0 && (
        <Editor
          resource={resource}
          fields={fields}
          row={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={reload}
        />
      )}
    </div>
  );
}
