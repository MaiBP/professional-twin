import { useCallback, useEffect, useState } from 'react';

// Header required for writes (see app/server/index.mjs).
export const WRITE_HEADERS = { 'X-Twin': '1' };

async function request(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...WRITE_HEADERS, ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  put: (url, body) => request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  upload: (url, files, field = 'files') => {
    const form = new FormData();
    for (const f of files) form.append(field, f);
    return request(url, { method: 'POST', body: form });
  },
  remove: (url) => request(url, { method: 'DELETE' }),
};

export const fileUrl = (path, download = false) =>
  `/api/file?path=${encodeURIComponent(path)}${download ? '&download=1' : ''}`;

// Loads data and refreshes it by itself: this way you see right away what the twin writes from Claude Code.
export function useData(url, { every = 5000, paused = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!url) return;
    try {
      setData(await api.get(url));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [url]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  useEffect(() => {
    if (paused || !every) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, every);
    window.addEventListener('focus', reload);
    return () => { clearInterval(id); window.removeEventListener('focus', reload); };
  }, [reload, every, paused]);

  return { data, error, reload };
}
