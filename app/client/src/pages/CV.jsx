import { fileUrl, useData } from '../api.js';
import Document from '../components/Document.jsx';
import Icon from '../components/Icon.jsx';
import Twin from '../components/Twin.jsx';
import { L } from '../i18n.js';

export default function CV({ route }) {
  const { data: versions } = useData('/api/cv');
  const selected = versions?.find((v) => v.name === route[0]);

  return (
    <>
      <header className="page-header">
        <h1>CV</h1>
        <p className="muted">{L('Versions created from your profile and your logbook. Never with made-up data.', 'Versiones generadas a partir de tu perfil y tu bitácora. Nunca con datos inventados.')}</p>
      </header>

      <Twin type="general" id="cv" title={L('Create or update your CV', 'Crear o actualizar tu CV')} compact
        actions={[{ action: 'cv', label: L('Create a CV', 'Crear un CV'), primary: true, description: L('For which role? Also say which language you need it in', '¿Para qué puesto? Indica también el idioma si lo necesitas en inglés'), askText: L('E.g.: Technical Product Owner with AI, in English and Spanish', 'Ej.: Product Owner técnica con IA, en español e inglés') }]}
        intro={L('Your twin builds your CV from your real achievements, aimed at the role you tell it, and leaves the PDF ready. If it\'s for a specific job offer, add it in “Job offers” instead: that way it also analyses how well you fit.', 'El gemelo arma tu CV con tus logros reales, orientado al puesto que le digas, y te deja el PDF listo. Si es para una oferta concreta, mejor añádela en «Ofertas»: así analiza también tu encaje.')} />

      <section className="block">
        <h2>{L('Versions', 'Versiones')}</h2>
        {!versions ? <p className="muted">{L('Loading…', 'Cargando…')}</p> : versions.length === 0 ? (
          <p className="muted">{L('No versions yet.', 'Aún no hay versiones.')}</p>
        ) : (
          <ul className="file-list">
            {versions.map((v) => (
              <li key={v.path} className={selected?.path === v.path ? 'active' : ''}>
                <Icon name="cv" />
                {v.name.endsWith('.md')
                  ? <a href={`#/cv/${encodeURIComponent(v.name)}`}>{v.name}</a>
                  : <span>{v.name}</span>}
                <a className="icon-button" href={fileUrl(v.path, true)} aria-label={L('Download', 'Descargar')}><Icon name="download" size={16} /></a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected?.name.endsWith('.md') && <Document path={selected.path} />}
    </>
  );
}
