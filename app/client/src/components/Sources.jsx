import { useRef, useState } from 'react';
import { api, fileUrl, useData } from '../api.js';
import Icon from './Icon.jsx';
import { L, locale } from '../i18n.js';

const formatSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const formatDate = (iso) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });

const TYPES = L('PDF, Word, Excel, PowerPoint, images, text · max. 25 MB · stored only on your PC', 'PDF, Word, Excel, PowerPoint, imágenes, texto · máx. 25 MB · se guardan solo en tu PC');

// File list with a drop zone.
// By default it works with a sources folder (`area`); with `url` + `deleteUrl` it works for any folder.
export default function Sources({
  area, title, description, url = `/api/sources/${area}`,
  deleteUrl = (f) => `/api/sources/${area}/${encodeURIComponent(f.name)}`,
  nameOf = (f) => f.name, types = TYPES,
}) {
  const { data, reload } = useData(url);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState(null);
  const input = useRef(null);

  const upload = async (files) => {
    if (!files.length) return;
    try {
      const r = await api.upload(url, files);
      setMessage({ type: 'success', text: `${L('Uploaded', 'Subido')}: ${r.uploaded.join(', ')}` });
      reload();
    } catch (e) {
      setMessage({ type: 'warning', text: e.message });
    }
  };

  const remove = async (f) => {
    if (!window.confirm(L(`Delete "${nameOf(f)}" from your PC?`, `¿Borrar "${nameOf(f)}" de tu PC?`))) return;
    try {
      await api.remove(deleteUrl(f));
    } catch (e) {
      setMessage({ type: 'warning', text: e.message });
    }
    reload();
  };

  return (
    <section className="block">
      {title && <h2>{title}</h2>}
      {description && <p className="muted">{description}</p>}
      <div
        className={`dropzone ${dragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload([...e.dataTransfer.files]); }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        <Icon name="upload" size={22} />
        <span>{L('Drag files here or click to choose them', 'Arrastra archivos aquí o haz clic para elegirlos')}</span>
        <span className="muted">{types}</span>
        <input ref={input} type="file" multiple hidden onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
      </div>
      {message && <div className={`card ${message.type}`}>{message.text}</div>}
      {data?.length > 0 && (
        <ul className="file-list">
          {data.map((f) => (
            <li key={f.path}>
              <Icon name="file" />
              <a href={fileUrl(f.path)} target="_blank" rel="noreferrer">{nameOf(f)}</a>
              <span className="muted">{formatSize(f.size)} · {formatDate(f.modified)}</span>
              <button className="icon-button" onClick={() => remove(f)} aria-label={`${L('Delete', 'Borrar')} ${nameOf(f)}`}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
