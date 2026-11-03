import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, useData } from '../api.js';
import Icon from './Icon.jsx';
import Diagram from './Diagram.jsx';
import Form from './Form.jsx';
import { L } from '../i18n.js';
import { MAP_LANGS } from '../../../shared/mapFormat.mjs';

// The interactive map is heavy: it is only loaded when a document needs it.
const InteractiveMap = lazy(() => import('./InteractiveMap.jsx'));

// In the print view (PDF) the map is drawn still, without buttons or animations.
export const PrintMode = createContext(false);
function MapBlock({ code }) {
  const print = useContext(PrintMode);
  return <Suspense fallback={<div className="diagram muted">{L('Preparing the map…', 'Preparando el mapa…')}</div>}><InteractiveMap code={code} print={print} /></Suspense>;
}

const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '');

// ```map blocks (and the old ```mapa ones) are drawn as an interactive map and ```mermaid ones as a diagram; the rest is shown as is.
const COMPONENTS = {
  pre: ({ children, node, ...props }) => {
    const child = node?.children?.[0];
    const classes = child?.properties?.className ?? [];
    const code = () => child.children.map((c) => c.value ?? '').join('').trim();
    if (child?.tagName === 'code' && MAP_LANGS.some((l) => classes.includes(`language-${l}`))) {
      return <MapBlock code={code()} />;
    }
    if (child?.tagName === 'code' && classes.includes('language-mermaid')) return <Diagram code={code()} />;
    return <pre {...props}>{children}</pre>;
  },
};

export function Markdown({ text }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>{stripComments(text)}</ReactMarkdown>
    </div>
  );
}

// Viewer and editor (as a form) of a private document. In read mode it refreshes by itself.
export default function Document({ path, templateNotice, editable = true }) {
  const [mode, setMode] = useState('view'); // view · form · text
  const editing = mode !== 'view';
  const { data, error, reload } = useData(`/api/doc?path=${encodeURIComponent(path)}`, { paused: editing });
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMode('view'); setStatus(null); }, [path]);

  if (error) return <div className="card warning"><Icon name="warning" /> {error.status === 404 ? L('This document does not exist yet.', 'Este documento aún no existe.') : error.message}</div>;
  if (!data) return <div className="card muted">{L('Loading…', 'Cargando…')}</div>;

  const isTemplate = /^<!--\s*(TEMPLATE|PLANTILLA)\b/.test(data.content.trimStart());

  const save = async (content) => {
    setSaving(true);
    try {
      await api.put('/api/doc', { path, content, modified: data.modified });
      setMode('view');
      setStatus({ type: 'ok', text: L('Changes saved.', 'Cambios guardados.') });
      reload();
    } catch (e) {
      setStatus({ type: 'error', text: e.status === 409 ? L('Your twin updated this document while you were editing it. Cancel and open it again so you don’t lose its changes.', 'El gemelo actualizó este documento mientras lo editabas. Cancela y vuelve a abrirlo para no perder sus cambios.') : e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="document">
      {isTemplate && templateNotice && (
        <div className="card warning"><p><strong>{L('Not filled in yet.', 'Aún está por completar.')}</strong> {templateNotice.text}</p></div>
      )}
      {editable && (
        <div className="row between document-bar">
          <span />
          {mode === 'view' ? (
            <button className="button button-secondary" onClick={() => { setMode('form'); setStatus(null); }}><Icon name="edit" size={16} />{L('Edit', 'Editar')}</button>
          ) : mode === 'form' ? (
            <button className="link-button" onClick={() => { setDraft(data.content); setMode('text'); }}>{L('Advanced editing (text)', 'Edición avanzada (texto)')}</button>
          ) : (
            <button className="link-button" onClick={() => setMode('form')}>{L('Back to the form', 'Volver al formulario')}</button>
          )}
        </div>
      )}
      {status && <div className={`card ${status.type === 'error' ? 'warning' : 'success'}`}>{status.text}</div>}
      {mode === 'form' && (
        <Form content={data.content} saving={saving} onSave={save} onCancel={() => setMode('view')} />
      )}
      {mode === 'text' && (
        <div className="card">
          <p className="muted">{L('Advanced editing: keep the symbols (**, -, |, #) as they are, because the app and your twin use them to understand the document.', 'Edición avanzada: respeta los símbolos (**, -, |, #) porque la app y el gemelo los usan para entender el documento.')}</p>
          <textarea className="editor" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck />
          <div className="row form-buttons">
            <button className="button button-secondary" onClick={() => setMode('view')}>{L('Cancel', 'Cancelar')}</button>
            <button className="button" disabled={saving} onClick={() => save(draft)}>{L('Save changes', 'Guardar cambios')}</button>
          </div>
        </div>
      )}
      {mode === 'view' && <div className="card"><Markdown text={data.content} /></div>}
    </div>
  );
}
