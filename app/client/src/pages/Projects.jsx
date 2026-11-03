import { useRef, useState } from 'react';
import { api, fileUrl, useData } from '../api.js';
import Document from '../components/Document.jsx';
import Phases from '../components/Phases.jsx';
import Sources from '../components/Sources.jsx';
import Tabs from '../components/Tabs.jsx';
import Icon from '../components/Icon.jsx';
import Twin from '../components/Twin.jsx';
import Confirm from '../components/Confirm.jsx';
import { L, locale } from '../i18n.js';

const PREVIEWABLE = /\.(html?|pdf|png|jpe?g|svg|txt|csv|md)$/i;
const MATERIAL_TYPES = L('Documents, presentations, Excel, PDF, images, code or a .zip with a whole project · max. 100 MB · stored only on your PC', 'Documentos, presentaciones, Excel, PDF, imágenes, código o un .zip con un proyecto entero · máx. 100 MB · se guardan solo en tu PC');
const EVENT_ICON = { phase: '✓', decision: '◆', achievement: '★' };
const EVENT_NAME = { phase: L('Phase', 'Fase'), decision: L('Decision', 'Decisión'), achievement: L('Achievement', 'Logro') };
const formatSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const PATHS_EXAMPLE = L(
  'C:\\Users\\your-user\\Documents\\Overdue accounts project\n\\\\server\\shared\\IT\\Automations\\Overdue',
  'C:\\Users\\your-user\\Documents\\Proyecto morosos\n\\\\servidor\\compartida\\IT\\Automatizaciones\\Morosos',
);
const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// New need: the person tells it in their own words and the twin opens the project and asks the first questions.
function NewNeed() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setStatus({ type: 'progress', text: L('Opening the project…', 'Abriendo el proyecto…') });
    try {
      const { id } = await api.post('/api/projects/need', { title, text });
      window.location.hash = `#/projects/${encodeURIComponent(id)}`;
    } catch (err) {
      setStatus({ type: 'warning', text: err.message });
    }
  };

  if (!open) {
    return (
      <div className="card compose big-option">
        <span className="option-icon"><Icon name="sparkle" size={22} /></span>
        <div>
          <span className="compose-label">{L('Start a new project', 'Empezar un proyecto nuevo')}</span>
          <p className="muted">{L('Tell your twin about a problem or a request at work. It opens the project and asks you the first questions.', 'Cuéntale al gemelo un problema o un pedido de tu trabajo. Él abre el proyecto y te hace las primeras preguntas.')}</p>
        </div>
        <button className="button" onClick={() => setOpen(true)}>{L('Describe a need', 'Contar una necesidad')}</button>
      </div>
    );
  }

  return (
    <form className="card compose" onSubmit={save}>
      <h2>{L('Describe a need', 'Contar una necesidad')}</h2>
      <label>{L('What is happening?', '¿Qué está pasando?')} *
        <textarea rows={5} required value={text} onChange={(e) => setText(e.target.value)}
          placeholder={L('E.g.: every manager reads the call-centre metrics their own way and the system doesn\'t produce good charts. We need everyone looking at the same numbers…', 'Ej.: cada manager interpreta las métricas de telefonía a su manera y el sistema no da buenos gráficos. Necesitamos que todos miren lo mismo…')} />
      </label>
      <label>{L('Short project name (optional)', 'Nombre corto del proyecto (opcional)')}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L('E.g.: Call-centre metrics', 'Ej.: Métricas de telefonía')} />
      </label>
      {status && <div className={`card ${status.type === 'warning' ? 'warning' : ''}`}>{status.text}</div>}
      <div className="row between">
        <span className="muted">{L('Tell it as you would tell a colleague. It doesn\'t need to be complete.', 'Cuéntalo como se lo contarías a un compañero. No hace falta que esté completo.')}</span>
        <div className="row">
          <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>{L('Cancel', 'Cancelar')}</button>
          <button className="button" disabled={status?.type === 'progress'}><Icon name="send" size={16} />{L('Send to your twin', 'Enviar al gemelo')}</button>
        </div>
      </div>
    </form>
  );
}

