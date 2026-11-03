import { useEffect, useRef, useState } from 'react';
import { api, useData, WRITE_HEADERS } from '../api.js';
import Icon from '../components/Icon.jsx';
import Confirm from '../components/Confirm.jsx';
import { L, onThemeChange, changeSettings, language, locale, theme } from '../i18n.js';

const PLANS = { pro: 'Pro', max: 'Max', team: 'Team', enterprise: 'Enterprise', free: L('Free', 'Gratuito') };

// Steps to connect: choose the account type → open the Claude page → paste the code.
function Connect({ onDone, onCancel, switching }) {
  const [mode, setMode] = useState('subscription');
  const [url, setUrl] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const open = async () => {
    setBusy(true); setError(null);
    try {
      setUrl((await api.post('/api/config/ai/connect', { mode })).url);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const finish = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post('/api/config/ai/code', { code });
      onDone();
    } catch (e2) { setError(e2.message); setUrl(null); setCode(''); } finally { setBusy(false); }
  };
  const cancel = () => { api.post('/api/config/ai/cancel', {}).catch(() => {}); onCancel?.(); setUrl(null); };

  if (!url) {
    return (
      <div className="connect">
        <p><strong>{switching ? L('Which account do you want to connect now?', '¿Con qué cuenta quieres conectar ahora?') : L('What kind of account do you have?', '¿Qué tipo de cuenta tienes?')}</strong></p>
        <label className="radio-option">
          <input type="radio" name="mode" checked={mode === 'subscription'} onChange={() => setMode('subscription')} />
          <span><strong>{L('Claude subscription', 'Suscripción de Claude')}</strong><span className="muted">{L('Pro, Max, Team or Enterprise. The one you use on claude.ai.', 'Pro, Max, Team o Enterprise. La que usas en claude.ai.')}</span></span>
        </label>
        <label className="radio-option">
          <input type="radio" name="mode" checked={mode === 'console'} onChange={() => setMode('console')} />
          <span><strong>{L('Anthropic Console account', 'Cuenta de Anthropic Console')}</strong><span className="muted">{L('Pay as you go, for people with API credits.', 'Pago por uso, para quien tiene créditos de API.')}</span></span>
        </label>
        {error && <div className="card warning">{error}</div>}
        <div className="row form-buttons">
          {onCancel && <button className="button button-secondary" onClick={cancel}>{L('Cancel', 'Cancelar')}</button>}
          <button className="button" onClick={open} disabled={busy}>
            <Icon name="open" size={16} />{busy ? L('Opening…', 'Abriendo…') : L('Connect', 'Conectar')}
          </button>
        </div>
      </div>
    );
  }
  return (
    <form className="connect" onSubmit={finish}>
      <ol className="connect-steps">
        <li>{L('A Claude page opened in your browser. If you don\'t see it,', 'Se abrió una página de Claude en tu navegador. Si no la ves,')} <a href={url} target="_blank" rel="noreferrer">{L('open it here', 'ábrela aquí')}</a>.</li>
        <li>{L('Sign in with your account and press', 'Inicia sesión con tu cuenta y pulsa')} <strong>{L('Authorize', 'Autorizar')}</strong>.</li>
        <li>{L('Claude will show you a code. Copy it and paste it here:', 'Claude te mostrará un código. Cópialo y pégalo aquí:')}</li>
      </ol>
      <input className="code-field" value={code} onChange={(e) => setCode(e.target.value)} placeholder={L('Paste the code here', 'Pega aquí el código')} autoFocus spellCheck={false} />
      {error && <div className="card warning">{error}</div>}
      <div className="row form-buttons">
        <button type="button" className="button button-secondary" onClick={cancel}>{L('Cancel', 'Cancelar')}</button>
        <button className="button" disabled={busy || !code.trim()}>{busy ? L('Connecting…', 'Conectando…') : L('Finish connecting', 'Terminar conexión')}</button>
      </div>
    </form>
  );
}

