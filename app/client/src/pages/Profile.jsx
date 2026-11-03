import { useData } from '../api.js';
import Document from '../components/Document.jsx';
import Sources from '../components/Sources.jsx';
import Tabs from '../components/Tabs.jsx';
import Twin from '../components/Twin.jsx';
import { L } from '../i18n.js';

const TABS = [
  { id: 'profile', title: L('Profile', 'Perfil'), path: 'profile/profile.md', key: 'profile' },
  { id: 'criteria', title: L('How I work', 'Cómo trabajo'), path: 'profile/criteria.md', key: 'criteria' },
  { id: 'goals', title: L('Where I\'m heading', 'Hacia dónde voy'), path: 'profile/goals.md', key: 'goals' },
  { id: 'sources', title: L('CV and certificates', 'CV y certificados') },
];

const ACTIONS = [
  { action: 'onboarding', label: L('Complete or update my profile', 'Completar o actualizar mi perfil'), primary: true, description: L('Reads your CV and certificates and gives you a short interview.', 'Lee tu CV y certificados y te hace una entrevista breve.') },
  { action: 'mentor', label: L('Mentoring session', 'Sesión de mentoría'), description: L('Reviews your progress, your gaps and your development plan.', 'Revisa tu progreso, tus brechas y tu plan de desarrollo.') },
];

export default function Profile({ route }) {
  const { data: s, reload } = useData('/api/summary');
  const active = TABS.find((t) => t.id === route[0]) ?? TABS[0];
  const items = TABS.map((t) => ({ ...t, mark: t.key && s && !s.complete[t.key] ? L('To complete', 'Por completar') : null }));

  return (
    <>
      <header className="page-header">
        <h1>{L('Profile', 'Perfil')}</h1>
        <p className="muted">{L('Who you are, how you work and where you are heading. Your twin takes it into account in everything it does for you.', 'Quién eres, cómo trabajas y hacia dónde vas. El gemelo lo tiene en cuenta en todo lo que hace por ti.')}</p>
      </header>
      <Twin type="general" id="profile" title={L('Your twin', 'Tu gemelo')} actions={ACTIONS} onDone={reload} compact
        intro={L('Upload your CV in “CV and certificates” and press “Complete or update my profile”. Your twin reads it, asks you a few questions and fills in these pages for you.', 'Sube tu CV en «CV y certificados» y pulsa «Completar o actualizar mi perfil». El gemelo lo lee, te hace unas preguntas y rellena estas páginas por ti.')} />
      <Tabs base="#/profile" items={items} active={active.id} />
      {active.id === 'sources' ? (
        <Sources area="profile"
          description={L('Your CV, certificates, degrees, performance reviews or your LinkedIn profile as a PDF. Then press “Complete or update my profile”.', 'Tu CV, certificados, títulos, evaluaciones o tu perfil de LinkedIn en PDF. Después pulsa «Completar o actualizar mi perfil».')} />
      ) : (
        <Document path={active.path}
          templateNotice={{
            text: active.id === 'profile'
              ? L('Upload your CV in “CV and certificates” and press “Complete or update my profile”: your twin fills it in for you.', 'Sube tu CV en «CV y certificados» y pulsa «Completar o actualizar mi perfil»: el gemelo lo completa por ti.')
              : L('Your twin fills it in with a short interview when you press “Complete or update my profile”. You can also edit it yourself.', 'El gemelo lo completa con una entrevista breve al pulsar «Completar o actualizar mi perfil». También puedes editarlo tú.'),
          }} />
      )}
    </>
  );
}
