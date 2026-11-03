import { useMemo, useState } from 'react';
import { useData } from '../api.js';
import Document from '../components/Document.jsx';
import Tabs from '../components/Tabs.jsx';
import { Copy } from '../components/Command.jsx';
import Twin from '../components/Twin.jsx';
import { L } from '../i18n.js';

const TABS = [
  { id: 'achievements', title: L('Achievements', 'Logros') },
  { id: 'skills', title: L('Skills', 'Habilidades') },
  { id: 'edit', title: L('Edit', 'Editar') },
];

function Achievements({ achievements }) {
  const [filter, setFilter] = useState('');
  const [skill, setSkill] = useState(null);

  const allSkills = useMemo(() => {
    const count = new Map();
    for (const a of achievements) for (const s of a.skills) count.set(s, (count.get(s) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
  }, [achievements]);

  const q = filter.toLowerCase();
  const visible = achievements.filter((a) =>
    (!skill || a.skills.includes(skill))
    && (!q || JSON.stringify(a).toLowerCase().includes(q)));

  return (
    <>
      <Twin type="general" id="journal" title={L('Log an achievement', 'Anotar un logro')} compact
        actions={[{ action: 'log', label: L('Log something I did', 'Anotar algo que hice'), primary: true, description: L('Tell it what you did and what the result was', 'Cuéntale qué hiciste y qué resultado tuvo'), askText: L('E.g.: I presented the metrics dictionary to the 6 managers and they approved it…', 'Ej.: presenté el diccionario de métricas a los 6 managers y lo aprobaron…') }]}
        intro={L('Did you do something worth remembering? An achievement, a course, a recognition, a problem you solved. Your twin writes it up for your CV.', '¿Hiciste algo que valga la pena recordar? Un logro, un curso, un reconocimiento, un problema que resolviste. El gemelo lo redacta para tu CV.')} />
      {achievements.length === 0 ? (
        <p className="muted block">{L('No achievements yet. They are logged automatically when you finish phases and deliverables with your twin, or you can tell it about them here.', 'Aún no hay logros. Se anotan solos cuando terminas fases y entregables con el gemelo, o puedes contárselos aquí.')}</p>
      ) : (<>
        <div className="filters block">
          <input type="search" placeholder={L('Search achievements…', 'Buscar en logros…')} value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="chips">
            {allSkills.map(([s, n]) => (
              <button key={s} className={`chip ${skill === s ? 'active' : ''}`}
                onClick={() => setSkill(skill === s ? null : s)}>{s} <span className="muted">{n}</span></button>
            ))}
          </div>
        </div>
        <div className="timeline">
          {visible.map((a, i) => (
            <article key={`${a.date}-${i}`} className="card achievement">
              <div className="row between">
                <span className="muted">{a.date}{a.project && a.project !== 'General' ? ` · ${a.project}` : ''}</span>
                {a.cvBullet && <Copy text={a.cvBullet} label={L('Copy for CV', 'Copiar para CV')} />}
              </div>
              <h3>{a.title}</h3>
              {a.whatIDid && <p>{a.whatIDid}</p>}
              {a.impact && <p><strong>{L('Impact', 'Impacto')}:</strong> {a.impact}</p>}
              {a.cvBullet && <blockquote>{a.cvBullet}</blockquote>}
              <div className="chips">
                {a.skills.map((s) => <span key={s} className="chip static">{s}</span>)}
                {a.tools.map((t) => <span key={t} className="chip static tool">{t}</span>)}
              </div>
              {a.evidence && <p className="muted">{L('Evidence', 'Evidencia')}: {a.evidence}</p>}
            </article>
          ))}
        </div>
      </>)}
    </>
  );
}

function Skills({ rows }) {
  if (rows.length === 0) return <p className="muted">{L('The skills matrix is filled in when your twin builds your profile from your CV, and it grows with every achievement.', 'La matriz se llena con /onboarding (desde tu CV) y crece con cada logro.')}</p>;
  const col = (r, i) => Object.values(r)[i] ?? '';
  const level = (r) => Number(String(col(r, 2)).match(/\d/)?.[0] ?? 0);
  const sorted = [...rows].sort((a, b) => level(b) - level(a));
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{L('Skill', 'Habilidad')}</th><th>{L('Category', 'Categoría')}</th><th>{L('Level', 'Nivel')}</th><th>{L('Evidence', 'Evidencia')}</th><th>{L('Last used', 'Última vez')}</th><th>{L('Target role', 'Rol objetivo')}</th></tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={col(r, 0)}>
              <td><strong>{col(r, 0)}</strong></td>
              <td>{col(r, 1)}</td>
              <td>
                <span className="level" title={L(`Level ${level(r)} of 4`, `Nivel ${level(r)} de 4`)}>
                  {[1, 2, 3, 4].map((n) => <span key={n} className={n <= level(r) ? 'filled' : ''} />)}
                </span>
              </td>
              <td className="muted">{col(r, 3)}</td>
              <td>{col(r, 4)}</td>
              <td>{col(r, 5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Journal({ route }) {
  const { data, error } = useData('/api/journal');
  const active = TABS.find((t) => t.id === route[0]) ?? TABS[0];
  const [file, setFile] = useState('journal/achievements.md');

  return (
    <>
      <header className="page-header">
        <h1>{L('Logbook', 'Bitácora')}</h1>
        <p className="muted">{L('Everything you do, with evidence. It is the source of your CV.', 'Todo lo que haces, con evidencia. Es la fuente de tu CV.')}</p>
      </header>
      <Tabs base="#/journal" items={TABS} active={active.id} />
      {error && <div className="card warning">{error.message}</div>}
      {active.id === 'edit' ? (<>
        <div className="row block">
          <select value={file} onChange={(e) => setFile(e.target.value)}>
            <option value="journal/achievements.md">{L('Achievements', 'Logros')}</option>
            <option value="journal/skills.md">{L('Skills', 'Habilidades')}</option>
          </select>
        </div>
        <Document path={file} />
      </>) : !data ? <p className="muted">{L('Loading…', 'Cargando…')}</p>
        : active.id === 'skills' ? <Skills rows={data.skills} />
          : <Achievements achievements={data.achievements} />}
    </>
  );
}
