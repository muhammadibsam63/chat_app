import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Bell,
  Briefcase,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  Image as ImageIcon,
  Inbox,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Newspaper,
  Quote,
  Settings as SettingsIcon,
  ShieldCheck,
  Trophy,
  Wrench,
  X,
} from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { useQuery } from '../lib/hooks';
import './admin.css';
import { AuthProvider, useAuth } from './AuthContext';
import { RealtimeProvider, useRealtime } from './RealtimeContext';
import Overview from './Overview';
import ContentManager from './Content';
import Messages from './Messages';
import MediaLibrary from './Media';
import SettingsPanel from './Settings';
import SecurityPanel from './Security';

const CONTENT_LINKS = [
  { resource: 'projects', label: 'Projects', icon: FolderKanban },
  { resource: 'blog-posts', label: 'Blog', icon: Newspaper },
  { resource: 'skills', label: 'Skills', icon: Wrench },
  { resource: 'experience', label: 'Experience', icon: Briefcase },
  { resource: 'education', label: 'Education', icon: GraduationCap },
  { resource: 'certifications', label: 'Certifications', icon: Award },
  { resource: 'achievements', label: 'Achievements', icon: Trophy },
  { resource: 'services', label: 'Services', icon: Layers },
  { resource: 'testimonials', label: 'Testimonials', icon: Quote },
];

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-[#0b0f16] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#f5c542]/60 focus:outline-none';

function BootScreen({ label }: { label: string }) {
  return (
    <div className="admin-boot">
      <div className="admin-boot-mark">IBSAM®</div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
        <Loader2 size={14} className="animate-spin" /> {label}
      </div>
    </div>
  );
}

function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="auth-screen">
      <div className="auth-glow" aria-hidden="true" />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link to="/" className="auth-brand">
          IBSAM<span>®</span>
        </Link>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </motion.div>
    </div>
  );
}

function LoginScreen() {
  const { login, needsSetup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Console access" subtitle="Authenticate to manage the IBSAM® ecosystem.">
      {needsSetup && (
        <div className="mb-5 rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10 px-4 py-3 text-xs text-[#f5c542]">
          No administrator exists yet. Start with first-run setup.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs uppercase tracking-[0.2em] text-white/45">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${fieldClass} mt-2`}
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-white/45">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${fieldClass} mt-2`}
            placeholder="••••••••••"
          />
        </label>
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="admin-primary w-full">
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          {busy ? 'Verifying' : 'Enter console'}
        </button>
      </form>
      <div className="auth-foot">
        <Link to="/">← Return to site</Link>
        <span>Protected by server-side sessions</span>
      </div>
    </AuthShell>
  );
}

function SetupScreen() {
  const { bootstrap, bootstrapFromEnv } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await bootstrap({ name, email, password });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="First-run setup" subtitle="Create the administrator account that owns this console.">
      {bootstrapFromEnv && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
          An admin is configured through environment variables; restart the server and sign in instead.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs uppercase tracking-[0.2em] text-white/45">
          Full name
          <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className={`${fieldClass} mt-2`} />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-white/45">
          Email
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} mt-2`} />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-white/45">
          Password
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${fieldClass} mt-2`}
          />
          <span className="mt-2 block text-[0.68rem] normal-case tracking-normal text-white/35">
            Minimum 10 characters. Stored as a bcrypt hash.
          </span>
        </label>
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="admin-primary w-full">
          {busy ? 'Creating account' : 'Create administrator'}
        </button>
      </form>
    </AuthShell>
  );
}

function LiveToasts() {
  const { events, dismiss } = useRealtime();
  return (
    <div className="admin-toasts" aria-live="polite">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            className="admin-toast"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3 }}
          >
            <span className="admin-toast-dot" />
            <span>{event.label}</span>
            <button type="button" onClick={() => dismiss(event.id)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AdminShell() {
  const { user, logout } = useAuth();
  const { connected, pulse } = useRealtime();
  const [open, setOpen] = useState(false);
  const notifications = useQuery<Array<{ is_read: number }>>('/admin/notifications', [pulse]);
  const unread = (notifications.data ?? []).filter((item) => !item.is_read).length;

  useEffect(() => {
    setOpen(false);
  }, [user?.id]);

  return (
    <div className="admin-shell">
      <aside className={`admin-side${open ? ' is-open' : ''}`}>
        <div className="admin-side-head">
          <Link to="/admin" className="admin-brand">
            IBSAM<span>®</span>
          </Link>
          <span className="admin-side-tag">Console</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
            <LayoutDashboard size={15} /> Overview
          </NavLink>

          <p className="admin-nav-label">Content</p>
          {CONTENT_LINKS.map((item) => (
            <NavLink
              key={item.resource}
              to={`/admin/content/${item.resource}`}
              className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
            >
              <item.icon size={15} /> {item.label}
            </NavLink>
          ))}

          <p className="admin-nav-label">Operations</p>
          <NavLink to="/admin/messages" className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
            <Inbox size={15} /> Messages
          </NavLink>
          <NavLink to="/admin/media" className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
            <ImageIcon size={15} /> Media
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
            <SettingsIcon size={15} /> Settings
          </NavLink>
          <NavLink to="/admin/security" className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
            <ShieldCheck size={15} /> Security
          </NavLink>
        </nav>

        <div className="admin-side-foot">
          <div className="admin-user">
            <span className="admin-avatar">{(user?.name ?? 'A').slice(0, 1).toUpperCase()}</span>
            <div>
              <p>{user?.name}</p>
              <span>{user?.role}</span>
            </div>
          </div>
          <button type="button" onClick={() => void logout()} className="admin-ghost w-full">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {open && <button type="button" className="admin-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-icon-btn admin-menu" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
            <Menu size={16} />
          </button>
          <div className={`admin-live${connected ? ' is-live' : ''}`}>
            <span /> {connected ? 'Live' : 'Offline'}
          </div>
          <div className="admin-topbar-actions">
            <Link to="/admin#notifications" className="admin-icon-btn" aria-label={`${unread} unread notifications`}>
              <Bell size={16} />
              {unread > 0 && <span className="admin-badge">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link to="/" target="_blank" rel="noreferrer" className="admin-ghost">
              <ExternalLink size={14} /> View site
            </Link>
          </div>
        </header>

        <main className="admin-content">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="content/:resource" element={<ContentManager />} />
            <Route path="messages" element={<Messages />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="settings" element={<SettingsPanel />} />
            <Route path="security" element={<SecurityPanel />} />
            <Route path="*" element={<p className="admin-empty">That console section does not exist.</p>} />
          </Routes>
        </main>
      </div>

      <LiveToasts />
    </div>
  );
}

function AdminGate() {
  const { loading, user, needsSetup, error } = useAuth();

  if (loading) return <BootScreen label="Verifying session" />;
  if (error) {
    return (
      <AuthShell title="API unreachable" subtitle="The console could not reach the API server.">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</p>
        <button type="button" className="admin-primary mt-4 w-full" onClick={() => window.location.reload()}>
          Retry connection
        </button>
      </AuthShell>
    );
  }
  if (needsSetup) return <SetupScreen />;
  if (!user) return <LoginScreen />;

  return (
    <RealtimeProvider>
      <AdminShell />
    </RealtimeProvider>
  );
}

export function AdminApp() {
  return (
    <AuthProvider>
      <AdminGate />
    </AuthProvider>
  );
}

export default AdminApp;

/** Kept for imports that expect the raw API helper alongside the app. */
export { api };
