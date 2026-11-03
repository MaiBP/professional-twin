import { useState } from 'react';
import { api, useData } from '../api.js';
import Document from '../components/Document.jsx';
import Sources from '../components/Sources.jsx';
import Tabs from '../components/Tabs.jsx';
import Icon from '../components/Icon.jsx';
import Twin from '../components/Twin.jsx';
import Confirm from '../components/Confirm.jsx';
import { L } from '../i18n.js';

// Statuses arrive with their canonical English id; only what is shown is translated here.
const STATUSES = {
  New: L('New', 'Nueva'),
  Analyzed: L('Analyzed', 'Analizada'),
  Applied: L('Applied', 'Postulada'),
  Interview: L('Interview', 'Entrevista'),
  Offer: L('Offer', 'Oferta'),
  Discarded: L('Discarded', 'Descartada'),
};
const statusName = (s) => STATUSES[s] ?? s;

const fitLevel = (n) => (n == null ? 'none' : n >= 75 ? 'high' : n >= 50 ? 'medium' : 'low');
const titleOf = (o) => o.position ?? L('Untitled role', 'Puesto sin nombre');

// Fit bar 0-100 %.
function Fit({ value, large = false }) {
  return (
    <div className={`fit ${fitLevel(value)} ${large ? 'large' : ''}`}>
      <div className="fit-bar"><span style={{ width: `${value ?? 0}%` }} /></div>
      <span className="fit-value">{value == null ? L('Not analyzed', 'Sin analizar') : L(`${value}% fit`, `${value}% de encaje`)}</span>
    </div>
  );
}

function NewOffer() {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ company: '', position: '', location: '', link: '', text: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const change = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id } = await api.post('/api/offers', fields);
      // The analysis starts by itself: when you open the offer you already see the twin working.
      await api.post(`/api/twin/offer/${encodeURIComponent(id)}`, { action: 'analyze', label: L('Analyze whether I fit this offer', 'Analiza si encajo en esta oferta') }).catch(() => {});
      window.location.hash = `#/offers/${encodeURIComponent(id)}`;
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className="button" onClick={() => setOpen(true)}>
        <Icon name="upload" size={16} />{L('Add a job offer', 'Añadir una oferta')}
      </button>
    );
  }

  return (
    <form className="card compose" onSubmit={save}>
      <h2>{L('New job offer', 'Nueva oferta')}</h2>
      <div className="form-2">
        <label>{L('Company', 'Empresa')}<input value={fields.company} onChange={change('company')} placeholder={L('Company name', 'Nombre de la empresa')} /></label>
        <label>{L('Role', 'Puesto')}<input value={fields.position} onChange={change('position')} placeholder={L('E.g.: Technical Product Owner – AI', 'Ej.: Technical Product Owner – AI')} /></label>
        <label>{L('Location / work mode', 'Ubicación / modalidad')}<input value={fields.location} onChange={change('location')} placeholder={L('E.g.: London · hybrid', 'Ej.: Barcelona · híbrido')} /></label>
        <label>{L('Link', 'Enlace')}<input value={fields.link} onChange={change('link')} placeholder="https://…" /></label>
      </div>
      <label>{L('Offer text', 'Texto de la oferta')}
        <textarea rows={10} value={fields.text} onChange={change('text')} required
          placeholder={L('Paste the full description here: responsibilities, requirements, nice-to-haves, benefits…', 'Pega aquí la descripción completa: responsabilidades, requisitos, deseables, beneficios…')} />
      </label>
      {error && <div className="card warning">{error}</div>}
      <div className="row between">
        <span className="muted">{L('It is stored only on your PC. If you have it as a PDF or screenshot, you can attach it later.', 'Se guarda solo en tu PC. Si la tienes en PDF o captura, podrás adjuntarla después.')}</span>
        <div className="row">
          <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>{L('Cancel', 'Cancelar')}</button>
          <button className="button" disabled={saving}>{saving ? L('Saving…', 'Guardando…') : L('Save and analyze', 'Guardar y analizar')}</button>
        </div>
      </div>
    </form>
  );
}