function YourAi() {
  const { data: s, reload } = useData('/api/config/ai?refresh=1', { every: 0 });
  const [switching, setSwitching] = useState(false);
  const [notice, setNotice] = useState(null);

  const done = () => { setSwitching(false); setNotice(L('Done! Your twin can now work with this account.', '¡Listo! Tu gemelo ya puede trabajar con esta cuenta.')); reload(); };
  const disconnect = async () => {
    if (!window.confirm(L('Disconnect your Claude account? Your twin will stop working until you connect it again.', '¿Desconectar tu cuenta de Claude? El gemelo dejará de trabajar hasta que vuelvas a conectarla.'))) return;
    await api.post('/api/config/ai/disconnect', {});
    setNotice(null);
    reload();
  };

  if (!s) return <section className="card"><h2>{L('Your AI', 'Tu IA')}</h2><p className="muted">{L('Checking the connection…', 'Comprobando la conexión…')}</p></section>;

  return (
    <section className="card">
      <h2><Icon name="sparkle" /> {L('Your AI', 'Tu IA')}</h2>
      <p className="muted">{L('Your twin uses Claude to read, analyze and write. Connect your own account: each person uses theirs and usage is counted against it.', 'El gemelo usa Claude para leer, analizar y escribir. Conecta tu propia cuenta: cada persona usa la suya y el consumo se descuenta de ella.')}</p>

      {!s.installed && (
        <div className="card warning">
          <p><strong>{L('Claude Code is not installed on this PC yet.', 'Falta instalar Claude Code en este PC.')}</strong> {L('It is the program that lets your twin work.', 'Es el programa que permite al gemelo trabajar.')}</p>
          <ol>
            <li>{L('Install it following the instructions at', 'Instálalo siguiendo las instrucciones de')} <a href="https://claude.com/claude-code" target="_blank" rel="noreferrer">claude.com/claude-code</a> {L('(if it is a company PC, you may need help from IT).', '(si tu PC es de empresa, puede que necesites ayuda de IT).')}</li>
            <li>{L('Come back to this page and press “Check again”.', 'Vuelve a esta página y pulsa «Comprobar de nuevo».')}</li>
          </ol>
          <button className="button button-secondary" onClick={reload}>{L('Check again', 'Comprobar de nuevo')}</button>
        </div>
      )}

      {s.installed && s.connected && !switching && (
        <>
          <div className="connection-status ok">
            <span className="dot" />
            <div>
              <strong>{L('Connected', 'Conectado')}{s.email ? ` ${L('as', 'como')} ${s.email}` : ''}</strong>
              <p className="muted">
                {s.method === 'console' ? L('Anthropic Console (pay as you go)', 'Anthropic Console (pago por uso)') : `${L('Claude subscription', 'Suscripción de Claude')}${s.plan ? ` · ${L('plan', 'plan')} ${PLANS[s.plan] ?? s.plan}` : ''}`}
                {s.organization ? ` · ${s.organization}` : ''}
              </p>
            </div>
          </div>
          {s.plan === 'team' || s.plan === 'enterprise' ? (
            <p className="muted account-note">{L('This looks like a company account. Your CV, your job offers and your projects are processed with it. If you prefer to keep personal things separate, connect your own account with “Switch account”.', 'Esta parece una cuenta de empresa. Tu CV, tus ofertas y tus proyectos se procesan con ella. Si prefieres separar lo personal, conecta una cuenta propia con «Cambiar de cuenta».')}</p>
          ) : null}
          {notice && <div className="card success">{notice}</div>}
          <div className="row form-buttons">
            <button className="button button-secondary" onClick={disconnect}>{L('Disconnect', 'Desconectar')}</button>
            <button className="button button-secondary" onClick={() => { setSwitching(true); setNotice(null); }}>{L('Switch account', 'Cambiar de cuenta')}</button>
          </div>
        </>
      )}

      {s.installed && (!s.connected || switching) && (
        <>
          {!s.connected && (
            <div className="connection-status"><span className="dot" /><div><strong>{L('Not connected', 'Sin conectar')}</strong><p className="muted">{L('Your twin can\'t work until you connect an account.', 'El gemelo no puede trabajar hasta que conectes una cuenta.')}</p></div></div>
          )}
          <Connect onDone={done} onCancel={switching ? () => setSwitching(false) : undefined} switching={switching} />
        </>
      )}
    </section>
  );
}

