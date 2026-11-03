import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { parse, rebuild } from './formMd.js';
import { L } from '../i18n.js';

// Form editor for the twin's documents: fields, checkboxes, tables, texts and lists.
// The conversion lives in formMd.js and keeps everything else intact (headings, comments, diagrams).

const MODE_LABEL = { list: L('One item per line', 'Un elemento por línea'), quote: '', paragraph: '' };

export default function Form({ content, onSave, onCancel, saving }) {
  const initial = useMemo(() => parse(content.replace(/\r\n/g, '\n')), [content]);
  const [blocks, setBlocks] = useState(initial);
  const change = (j, changes) => setBlocks((bs) => bs.map((b, k) => (k === j ? { ...b, ...changes } : b)));
  const editable = blocks.some((b) => ['field', 'check', 'table', 'text'].includes(b.type));

  const save = (e) => {
    e.preventDefault();
    onSave(rebuild(blocks));
  };

  return (
    <form className="card doc-form" onSubmit={save}>
      {!editable && <p className="muted">{L('This document has no editable fields.', 'Este documento no tiene campos editables.')}</p>}
      {blocks.map((b, j) => {
        if (b.type === 'heading') {
          const Tag = b.level === 1 ? 'h2' : 'h3';
          return <Tag key={j} className={`form-title level-${b.level}`}>{b.text.replace(/[*_`]/g, '')}</Tag>;
        }
        if (b.type === 'fixed') {
          if (!b.code) return null;
          return (
            <div key={j} className="form-fixed">
              <Icon name="map" size={16} />
              {/^(map|mapa|mermaid)\b/.test(b.code) ? L('Project diagram: your twin draws and updates it.', 'Diagrama del proyecto: lo dibuja y actualiza el gemelo.') : L('Technical block: kept as it is.', 'Bloque técnico: se conserva tal cual.')}
            </div>
          );
        }
        if (b.type === 'field') {
          const long = b.value.length > 70;
          return (
            <label key={j} className="form-field">
              <span>{b.key}</span>
              {long
                ? <textarea rows={3} value={b.value} placeholder={b.hint} onChange={(e) => change(j, { value: e.target.value })} />
                : <input value={b.value} placeholder={b.hint} onChange={(e) => change(j, { value: e.target.value })} />}
            </label>
          );
        }
        if (b.type === 'check') {
          return (
            <label key={j} className="form-check">
              <input type="checkbox" checked={b.checked} onChange={(e) => change(j, { checked: e.target.checked })} />
              <span>{b.text}</span>
            </label>
          );
        }
        if (b.type === 'table') {
          const { rows } = b;
          const setCell = (r, c, v) => change(j, { rows: rows.map((row, x) => (x === r ? row.map((cell, y) => (y === c ? v : cell)) : row)) });
          return (
            <div key={j} className="form-table">
              <div className="table-wrap">
                <table>
                  <thead><tr>{b.header.map((h) => <th key={h}>{h}</th>)}<th aria-label={L('Actions', 'Acciones')} /></tr></thead>
                  <tbody>
                    {rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}><textarea rows={1} value={cell} aria-label={b.header[c]} onChange={(e) => setCell(r, c, e.target.value)} /></td>
                        ))}
                        <td><button type="button" className="icon-button" aria-label={L('Remove row', 'Quitar fila')}
                          onClick={() => change(j, { rows: rows.filter((_, x) => x !== r) })}><Icon name="trash" size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="button button-secondary" onClick={() => change(j, { rows: [...rows, b.header.map(() => '')] })}>+ {L('Add row', 'Añadir fila')}</button>
            </div>
          );
        }
        // text
        const textRows = Math.min(12, Math.max(b.mode === 'list' ? 3 : 2, b.value.split('\n').length + 1));
        return (
          <label key={j} className="form-text">
            {MODE_LABEL[b.mode] && <span className="muted">{MODE_LABEL[b.mode]}</span>}
            <textarea rows={textRows} value={b.value} placeholder={b.hint || L('Write here…', 'Escribe aquí…')} onChange={(e) => change(j, { value: e.target.value })} />
          </label>
        );
      })}
      <div className="row between form-buttons">
        <span className="muted">{L('Changes are saved on your PC and your twin will take them into account.', 'Los cambios se guardan en tu PC y el gemelo los tendrá en cuenta.')}</span>
        <div className="row">
          <button type="button" className="button button-secondary" onClick={onCancel}>{L('Cancel', 'Cancelar')}</button>
          <button className="button" disabled={saving}>{saving ? L('Saving…', 'Guardando…') : L('Save changes', 'Guardar cambios')}</button>
        </div>
      </div>
    </form>
  );
}
