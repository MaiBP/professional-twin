import { useEffect } from 'react';
import { useData } from '../api.js';
import { Markdown, PrintMode } from '../components/Document.jsx';
import { L, locale } from '../i18n.js';

// Clean view of a project's map and summary card, meant to be saved as PDF (used by the server).
export default function Print({ id }) {
  const { data: p, error } = useData(`/api/projects/${encodeURIComponent(id)}`);
  const { data: doc, error: docError } = useData(`/api/doc?path=${encodeURIComponent(`projects/${id}/map.md`)}`);

  useEffect(() => {
    document.documentElement.classList.add('print-mode');
    return () => document.documentElement.classList.remove('print-mode');
  }, []);
  useEffect(() => {
    if (p) document.title = `${L('Map', 'Mapa')} - ${p.name}`;
  }, [p]);

  if (error || docError) return <p>{L('The map for this project was not found.', 'No se encontró el mapa de este proyecto.')}</p>;
  if (!p || !doc) return <p>{L('Loading…', 'Cargando…')}</p>;

  // The document title ("# Project map") is replaced by the header with the project name.
  const text = doc.content.replace(/^\s*(<!--[\s\S]*?-->\s*)*#\s[^\n]*\n/, '');
  const date = new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const phase = p.retrospective && p.phase < 6 ? L('To be documented', 'Por documentar') : p.phaseName;

  return (
    <article className="print-sheet">
      <header className="print-header">
        <span className="print-label">{L('Project map', 'Mapa del proyecto')}</span>
        <h1>{p.name}</h1>
        <p>{[phase, L(`Updated ${date}`, `Actualizado el ${date}`)].filter(Boolean).join(' · ')}</p>
      </header>
      <PrintMode.Provider value>
        <Markdown text={text} />
      </PrintMode.Provider>
    </article>
  );
}