function Backups() {
  const { data: automatic, reload } = useData('/api/backup/automatic', { every: 0 });
  const [file, setFile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const input = useRef(null);

  const choose = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.zip')) { setError(L('Choose the backup .zip file (without unzipping it).', 'Elige el archivo .zip de la copia (sin descomprimirlo).')); return; }
    setError(null); setFile(f); setConfirming(true);
  };
  const restore = async () => {
    const form = new FormData();
    form.append('backup', file);
    const r = await fetch('/api/backup/restore', { method: 'POST', headers: WRITE_HEADERS, body: form });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error ?? L('The backup could not be restored.', 'No se pudo restaurar la copia.'));
    setConfirming(false); setFile(null); setResult(d); reload();
  };

  return (
    <section className="card">
      <h2><Icon name="download" /> {L('Backups', 'Copias de seguridad')}</h2>
      <p className="muted">{L('Download all your information (profile, company, logbook, projects with their material and conversations, CVs and job offers) in a single file. If you lose your data or change PC, restore everything from that file.', 'Descarga toda tu información (perfil, empresa, bitácora, proyectos con su material y conversaciones, CV y ofertas) en un solo archivo. Si pierdes los datos o cambias de PC, recupéralo todo desde ese archivo.')}</p>

      <div className="backup-block">
        <div>
          <strong>{L('Save a backup', 'Guardar una copia')}</strong>
          <p className="muted">{L('Do it now and then and keep the file somewhere private (a drive or a personal cloud). It contains personal data: don\'t share it.', 'Hazlo de vez en cuando y guarda el archivo en un lugar privado (un disco o una nube personal). Contiene datos personales: no lo compartas.')}</p>
        </div>
        <a className="button" href="/api/backup" download><Icon name="download" size={16} />{L('Download backup', 'Descargar copia')}</a>
      </div>

      <div className="backup-block">
        <div>
          <strong>{L('Restore from a backup', 'Restaurar desde una copia')}</strong>
          <p className="muted">{L('Choose the .zip file you downloaded. It replaces what is there now with the backup content; before that, the app automatically saves the current data just in case.', 'Elige el archivo .zip que descargaste. Sustituye lo que hay ahora por el contenido de la copia; antes, la app guarda automáticamente lo actual por si acaso.')}</p>
        </div>
        <button className="button button-secondary" onClick={() => input.current?.click()}><Icon name="upload" size={16} />{L('Choose backup…', 'Elegir copia…')}</button>
        <input ref={input} type="file" accept=".zip" hidden onChange={choose} />
      </div>

      {error && <div className="card warning">{error}</div>}
      {result && (
        <div className="card success">
          {L('Backup restored', 'Copia restaurada')}: {result.files} {L('files', 'archivos')}{result.created ? ` ${L('from the backup of', 'de la copia del')} ${new Date(result.created).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. {L('You can now review your sections.', 'Ya puedes revisar tus secciones.')}
        </div>
      )}
      {automatic && (
        <p className="muted account-note">
          {L('Automatic backup from before the last restore', 'Copia automática de antes de la última restauración')}: {new Date(automatic.date).toLocaleString(locale(), { dateStyle: 'long', timeStyle: 'short' })}. <a href="/api/backup/automatic?download=1">{L('Download it', 'Descargarla')}</a> {L('(use it to undo the restore).', '(sirve para deshacer la restauración).')}
        </p>
      )}

      {confirming && (
        <Confirm
          title={L('Restore this backup?', '¿Restaurar esta copia?')} word={L('RESTORE', 'RESTAURAR')} buttonText={L('Restore', 'Restaurar')} busyText={L('Restoring…', 'Restaurando…')} icon="upload"
          onConfirm={restore} onCancel={() => { setConfirming(false); setFile(null); }}
        >
          <p>{L('You are about to replace all your current information with the contents of', 'Vas a sustituir toda tu información actual por la de')} <strong>{file?.name}</strong>.</p>
          <p className="muted">{L('Before doing so, the app saves an automatic backup of what is there now, so you can undo it.', 'Antes de hacerlo, la app guarda una copia automática de lo que hay ahora, para que puedas deshacerlo.')}</p>
        </Confirm>
      )}
    </section>
  );
}

// Interface language and light or dark theme.
function Appearance() {
  const [value, setValue] = useState({ language: language(), theme: theme() });
  const [busy, setBusy] = useState(false);
  useEffect(() => onThemeChange(() => setValue((v) => ({ ...v, theme: theme() }))), []);
  const change = (key) => async (e) => {
    const next = e.target.value;
    setValue((v) => ({ ...v, [key]: next }));
    setBusy(true);
    await changeSettings({ [key]: next });
    setBusy(false);
  };
  return (
    <section className="card">
      <h2><Icon name="screen" /> {L('Appearance & language', 'Apariencia e idioma')}</h2>
      <p className="muted">{L('Choose the language of the app and whether it looks light or dark. Your twin will also write new documents in this language.', 'Elige el idioma de la app y si se ve clara u oscura. El gemelo también escribirá los documentos nuevos en este idioma.')}</p>
      <div className="appearance-settings">
        <label>
          <span>{L('Language', 'Idioma')}</span>
          <select value={value.language} onChange={change('language')} disabled={busy}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <label>
          <span>{L('Theme', 'Tema')}</span>
          <select value={value.theme} onChange={change('theme')} disabled={busy}>
            <option value="system">{L('System (follow Windows)', 'Sistema (como Windows)')}</option>
            <option value="light">{L('Light', 'Claro')}</option>
            <option value="dark">{L('Dark', 'Oscuro')}</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function Shortcut() {
  const [status, setStatus] = useState(null);
  const create = async () => {
    setStatus({ type: 'busy' });
    try {
      await api.post('/api/config/shortcut', {});
      setStatus({ type: 'success', text: L('Done: there is now a “Professional Twin” shortcut on your desktop. Double-click it whenever you want to use the app.', 'Listo: en tu escritorio tienes «Gemelo profesional». Ábrelo con doble clic cuando quieras usar la app.') });
    } catch (e) { setStatus({ type: 'warning', text: e.message }); }
  };
  return (
    <section className="card">
      <h2><Icon name="home" /> {L('Desktop shortcut', 'Acceso directo')}</h2>
      <p className="muted">{L('Create a desktop icon that opens your twin with a double click, without starting it by hand.', 'Crea un icono en el escritorio que abre el gemelo con doble clic, sin tener que arrancarlo a mano.')}</p>
      {status?.text && <div className={`card ${status.type}`}>{status.text}</div>}
      <button className="button" onClick={create} disabled={status?.type === 'busy'}>
        {status?.type === 'busy' ? L('Creating…', 'Creando…') : L('Create desktop shortcut', 'Crear acceso directo en el escritorio')}
      </button>
    </section>
  );
}

function CloseApp() {
  const [closed, setClosed] = useState(false);
  const close = async () => {
    if (!window.confirm(L('Close the app? If your twin is working on something, it will stop.', '¿Cerrar la app? Si el gemelo está trabajando en algo, se detendrá.'))) return;
    await api.post('/api/config/close', {}).catch(() => {});
    setClosed(true);
  };
  return (
    <section className="card">
      <h2><Icon name="close" /> {L('Close the app', 'Cerrar la app')}</h2>
      {closed ? (
        <div className="card success">{L('The app has closed. You can close this tab now. To come back, use the desktop shortcut.', 'La app se cerró. Ya puedes cerrar esta pestaña. Para volver, usa el acceso directo del escritorio.')}</div>
      ) : (
        <>
          <p className="muted">{L('The app keeps running in the background even if you close the browser. Close it completely if you are not going to use it.', 'La app sigue funcionando en segundo plano aunque cierres el navegador. Ciérrala del todo si no la vas a usar.')}</p>
          <button className="button button-secondary" onClick={close}>{L('Close the app', 'Cerrar la app')}</button>
        </>
      )}
    </section>
  );
}

export default function Settings() {
  return (
    <>
      <header className="page-header">
        <h1>{L('Settings', 'Configuración')}</h1>
        <p className="muted">{L('Connect your AI, choose language and theme, back up your information and set up the app to open with one click.', 'Conecta tu IA, elige idioma y tema, guarda copias de tu información y prepara la app para abrirla con un clic.')}</p>
      </header>
      <YourAi />
      <Appearance />
      <Backups />
      <Shortcut />
      <CloseApp />
    </>
  );
}
