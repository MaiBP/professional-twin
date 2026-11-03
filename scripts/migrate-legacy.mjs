// Migrates the private content of an old "Gemelo profesional" folder (Spanish layout) into this Professional Twin folder.
// Usage: npm run migrate -- <path-to-old-gemelo-profesional-folder> [--dry-run] [--force]
//
// - It COPIES from the old folder: the old folder is never modified or deleted.
// - Folders and files get their new English names; conversations, project maps and settings are converted
//   (see app/server/legacy.mjs, the same mapping the backup restore uses for old backups).
// - It refuses to overwrite existing data in this folder (anything that is not an untouched template)
//   unless --force is given. Running it again is safe: files that are already identical are skipped.
// - --dry-run shows what would happen without writing anything.
import {
  existsSync, mkdirSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync,
} from 'node:fs';
import {
  dirname, isAbsolute, join, relative, resolve,
} from 'node:path';
import { ROOT, init } from './init.mjs';
import { loadSettings } from '../app/server/i18n.mjs';
import { isTemplate } from '../app/server/parsers.mjs';
import {
  LEGACY_FOLDERS, LEGACY_SETTINGS, convertContent, isConversationPath, isMapPath, mapLegacyPath,
} from '../app/server/legacy.mjs';

const SKIP = new Set(['node_modules', '.venv', 'venv', '__pycache__', '.git']);
const DEFAULT_SETTINGS = { language: 'en', theme: 'system' };

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const unknown = args.filter((a) => a.startsWith('--') && !['--force', '--dry-run'].includes(a));

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (unknown.length || positional.length !== 1) {
  fail([
    'Usage: npm run migrate -- <path-to-old-gemelo-profesional-folder> [--dry-run] [--force]',
    '',
    'Copies your private content (perfil, contexto, bitacora, proyectos, cv, ofertas, copias, ajustes.json)',
    'from an old "Gemelo profesional" folder into this folder, with the new English names.',
    'The old folder is never modified.',
  ].join('\n'));
}

const source = resolve(positional[0]);
if (!existsSync(source) || !statSync(source).isDirectory()) fail(`Folder not found: ${source}`);
if (resolve(source) === resolve(ROOT)) fail('The old folder must be a different folder from this one.');
const inside = (parent, child) => { const r = relative(parent, child); return r && !r.startsWith('..') && !isAbsolute(r); };
if (Object.keys(LEGACY_FOLDERS).some((f) => inside(join(source, f), ROOT))) {
  fail('This folder is inside one of the old private folders. Put Professional Twin in a separate folder.');
}
const legacyTops = Object.keys(LEGACY_FOLDERS).filter((f) => existsSync(join(source, f)));
const hasSettings = existsSync(join(source, LEGACY_SETTINGS));
if (!legacyTops.length && !hasSettings) {
  fail(`No old Gemelo profesional content found in ${source}\n(expected folders such as perfil/, proyectos/, bitacora/ or the file ajustes.json).`);
}

// --- Plan ---------------------------------------------------------------------

const toPosix = (p) => p.split(/[\\/]/).join('/');

function walk(absDir, relDir, out) {
  const entries = readdirSync(absDir, { withFileTypes: true });
  if (!entries.length) out.push({ oldPath: relDir, dir: true });
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith('.restaurando-')) continue; // leftovers of an interrupted restore
    const abs = join(absDir, e.name);
    const r = `${relDir}/${e.name}`;
    if (e.isDirectory()) walk(abs, r, out);
    else if (e.isFile()) out.push({ oldPath: r, dir: false });
  }
}

const items = [];
for (const top of legacyTops) {
  if (statSync(join(source, top)).isDirectory()) walk(join(source, top), top, items);
}
if (hasSettings) items.push({ oldPath: LEGACY_SETTINGS, dir: false });

// Template files this folder may already have (created by `npm run init`): they can be replaced.
function templateCandidates(newPath) {
  const out = [];
  for (const lang of ['en', 'es']) {
    out.push(join(ROOT, 'templates', lang, newPath));
    if (newPath.startsWith('projects/')) {
      const inProject = newPath.split('/').slice(2).join('/');
      if (inProject) out.push(join(ROOT, 'templates', lang, 'project', inProject));
    }
    if (newPath.startsWith('offers/')) {
      const inOffer = newPath.split('/').slice(2).join('/');
      if (inOffer) out.push(join(ROOT, 'templates', lang, 'offer', inOffer));
    }
  }
  return out;
}

function isReplaceable(newPath, current) {
  if (newPath === 'settings.json') {
    try {
      const s = JSON.parse(current.toString('utf8'));
      return s.language === DEFAULT_SETTINGS.language && s.theme === DEFAULT_SETTINGS.theme;
    } catch { return true; }
  }
  if (/\.md$/i.test(newPath) && isTemplate(current.toString('utf8'))) return true;
  return templateCandidates(newPath).some((t) => existsSync(t) && statSync(t).isFile() && readFileSync(t).equals(current));
}

