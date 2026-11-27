import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Database, Inbox, Layers, Radio } from 'lucide-react';
import { formatBytes, formatDate, useQuery } from '../lib/hooks';
import type { AdminOverview } from '../lib/types';
import { useRealtime } from './RealtimeContext';

const METRICS: Array<{ key: string; label: string; to: string }> = [
  { key: 'projects', label: 'Projects', to: '/admin/content/projects' },
  { key: 'messages', label: 'Messages', to: '/admin/messages' },
  { key: 'unreadMessages', label: 'Unread', to: '/admin/messages' },
  { key: 'posts', label: 'Blog posts', to: '/admin/content/blog-posts' },
  { key: 'skills', label: 'Skills', to: '/admin/content/skills' },
  { key: 'testimonials', label: 'Testimonials', to: '/admin/content/testimonials' },
];

function metricValue(counts: Record<string, number>, key: string): number {
  if (key === 'unreadMessages') return counts.unreadMessages ?? counts.unread ?? 0;
  return counts[key] ?? 0;
}

export default function Overview() {
  const { pulse } = useRealtime();
  const { data, loading, error } = useQuery<AdminOverview>('/admin/overview', [pulse]);

  if (loading && !data) {
    return (
      <div className="admin-page" aria-busy="true" aria-label="Loading dashboard">
        <div className="admin-skel admin-skel--title" />
        <div className="admin-metrics">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="admin-skel admin-skel--metric" />
          ))}
        </div>
        <div className="admin-columns">
          <div className="admin-skel admin-skel--block" />
          <div className="admin-skel admin-skel--block" />
        </div>
      </div>
    );
  }
  if (error) return <p className="admin-empty admin-empty--error">{error}</p>;
  if (!data) return <p className="admin-empty">No dashboard data available.</p>;

  const counts = data.counts ?? {};

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Dashboard</p>
          <h1>Operational overview</h1>
        </div>
        <Link to="/" target="_blank" rel="noreferrer" className="admin-ghost">
          Open public site <ArrowUpRight size={14} />
        </Link>
      </header>

      <section className="admin-metrics">
        {METRICS.map((metric) => (
          <Link key={metric.key} to={metric.to} className="admin-metric">
            <span>{metric.label}</span>
            <strong>{metricValue(counts, metric.key)}</strong>
          </Link>
        ))}
      </section>

      <div className="admin-columns">
        <section className="admin-card" id="notifications">
          <div className="admin-card-head">
            <h2>
              <Inbox size={15} /> Recent messages
            </h2>
            <Link to="/admin/messages">All messages</Link>
          </div>
          {(data.recentMessages ?? []).length === 0 ? (
            <p className="admin-empty">No messages yet.</p>
          ) : (
            <ul className="admin-list">
              {data.recentMessages.slice(0, 5).map((message) => (
                <li key={message.id}>
                  <div>
                    <p className="admin-list-title">{message.subject || 'Untitled enquiry'}</p>
                    <span className="admin-list-sub">
                      {message.name} · {message.email}
                    </span>
                  </div>
                  <div className="admin-list-side">
                    <span className={`admin-tag admin-tag--${message.status}`}>{message.status}</span>
                    <time>{formatDate(message.created_at)}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Activity size={15} /> Recent activity
            </h2>
            <Link to="/admin/security">Audit log</Link>
          </div>
          {(data.recentActivity ?? []).length === 0 ? (
            <p className="admin-empty">No recorded activity.</p>
          ) : (
            <ul className="admin-feed">
              {data.recentActivity.slice(0, 8).map((entry) => (
                <li key={entry.id}>
                  <span className="admin-feed-dot" />
                  <div>
                    <p>{entry.action.replace(/[._]/g, ' ')}</p>
                    <span>
                      {entry.user_name ? `${entry.user_name} · ` : ''}
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="admin-columns">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Radio size={15} /> Traffic
            </h2>
            <Link to="/admin/analytics">Open analytics</Link>
          </div>
          <div className="admin-stat-row">
            <div>
              <strong>{data.analytics?.views7d ?? 0}</strong>
              <span>7-day views</span>
            </div>
            <div>
              <strong>{data.analytics?.views30d ?? 0}</strong>
              <span>30-day views</span>
            </div>
            <div>
              <strong>{formatBytes(data.storage?.bytes ?? 0)}</strong>
              <span>{data.storage?.files ?? 0} files stored</span>
            </div>
          </div>
          {(data.analytics?.topPaths ?? []).length > 0 && (
            <ul className="admin-paths">
              {data.analytics.topPaths.slice(0, 6).map((row) => (
                <li key={row.path}>
                  <span>{row.path}</span>
                  <span>{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Database size={15} /> System
            </h2>
            <span className={`admin-live${data.system?.database === 'ok' ? ' is-live' : ''}`}>
              <span /> {data.system?.database ?? 'unknown'}
            </span>
          </div>
          <dl className="admin-kv">
            <div>
              <dt>Environment</dt>
              <dd>{data.system?.environment ?? '—'}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{data.system?.version ?? '—'}</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>{Math.floor((data.system?.uptimeSeconds ?? 0) / 60)} min</dd>
            </div>
          </dl>
          <div className="admin-card-foot">
            <Layers size={14} /> Socket.IO rooms authorised per admin session
          </div>
        </section>
      </div>
    </div>
  );
}
