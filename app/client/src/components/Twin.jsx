import { useEffect, useRef, useState } from 'react';
import { api, useData } from '../api.js';
import { Markdown } from './Document.jsx';
import Icon from './Icon.jsx';
import { L, locale } from '../i18n.js';

const formatTime = (iso) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Panel to work with the twin without commands: action buttons, live progress and chat.
// `actions`: [{ action, label, description?, askText?: placeholder, primary? }]
export default function Twin({ type, id, title = L('Your twin', 'Tu gemelo'), intro, actions = [], onDone, placeholder, compact = false }) {
  const url = `/api/twin/${type}/${encodeURIComponent(id)}`;
  const [working, setWorking] = useState(false);
  const { data: c, reload } = useData(url, { every: working ? 1500 : 6000 });
  const [text, setText] = useState('');
  const [withText, setWithText] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const end = useRef(null);
  const previous = useRef(null);

  const state = c?.state ?? 'idle';
  useEffect(() => {
    setWorking(state === 'working');
    if (previous.current === 'working' && state !== 'working') onDone?.();
    previous.current = state;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = c?.messages ?? [];
  const visible = showAll ? messages : messages.slice(-6);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages.length, c?.steps?.length]);

  const send = async (body) => {
    setError(null);
    try {
      await api.post(url, body);
      setWorking(true);
      setText('');
      setWithText(null);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const press = (a) => {
    if (a.askText) { setWithText(a); setText(''); return; }
    send({ action: a.action, label: a.label });
  };

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    if (withText) send({ action: withText.action, message: t, label: `${withText.label}: ${t}` });
    else send({ message: t });
  };

  return (
    <section className={`card twin-panel ${compact ? 'compact' : ''}`}>
      <div className="twin-header">
        <span className={`twin-avatar ${working ? 'thinking' : ''}`} aria-hidden="true" />
        <div>
          <h2>{title}</h2>
          <p className="muted">{working ? L('Working…', 'Trabajando…') : state === 'error' ? L('Something went wrong in the last task', 'Algo falló en la última tarea') : L('Available', 'Disponible')}</p>
        </div>
      </div>

      {actions.length > 0 && !working && (
        <div className="twin-actions">
          {actions.map((a) => (
            <button key={a.action} type="button" className={`button ${a.primary ? '' : 'button-secondary'}`} onClick={() => press(a)} title={a.description}>
              {a.primary && <Icon name="sparkle" size={16} />}{a.label}
            </button>
          ))}
        </div>
      )}

      {messages.length === 0 && !working && intro && <p className="twin-intro">{intro}</p>}

      {messages.length > 0 && (
        <div className="chat">
          {messages.length > visible.length && (
            <button type="button" className="link-button" onClick={() => setShowAll(true)}>{L(`See full conversation (${messages.length} messages)`, `Ver conversación completa (${messages.length} mensajes)`)}</button>
          )}
          {visible.map((m, i) => (
            <div key={i} className={`bubble ${m.role} ${m.notice ? 'warning' : ''}`}>
              {m.role === 'twin' ? <Markdown text={m.text} /> : <p>{m.text}</p>}
              <span className="bubble-time">{formatTime(m.date)}</span>
            </div>
          ))}
        </div>
      )}

      {working && (
        <div className="twin-progress" aria-live="polite">
          <div className="row between">
            <strong><span className="spinner" aria-hidden="true" /> {L('Your twin is working', 'El gemelo está trabajando')}</strong>
            <button type="button" className="button button-secondary" onClick={() => api.post(`${url}/stop`, {}).then(reload)}>{L('Stop', 'Detener')}</button>
          </div>
          <ul>
            {(c?.steps ?? []).slice(-6).map((s, i, arr) => (
              <li key={i} className={i === arr.length - 1 ? 'current' : ''}>{i === arr.length - 1 ? '…' : '✓'} {s.text}</li>
            ))}
            {(c?.steps ?? []).length === 0 && <li className="current">… {L('Reading your context', 'Leyendo tu contexto')}</li>}
          </ul>
          <p className="muted">{L('This can take a few minutes. You can keep using the app: the result will appear here.', 'Puede tardar unos minutos. Puedes seguir usando la app: el resultado aparecerá aquí.')}</p>
        </div>
      )}
      <div ref={end} />

      {error && <div className="card warning">{error}</div>}

      {!working && (
        <form className="chat-input" onSubmit={submit}>
          {withText && (
            <div className="row between chat-context">
              <span><strong>{withText.label}</strong> · {withText.description ?? L('Give it the details', 'Cuéntale los detalles')}</span>
              <button type="button" className="link-button" onClick={() => setWithText(null)}>{L('Cancel', 'Cancelar')}</button>
            </div>
          )}
          <div className="chat-row">
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={withText?.askText ?? placeholder ?? (messages.length ? L('Reply or ask your twin for something…', 'Responde o pídele algo al gemelo…') : L('Write to your twin…', 'Escríbele al gemelo…'))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }} autoFocus={!!withText} />
            <button className="button" disabled={!text.trim()} aria-label={L('Send', 'Enviar')}><Icon name="send" size={16} />{L('Send', 'Enviar')}</button>
          </div>
          <span className="muted chat-hint">{L('Enter to send · Shift + Enter for a new line', 'Enter para enviar · Mayús + Enter para salto de línea')}</span>
        </form>
      )}
    </section>
  );
}
