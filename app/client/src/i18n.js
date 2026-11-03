// Interface language and theme. The server stores the preference (/api/settings);
// a copy is kept in localStorage to paint correctly from the very first moment.
import { api } from './api.js';

const CACHE = 'twin-settings';
const DEFAULTS = { language: 'en', theme: 'system' };

const readCache = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(CACHE) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};
const writeCache = (s) => {
  try { localStorage.setItem(CACHE, JSON.stringify({ language: s.language, theme: s.theme })); } catch { /* no storage */ }
};

let settings = readCache();
const themeListeners = new Set();

const valid = (s) => ({
  language: s?.language === 'es' ? 'es' : 'en',
  theme: ['light', 'dark'].includes(s?.theme) ? s.theme : 'system',
});

// L('English', 'Español'): returns the text in the active language.
export const L = (en, es) => (settings.language === 'es' ? es : en);
export const language = () => settings.language;
export const locale = () => (settings.language === 'es' ? 'es-ES' : 'en-GB');
export const theme = () => settings.theme;

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
// The theme actually shown: 'light' or 'dark'.
export const effectiveTheme = () => (settings.theme === 'system' ? (systemDark() ? 'dark' : 'light') : settings.theme);

function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  themeListeners.forEach((f) => f());
}

function applyLanguage() {
  document.documentElement.lang = settings.language;
  document.title = L('Professional Twin', 'Gemelo profesional');
}

// Called before the first render: reads the settings from the server (or keeps the cached ones if that fails).
export async function loadSettings() {
  applyTheme();
  applyLanguage();
  try {
    settings = valid(await api.get('/api/settings'));
    writeCache(settings);
  } catch {
    // Server not reachable: keep the cache or en/system.
  }
  applyTheme();
  applyLanguage();
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (settings.theme === 'system') themeListeners.forEach((f) => f());
  });
}

// Changes language and/or theme. Changing the language reloads the page.
export async function changeSettings(changes) {
  const before = settings;
  let next = valid({ ...settings, ...changes });
  try {
    next = valid(await api.post('/api/settings', changes));
  } catch {
    // If the server does not save it, at least it stays in this browser.
  }
  settings = next;
  writeCache(settings);
  if (next.language !== before.language) {
    window.location.reload();
    return;
  }
  applyTheme();
}

// Notifies when the effective theme changes (for maps and diagrams).
export function onThemeChange(f) {
  themeListeners.add(f);
  return () => themeListeners.delete(f);
}
