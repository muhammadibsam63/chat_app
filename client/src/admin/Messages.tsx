import { useMemo, useState } from 'react';
import { Archive, Check, Mail, Search, Trash2 } from 'lucide-react';
import { api, ApiClientError, queryString } from '../lib/api';
import { formatDate, useQuery } from '../lib/hooks';
import type { ContactMessage } from '../lib/types';
import { useRealtime } from './RealtimeContext';

const STATUSES = ['all', 'new', 'read', 'archived'] as const;

export default function Messages() {
  const { pulse } = useRealtime();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const path = `/admin/content/messages${queryString({ limit: 100, q: search })}`;
  const { data, loading, error: loadError, reload } = useQuery<ContactMessage[]>(path, [pulse]);

  const messages = useMemo(() => {
    const rows = data ?? [];
    return status === 'all' ? rows : rows.filter((row) => row.status === status);
  }, [data, status]);

  const selected = useMemo(() => {
    if (selectedId) return messages.find((row) => row.id === selectedId) ?? null;
    return messages[0] ?? null;
  }, [messages, selectedId]);

  async function setStatusFor(id: string, next: string) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/content/messages/${id}`, { status: next });
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update message');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this message permanently?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.del(`/admin/content/messages/${id}`);
      setSelectedId(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to delete message');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Operations</p>
          <h1>Messages</h1>
          <p className="admin-muted">{messages.length} shown · live inbox</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <Search size={14} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search sender, subject or body"
            aria-label="Search messages"
          />
        </form>
        <div className="admin-chips">
          {STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              className={`admin-chip${status === option ? ' is-active' : ''}`}
              onClick={() => setStatus(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {(error || loadError) && <p className="admin-error">{error ?? loadError}</p>}

      <div className="admin-split">
        <section className="admin-card admin-inbox">
          {loading && messages.length === 0 ? (
            <p className="admin-empty">Loading inbox…</p>
          ) : messages.length === 0 ? (
            <p className="admin-empty">No messages in this view.</p>
          ) : (
            <ul className="admin-inbox-list">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className={`admin-inbox-item${selected?.id === message.id ? ' is-active' : ''}${
                      message.status === 'new' ? ' is-unread' : ''
                    }`}
                    onClick={() => setSelectedId(message.id)}
                  >
                    <div className="admin-inbox-top">
                      <strong>{message.name}</strong>
                      <time>{formatDate(message.created_at)}</time>
                    </div>
                    <p>{message.subject || 'No subject'}</p>
                    <span className="admin-inbox-preview">{message.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card admin-reader">
          {!selected ? (
            <p className="admin-empty">Select a message to read it.</p>
          ) : (
            <>
              <header className="admin-reader-head">
                <div>
                  <h2>{selected.subject || 'No subject'}</h2>
                  <p>
                    {selected.name} · <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </p>
                  <span className="admin-muted">{formatDate(selected.created_at)}</span>
                </div>
                <span className={`admin-tag admin-tag--${selected.status}`}>{selected.status}</span>
              </header>

              <div className="admin-reader-body">{selected.message}</div>

              <footer className="admin-reader-foot">
                {selected.status !== 'read' && (
                  <button type="button" className="admin-ghost" disabled={busy} onClick={() => void setStatusFor(selected.id, 'read')}>
                    <Check size={14} /> Mark read
                  </button>
                )}
                {selected.status !== 'archived' && (
                  <button
                    type="button"
                    className="admin-ghost"
                    disabled={busy}
                    onClick={() => void setStatusFor(selected.id, 'archived')}
                  >
                    <Archive size={14} /> Archive
                  </button>
                )}
                <a className="admin-primary" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject ?? '')}`}>
                  <Mail size={14} /> Reply
                </a>
                <button type="button" className="admin-danger" disabled={busy} onClick={() => void remove(selected.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
