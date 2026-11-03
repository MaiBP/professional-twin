import { L } from '../i18n.js';

export const PHASES = L(
  ['Capture', 'Discovery', 'Definition', 'Plan', 'Build', 'Delivery & adoption', 'Closure'],
  ['Captura', 'Descubrimiento', 'Definición', 'Plan', 'Construcción', 'Entrega y adopción', 'Cierre'],
);

// Phase line of a project. `compact` shows only the dots.
export default function Phases({ phase, completed = [], compact = false }) {
  return (
    <ol className={`phases ${compact ? 'compact' : ''}`} aria-label={`${L('Current phase', 'Fase actual')}: ${PHASES[phase]}`}>
      {PHASES.map((name, i) => {
        const state = completed.includes(i) || i < phase ? 'done' : i === phase ? 'current' : 'pending';
        return (
          <li key={name} className={state} title={`${i}. ${name}`}>
            <span className="dot">{state === 'done' ? '✓' : i}</span>
            {!compact && <span className="phase-name">{name}</span>}
          </li>
        );
      })}
    </ol>
  );
}
