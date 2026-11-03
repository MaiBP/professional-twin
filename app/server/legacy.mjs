// Legacy layout support: the old Spanish folder/file names ("Gemelo profesional") → the current English layout.
// One mapping shared by `scripts/migrate-legacy.mjs` and the backup restore (old .zip backups).
// Everything here is pure (no file system access), so it can be tested and reused safely.
import { convertMapBlocks } from '../shared/mapFormat.mjs';

export { convertMapBlocks, normalizeMap } from '../shared/mapFormat.mjs';

// Old top-level private folders → new ones.
export const LEGACY_FOLDERS = {
  perfil: 'profile',
  contexto: 'context',
  bitacora: 'journal',
  proyectos: 'projects',
  cv: 'cv',
  ofertas: 'offers',
  copias: 'backups',
};
export const LEGACY_SETTINGS = 'ajustes.json';

// LEEME → README (only where the templates put one).
const readme = (name) => ({ 'LEEME.md': 'README.md', 'LEEME.txt': 'README.txt' }[name] ?? name);

const PROFILE_FILES = { 'perfil.md': 'profile.md', 'criterios.md': 'criteria.md', 'proyeccion.md': 'goals.md', fuentes: 'sources' };
const CONTEXT_FILES = { 'empresa.md': 'company.md', fuentes: 'sources' };
const JOURNAL_FILES = { 'logros.md': 'achievements.md', 'habilidades.md': 'skills.md', conversaciones: 'conversations' };
// General conversations (journal/conversations/<id>.json): old context id → new one.
export const LEGACY_CONVERSATION_IDS = { inicio: 'home', perfil: 'profile', empresa: 'company', bitacora: 'journal', cv: 'cv' };
const CV_FILES = { versiones: 'versions' };
const PROJECT_FILES = {
  '00-necesidad.md': '00-need.md',
  '01-descubrimiento.md': '01-discovery.md',
  '02-definicion.md': '02-definition.md',
  '03-plan.md': '03-plan.md',
  '04-entrega.md': '04-delivery.md',
  '05-cierre.md': '05-closure.md',
  'estado.md': 'status.md',
  'mapa.md': 'map.md',
  'decisiones.md': 'decisions.md',
  'conversacion.json': 'conversation.json',
  producto: 'product',
};
const MATERIAL_FILES = { 'enlaces.md': 'links.md', 'inventario.md': 'inventory.md' };
const OFFER_FILES = {
  'oferta.md': 'offer.md',
  'analisis.md': 'analysis.md',
  'carta.md': 'cover-letter.md',
  'entrevista.md': 'interview.md',
  'conversacion.json': 'conversation.json',
  fuentes: 'sources',
};
const TRASH = '_papelera';

// "<id>--borrado-<date>" → "<id>--deleted-<date>"
const trashEntry = (name) => name.replace(/--borrado-/, '--deleted-');

// Path inside a project or offer folder: only the files the templates/twin create are renamed;
// whatever the person uploaded (material, sources) keeps its name.
function mapItem(kind, parts) {
  const [first, ...rest] = parts;
  if (first === undefined) return [];
  if (kind === 'project') {
    if (first === 'material') {
      if (rest.length === 1) return ['material', readme(MATERIAL_FILES[rest[0]] ?? rest[0])];
      return ['material', ...rest];
    }
    if (first === 'producto' || first === 'product') {
      return ['product', ...(rest.length === 1 ? [readme(rest[0])] : rest)];
    }
    return [readme(PROJECT_FILES[first] ?? first), ...rest];
  }
  // offer
  if (first === 'fuentes' || first === 'sources') return ['sources', ...(rest.length === 1 ? [readme(rest[0])] : rest)];
  return [readme(OFFER_FILES[first] ?? first), ...rest];
}

// Old relative path (posix, e.g. "proyectos/2024-01-x/estado.md") → new relative path,
// or null when it is not part of the private content (e.g. old app code).
export function mapLegacyPath(oldPath) {
  const parts = String(oldPath).replace(/\\/g, '/').split('/').filter((p) => p && p !== '.');
  if (!parts.length) return null;
  if (parts.length === 1 && parts[0] === LEGACY_SETTINGS) return 'settings.json';
  const [top, ...rest] = parts;
  const folder = LEGACY_FOLDERS[top];
  if (!folder) return null;
  if (!rest.length) return folder;
  let out;
  switch (top) {
    case 'perfil':
      out = [PROFILE_FILES[rest[0]] ?? rest[0], ...rest.slice(1)];
      if (out[0] === 'sources' && out.length === 2) out[1] = readme(out[1]);
      break;
    case 'contexto':
      out = [CONTEXT_FILES[rest[0]] ?? rest[0], ...rest.slice(1)];
      if (out[0] === 'sources' && out.length === 2) out[1] = readme(out[1]);
      break;
    case 'bitacora':
      out = [JOURNAL_FILES[rest[0]] ?? rest[0], ...rest.slice(1)];
      if (out[0] === 'conversations' && out.length === 2) {
        const m = out[1].match(/^(.*)\.json$/);
        if (m && LEGACY_CONVERSATION_IDS[m[1]]) out[1] = `${LEGACY_CONVERSATION_IDS[m[1]]}.json`;
      }
      break;
    case 'cv':
      out = [CV_FILES[rest[0]] ?? rest[0], ...rest.slice(1)];
      break;
    case 'proyectos':
    case 'ofertas': {
      const kind = top === 'proyectos' ? 'project' : 'offer';
      if (rest[0] === TRASH) {
        out = ['_trash', ...(rest[1] ? [trashEntry(rest[1]), ...mapItem(kind, rest.slice(2))] : [])];
      } else if (rest.length === 1) {
        out = [readme(rest[0])]; // file directly in the folder (e.g. LEEME.md) or the project/offer folder itself
      } else {
        out = [rest[0], ...mapItem(kind, rest.slice(1))];
      }
      break;
    }
    default: // copias: old backups are kept as they are (restore accepts them)
      out = rest;
  }
  if (out.length === 1 && top !== 'proyectos' && top !== 'ofertas') out[0] = readme(out[0]);
  return [folder, ...out].join('/');
}

