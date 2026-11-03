// Parse the template formats (templates/en and templates/es). If you change a template, review its parser.
// They accept both English and Spanish labels: fields are stored with the English label as the canonical key.
import { L } from './i18n.mjs';

export const isTemplate = (text) => /^<!--\s*(TEMPLATE|PLANTILLA)\b/.test(text.trimStart());

const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

// Spanish (or English) label → canonical English label. Comparison is case-insensitive.
const ALIASES = Object.fromEntries(Object.entries({
  // status.md
  'Current phase': 'Fase actual',
  'Last updated': 'Última actualización',
  'Next decision I need from you': 'Próxima decisión que necesito de ti',
  Type: 'Tipo',
  // status.md sections
  Phases: 'Fases',
  Pending: 'Pendientes',
  'Unvalidated assumptions': 'Supuestos sin validar',
  // achievements.md
  Project: 'Proyecto',
  'What I did': 'Qué hice',
  'Situation / problem': 'Situación / problema',
  'Result / impact': 'Resultado / impacto',
  Skills: 'Habilidades',
  Tools: 'Herramientas',
  Evidence: 'Evidencia',
  'CV bullet': 'Bullet para CV',
  // offer.md
  Company: 'Empresa',
  Position: 'Puesto',
  'Location / work mode': 'Ubicación / modalidad',
  Link: 'Enlace',
  Received: 'Recibida',
  Status: 'Estado',
  Fit: 'Encaje',
  Verdict: 'Veredicto',
  'Next step': 'Próximo paso',
  // decisions.md (table headers)
  Date: 'Fecha',
  Decision: 'Decisión',
  Why: 'Por qué',
  'Alternatives discarded': 'Alternativas descartadas',
}).flatMap(([en, es]) => [[en.toLowerCase(), en], [es.toLowerCase(), en]]));

export const canonical = (label) => ALIASES[label.trim().toLowerCase()] ?? label.trim();

const fieldLine = (line) => line.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.*)$/);

// "- **Label:** value" fields keyed by canonical label (the first occurrence wins if `first`).
function readFields(lines, { first = false } = {}) {
  const fields = {};
  for (const line of lines) {
    const m = fieldLine(line);
    if (!m) continue;
    const k = canonical(m[1]);
    if (first && k in fields) continue;
    fields[k] = m[2].trim();
  }
  return fields;
}

const isEmpty = (v) => !v || /^_?\(.*\)_?$/.test(v) || v === '_' || v === '-';

// Splits markdown into "## Title" sections → lines (canonical title).
function sections(text) {
  const out = {};
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+)/);
    if (h) { current = canonical(h[1]); out[current] = []; continue; }
    if (current) out[current].push(line);
  }
  return out;
}

const items = (lines = []) => lines
  .map((l) => l.match(/^\s*-\s+(?:\[[ xX]\]\s+)?(.*)$/)?.[1]?.trim())
  .filter((v) => v && !isEmpty(v));

export const PHASES_ES = [
  'Captura', 'Descubrimiento', 'Definición', 'Plan',
  'Construcción', 'Entrega y adopción', 'Cierre',
];
export const PHASES_EN = [
  'Capture', 'Discovery', 'Definition', 'Plan',
  'Build', 'Delivery & adoption', 'Closure',
];
// Phase names in the current language.
export const phases = () => L(PHASES_EN, PHASES_ES);

