// App language and settings. `settings.json` (repo root, private) stores { language, theme }.
// Defaults: English and the system theme. L(en, es) returns the text in the current language.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGUAGES = ['en', 'es'];
export const THEMES = ['system', 'light', 'dark'];
const DEFAULTS = { language: 'en', theme: 'system' };

let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let current = { ...DEFAULTS };
let readMs = null; // mtime of the settings.json that was read (to pick up manual edits)

const file = () => join(root, 'settings.json');

function normalize(data) {
  const d = data && typeof data === 'object' ? data : {};
  return {
    language: LANGUAGES.includes(d.language) ? d.language : DEFAULTS.language,
    theme: THEMES.includes(d.theme) ? d.theme : DEFAULTS.theme,
  };
}

// Reads settings.json (if it exists). A missing or damaged file means the defaults.
export function loadSettings(ROOT) {
  if (ROOT) root = ROOT;
  let data = null;
  readMs = null;
  try {
    if (existsSync(file())) {
      readMs = statSync(file()).mtimeMs;
      data = JSON.parse(readFileSync(file(), 'utf8'));
    }
  } catch { /* unreadable settings: defaults */ }
  current = normalize(data);
  return { ...current };
}

// Reads the file again only if it changed on disk.
function refresh() {
  try {
    const ms = existsSync(file()) ? statSync(file()).mtimeMs : null;
    if (ms !== readMs) loadSettings();
  } catch { /* keep what we had */ }
}

export function settings() {
  refresh();
  return { ...current };
}

export const language = () => settings().language;

// Text in the current language.
export const L = (en, es) => (language() === 'es' ? es : en);

// Saves a partial change { language?, theme? }. Throws a 400 error if a value is not valid.
export function saveSettings(changes = {}) {
  const c = changes && typeof changes === 'object' ? changes : {};
  const error = (msg) => Object.assign(new Error(msg), { status: 400 });
  if (c.language !== undefined && !LANGUAGES.includes(c.language)) {
    throw error(L(`Invalid language. Use one of: ${LANGUAGES.join(', ')}.`, `Idioma no válido. Usa uno de: ${LANGUAGES.join(', ')}.`));
  }
  if (c.theme !== undefined && !THEMES.includes(c.theme)) {
    throw error(L(`Invalid theme. Use one of: ${THEMES.join(', ')}.`, `Tema no válido. Usa uno de: ${THEMES.join(', ')}.`));
  }
  const next = { ...settings() };
  if (c.language !== undefined) next.language = c.language;
  if (c.theme !== undefined) next.theme = c.theme;
  writeFileSync(file(), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  current = next;
  readMs = statSync(file()).mtimeMs;
  return { ...current };
}

// Path of a template in the current language (templates/<language>/<rel>), falling back to the other language.
export function template(rel = '') {
  const own = join(root, 'templates', language(), rel);
  if (existsSync(own)) return own;
  const other = join(root, 'templates', language() === 'es' ? 'en' : 'es', rel);
  return existsSync(other) ? other : own;
}
