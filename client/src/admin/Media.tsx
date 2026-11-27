import { useRef, useState } from 'react';
import { Copy, FileText, Trash2, Upload } from 'lucide-react';
import { api, ApiClientError } from '../lib/api';
import { formatBytes, formatDate, useQuery } from '../lib/hooks';
import type { MediaAsset, ResumeRecord } from '../lib/types';
import { useRealtime } from './RealtimeContext';

interface ResumePayload {
  active: ResumeRecord | null;
  history: ResumeRecord[];
}

export default function MediaLibrary() {
  const { pulse } = useRealtime();
  const inputRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const media = useQuery<MediaAsset[]>('/admin/media', [pulse]);
  const resume = useQuery<ResumePayload>('/admin/resume', [pulse]);

  const assets = media.data ?? [];
  const usage = media.meta.usage as { bytes: number; files: number } | undefined;

  async function uploadFile(file: File | undefined, target: 'media' | 'resume') {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.upload(target === 'media' ? '/admin/media' : '/admin/resume', form);
      setNotice(`${file.name} uploaded`);
      if (target === 'media') media.reload();
      else resume.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
      if (resumeRef.current) resumeRef.current.value = '';
    }
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(`Delete ${asset.original_name}?`)) return;
    setError(null);
    try {
      await api.del(`/admin/media/${asset.id}`);
      media.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${url}`);
      setNotice('URL copied to clipboard');
    } catch {
      setError('Clipboard access was blocked by the browser');
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Operations</p>
          <h1>Media library</h1>
          <p className="admin-muted">
            {usage ? `${usage.files} files · ${formatBytes(usage.bytes)} stored` : 'Images, documents and resume files'}
          </p>
        </div>
        <button type="button" className="admin-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload size={15} /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml,application/pdf"
          onChange={(event) => void uploadFile(event.target.files?.[0], 'media')}
        />
      </header>

      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>
            <FileText size={15} /> Active resume
          </h2>
          <button type="button" className="admin-ghost" onClick={() => resumeRef.current?.click()} disabled={busy}>
            <Upload size={14} /> Replace
          </button>
          <input
            ref={resumeRef}
            type="file"
            hidden
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => void uploadFile(event.target.files?.[0], 'resume')}
          />
        </div>
        {resume.data?.active ? (
          <div className="admin-resume">
            <div>
              <p className="admin-list-title">{resume.data.active.original_name}</p>
              <span className="admin-list-sub">
                {formatBytes(resume.data.active.size)} · updated {formatDate(resume.data.active.created_at)}
              </span>
            </div>
            <div className="admin-row-actions">
              <a href={resume.data.active.url} target="_blank" rel="noreferrer" className="admin-ghost">
                Open
              </a>
              <button
                type="button"
                className="admin-danger"
                onClick={async () => {
                  if (!window.confirm('Remove the active resume?')) return;
                  try {
                    await api.del(`/admin/resume/${resume.data!.active!.id}`);
                    resume.reload();
                  } catch (err) {
                    setError(err instanceof ApiClientError ? err.message : 'Unable to remove resume');
                  }
                }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <p className="admin-empty">No resume uploaded. The public resume page will offer the contact route instead.</p>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Assets</h2>
          <span className="admin-muted">{assets.length} files</span>
        </div>

        {media.loading && assets.length === 0 ? (
          <p className="admin-empty">Loading assets…</p>
        ) : assets.length === 0 ? (
          <p className="admin-empty">The library is empty. Upload an image to begin.</p>
        ) : (
          <div className="admin-media-grid">
            {assets.map((asset) => (
              <figure key={asset.id} className="admin-media-item">
                {asset.mime_type.startsWith('image/') ? (
                  <img src={asset.url} alt={asset.original_name} loading="lazy" />
                ) : (
                  <div className="admin-media-file">
                    <FileText size={22} />
                  </div>
                )}
                <figcaption>
                  <p title={asset.original_name}>{asset.original_name}</p>
                  <span>{formatBytes(asset.size)}</span>
                </figcaption>
                <div className="admin-media-actions">
                  <button type="button" onClick={() => void copy(asset.url)} aria-label="Copy URL">
                    <Copy size={13} />
                  </button>
                  <button type="button" onClick={() => void remove(asset)} aria-label="Delete asset">
                    <Trash2 size={13} />
                  </button>
                </div>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