const plan = [];
const conflicts = [];
let renamed = 0;
for (const item of items) {
  const newPath = mapLegacyPath(item.oldPath);
  if (!newPath) continue;
  const target = join(ROOT, newPath);
  if (item.dir) { plan.push({ ...item, newPath, target, action: 'mkdir' }); continue; }
  const content = convertContent(newPath, readFileSync(join(source, item.oldPath)));
  let action = 'copy';
  if (existsSync(target)) {
    if (statSync(target).isDirectory()) {
      action = 'conflict';
    } else {
      const current = readFileSync(target);
      if (current.equals(content)) action = 'same';
      else if (isReplaceable(newPath, current)) action = 'replace-template';
      else action = 'conflict';
    }
  }
  if (action === 'conflict') conflicts.push(newPath);
  plan.push({ ...item, newPath, target, action });
}

// --- Report and checks ----------------------------------------------------------

console.log(`\nProfessional Twin · migration from the old Spanish layout`);
console.log(`  From (read only): ${source}`);
console.log(`  To:               ${ROOT}`);
if (dryRun) console.log('  Mode:             dry run (nothing will be written)');

if (conflicts.length && !force) {
  console.error(`\nStopped: ${conflicts.length} file(s) already exist here with different content:`);
  for (const c of conflicts.slice(0, 30)) console.error(`  - ${c}`);
  if (conflicts.length > 30) console.error(`  … and ${conflicts.length - 30} more`);
  console.error('\nNothing was written. Move those files away (or make a backup from the app first)');
  console.error('and run the migration again, or add --force to overwrite them with the old content.\n');
  process.exit(1);
}
if (conflicts.length && force) {
  const dirConflict = plan.find((p) => p.action === 'conflict' && existsSync(p.target) && statSync(p.target).isDirectory());
  if (dirConflict) fail(`Cannot overwrite a folder with a file: ${dirConflict.newPath}`);
}

// --- Execute --------------------------------------------------------------------

const stats = {};
const bump = (newPath, key) => {
  const top = newPath.split('/')[0];
  stats[top] ??= { copied: 0, unchanged: 0, overwritten: 0 };
  stats[top][key] += 1;
};
let conversations = 0;
let maps = 0;
for (const p of plan) {
  if (p.action === 'mkdir') {
    if (!dryRun) mkdirSync(p.target, { recursive: true });
    continue;
  }
  if (p.action === 'same') { bump(p.newPath, 'unchanged'); continue; }
  const sourceAbs = join(source, p.oldPath);
  if (!dryRun) {
    mkdirSync(dirname(p.target), { recursive: true });
    writeFileSync(p.target, convertContent(p.newPath, readFileSync(sourceAbs)));
    const st = statSync(sourceAbs);
    try { utimesSync(p.target, st.atime, st.mtime); } catch { /* keeping the date is a nicety */ }
  }
  bump(p.newPath, p.action === 'conflict' ? 'overwritten' : 'copied');
  if (isConversationPath(p.newPath)) conversations += 1;
  if (isMapPath(p.newPath)) maps += 1;
  if (toPosix(p.oldPath) !== p.newPath) renamed += 1;
}

let created = [];
if (!dryRun) {
  loadSettings(ROOT); // the migrated settings.json decides the language of any template still missing
  created = init();
}

// --- Summary --------------------------------------------------------------------

const label = {
  profile: 'perfil      → profile',
  context: 'contexto    → context',
  journal: 'bitacora    → journal',
  projects: 'proyectos   → projects',
  cv: 'cv          → cv',
  offers: 'ofertas     → offers',
  backups: 'copias      → backups',
  'settings.json': 'ajustes.json → settings.json',
};
console.log(`\n${dryRun ? 'Would migrate' : 'Migrated'}:`);
for (const [top, s] of Object.entries(stats)) {
  const parts = [`${s.copied} ${dryRun ? 'to copy' : 'copied'}`];
  if (s.unchanged) parts.push(`${s.unchanged} already up to date`);
  if (s.overwritten) parts.push(`${s.overwritten} ${dryRun ? 'to overwrite' : 'overwritten'} (--force)`);
  console.log(`  ${(label[top] ?? top).padEnd(30)} ${parts.join(', ')}`);
}
if (!Object.keys(stats).length) console.log('  (no files)');
console.log(`\n  Files renamed to the new English names: ${renamed}`);
console.log(`  Conversations converted: ${conversations} (they continue in a new Claude session)`);
console.log(`  Project maps converted:  ${maps}`);
if (created.length) console.log(`  Missing files completed from the templates: ${created.length}`);
console.log(`\n${dryRun ? 'Dry run: nothing was written.' : 'Done.'} The old folder was not modified.`);
if (!dryRun) console.log('Start the app with `npm start` (or `npm run open`) to see your content.\n');
