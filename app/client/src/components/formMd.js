// Markdown ⇄ editable blocks conversion for the Form. No dependencies, so it can be tested on its own.

const RE_FIELD = /^(\s*-\s+)\*\*(.+?):\*\*\s?(.*)$/;
const RE_CHECK = /^(\s*-\s+)\[([ xX])\]\s+(.*)$/;
const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_TABLE = /^\s*\|.*\|\s*$/;
const RE_SEPARATOR = /^\s*\|?\s*:?-{2,}/;
const isPlaceholder = (v) => /^_?\(.*\)_?$/.test(v.trim()) || /^_.*_$/.test(v.trim());
const cleanPlaceholder = (v) => v.trim().replace(/^_?\(?|\)?_?$/g, '');
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function parse(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  let textBlock = null;
  const closeText = () => { if (textBlock) { blocks.push(textBlock); textBlock = null; } };

  while (i < lines.length) {
    const l = lines[i];
    const noCr = l.replace(/\r$/, '');
    // HTML comments (may span several lines): kept hidden.
    if (noCr.trim().startsWith('<!--')) {
      closeText();
      const start = i;
      while (i < lines.length && !lines[i].includes('-->')) i++;
      blocks.push({ type: 'fixed', lines: lines.slice(start, i + 1), hidden: true });
      i++; continue;
    }
    // Code blocks or diagrams: kept and shown as "not editable".
    if (/^\s*```/.test(noCr)) {
      closeText();
      const start = i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) i++;
      const lang = noCr.replace(/`/g, '').trim();
      blocks.push({ type: 'fixed', lines: lines.slice(start, i + 1), code: lang || 'text' });
      i++; continue;
    }
    const h = noCr.match(RE_HEADING);
    if (h) {
      closeText();
      blocks.push({ type: 'heading', level: h[1].length, text: h[2], lines: [l] });
      i++; continue;
    }
    const f = noCr.match(RE_FIELD);
    if (f) {
      closeText();
      const placeholder = isPlaceholder(f[3]);
      blocks.push({ type: 'field', prefix: f[1], key: f[2], value: placeholder ? '' : f[3], original: l, hint: placeholder ? cleanPlaceholder(f[3]) : '' });
      i++; continue;
    }
    const k = noCr.match(RE_CHECK);
    if (k) {
      closeText();
      blocks.push({ type: 'check', prefix: k[1], checked: k[2] !== ' ', text: k[3] });
      i++; continue;
    }
    if (RE_TABLE.test(noCr) && RE_SEPARATOR.test(lines[i + 1] ?? '')) {
      closeText();
      const header = cells(noCr);
      const separator = lines[i + 1];
      i += 2;
      const rawRows = [];
      while (i < lines.length && RE_TABLE.test(lines[i].replace(/\r$/, ''))) rawRows.push(lines[i++].replace(/\r$/, ''));
      const rows = rawRows.map((r) => { const c = cells(r); return header.map((_, j) => c[j] ?? ''); });
      blocks.push({
        type: 'table', header, separator, headerLine: noCr, rows, rawRows,
        originals: rows.map((r) => JSON.stringify(r)),
      });
      continue;
    }
    // Free text: groups consecutive lines (including empty ones in between).
    textBlock ??= { type: 'text', lines: [] };
    textBlock.lines.push(noCr);
    i++;
  }
  closeText();

  // Prepares each text block: list, quote or paragraph; splits off the trailing empty lines.
  const output = [];
  for (const b of blocks) {
    if (b.type !== 'text') { output.push(b); continue; }
    const trailing = [];
    while (b.lines.length && !b.lines.at(-1).trim()) trailing.unshift(b.lines.pop());
    const leading = [];
    while (b.lines.length && !b.lines[0].trim()) leading.push(b.lines.shift());
    if (leading.length) output.push({ type: 'fixed', lines: leading });
    if (b.lines.length) {
      const filled = b.lines.filter((x) => x.trim());
      const mode = filled.every((x) => /^-(\s|$)/.test(x)) ? 'list' : filled.every((x) => /^>/.test(x)) ? 'quote' : 'paragraph';
      const strip = (x) => (mode === 'list' ? x.replace(/^-\s?/, '') : mode === 'quote' ? x.replace(/^>\s?/, '') : x);
      const values = (mode === 'paragraph' ? b.lines : filled).map(strip);
      const placeholder = values.every((v) => !v.trim() || isPlaceholder(v));
      output.push({
        type: 'text', mode, original: b.lines,
        value: placeholder ? '' : values.join('\n'),
        hint: placeholder ? values.filter((v) => v.trim()).map(cleanPlaceholder).join(' ') : '',
      });
    }
    if (trailing.length) output.push({ type: 'fixed', lines: trailing });
  }

  // Empty sections (a heading followed by another heading or by the end): adds a box to write in.
  const withGaps = [];
  output.forEach((b, j) => {
    withGaps.push(b);
    if (b.type === 'heading' && b.level >= 2) {
      const next = output.slice(j + 1).find((x) => !(x.type === 'fixed' && !x.code && !x.hidden && x.lines.every((y) => !y.trim())));
      if (!next || next.type === 'heading') withGaps.push({ type: 'text', mode: 'paragraph', original: [], value: '', hint: '', gap: true });
    }
  });
  return withGaps;
}

export function rebuild(blocks) {
  const out = [];
  blocks.forEach((b, j) => {
    switch (b.type) {
      case 'field':
        out.push(b.value.trim() || !b.hint ? `${b.prefix}**${b.key}:**${b.value.trim() ? ` ${b.value.replace(/\s*\n\s*/g, ' ').trim()}` : ''}` : b.original);
        break;
      case 'check': out.push(`${b.prefix}[${b.checked ? 'x' : ' '}] ${b.text}`); break;
      case 'table':
        out.push(b.headerLine, b.separator.replace(/\r$/, ''));
        b.rows.forEach((r, k) => {
          // Unchanged rows are kept exactly as they were.
          const unchanged = b.rows.length === b.originals.length && JSON.stringify(r) === b.originals[k];
          if (unchanged) out.push(b.rawRows[k]);
          else if (r.some((x) => x.trim())) out.push(`| ${r.map((x) => x.replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ')} |`);
        });
        break;
      case 'text': {
        const v = b.value.replace(/\r/g, '');
        if (!v.trim()) {
          if (!b.gap) out.push(...b.original);
          break;
        }
        if (b.gap) {
          if (blocks[j - 1]?.type === 'heading') out.push('');
          out.push(...v.split('\n'));
          if (blocks[j + 1] && blocks[j + 1].type === 'heading') out.push('');
          break;
        }
        const lines = v.split('\n');
        if (b.mode === 'list') out.push(...lines.filter((x) => x.trim()).map((x) => `- ${x.trim()}`));
        else if (b.mode === 'quote') out.push(...lines.map((x) => `> ${x}`.trimEnd()));
        else out.push(...lines);
        break;
      }
      default: out.push(...b.lines.map((x) => x.replace(/\r$/, '')));
    }
  });
  return out.join('\n');
}
