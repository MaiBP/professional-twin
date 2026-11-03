import { useData } from '../api.js';
import { L } from '../i18n.js';
import Phases from '../components/Phases.jsx';
import Twin from '../components/Twin.jsx';
import Icon from '../components/Icon.jsx';

function GettingStarted({ s }) {
  const steps = [
    { done: s.sources.profile > 0, title: L('Upload your CV and certificates', 'Sube tu CV y certificados'), link: '#/profile/sources', action: L('Go to upload', 'Ir a subir') },
    { done: s.complete.profile, title: L('Build your profile with your twin', 'Construye tu perfil con el gemelo'), link: '#/profile', action: L('Go to my profile', 'Ir a mi perfil') },
    { done: s.complete.criteria && s.complete.goals && s.complete.company, title: L('Fill in how you work, where you are heading and your company', 'Completa cómo trabajas, hacia dónde vas y tu empresa'), link: '#/profile', action: L('Go to my profile', 'Ir a mi perfil') },
    { done: s.projects.length > 0, title: L('Start or document your first project', 'Empieza o documenta tu primer proyecto'), link: '#/projects', action: L('Go to projects', 'Ir a proyectos') },
  ];
  const doneCount = steps.filter((p) => p.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.find((p) => !p.done);
  return (
    <section className="card highlight">
      <div className="row between">
        <h2>{L('Getting started', 'Puesta en marcha')}</h2>
        <span className="muted">{L(`${doneCount} of ${steps.length}`, `${doneCount} de ${steps.length}`)}</span>
      </div>
      <div className="progress"><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      <ol className="steps">
        {steps.map((p) => (
          <li key={p.title} className={p.done ? 'done' : p === next ? 'next' : ''}>
            <span className="check">{p.done ? <Icon name="ok" size={14} /> : null}</span>
            <span>{p.title}</span>
          </li>
        ))}
      </ol>
      <a className="button" href={next.link}>{next.action}</a>
    </section>
  );
}

export default function Home() {
  const { data: s, error } = useData('/api/summary');
  if (error) return <div className="card warning">{error.message}</div>;
  if (!s) return <p className="muted">{L('Loading…', 'Cargando…')}</p>;

  const active = s.projects.filter((p) => p.phase < 6 || !p.completed.includes(6));
  const waiting = s.projects.filter((p) => p.nextDecision);

  return (
    <>
      <header className="page-header">
        <h1>{L('Home', 'Inicio')}</h1>
        <p className="muted">{L('What your twin knows about you, what you are working on and what you have achieved.', 'Lo que tu gemelo sabe de ti, en qué estás trabajando y lo que has logrado.')}</p>
      </header>

      <GettingStarted s={s} />

      <Twin type="general" id="home" title={L('Your twin', 'Tu gemelo')} compact
        actions={[
          { action: 'status', label: L('Where are we?', '¿En qué estamos?'), primary: true, description: L('Summary of projects, pending items and achievements.', 'Resumen de proyectos, pendientes y logros.') },
          { action: 'mentor', label: L('Mentoring session', 'Sesión de mentoría'), description: L('Your progress towards the role you want.', 'Tu progreso frente al rol que buscas.') },
        ]}
        intro={L('Ask it anything about your work or your career, or press a button.', 'Pregúntale lo que quieras sobre tu trabajo o tu carrera, o pulsa un botón.')} />

      <section className="kpis">
        <a className="kpi" href="#/projects"><span className="kpi-value">{active.length}</span><span>{L('Active projects', 'Proyectos activos')}</span></a>
        <a className="kpi" href="#/journal"><span className="kpi-value">{s.achievements.total}</span><span>{L('Achievements logged', 'Logros registrados')}</span></a>
        <a className="kpi" href="#/journal/skills"><span className="kpi-value">{s.skills}</span><span>{L('Skills with evidence', 'Habilidades con evidencia')}</span></a>
        <a className="kpi" href="#/cv"><span className="kpi-value">{s.cvVersions}</span><span>{L('CV versions', 'Versiones de CV')}</span></a>
      </section>

      {waiting.length > 0 && (
        <section className="block">
          <h2>{L('Waiting for your answer', 'Esperando tu respuesta')}</h2>
          <ul className="simple-list">
            {waiting.map((p) => (
              <li key={p.id}><a href={`#/projects/${encodeURIComponent(p.id)}`}><strong>{p.name}:</strong></a> {p.nextDecision}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="block">
        <div className="row between"><h2>{L('Projects', 'Proyectos')}</h2><a href="#/projects">{L('See all', 'Ver todos')}</a></div>
        {active.length === 0 ? (
          <p className="muted">{L('No projects yet. Tell your twin about a need from', 'Aún no hay proyectos. Cuéntale una necesidad al gemelo desde')} <a href="#/projects">{L('Projects', 'Proyectos')}</a>.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{L('Project', 'Proyecto')}</th><th>{L('Phase', 'Fase')}</th><th>{L('Next decision', 'Próxima decisión')}</th></tr></thead>
              <tbody>
                {active.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td><a href={`#/projects/${encodeURIComponent(p.id)}`}>{p.name}</a></td>
                    <td><Phases phase={p.phase} completed={p.completed} compact /><span className="muted">{p.phaseName}</span></td>
                    <td>{p.nextDecision ?? <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="block">
        <div className="row between"><h2>{L('Recent achievements', 'Logros recientes')}</h2><a href="#/journal">{L('See logbook', 'Ver bitácora')}</a></div>
        {s.achievements.recent.length === 0 ? (
          <p className="muted">{L('Your logbook fills up by itself as you work with your twin. You can also tell it about an achievement in the', 'La bitácora se llena sola a medida que trabajas con el gemelo. También puedes contarle un logro en la')} <a href="#/journal">{L('Logbook', 'Bitácora')}</a>.</p>
        ) : (
          <ul className="simple-list">
            {s.achievements.recent.map((a, i) => (
              <li key={i}><span className="muted">{a.date}</span> · {a.cvBullet ?? a.title}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
