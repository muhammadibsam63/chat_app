import { useMemo, useState } from 'react';
import { BarChart3, Inbox, RefreshCw, Route as RouteIcon, TrendingUp } from 'lucide-react';
import { useQuery } from '../lib/hooks';
import type { AnalyticsPayload } from '../lib/types';
import { useRealtime } from './RealtimeContext';

const RANGES = [7, 14, 30, 90] as const;

type Point = { date: string; label: string; views: number };

/** Builds a continuous day axis so quiet days render as gaps, not compressed bars. */
function buildSeries(days: number, rows: Array<{ day: string; total: number }>): Point[] {
  const totals = new Map(rows.map((row) => [row.day, row.total]));
  const points: Point[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    points.push({ date: key, label: key.slice(5), views: totals.get(key) ?? 0 });
  }
  return points;
}

function ChartSkeleton() {
  return (
    <div className="admin-skel-stack" aria-busy="true" aria-label="Loading analytics">
      <div className="admin-skel admin-skel--title" />
      <div className="admin-skel admin-skel--block" />
      <div className="admin-skel admin-skel--line" />
      <div className="admin-skel admin-skel--line" />
    </div>
  );
}

export default function AnalyticsPanel() {
  const { pulse } = useRealtime();
  const [days, setDays] = useState<number>(14);
  const { data, loading, error } = useQuery<AnalyticsPayload>(`/admin/analytics?days=${days}`, [days, pulse]);

  const series = useMemo(() => buildSeries(days, data?.views ?? []), [days, data]);
  const peak = Math.max(1, ...series.map((point) => point.views));
  const windowViews = data?.totals?.viewsWindow ?? 0;
  const topPaths = data?.topPaths ?? [];
  const pathPeak = Math.max(1, ...topPaths.map((row) => row.total));
  const messageDays = (data?.messages ?? []).slice(-6).reverse();
  const silent = !loading && !error && windowViews === 0;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Insights</p>
          <h1>Traffic analytics</h1>
          <p className="admin-muted">Recorded server-side on public page views. No third-party trackers.</p>
        </div>
        <div className="admin-range" role="group" aria-label="Date range">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={range === days ? 'is-active' : ''}
              aria-pressed={range === days}
            >
              {range}D
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p className="admin-empty admin-empty--error" role="alert">
          <BarChart3 size={18} />
          <strong>Analytics unavailable</strong>
          <span>{error}</span>
        </p>
      )}

      {loading && !data && <ChartSkeleton />}

      {data && (
        <>
          <section className="admin-metrics" aria-label="Traffic totals">
            <div className="admin-metric">
              <span>Views · {days}D</span>
              <strong>{windowViews}</strong>
              <em>selected range</em>
            </div>
            <div className="admin-metric">
              <span>Views · all time</span>
              <strong>{data.totals?.views ?? 0}</strong>
              <em>since launch</em>
            </div>
            <div className="admin-metric">
              <span>Messages</span>
              <strong>{data.totals?.messages ?? 0}</strong>
              <em>contact inbox</em>
            </div>
            <div className="admin-metric">
              <span>Active sessions</span>
              <strong>{data.totals?.sessions ?? 0}</strong>
              <em>admin sessions</em>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>
                <TrendingUp size={15} /> Page views per day
              </h2>
              <span className="admin-muted">
                {loading ? 'Refreshing…' : `peak ${peak} view${peak === 1 ? '' : 's'}`}
              </span>
            </div>
            {silent ? (
              <p className="admin-empty">
                <BarChart3 size={18} />
                <strong>No page views recorded yet</strong>
                <span>
                  Views are written to the database by the public site. Open a public page in this
                  browser and this chart fills in — nothing here is simulated.
                </span>
              </p>
            ) : (
              <div className="admin-chart" role="img" aria-label={`Page views per day over the last ${days} days`}>
                {series.map((point) => (
                  <div key={point.date} className="admin-chart-col" title={`${point.date}: ${point.views} views`}>
                    <em>{point.views > 0 ? point.views : ''}</em>
                    <div
                      className="admin-chart-bar"
                      style={{ height: `${Math.max(2, Math.round((point.views / peak) * 100))}%` }}
                    />
                    <small>{point.label}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="admin-columns">
            <section className="admin-card">
              <div className="admin-card-head">
                <h2>
                  <RouteIcon size={15} /> Top pages
                </h2>
                <span className="admin-muted">Last {days} days</span>
              </div>
              {topPaths.length === 0 ? (
                <p className="admin-empty">
                  <RouteIcon size={18} />
                  <strong>No pages ranked yet</strong>
                  <span>Once public routes are visited, the busiest paths appear here.</span>
                </p>
              ) : (
                <ul className="admin-bars">
                  {topPaths.map((row) => (
                    <li key={row.path}>
                      <div className="admin-bars-top">
                        <span>{row.path}</span>
                        <strong>{row.total}</strong>
                      </div>
                      <div className="admin-bars-track">
                        <div
                          className="admin-bars-fill"
                          style={{ width: `${Math.max(4, Math.round((row.total / pathPeak) * 100))}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card">
              <div className="admin-card-head">
                <h2>
                  <Inbox size={15} /> Messages per day
                </h2>
                <span className="admin-muted">Last {days} days</span>
              </div>
              {messageDays.length === 0 ? (
                <p className="admin-empty">
                  <Inbox size={18} />
                  <strong>No messages in range</strong>
                  <span>Contact form submissions appear here as they arrive.</span>
                </p>
              ) : (
                <ul className="admin-list">
                  {messageDays.map((row) => (
                    <li key={row.day}>
                      <p className="admin-list-title">{row.day}</p>
                      <div className="admin-list-side">
                        <span className="admin-tag">{row.total} received</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="admin-card-foot">
                <RefreshCw size={13} /> Live updates arrive over the authenticated socket
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
