import { useState } from 'react';
import Icon from './Icon.jsx';
import { L } from '../i18n.js';

export function Copy({ text, label = L('Copy', 'Copiar') }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button className="button button-secondary" onClick={copy} type="button">
      <Icon name={done ? 'ok' : 'copy'} size={16} />
      {done ? L('Copied', 'Copiado') : label}
    </button>
  );
}

// Shows a command ready to paste into Claude Code.
export function Command({ text, note }) {
  return (
    <div className="command">
      <code>{text}</code>
      <Copy text={text} />
      {note && <p className="command-note">{note}</p>}
    </div>
  );
}

// Form that turns free text into a command for Claude Code.
export function ComposeCommand({ command, label, placeholder, help }) {
  const [text, setText] = useState('');
  const final = `${command} ${text.trim()}`.trim();
  return (
    <div className="card compose">
      <label className="compose-label" htmlFor={`c-${command}`}>{label}</label>
      <textarea id={`c-${command}`} rows={3} value={text} placeholder={placeholder}
        onChange={(e) => setText(e.target.value)} />
      <div className="row between">
        <span className="muted">{help ?? L('Copy and paste it into the Claude Code chat.', 'Copia y pega en el chat de Claude Code.')}</span>
        <Copy text={final} label={`${L('Copy', 'Copiar')} ${command}`} />
      </div>
    </div>
  );
}