// Does this (new) path hold a conversation JSON?
export const isConversationPath = (newPath) => /(^|\/)conversation\.json$/.test(newPath)
  || /^journal\/conversations\/[^/]+\.json$/.test(newPath);
export const isMapPath = (newPath) => /(^|\/)map\.md$/.test(newPath);

const STATE = { libre: 'idle', trabajando: 'working', interrumpido: 'interrupted', error: 'error' };
const ROLE = { persona: 'user', gemelo: 'twin' };
const isLegacyConversation = (c) => c && typeof c === 'object'
  && ['sesion', 'estado', 'pasos', 'inicio', 'coste', 'mensajes'].some((k) => k in c);

const pick = (o, a, b) => (o?.[a] !== undefined ? o[a] : o?.[b]);

function convertEntry(m) {
  if (!m || typeof m !== 'object') return m;
  const { rol, texto, fecha, aviso, ...rest } = m;
  const role = pick(m, 'role', 'rol');
  const out = { ...rest, role: ROLE[role] ?? role, text: pick(m, 'text', 'texto'), date: pick(m, 'date', 'fecha') };
  const notice = pick(m, 'notice', 'aviso');
  if (notice !== undefined) out.notice = notice;
  if (out.role === undefined) delete out.role;
  return out;
}

// Conversation JSON in the old format ({ sesion, estado, pasos, inicio, coste, mensajes:[{rol,texto,fecha}] })
// → current format ({ session, state, steps, start, cost, messages:[{role,text,date}] }).
// The Claude session of an old conversation is dropped: it belongs to the old folder.
// A conversation already in the current format is returned unchanged.
export function convertConversation(c) {
  if (!isLegacyConversation(c)) return c;
  const { sesion, estado, pasos, inicio, coste, mensajes, ...rest } = c;
  const state = pick(c, 'state', 'estado');
  const out = {
    ...rest,
    session: null,
    state: STATE[state] ?? state ?? 'idle',
    steps: (pick(c, 'steps', 'pasos') ?? []).map(convertEntry),
    messages: (pick(c, 'messages', 'mensajes') ?? []).map(convertEntry),
  };
  const start = pick(c, 'start', 'inicio');
  const cost = pick(c, 'cost', 'coste');
  if (start !== undefined) out.start = start;
  if (cost !== undefined) out.cost = cost;
  if (out.state === 'working') { out.state = 'interrupted'; out.steps = []; } // nothing is running for an imported conversation
  return out;
}

// Old settings ({ idioma, tema }) → current ({ language, theme }).
export function convertSettings(s) {
  const d = s && typeof s === 'object' ? s : {};
  return {
    language: pick(d, 'language', 'idioma') === 'es' ? 'es' : 'en',
    theme: ['system', 'light', 'dark'].includes(pick(d, 'theme', 'tema')) ? pick(d, 'theme', 'tema') : 'system',
  };
}

// Content of a file being migrated (new path + old content) → new content (Buffer).
// Conversations, maps and settings are converted; everything else is copied byte for byte.
export function convertContent(newPath, buffer) {
  try {
    if (newPath === 'settings.json') {
      return Buffer.from(`${JSON.stringify(convertSettings(JSON.parse(buffer.toString('utf8'))), null, 2)}\n`, 'utf8');
    }
    if (isConversationPath(newPath)) {
      const c = convertConversation(JSON.parse(buffer.toString('utf8')));
      return Buffer.from(JSON.stringify({ ...c, session: null }, null, 2), 'utf8');
    }
    if (isMapPath(newPath)) {
      const text = buffer.toString('utf8');
      const converted = convertMapBlocks(text);
      return converted === text ? buffer : Buffer.from(converted, 'utf8');
    }
  } catch { /* unreadable JSON: copy it as it is */ }
  return buffer;
}
