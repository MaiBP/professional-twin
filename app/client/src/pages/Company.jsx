import Document from '../components/Document.jsx';
import Sources from '../components/Sources.jsx';
import Tabs from '../components/Tabs.jsx';
import Twin from '../components/Twin.jsx';
import { L } from '../i18n.js';

const TABS = [
  { id: 'context', title: L('Context', 'Contexto') },
  { id: 'sources', title: L('Company material', 'Material de la empresa') },
];

export default function Company({ route }) {
  const active = TABS.find((t) => t.id === route[0]) ?? TABS[0];
  return (
    <>
      <header className="page-header">
        <h1>{L('Company', 'Empresa')}</h1>
        <p className="muted">{L('Business, area, key people, tools and constraints. This way your twin suggests solutions you can actually use.', 'Negocio, área, personas clave, herramientas y restricciones. Así el gemelo propone soluciones que de verdad puedes usar.')}</p>
      </header>
      <Twin type="general" id="company" title={L('Your twin', 'Tu gemelo')} compact
        actions={[{ action: 'onboarding', label: L('Update the company context', 'Actualizar el contexto de la empresa'), primary: true, description: L('Reads the company material and asks you about anything missing.', 'Lee el material de la empresa y te pregunta lo que falte.') }]}
        intro={L('Upload material from your company (org charts, presentations, processes) or tell it what\'s new, for example a change of team or tools.', 'Sube material de tu empresa (organigramas, presentaciones, procesos) o cuéntale novedades, por ejemplo un cambio de área o de herramientas.')} />
      <Tabs base="#/company" items={TABS} active={active.id} />
      {active.id === 'sources' ? (
        <Sources area="context"
          description={L('Org charts, presentations, processes, manuals or sample reports. First remove any personal data about customers or employees that isn\'t needed.', 'Organigramas, presentaciones, procesos, manuales o ejemplos de informes. Antes, quita los datos personales de clientes o empleados que no hagan falta.')} />
      ) : (
        <Document path="context/company.md"
          templateNotice={{ text: L('Your twin fills it in from the material you upload and a short interview.', 'El gemelo lo completa a partir del material que subas y de una breve entrevista.') }} />
      )}
    </>
  );
}