function List() {
  const { data, error } = useData('/api/offers');
  const [filter, setFilter] = useState(null);
  if (error) return <div className="card warning">{error.message}</div>;

  const list = data?.offers ?? [];
  const visible = filter ? list.filter((o) => o.status === filter) : list;

  return (
    <>
      <header className="page-header">
        <h1>{L('Job offers', 'Ofertas')}</h1>
        <p className="muted">{L('Paste a job offer and your twin analyzes whether it fits your profile, what you are missing and how to tailor your CV. Track each application here.', 'Pega una oferta y el gemelo analiza si encaja con tu perfil, qué te falta y cómo ajustar tu CV. Aquí sigues cada candidatura.')}</p>
      </header>

      <NewOffer />

      {!data ? <p className="muted">{L('Loading…', 'Cargando…')}</p> : list.length === 0 ? (
        <p className="muted block">{L('No job offers yet. Press “Add a job offer” and paste its text: your twin analyzes it right away.', 'Aún no hay ofertas. Pulsa «Añadir una oferta» y pega su texto: el gemelo la analiza al momento.')}</p>
      ) : (
        <>
          <div className="chips block">
            <button className={`chip ${!filter ? 'active' : ''}`} onClick={() => setFilter(null)}>{L('All', 'Todas')} <span className="muted">{list.length}</span></button>
            {data.statuses.map((s) => {
              const n = list.filter((o) => o.status === s).length;
              return n > 0 && (
                <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(filter === s ? null : s)}>
                  {statusName(s)} <span className="muted">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="grid block">
            {visible.map((o) => (
              <a key={o.id} className={`card project offer ${o.status === 'Discarded' ? 'dimmed' : ''}`} href={`#/offers/${encodeURIComponent(o.id)}`}>
                <div className="row between">
                  <strong>{titleOf(o)}</strong>
                  <span className="tag">{statusName(o.status)}</span>
                </div>
                <span>{o.company ?? L('Company not specified', 'Empresa sin indicar')}{o.location ? ` · ${o.location}` : ''}</span>
                <Fit value={o.fit} />
                {o.verdict && <p className="next-decision"><strong>{o.verdict}</strong></p>}
                {o.nextStep && <p className="next-decision"><span className="muted">{L('Next step', 'Próximo paso')}:</span> {o.nextStep}</p>}
                <span className="muted">{o.received ? L(`Received ${o.received}`, `Recibida ${o.received}`) : o.id}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function StatusSelect({ o, reload }) {
  const [error, setError] = useState(null);
  const change = async (e) => {
    try {
      await api.put(`/api/offers/${encodeURIComponent(o.id)}/status`, { status: e.target.value });
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <label className="row">
      <span className="muted">{L('Status', 'Estado')}</span>
      <select value={o.status} onChange={change}>
        {o.statuses.map((s) => <option key={s} value={s}>{statusName(s)}</option>)}
      </select>
      {error && <span className="warning-text">{error}</span>}
    </label>
  );
}

const offerActions = (o) => (!o.analyzed
  ? [{ action: 'analyze', label: L('Analyze fit', 'Analizar encaje'), primary: true, description: L('Compares the offer with your profile, requirement by requirement.', 'Compara la oferta con tu perfil, requisito por requisito.') }]
  : [
    { action: 'cv', label: L('Create a CV for this offer', 'Crear CV para esta oferta'), primary: true },
    { action: 'letter', label: L('Write a cover letter', 'Escribir carta de presentación') },
    { action: 'interview', label: L('Prepare for the interview', 'Preparar la entrevista') },
    { action: 'analyze', label: L('Analyze again', 'Volver a analizar') },
  ]);

function Detail({ id, tab }) {
  const { data: o, error, reload } = useData(`/api/offers/${encodeURIComponent(id)}`);
  const [deleting, setDeleting] = useState(false);
  if (error) return <div className="card warning">{error.message} · <a href="#/offers">{L('Back', 'Volver')}</a></div>;
  if (!o) return <p className="muted">{L('Loading…', 'Cargando…')}</p>;

  const base = `/api/offers/${encodeURIComponent(o.id)}/files`;
  const tabs = [
    ...o.docs.map((d) => ({ id: d.name.replace(/\.md$/, ''), title: d.title, path: d.path })),
    { id: 'files', title: `${L('Files', 'Archivos')} (${o.files.length})` },
  ];
  const active = tabs.find((t) => t.id === tab)
    ?? tabs.find((t) => t.id === (o.analyzed ? 'analysis' : 'offer'))
    ?? tabs[0];

  return (
    <>
      <div className="row between">
        <a className="back" href="#/offers"><Icon name="back" size={16} />{L('Job offers', 'Ofertas')}</a>
        <button className="button button-secondary danger-soft" onClick={() => setDeleting(true)}><Icon name="trash" size={16} />{L('Delete offer', 'Borrar oferta')}</button>
      </div>
      <header className="page-header">
        <h1>{titleOf(o)}</h1>
        <p className="muted">{o.company ?? L('Company not specified', 'Empresa sin indicar')}{o.location ? ` · ${o.location}` : ''}{o.received ? ` · ${L('received', 'recibida')} ${o.received}` : ''}
          {o.link && /^https?:\/\//.test(o.link) && <> · <a href={o.link} target="_blank" rel="noreferrer">{L('see original offer', 'ver oferta original')}</a></>}
        </p>
      </header>

      <section className="card highlight">
        <div className="row between">
          <h2>{L('Fit', 'Encaje')}</h2>
          <StatusSelect o={o} reload={reload} />
        </div>
        <Fit value={o.fit} large />
        {o.verdict && <p><strong>{o.verdict}</strong></p>}
        {o.nextStep && <p><span className="muted">{L('Next step', 'Próximo paso')}:</span> {o.nextStep}</p>}
      </section>

      <Twin type="offer" id={o.id} actions={offerActions(o)} onDone={reload}
        intro={L('Press “Analyze fit” so your twin compares the offer with your profile. You can also ask it anything about this application.', 'Pulsa «Analizar encaje» para que el gemelo compare la oferta con tu perfil. También puedes preguntarle lo que quieras sobre esta candidatura.')} />

      <Tabs base={`#/offers/${encodeURIComponent(o.id)}`} items={tabs} active={active.id} />
      {active.id === 'files' ? (
        <>
          <p className="muted">{L('The offer as a PDF or screenshot, and the CVs or cover letters created for this application.', 'La oferta en PDF o captura, y los CV o cartas generados para esta candidatura.')}</p>
          <Sources url={base}
            deleteUrl={(f) => `${base}?path=${encodeURIComponent(f.relative)}`}
            nameOf={(f) => f.relative} />
        </>
      ) : (
        <Document path={active.path} />
      )}

      {deleting && (
        <Confirm title={L(`Delete the offer “${titleOf(o)}”?`, `¿Borrar la oferta «${titleOf(o)}»?`)}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => { await api.remove(`/api/offers/${encodeURIComponent(o.id)}`); window.location.hash = '#/offers'; }}>
          <p>{L('The offer, its analysis, the CVs and cover letters created for it and the conversation with your twin will be removed from the app.', 'Se borrarán de la app la oferta, su análisis, los CV y cartas generados para ella y la conversación con el gemelo.')}</p>
          <p className="muted">{L('To be safe, a copy is kept in your twin\'s recycle bin on your PC: if you make a mistake, ask it to restore it. If you only turned it down, you may prefer to change its status to “Discarded”.', 'Por seguridad se guarda una copia en la papelera del gemelo, en tu PC: si te equivocas, pídele que la recupere. Si solo la descartaste, quizá prefieras cambiar su estado a «Descartada».')}</p>
        </Confirm>
      )}
    </>
  );
}

export default function Offers({ route }) {
  return route[0] ? <Detail id={route[0]} tab={route[1]} /> : <List />;
}
