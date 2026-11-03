import { useEffect, useState } from 'react';
import { SECTIONS } from './sections.jsx';
import Icon from './components/Icon.jsx';
import Print from './pages/Print.jsx';
import { useData } from './api.js';
import { L, onThemeChange, changeSettings, effectiveTheme } from './i18n.js';

// Banner shown across the app when the twin has no AI account connected.
function AiBanner({ section }) {
  const { data } = useData('/api/config/ai', { every: 30000 });
  if (!data || data.connected || section === 'settings') return null;
  return (
    <div className="card warning ai-banner">
      <span>
        <strong>{L('Your twin is not connected to your AI yet.', 'Tu gemelo aún no está conectado a tu IA.')}</strong>{' '}
        {data.installed
          ? L('Connect your Claude account so it can work.', 'Conecta tu cuenta de Claude para que pueda trabajar.')
          : L('Claude Code is not installed on this PC yet.', 'Falta instalar Claude Code en este PC.')}
      </span>
      <a className="button" href="#/settings">{L('Go to Settings', 'Ir a Configuración')}</a>
    </div>
  );
}

// Compact button to switch between light and dark.
function ThemeButton() {
  const [effective, setEffective] = useState(effectiveTheme);
  useEffect(() => onThemeChange(() => setEffective(effectiveTheme())), []);
  const dark = effective === 'dark';
  const text = dark ? L('Switch to light theme', 'Cambiar a tema claro') : L('Switch to dark theme', 'Cambiar a tema oscuro');
  return (
    <button type="button" className="icon-button theme-button" onClick={() => changeSettings({ theme: dark ? 'light' : 'dark' })}
      aria-label={text} title={text}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

const readHash = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

export default function App() {
  const [route, setRoute] = useState(readHash);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onChange = () => { setRoute(readHash()); setMenuOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const [id = 'home', ...rest] = route;
  // PDF view: no menu or frame.
  if (id === 'print' && rest[0]) return <Print id={rest[0]} />;
  const section = SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
  const { Page } = section;
  const name = L('Professional Twin', 'Gemelo profesional');

  return (
    <div className="frame">
      <header className="mobile-bar">
        <button className="icon-button" onClick={() => setMenuOpen((v) => !v)} aria-label={L('Menu', 'Menú')}>
          <Icon name="menu" />
        </button>
        <span className="brand-text">{name}</span>
        <ThemeButton />
      </header>

      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-logo" aria-hidden="true" />
          <div>
            <div className="brand-text">{name}</div>
            <div className="brand-sub">{L('Your AI career companion', 'Tu asistente de carrera')}</div>
          </div>
        </div>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#/${s.id}`} className={s.id === section.id ? 'active' : ''}>
                <Icon name={s.icon} />
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="sidebar-foot">
          <p>{L('Your data is stored on this PC. Questions? See Help.', 'Tus datos se guardan en este PC. ¿Dudas? Mira la Ayuda.')}</p>
          <ThemeButton />
        </div>
      </nav>

      <main className="content">
        <AiBanner section={section.id} />
        <Page route={rest} />
      </main>
    </div>
  );
}
