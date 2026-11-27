import { useState, type FormEvent } from 'react';
import { KeyRound, Plus, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { formatDate, useQuery } from '../lib/hooks';
import type { AdminUser } from '../lib/types';

interface SessionRecord {
  id: string;
  created_at: string;
  expires_at: string;
  ip?: string | null;
  user_agent?: string | null;
}

interface RoleRecord {
  name: string;
  description: string;
  permissions: string[];
}

interface ActivityEntry {
  id: string;
  action: string;
  entity?: string | null;
  created_at: string;
  user_name?: string | null;
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0b0f16] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#f5c542]/60 focus:outline-none';

export default function SecurityPanel() {
  const { user } = useAuthSafe();
  const sessions = useQuery<SessionRecord[]>('/auth/sessions');
  const users = useQuery<AdminUser[]>('/admin/users');
  const roles = useQuery<RoleRecord[]>('/admin/roles');
  const activity = useQuery<ActivityEntry[]>('/admin/activity');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'editor' });

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/auth/password', { currentPassword, newPassword });
      setNotice('Password updated. Other sessions were invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      sessions.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to change password');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await api.del(`/auth/sessions/${id}`);
      sessions.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to revoke session');
    }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/users', newUser);
      setNotice('Team member created');
      setNewUser({ name: '', email: '', password: '', role: 'editor' });
      users.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create user');
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(id: string, payload: Record<string, unknown>) {
    setError(null);
    try {
      await api.patch(`/admin/users/${id}`, payload);
      users.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update user');
    }
  }

  async function removeUser(id: string) {
    if (!window.confirm('Delete this account? Their sessions end immediately.')) return;
    setError(null);
    try {
      await api.del(`/admin/users/${id}`);
      users.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to delete user');
    }
  }

  const currentSessionId = String(sessions.meta.current ?? '');

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Operations</p>
          <h1>Security</h1>
          <p className="admin-muted">Account, sessions, team access and audit trail.</p>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}

      <div className="admin-columns">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <KeyRound size={15} /> Change password
            </h2>
          </div>
          <form className="admin-form" onSubmit={changePassword}>
            <label className="admin-field--wide">
              <span>Current password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="admin-field--wide">
              <span>New password</span>
              <input
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
              />
              <small>At least 10 characters, hashed with bcrypt before storage.</small>
            </label>
            <button type="submit" className="admin-primary" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <ShieldCheck size={15} /> Active sessions
            </h2>
            <span className="admin-muted">{sessions.data?.length ?? 0} open</span>
          </div>
          {(sessions.data ?? []).length === 0 ? (
            <p className="admin-empty">No other sessions.</p>
          ) : (
            <ul className="admin-list">
              {(sessions.data ?? []).map((session) => (
                <li key={session.id}>
                  <div>
                    <p className="admin-list-title">
                      {session.id === currentSessionId ? 'This device' : session.ip ?? 'Unknown device'}
                    </p>
                    <span className="admin-list-sub">
                      Started {formatDate(session.created_at)} · expires {formatDate(session.expires_at)}
                    </span>
                  </div>
                  {session.id !== currentSessionId && (
                    <button type="button" className="admin-ghost" onClick={() => void revoke(session.id)}>
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Team access</h2>
          <span className="admin-muted">{(users.data ?? []).length} accounts</span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>
                    <select
                      value={account.role}
                      onChange={(event) => void patchUser(account.id, { role: event.target.value })}
                      className="admin-select-inline"
                      aria-label={`Role for ${account.name}`}
                    >
                      {(roles.data ?? [{ name: 'admin' }, { name: 'editor' }, { name: 'viewer' }] as RoleRecord[]).map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`admin-tag ${account.isActive ? 'admin-tag--read' : 'admin-tag--archived'}`}>
                      {account.isActive ? 'active' : 'disabled'}
                    </span>
                  </td>
                  <td className="admin-row-actions">
                    <button
                      type="button"
                      onClick={() => void patchUser(account.id, { isActive: !account.isActive })}
                      aria-label={account.isActive ? 'Disable account' : 'Enable account'}
                    >
                      <UserX size={14} />
                    </button>
                    {account.id !== user?.id && (
                      <button type="button" onClick={() => void removeUser(account.id)} aria-label="Delete account">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="admin-inline-form" onSubmit={createUser}>
          <input
            required
            placeholder="Full name"
            value={newUser.name}
            onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
            className={inputClass}
          />
          <input
            required
            type="password"
            minLength={10}
            placeholder="Temporary password"
            value={newUser.password}
            onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
            className={inputClass}
          />
          <select
            value={newUser.role}
            onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
            className={inputClass}
            aria-label="New account role"
          >
            {(roles.data ?? []).map((role) => (
              <option key={role.name} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-primary" disabled={busy}>
            <Plus size={15} /> Add
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Audit log</h2>
          <span className="admin-muted">Most recent 50 events</span>
        </div>
        {(activity.data ?? []).length === 0 ? (
          <p className="admin-empty">No activity recorded yet.</p>
        ) : (
          <ul className="admin-feed">
            {(activity.data ?? []).slice(0, 50).map((entry) => (
              <li key={entry.id}>
                <span className="admin-feed-dot" />
                <div>
                  <p>{entry.action.replace(/[._]/g, ' ')}</p>
                  <span>
                    {entry.user_name ? `${entry.user_name} · ` : ''}
                    {entry.entity ?? 'system'} · {formatDate(entry.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Local re-export so this panel does not import the shell (circular import). */
function useAuthSafe(): { user: AdminUser | null } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./AuthContext').useAuth() as { user: AdminUser | null };
  } catch {
    return { user: null };
  }
}