// Already finished project: name, folders with documentation and loose files. The twin analyzes it and builds the map.
function DocumentProject() {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ name: '', date: '', description: '', paths: '' });
  const [files, setFiles] = useState([]);
  const [checked, setChecked] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const input = useRef(null);
  const change = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));
  const paths = () => fields.paths.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const add = (list) => setFiles((a) => [...a, ...list.filter((f) => !a.some((x) => x.name === f.name && x.size === f.size))]);

  const check = async () => {
    const p = paths();
    if (!p.length) { setChecked(null); return; }
    try {
      setChecked(await Promise.all(p.map((path) => api.post('/api/paths/check', { path }))));
    } catch {
      setChecked(null);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!paths().length && !files.length && !fields.description.trim()) {
      setStatus({ type: 'warning', text: L('Give at least one folder, a file or a description.', 'Indica al menos una carpeta, algún archivo o una descripción.') });
      return;
    }
    setStatus({ type: 'progress', text: L('Creating the project…', 'Creando el proyecto…') });
    try {
      const { id } = await api.post('/api/projects/document', { ...fields, paths: paths() });
      if (files.length) {
        setStatus({ type: 'progress', text: L(`Uploading ${files.length} file(s)…`, `Subiendo ${files.length} archivo(s)…`) });
        await api.upload(`/api/projects/${encodeURIComponent(id)}/material`, files);
      }
      await api.post(`/api/twin/project/${encodeURIComponent(id)}`, { action: 'document', label: L('Document this project with the material I left you', 'Documenta este proyecto con el material que te dejé') });
      window.location.hash = `#/projects/${encodeURIComponent(id)}`;
    } catch (err) {
      setStatus({ type: 'warning', text: err.message });
    }
  };

  if (!open) {
    return (
      <div className="card compose big-option">
        <span className="option-icon"><Icon name="projects" size={22} /></span>
        <div>
          <span className="compose-label">{L('Document a project you already did', 'Documentar un proyecto que ya hiciste')}</span>
          <p className="muted">{L('Point to the folder with its documentation or upload the files. Your twin analyzes them and builds the map, the summary card, the decisions and the achievements.', 'Indica la carpeta donde está su documentación o sube los archivos. El gemelo los analiza y arma el mapa, la ficha, las decisiones y los logros.')}</p>
        </div>
        <button className="button button-secondary" onClick={() => setOpen(true)}>{L('Document', 'Documentar')}</button>
      </div>
    );
  }

  return (
    <form className="card compose" onSubmit={save}>
      <h2>{L('Document a finished project', 'Documentar un proyecto ya hecho')}</h2>
      <div className="form-2">
        <label>{L('Project name', 'Nombre del proyecto')} *<input required value={fields.name} onChange={change('name')} placeholder={L('E.g.: Sending overdue accounts to the collection agency', 'Ej.: Envío de morosos a la agencia de recobro')} /></label>
        <label>{L('When was it done?', '¿Cuándo se hizo?')}<input type="month" value={fields.date} onChange={change('date')} /></label>
      </div>
      <label>{L('Short description', 'Descripción breve')}
        <textarea rows={3} value={fields.description} onChange={change('description')}
          placeholder={L('What problem it solved, for whom and what you did. If you leave it empty, your twin works it out from the material and asks you.', 'Qué problema resolvía, para quién y qué hiciste tú. Si lo dejas vacío, el gemelo lo deduce del material y te pregunta.')} />
      </label>
      <label>{L('Folders with the documentation (one per line)', 'Carpetas con la documentación (una por línea)')}
        <textarea rows={3} value={fields.paths} onChange={change('paths')} onBlur={check} placeholder={PATHS_EXAMPLE} />
      </label>
      <span className="muted">{L('Your twin reads these folders where they are, without copying them. To copy the path: in File Explorer, right-click the folder → “Copy as path”.', 'El gemelo lee estas carpetas donde están, sin copiarlas. Para copiar la ruta: en el Explorador de archivos, clic derecho sobre la carpeta → «Copiar como ruta de acceso».')}</span>
      {checked?.length > 0 && (
        <ul className="simple-list">
          {checked.map((c) => (
            <li key={c.path} className={c.exists ? '' : 'warning-text'}>
              {c.exists ? '✓' : '⚠️'} {c.path}{' '}
              {c.exists ? (c.folder ? `· ${c.items} ${L('items', 'elementos')}` : `· ${L('file', 'archivo')}`) : `· ${c.error ?? L('cannot be found from this PC', 'no se encuentra desde este PC')}`}
            </li>
          ))}
        </ul>
      )}
      <div
        className={`dropzone ${dragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); add([...e.dataTransfer.files]); }}
        onClick={() => input.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        <Icon name="upload" size={22} />
        <span>{L('Or drag individual documents here', 'O arrastra aquí documentos sueltos')}</span>
        <span className="muted">{MATERIAL_TYPES}</span>
        <input ref={input} type="file" multiple hidden onChange={(e) => { add([...e.target.files]); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.name + f.size}>
              <Icon name="file" />
              <span>{f.name}</span>
              <span className="muted">{formatSize(f.size)}</span>
              <button type="button" className="icon-button" aria-label={`${L('Remove', 'Quitar')} ${f.name}`}
                onClick={() => setFiles((a) => a.filter((x) => x !== f))}><Icon name="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {status && <div className={`card ${status.type === 'warning' ? 'warning' : ''}`}>{status.text}</div>}
      <div className="row between">
        <span className="muted">{L('When the project is created, your twin starts analyzing it and will let you know if it needs anything.', 'Al crear el proyecto, el gemelo empieza a analizarlo y te avisará si necesita algo.')}</span>
        <div className="row">
          <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>{L('Cancel', 'Cancelar')}</button>
          <button className="button" disabled={status?.type === 'progress'}><Icon name="sparkle" size={16} />{L('Create and analyze', 'Crear y analizar')}</button>
        </div>
      </div>
    </form>
  );
}

function List() {
  const { data: projects, error } = useData('/api/projects');
  if (error) return <div className="card warning">{error.message}</div>;

  return (
    <>
      <header className="page-header">
        <h1>{L('Projects', 'Proyectos')}</h1>
        <p className="muted">{L('Each need at work moves forward step by step with your twin, from understanding it to the result. Nothing is closed without your approval.', 'Cada necesidad de tu trabajo avanza paso a paso con el gemelo, desde entenderla hasta el resultado. Nada se cierra sin tu aprobación.')}</p>
      </header>

      <div className="options">
        <NewNeed />
        <DocumentProject />
      </div>

      <h2 className="block">{L('Your projects', 'Tus proyectos')}</h2>
      {!projects ? <p className="muted">{L('Loading…', 'Cargando…')}</p> : projects.length === 0 ? (
        <p className="muted">{L('No projects yet. Start by describing a need or documenting something you already did.', 'Aún no hay proyectos. Empieza contando una necesidad o documentando algo que ya hiciste.')}</p>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <a key={p.id} className="card project" href={`#/projects/${encodeURIComponent(p.id)}`}>
              <div className="row between">
                <strong>{p.name}</strong>
                <span className="tag">{p.retrospective && p.phase < 6 ? L('To be documented', 'Por documentar') : p.phaseName}</span>
              </div>
              <Phases phase={p.phase} completed={p.completed} compact />
              {p.nextDecision && <p className="next-decision"><span className="muted">{L('Waiting for you', 'Te espera')}:</span> {p.nextDecision}</p>}
              {p.updated && <span className="muted">{L('Updated', 'Actualizado el')} {formatDate(p.updated)}</span>}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

// Project timeline: closed phases, decisions and achievements.
function Journey({ p }) {
  const events = p.timeline ?? [];
  return (
    <section className="card block">
      <h2>{L('Journey', 'Recorrido')}</h2>
      {events.length === 0 && (
        <p className="muted">{L('Closed phases, decisions and achievements will appear here as the project moves forward.', 'Aquí aparecerán las fases cerradas, las decisiones y los logros del proyecto a medida que avance.')}</p>
      )}
      <ol className="journey">
        {events.map((e, i) => (
          <li key={i} className={`event ${e.type}`}>
            <span className="event-mark" aria-hidden="true">{EVENT_ICON[e.type]}</span>
            <div>
              <div className="row event-header">
                <span className="tag">{EVENT_NAME[e.type]}</span>
                <span className="muted">{e.date ?? L('no date', 'sin fecha')}</span>
              </div>
              <strong>{e.title}</strong>
              {e.detail && <p className="muted">{e.detail}</p>}
            </div>
          </li>
        ))}
        <li className="event now">
          <span className="event-mark" aria-hidden="true">●</span>
          <div>
            <div className="row event-header"><span className="tag">{L('Now', 'Ahora')}</span></div>
            <strong>{p.retrospective && p.phase < 6 ? L('To be documented', 'Por documentar') : p.phaseName}</strong>
            {p.nextDecision && <p className="muted">{L('Waiting for you', 'Te espera')}: {p.nextDecision}</p>}
          </div>
        </li>
      </ol>
    </section>
  );
}

// Downloads the map with its summary card as PDF. It takes a few seconds: the server draws it with the browser.
function DownloadPdf({ p }) {
  const [status, setStatus] = useState(null); // null · 'preparing' · error message
  const download = async () => {
    setStatus('preparing');
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(p.id)}/map.pdf`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? L('The PDF could not be created.', 'No se pudo crear el PDF.'));
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${L('Map', 'Mapa')} - ${p.name.replace(/[\\/:*?"<>|]/g, '')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus(null);
    } catch (e) {
      setStatus(e.message);
    }
  };
  return (
    <div className="row between document-bar">
      {status && status !== 'preparing' ? <span className="muted">{status}</span> : <span />}
      <button className="button button-secondary" onClick={download} disabled={status === 'preparing'}>
        <Icon name="download" size={16} />{status === 'preparing' ? L('Preparing the PDF…', 'Preparando el PDF…') : L('Download PDF', 'Descargar PDF')}
      </button>
    </div>
  );
}

function MapTab({ p }) {
  const map = p.docs.find((d) => d.path.endsWith('/map.md'));
  return (
    <>
      {map && <DownloadPdf p={p} />}
      {map ? <Document path={map.path} /> : (
        <div className="card warning"><p><strong>{L('This project has no map yet.', 'Este proyecto aún no tiene mapa.')}</strong> {L('Ask your twin to draw it with the “Update the map” button.', 'Pídele al gemelo que lo dibuje con el botón «Actualizar el mapa».')}</p></div>
      )}
      <Journey p={p} />
    </>
  );
}

function Material({ p }) {
  const base = `/api/projects/${encodeURIComponent(p.id)}/material`;
  return (
    <>
      <p className="muted">{L('Share what already exists here: documents, presentations, spreadsheets, screenshots or code. When you upload something new, press “Review new material” in your twin\'s panel.', 'Comparte aquí lo que ya existe: documentos, presentaciones, planillas, capturas o código. Cuando subas algo nuevo, pulsa «Revisar material nuevo» en el panel del gemelo.')}</p>
      <Sources url={base} types={MATERIAL_TYPES}
        deleteUrl={(f) => `${base}?path=${encodeURIComponent(f.relative)}`}
        nameOf={(f) => f.relative} />
      <h2 className="block">{L('Folders, links and notes', 'Carpetas, enlaces y notas')}</h2>
      <p className="muted">{L('For what can\'t be uploaded: network folders, systems or contact people.', 'Para lo que no se puede subir: carpetas de red, sistemas o personas de contacto.')}</p>
      <Document path={`projects/${p.id}/material/links.md`} />
    </>
  );
}

function Product({ p }) {
  if (p.product.length === 0) {
    return <p className="muted">{L('The deliverables your twin builds (documents, dashboards, spreadsheets, code) will appear here.', 'Los entregables que construya el gemelo (documentos, paneles, planillas, código) aparecerán aquí.')}</p>;
  }
  return (
    <ul className="file-list">
      {p.product.map((f) => (
        <li key={f.path}>
          <Icon name="file" />
          <span>{f.path.split('/product/')[1]}</span>
          {PREVIEWABLE.test(f.name) && (
            <a className="icon-button" href={fileUrl(f.path)} target="_blank" rel="noreferrer" aria-label={L('Open', 'Abrir')}><Icon name="open" size={16} /></a>
          )}
          <a className="icon-button" href={fileUrl(f.path, true)} aria-label={L('Download', 'Descargar')}><Icon name="download" size={16} /></a>
        </li>
      ))}
    </ul>
  );
}

function projectActions(p) {
  if (p.retrospective && p.phase < 6) {
    return [{ action: 'document', label: L('Document this project', 'Documentar este proyecto'), primary: true, description: L('Your twin analyzes the material and folders, asks you about anything missing and builds the map.', 'El gemelo analiza el material y las carpetas, te pregunta lo que falte y arma el mapa.') }];
  }
  return [
    { action: 'advance', label: L('Continue the project', 'Seguir con el proyecto'), primary: true, description: L('Your twin moves on to the next step.', 'El gemelo continúa con el siguiente paso.') },
    { action: 'material', label: L('Review new material', 'Revisar material nuevo'), description: L('Reads what you uploaded in Material.', 'Lee lo que subiste en Material.') },
    { action: 'map', label: L('Update the map', 'Actualizar el mapa'), description: L('Redraws the project\'s summary card and diagram.', 'Redibuja la ficha y el diagrama del proyecto.') },
  ];
}

function Detail({ id, doc }) {
  const { data: p, error, reload } = useData(`/api/projects/${encodeURIComponent(id)}`);
  const [deleting, setDeleting] = useState(false);
  if (error) return <div className="card warning">{error.message} · <a href="#/projects">{L('Back', 'Volver')}</a></div>;
  if (!p) return <p className="muted">{L('Loading…', 'Cargando…')}</p>;

  const tabs = [
    { id: 'map', title: L('Map', 'Mapa') },
    { id: 'material', title: `${L('Material', 'Material')} (${p.material.length})` },
    { id: 'product', title: `${L('Deliverables', 'Entregables')} (${p.product.length})` },
    ...p.docs
      .filter((d) => !d.path.endsWith('/map.md'))
      .map((d) => ({ id: d.path.split('/').pop().replace(/\.md$/, ''), title: d.title, path: d.path })),
  ];
  const active = tabs.find((t) => t.id === doc) ?? tabs[0];

  let view;
  if (active.id === 'map') view = <MapTab p={p} />;
  else if (active.id === 'material') view = <Material p={p} />;
  else if (active.id === 'product') view = <Product p={p} />;
  else view = <Document path={active.path} />;

  return (
    <>
      <div className="row between">
        <a className="back" href="#/projects"><Icon name="back" size={16} />{L('Projects', 'Proyectos')}</a>
        <button className="button button-secondary danger-soft" onClick={() => setDeleting(true)}><Icon name="trash" size={16} />{L('Delete project', 'Borrar proyecto')}</button>
      </div>
      <header className="page-header">
        <h1>{p.name}</h1>
        {p.updated && <p className="muted">{L('Updated', 'Actualizado el')} {formatDate(p.updated)}</p>}
      </header>

      <div className="card"><Phases phase={p.phase} completed={p.completed} /></div>

      <div className="grid-2 block">
        <section className="card highlight">
          <h2>{L('Next decision', 'Próxima decisión')}</h2>
          <p>{p.nextDecision ?? <span className="muted">{L('Nothing pending on your side.', 'Nada pendiente de tu parte.')}</span>}</p>
        </section>
        <section className="card">
          <h2>{L('Pending', 'Pendientes')}</h2>
          {p.pending.length ? <ul>{p.pending.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">{L('Nothing pending.', 'Sin pendientes.')}</p>}
          {p.assumptions.length > 0 && (<>
            <h3>{L('Unvalidated assumptions', 'Supuestos sin validar')}</h3>
            <ul>{p.assumptions.map((x) => <li key={x}>🟡 {x}</li>)}</ul>
          </>)}
        </section>
      </div>

      <Twin type="project" id={p.id} actions={projectActions(p)} onDone={reload}
        intro={L('Press a button or write to it: answer its questions, approve a phase (“approved, let\'s continue”) or ask for changes.', 'Pulsa un botón o escríbele: responde a sus preguntas, aprueba una fase («aprobado, sigamos») o pídele cambios.')} />

      <Tabs base={`#/projects/${encodeURIComponent(p.id)}`} items={tabs} active={active.id} />
      {view}

      {deleting && (
        <Confirm title={L(`Delete the project “${p.name}”?`, `¿Borrar el proyecto «${p.name}»?`)}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => { await api.remove(`/api/projects/${encodeURIComponent(p.id)}`); window.location.hash = '#/projects'; }}>
          <p>{L('Its map, documents, uploaded material and the conversation with your twin will be removed from the app.', 'Se borrarán de la app su mapa, sus documentos, el material subido y la conversación con el gemelo.')}</p>
          <p className="muted">{L('To be safe, a copy is kept in your twin\'s recycle bin on your PC: if you make a mistake, ask it to restore it. The external folders you pointed to are not touched, and your logbook achievements are kept.', 'Por seguridad se guarda una copia en la papelera del gemelo, en tu PC: si te equivocas, pídele que lo recupere. Las carpetas externas que indicaste no se tocan, y tus logros de la bitácora se mantienen.')}</p>
        </Confirm>
      )}
    </>
  );
}

export default function Projects({ route }) {
  return route[0] ? <Detail id={route[0]} doc={route[1]} /> : <List />;
}