export function parseStatus(text) {
  const clean = stripComments(text);
  const title = clean.match(/^#\s+(?:Status|Estado):\s*(.+)$/im)?.[1]?.trim();
  const fields = readFields(clean.split(/\r?\n/));
  const phaseText = fields['Current phase'] ?? '';
  const phase = Number(phaseText.match(/\d/)?.[0] ?? 0);
  const names = phases();
  const sec = sections(clean);
  // "- [x] 2. Definition · 2026-11-05": the optional date feeds the project timeline.
  const closed = (sec.Phases ?? [])
    .map((l) => l.match(/^\s*-\s+\[[xX]\]\s+(\d)(?:.*?(\d{4}-\d{2}(?:-\d{2})?))?/))
    .filter(Boolean);
  const completed = closed.map((m) => Number(m[1]));
  const history = closed.map((m) => ({ phase: names[Number(m[1])], date: m[2] ?? null }));
  const next = fields['Next decision I need from you'];
  const updated = fields['Last updated'] ?? '';
  return {
    title: title && !title.startsWith('{') ? title : null,
    phase,
    phaseName: names[phase] ?? phaseText,
    completed,
    history,
    retrospective: /ya hecho|documentar|already done|\bdocument\b/i.test(fields.Type ?? ''),
    updated: /\d{4}-\d{2}-\d{2}/.test(updated) ? updated : null,
    nextDecision: isEmpty(next) ? null : next,
    pending: items(sec.Pending),
    assumptions: items(sec['Unvalidated assumptions']),
  };
}

export function parseAchievements(text) {
  const blocks = stripComments(text).split(/^###\s+/m).slice(1);
  return blocks.map((block) => {
    const [header, ...rest] = block.split(/\r?\n/);
    const [date, ...titleParts] = header.split('·');
    const fields = readFields(rest);
    const list = (v) => (v ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    return {
      date: date.trim(),
      title: titleParts.join('·').trim() || date.trim(),
      project: fields.Project ?? null,
      whatIDid: fields['What I did'] ?? null,
      situation: fields['Situation / problem'] ?? null,
      impact: fields['Result / impact'] ?? null,
      skills: list(fields.Skills),
      tools: list(fields.Tools),
      evidence: fields.Evidence ?? null,
      cvBullet: fields['CV bullet'] ?? null,
    };
  });
}

// First markdown table in the text → array of objects keyed by the headers (as they appear).
export function parseTable(text) {
  const rows = stripComments(text).split(/\r?\n/).filter((l) => /^\s*\|.*\|\s*$/.test(l));
  if (rows.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]);
  return rows.slice(2)
    .map(cells)
    .filter((c) => c.some(Boolean))
    .map((c) => Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])));
}

// Value of a parseTable row, finding the column by its canonical label (accepts English and Spanish).
export function column(row, wanted) {
  for (const [k, v] of Object.entries(row)) if (canonical(k) === wanted) return v;
  return undefined;
}

// Canonical offer status ids (the ones the API returns) and their Spanish labels, in the same order.
export const OFFER_STATUSES = ['New', 'Analyzed', 'Applied', 'Interview', 'Offer', 'Discarded'];
export const OFFER_STATUSES_ES = ['Nueva', 'Analizada', 'Postulada', 'Entrevista', 'Oferta', 'Descartada'];
const STATUS_SYNONYMS = { analysed: 'Analyzed', rejected: 'Discarded' };

// Status label in any language → canonical id (or null if not recognized).
export function canonicalStatus(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return null;
  const i = OFFER_STATUSES.findIndex((s) => s.toLowerCase() === v);
  if (i >= 0) return OFFER_STATUSES[i];
  const j = OFFER_STATUSES_ES.findIndex((s) => s.toLowerCase() === v);
  if (j >= 0) return OFFER_STATUSES[j];
  return STATUS_SYNONYMS[v] ?? null;
}

// Label to write a canonical status into a file, in the requested language.
export const statusLabel = (id, lang) => (lang === 'es'
  ? OFFER_STATUSES_ES[OFFER_STATUSES.indexOf(id)] ?? id
  : id);

// offer.md: header "# Offer: Position · Company" (or "# Oferta: ...") + "- **Field:** value" fields.
export function parseOffer(text) {
  const fields = readFields(stripComments(text).split(/\r?\n/), { first: true });
  const val = (k) => (isEmpty(fields[k]) ? null : fields[k]);
  const status = canonicalStatus(val('Status')) ?? 'New';
  const fit = Number((val('Fit') ?? '').match(/\d{1,3}/)?.[0]);
  return {
    company: val('Company'),
    position: val('Position'),
    location: val('Location / work mode'),
    link: val('Link'),
    received: /\d{4}-\d{2}-\d{2}/.test(val('Received') ?? '') ? val('Received') : null,
    status,
    fit: Number.isFinite(fit) ? Math.min(fit, 100) : null,
    verdict: val('Verdict'),
    nextStep: val('Next step'),
  };
}
