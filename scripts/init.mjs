// Creates the private folders (profile, context, journal, projects, cv, offers) from templates/<language>/.
// The language comes from settings.json (English by default). It never overwrites: it only copies what is missing.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSettings, language, template } from '../app/server/i18n.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// templates/<language>/<source> → <target>
const FOLDERS = [
  ['profile', 'profile'],
  ['context', 'context'],
  ['journal', 'journal'],
  ['cv', 'cv'],
  ['offers', 'offers'],
];

function copyMissing(source, target, created) {
  mkdirSync(target, { recursive: true });
  if (!existsSync(source)) return;
  for (const name of readdirSync(source)) {
    const s = join(source, name);
    const t = join(target, name);
    if (statSync(s).isDirectory()) {
      copyMissing(s, t, created);
    } else if (!existsSync(t)) {
      cpSync(s, t);
      created.push(t.slice(ROOT.length + 1));
    }
  }
}

export function init() {
  const created = [];
  for (const [source, target] of FOLDERS) {
    copyMissing(template(source), join(ROOT, target), created);
  }
  mkdirSync(join(ROOT, 'projects'), { recursive: true });
  return created;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  loadSettings(ROOT);
  const created = init();
  const es = language() === 'es';
  console.log(created.length
    ? `${es ? 'Creados desde templates/es' : 'Created from templates/en'}:\n  ${created.join('\n  ')}`
    : es ? 'Todo en su sitio: no faltaba nada.' : 'Everything in place: nothing was missing.');
}
