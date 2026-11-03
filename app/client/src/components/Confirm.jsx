import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { L } from '../i18n.js';

// Confirmation dialog for sensitive actions: the given word must be typed to continue.
export default function Confirm({
  title, children, word = L('DELETE', 'BORRAR'), buttonText = L('Delete', 'Borrar'), busyText = L('Deleting…', 'Borrando…'),
  icon = 'trash', onConfirm, onCancel,
}) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);

  useEffect(() => {
    dialog.current?.showModal();
    const d = dialog.current;
    const close = (e) => { e.preventDefault(); onCancel(); };
    d?.addEventListener('cancel', close);
    return () => d?.removeEventListener('cancel', close);
  }, [onCancel]);

  const confirm = async (e) => {
    e.preventDefault();
    if (typed.trim().toUpperCase() !== word) return;
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialog} className="dialog" aria-labelledby="dialog-title">
      <form onSubmit={confirm}>
        <div className="dialog-icon"><Icon name="warning" size={26} /></div>
        <h2 id="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        <label className="dialog-field">
          {L('To confirm, type', 'Para confirmar, escribe')} <strong>{word}</strong>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
        </label>
        {error && <div className="card warning">{error}</div>}
        <div className="row dialog-buttons">
          <button type="button" className="button button-secondary" onClick={onCancel}>{L('Cancel', 'Cancelar')}</button>
          <button className="button danger" disabled={typed.trim().toUpperCase() !== word || busy}>
            <Icon name={icon} size={16} />{busy ? busyText : buttonText}
          </button>
        </div>
      </form>
    </dialog>
  );
}
