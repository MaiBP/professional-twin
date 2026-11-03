// Local Professional Twin server. It only listens on 127.0.0.1: nothing leaves this PC.
import express from 'express';
import multer from 'multer';
import { execFile } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { ROOT, init } from '../../scripts/init.mjs';
import {
  column, isTemplate, canonicalStatus, statusLabel, phases, parseStatus, parseAchievements, parseOffer, parseTable, OFFER_STATUSES,
} from './parsers.mjs';
import {
  L, settings, loadSettings, saveSettings, language, template,
} from './i18n.mjs';
import { createTwin } from './twin.mjs';
import { createSettings } from './settings.mjs';
import { createBackups } from './backups.mjs';

const PORT = Number(process.env.PORT ?? 3210);
const HOST = '127.0.0.1';
const PRIVATE = ['profile', 'context', 'journal', 'projects', 'cv', 'offers'];
const SOURCE_AREAS = { profile: 'profile/sources', context: 'context/sources' };
const UPLOAD_EXT = new Set(['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.csv', '.pptx']);
// Project material: besides documents, it accepts code and archives.
const MATERIAL_EXT = new Set([...UPLOAD_EXT, '.ppt', '.zip', '.json', '.xml', '.yml', '.yaml', '.html', '.htm', '.css',
  '.js', '.mjs', '.jsx', '.ts', '.tsx', '.py', '.ipynb', '.sql', '.ps1', '.bat', '.sh', '.vba', '.bas', '.cs', '.java',
  '.svg', '.gif', '.webp', '.log', '.ini', '.cfg', '.toml', '.drawio', '.vsdx', '.msg', '.eml']);
const LIST_EXCLUDE = ['README.md', 'conversation.json', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build'];
// Project documents: [file, English title, Spanish title].
const PROJECT_DOCS = [
  ['map.md', 'Map', 'Mapa'],
  ['00-need.md', 'Need', 'Necesidad'],
  ['01-discovery.md', 'Discovery', 'Descubrimiento'],
  ['02-definition.md', 'Definition', 'Definición'],
  ['03-plan.md', 'Plan', 'Plan'],
  ['04-delivery.md', 'Delivery', 'Entrega'],
  ['05-closure.md', 'Closure', 'Cierre'],
  ['decisions.md', 'Decisions', 'Decisiones'],
  ['status.md', 'Status', 'Estado'],
];

// status.md: lines the server rewrites (in English or Spanish). Each one captures the label to keep it.
const RE_STATUS_TITLE = /^(# (?:Status|Estado):).*$/m;
const RE_CURRENT_PHASE = /^(- \*\*(?:Current phase|Fase actual):\*\*).*$/m;
const RE_UPDATED = /^(- \*\*(?:Last updated|Última actualización):\*\*).*$/m;
const RE_NEXT = /^(- \*\*(?:Next decision I need from you|Próxima decisión que necesito de ti):\*\*).*$/m;
// Is the file in Spanish? Look at its main heading (English templates use Status/Offer/Links).
const isSpanish = (md) => /^# (?:Estado|Oferta|Enlaces)\b/m.test(md);

loadSettings(ROOT);
init();

// --- Path helpers -------------------------------------------------------------

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Resolves a relative path and makes sure it falls inside a private folder.
function safePath(relPath) {
  if (typeof relPath !== 'string' || !relPath) throw new HttpError(400, L('Missing path', 'Falta la ruta'));
  const abs = resolve(ROOT, relPath);
  const r = relative(ROOT, abs);
  const top = r.split(sep)[0];
  if (r.startsWith('..') || !PRIVATE.includes(top)) throw new HttpError(403, L('Path not allowed', 'Ruta no permitida'));
  return abs;
}

const rel = (abs) => relative(ROOT, abs).split(sep).join('/');
const read = (relPath) => {
  const abs = join(ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
};

function listFiles(dirAbs, { recursive = false, exclude = ['README.md'], limit = 1000 } = {}) {
  if (!existsSync(dirAbs)) return [];
  const out = [];
  for (const name of readdirSync(dirAbs)) {
    if (name.startsWith('.') || exclude.includes(name)) continue;
    const abs = join(dirAbs, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (recursive && out.length < limit) out.push(...listFiles(abs, { recursive, exclude, limit }));
    } else {
      out.push({ name, path: rel(abs), size: st.size, modified: st.mtime.toISOString() });
    }
  }
  return out.sort((a, b) => b.modified.localeCompare(a.modified));
}

function projects() {
  const dir = join(ROOT, 'projects');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => !n.startsWith('.') && !n.startsWith('_') && statSync(join(dir, n)).isDirectory())
    .map((id) => {
      const statusAbs = join(dir, id, 'status.md');
      const status = existsSync(statusAbs) ? parseStatus(readFileSync(statusAbs, 'utf8')) : parseStatus('');
      const modified = existsSync(statusAbs) ? statSync(statusAbs).mtime.toISOString() : null;
      return { id, name: status.title ?? id, ...status, modified };
    })
    .sort((a, b) => (b.modified ?? '').localeCompare(a.modified ?? ''));
}

// --- App ----------------------------------------------------------------------

const app = express();
app.disable('x-powered-by');

// Blocks DNS rebinding: only the local host is accepted.
app.use((req, res, next) => {
  const host = (req.headers.host ?? '').split(':')[0];
  if (!['localhost', '127.0.0.1'].includes(host)) return res.status(403).send(L('Host not allowed', 'Host no permitido'));
  next();
});

// Blocks writes from other websites: requires a header an external form cannot send
// without a CORS preflight (and CORS is not enabled).
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Twin') !== '1') return res.status(403).json({ error: L('Request not allowed', 'Petición no permitida') });
  next();
});

app.use(express.json({ limit: '2mb' }));

// --- Settings: language and theme ---------------------------------------------
// GET returns { language, theme }; POST takes a partial change, validates it, saves it in settings.json and returns the full object.
app.get('/api/settings', (req, res) => res.json(settings()));
app.post('/api/settings', (req, res) => {
  const { language: newLanguage, theme } = req.body ?? {};
  try {
    res.json(saveSettings({ language: newLanguage, theme }));
  } catch (e) {
    throw new HttpError(e.status ?? 500, e.message);
  }
});

app.get('/api/summary', (req, res) => {
  const files = {
    profile: 'profile/profile.md',
    criteria: 'profile/criteria.md',
    goals: 'profile/goals.md',
    company: 'context/company.md',
  };
  const complete = Object.fromEntries(
    Object.entries(files).map(([k, r]) => [k, !!read(r) && !isTemplate(read(r))]),
  );
  const skills = parseTable(read('journal/skills.md')).length;
  complete.skills = skills > 0;
  const achievements = parseAchievements(read('journal/achievements.md'));
  res.json({
    complete,
    sources: {
      profile: listFiles(join(ROOT, SOURCE_AREAS.profile)).length,
      context: listFiles(join(ROOT, SOURCE_AREAS.context)).length,
    },
    projects: projects(),
    achievements: { total: achievements.length, recent: achievements.slice(0, 5) },
    skills,
    cvVersions: listFiles(join(ROOT, 'cv/versions')).length,
    phases: phases(),
  });
});

app.get('/api/doc', (req, res) => {
  const abs = safePath(req.query.path);
  if (extname(abs) !== '.md') throw new HttpError(400, L('Only .md documents', 'Solo documentos .md'));
  if (!existsSync(abs)) throw new HttpError(404, L('Not found', 'No existe'));
  res.json({ path: rel(abs), content: readFileSync(abs, 'utf8'), modified: statSync(abs).mtime.toISOString() });
});

app.put('/api/doc', (req, res) => {
  const { path, content, modified } = req.body ?? {};
  const abs = safePath(path);
  if (extname(abs) !== '.md') throw new HttpError(400, L('Only .md documents', 'Solo documentos .md'));
  if (typeof content !== 'string') throw new HttpError(400, L('Missing content', 'Falta el contenido'));
  // Avoids overwriting changes made by the twin while you were editing.
  if (modified && existsSync(abs) && statSync(abs).mtime.toISOString() !== modified) {
    throw new HttpError(409, L(
      'The file changed while you were editing it (the twin may have updated it). Reload before saving.',
      'El archivo cambió mientras lo editabas (quizá el gemelo lo actualizó). Recarga antes de guardar.',
    ));
  }
  writeFileSync(abs, content, 'utf8');
  res.json({ ok: true, modified: statSync(abs).mtime.toISOString() });
});

app.get('/api/file', (req, res) => {
  const abs = safePath(req.query.path);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new HttpError(404, L('Not found', 'No existe'));
  // Files are served sandboxed: an HTML file opened here cannot use the API.
  res.set('Content-Security-Policy', 'sandbox allow-scripts allow-popups allow-downloads');
  res.set('X-Content-Type-Options', 'nosniff');
  if (req.query.download) return res.download(abs);
  res.sendFile(abs);
});

app.get('/api/projects', (req, res) => res.json(projects()));

// Checks a local or network path the person gives as a documentation source.
// It only reports whether it exists and how many items it has at the first level: the twin reads the content.
function checkPath(path) {
  const r = oneLine(path, 500).replace(/^"|"$/g, '');
  if (!r) return null;
  try {
    if (!existsSync(r)) return { path: r, exists: false };
    const st = statSync(r);
    if (!st.isDirectory()) return { path: r, exists: true, folder: false };
    const items = readdirSync(r).length;
    return { path: r, exists: true, folder: true, items };
  } catch {
    return { path: r, exists: false, error: L('No access', 'Sin acceso') };
  }
}

app.post('/api/paths/check', (req, res) => res.json(checkPath(req.body?.path) ?? { exists: false }));

// Creates an "already done" project to document: folder from the template, description and source paths.
app.post('/api/projects/document', (req, res) => {
  const { name, date, description, paths } = req.body ?? {};
  const title = oneLine(name, 100);
  if (!title) throw new HttpError(400, L('Give the project a name.', 'Ponle un nombre al proyecto.'));
  const month = /^\d{4}-\d{2}$/.test(date ?? '') ? date : /^\d{4}$/.test(date ?? '') ? `${date}-01` : today().slice(0, 7);
  const base = `${month}-${slug(title) || 'project'}`;
  let id = base;
  for (let i = 2; existsSync(join(ROOT, 'projects', id)); i++) id = `${base}-${i}`;
  const dir = safePath(`projects/${id}`);
  cpSync(template('project'), dir, { recursive: true });

  const sources = (Array.isArray(paths) ? paths : String(paths ?? '').split(/\r?\n/))
    .slice(0, 20).map(checkPath).filter(Boolean);
  const rewrite = (file, fn) => {
    const abs = join(dir, file);
    writeFileSync(abs, fn(existsSync(abs) ? readFileSync(abs, 'utf8') : ''), 'utf8');
  };

  // What is added follows the language of the copied template (the expressions accept both).
  const T = isSpanish(readFileSync(join(dir, 'status.md'), 'utf8')) ? (en, es) => es : (en) => en;
  rewrite('status.md', (md) => md
    .replace(RE_STATUS_TITLE, (_, c) => `${c} ${title}`)
    .replace(RE_CURRENT_PHASE, (_, c) => `- **${T('Type', 'Tipo')}:** ${T('Already done (document)', 'Ya hecho (documentar)')}\n${c} 0. ${T('Capture', 'Captura')}`)
    .replace(RE_UPDATED, (_, c) => `${c} ${today()}`)
    .replace(RE_NEXT, (_, c) => `${c} ${T(
      'Press “Document this project” so the twin analyzes the material and builds the map',
      'Pulsa «Documentar este proyecto» para que el gemelo analice el material y arme el mapa',
    )}`));
  rewrite('00-need.md', (md) => md.replace(/^>\s*$/m,
    () => `> ${oneLine(description, 4000) || T('(no description: the twin will infer it from the material)', '(sin descripción: el gemelo la deduce del material)')}`));
  if (sources.length) {
    rewrite('material/links.md', (md) => `${md.trimEnd()}\n\n## ${T('Folders with documentation', 'Carpetas con documentación')}\n${sources
      .map((f) => `- \`${f.path}\`${f.exists
        ? (f.folder ? ` (${f.items} ${T('items', 'elementos')})` : ` (${T('file', 'archivo')})`)
        : ` ⚠️ ${T('not found from this PC', 'no encontrada desde este PC')}`}`)
      .join('\n')}\n`);
  }
  res.json({ id, paths: sources });
});

// Folder of an existing project (the id cannot contain paths).
function projectDir(id) {
  if (!/^[\w.-]+$/.test(id ?? '') || /^[._]/.test(id)) throw new HttpError(400, L('Invalid project', 'Proyecto no válido'));
  const dir = safePath(`projects/${id}`);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new HttpError(404, L('Project not found', 'Proyecto no encontrado'));
  return dir;
}

function materialDir(id) {
  const dir = join(projectDir(id), 'material');
  mkdirSync(dir, { recursive: true });
  const links = join(dir, 'links.md');
  if (!existsSync(links)) {
    const linksTemplate = template('project/material/links.md');
    const initial = existsSync(linksTemplate) ? readFileSync(linksTemplate, 'utf8')
      : L('# Links and notes\n\n- \n', '# Enlaces y notas\n\n- \n');
    writeFileSync(links, initial, 'utf8');
  }
  return dir;
}

const listMaterial = (id) => listFiles(materialDir(id), { recursive: true, exclude: [...LIST_EXCLUDE, 'links.md'] })
  .map((a) => ({ ...a, relative: a.path.split('/material/')[1] }));

// Timeline: closed phases, decisions and achievements of the project, sorted by date.
function timeline(id, status) {
  const events = status.history.map((h) => ({ date: h.date, type: 'phase', title: L(`Phase closed: ${h.phase}`, `Fase cerrada: ${h.phase}`) }));
  // decisions.md: columns Date/Fecha, Decision/Decisión, Why/Por qué.
  for (const d of parseTable(read(`projects/${id}/decisions.md`))) {
    const decision = column(d, 'Decision');
    if (!decision) continue;
    events.push({ date: column(d, 'Date') || null, type: 'decision', title: decision, detail: column(d, 'Why') || null });
  }
  for (const a of parseAchievements(read('journal/achievements.md'))) {
    if (!a.project?.includes(id)) continue;
    events.push({ date: a.date, type: 'achievement', title: a.title, detail: a.impact });
  }
  return events.sort((a, b) => (a.date ?? '9').localeCompare(b.date ?? '9'));
}

app.get('/api/projects/:id', (req, res) => {
  const dir = projectDir(req.params.id);
  const status = parseStatus(read(`projects/${req.params.id}/status.md`));
  const docs = PROJECT_DOCS
    .filter(([f]) => existsSync(join(dir, f)))
    .map(([f, en, es]) => ({ title: L(en, es), path: rel(join(dir, f)) }));
  const others = listFiles(dir)
    .filter((a) => a.name.endsWith('.md') && !PROJECT_DOCS.some(([f]) => f === a.name))
    .map((a) => ({ title: a.name.replace(/\.md$/, ''), path: a.path }));
  res.json({
    id: req.params.id,
    name: status.title ?? req.params.id,
    ...status,
    phases: phases(),
    docs: [...docs, ...others],
    product: listFiles(join(dir, 'product'), { recursive: true, exclude: LIST_EXCLUDE }),
    material: listMaterial(req.params.id),
    timeline: timeline(req.params.id, status),
  });
});

// --- Project map PDF ----------------------------------------------------------
// Edge or Chrome in headless mode opens the app's own print view (which draws the map) and saves it as PDF.
const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
let pdfsInProgress = 0;

app.get('/api/projects/:id/map.pdf', async (req, res, next) => {
  let tmp = null;
  try {
    const dir = projectDir(req.params.id);
    if (!existsSync(join(dir, 'map.md'))) throw new HttpError(404, L('This project does not have a map yet.', 'Este proyecto aún no tiene mapa.'));
    const browser = BROWSERS.find(existsSync);
    if (!browser) {
      throw new HttpError(500, L(
        'Creating the PDF requires Microsoft Edge or Google Chrome on this PC.',
        'Para crear el PDF hace falta Microsoft Edge o Google Chrome en este PC.',
      ));
    }
    if (pdfsInProgress >= 2) {
      throw new HttpError(429, L('Other PDFs are already being prepared. Try again in a few seconds.', 'Ya se están preparando otros PDF. Prueba en unos segundos.'));
    }
    tmp = mkdtempSync(join(tmpdir(), 'twin-map-'));
    const output = join(tmp, 'map.pdf');
    const url = `http://${HOST}:${PORT}/#/print/${encodeURIComponent(req.params.id)}`;
    pdfsInProgress += 1;
    try {
      // Asynchronous on purpose: the browser requests the page from this same server.
      await new Promise((ok, fail) => execFile(browser, [
        '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--hide-scrollbars',
        '--window-size=794,1123', '--virtual-time-budget=20000', '--run-all-compositor-stages-before-draw',
        `--user-data-dir=${join(tmp, 'profile')}`, `--print-to-pdf=${output}`, url,
      ], { timeout: 90000, windowsHide: true }, (e) => (existsSync(output) ? ok() : fail(e ?? new Error('The browser did not create the PDF')))));
    } finally {
      pdfsInProgress -= 1;
    }
    const name = parseStatus(read(`projects/${req.params.id}/status.md`)).title ?? req.params.id;
    const folder = tmp;
    tmp = null;
    res.download(output, `${L('Map', 'Mapa')} - ${name.replace(/[\\/:*?"<>|\r\n]/g, '').slice(0, 80)}.pdf`, () => rmSync(folder, { recursive: true, force: true }));
  } catch (e) {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    if (!(e instanceof HttpError)) console.error(e);
    next(e instanceof HttpError ? e : new HttpError(500, L('Could not create the map PDF. Please try again.', 'No se pudo crear el PDF del mapa. Inténtalo de nuevo.')));
  }
});

// --- Project material (documents, presentations, existing code) ---------------

const materialUpload = multer({
  storage: multer.diskStorage({
    // Errors go through the callback: thrown here, they would bring the server down.
    destination: (req, file, cb) => { try { cb(null, materialDir(req.params.id)); } catch (e) { cb(e); } },
    filename: (req, file, cb) => {
      try { cb(null, freeName(materialDir(req.params.id), file.originalname)); } catch (e) { cb(e); }
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 50 },
  fileFilter: (req, file, cb) => {
    const ok = MATERIAL_EXT.has(extname(file.originalname).toLowerCase());
    cb(ok ? null : new HttpError(400, L(`File type not allowed: ${file.originalname}`, `Tipo de archivo no permitido: ${file.originalname}`)), ok);
  },
});

app.get('/api/projects/:id/material', (req, res) => res.json(listMaterial(req.params.id)));

app.post('/api/projects/:id/material', materialUpload.array('files'), (req, res) => {
  res.json({ uploaded: (req.files ?? []).map((f) => f.filename) });
});

app.delete('/api/projects/:id/material', (req, res) => {
  const dir = materialDir(req.params.id);
  const abs = resolve(dir, String(req.query.path ?? ''));
  const r = relative(dir, abs);
  if (!r || r.startsWith('..') || r === 'links.md') throw new HttpError(403, L('Path not allowed', 'Ruta no permitida'));
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new HttpError(404, L('Not found', 'No existe'));
  unlinkSync(abs);
  res.json({ ok: true });
});

app.get('/api/journal', (req, res) => {
  res.json({
    achievements: parseAchievements(read('journal/achievements.md')),
    skills: parseTable(read('journal/skills.md')),
  });
});

app.get('/api/cv', (req, res) => res.json(listFiles(join(ROOT, 'cv/versions'))));

// --- Twin: conversation with Claude Code from the app -------------------------

const twin = createTwin({ ROOT, safePath, HttpError });
const config = createSettings({ ROOT, HttpError });

// --- Configuration: AI connection and shortcut --------------------------------
const withErrors = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).then((d) => res.json(d), next);

app.get('/api/config/ai', withErrors((req) => config.status({ refresh: req.query.refresh === '1' })));
app.post('/api/config/ai/connect', withErrors((req) => config.startLogin(req.body?.mode)));
app.post('/api/config/ai/code', withErrors((req) => config.sendCode(req.body?.code)));
app.post('/api/config/ai/cancel', withErrors(() => { config.cancelLogin(); return { ok: true }; }));
app.post('/api/config/ai/disconnect', withErrors(() => config.disconnect()));
app.post('/api/config/shortcut', withErrors(() => config.createShortcut()));
// --- Backups ------------------------------------------------------------------
const backups = createBackups({ ROOT, PRIVATE, HttpError, twin, init });
const backupUpload = multer({
  dest: join(tmpdir(), 'twin-uploads'),
  limits: { fileSize: 2 * 1024 ** 3, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = extname(file.originalname).toLowerCase() === '.zip';
    cb(ok ? null : new HttpError(400, L('Choose the backup .zip file (without unzipping it).', 'Elige el archivo .zip de la copia (sin descomprimirlo).')), ok);
  },
});

app.get('/api/backup', (req, res) => {
  const { buffer, name } = backups.create();
  res.attachment(name).type('application/zip').send(buffer);
});

app.get('/api/backup/automatic', (req, res) => {
  const last = backups.lastAutomaticBackup();
  if (req.query.download !== '1') return res.json(last);
  if (!last) throw new HttpError(404, L('There are no automatic backups.', 'No hay copias automáticas.'));
  return res.download(join(backups.backupsDir, last.name), last.name);
});

app.post('/api/backup/restore', backupUpload.single('backup'), (req, res) => {
  if (!req.file) throw new HttpError(400, L('Choose the backup .zip file.', 'Elige el archivo .zip de la copia.'));
  try {
    res.json(backups.restore(req.file.path));
  } finally {
    rmSync(req.file.path, { force: true });
  }
});

// Close the app: stops the local server (the shortcut starts it again).
app.post('/api/config/close', (req, res) => {
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 300);
});

app.get('/api/twin/:type/:id', (req, res) => res.json(twin.read(req.params.type, req.params.id)));

app.post('/api/twin/:type/:id', config.requireAI, (req, res) => {
  const { action, message, label } = req.body ?? {};
  res.json(twin.send(req.params.type, req.params.id, {
    action: action || undefined, message, label: label ? oneLine(label, 200) : undefined,
  }));
});

app.post('/api/twin/:type/:id/stop', (req, res) => res.json(twin.stop(req.params.type, req.params.id)));

// New need: creates the project with what the person said and puts the twin to work on it.
app.post('/api/projects/need', config.requireAI, (req, res) => {
  const { title, text } = req.body ?? {};
  const story = String(text ?? '').trim().slice(0, 20000);
  if (story.length < 15) {
    throw new HttpError(400, L('Tell the twin about the need in a bit more detail.', 'Cuéntale al gemelo la necesidad con un poco más de detalle.'));
  }
  const name = oneLine(title, 100) || oneLine(story, 60).split(/\s+/).slice(0, 6).join(' ');
  const base = `${today().slice(0, 7)}-${slug(name) || 'project'}`;
  let id = base;
  for (let i = 2; existsSync(join(ROOT, 'projects', id)); i++) id = `${base}-${i}`;
  const dir = safePath(`projects/${id}`);
  cpSync(template('project'), dir, { recursive: true });
  const statusFile = join(dir, 'status.md');
  const statusMd = readFileSync(statusFile, 'utf8');
  writeFileSync(statusFile, statusMd
    .replace(RE_STATUS_TITLE, (_, c) => `${c} ${oneLine(title, 100) || name}`)
    .replace(RE_UPDATED, (_, c) => `${c} ${today()}`)
    .replace(RE_NEXT, (_, c) => `${c} ${isSpanish(statusMd) ? 'El gemelo está leyendo tu necesidad' : 'The twin is reading your need'}`), 'utf8');
  const needFile = join(dir, '00-need.md');
  writeFileSync(needFile, readFileSync(needFile, 'utf8')
    .replace(/^>\s*$/m, () => story.split(/\r?\n/).map((l) => `> ${l}`).join('\n')), 'utf8');
  twin.send('project', id, { action: 'need', message: story, label: story });
  res.json({ id });
});

// Delete = move to the trash (folder "_trash", which the app does not show). It can be recovered.
function toTrash(area, id, dir) {
  if (twin.isBusy(area === 'projects' ? 'project' : 'offer', id)) {
    throw new HttpError(409, L(
      'The twin is working here. Wait for it to finish or stop it before deleting.',
      'El gemelo está trabajando aquí. Espera a que termine o detenlo antes de borrar.',
    ));
  }
  const trash = join(ROOT, area, '_trash');
  mkdirSync(trash, { recursive: true });
  const target = join(trash, `${id}--deleted-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  renameSync(dir, target);
  return { ok: true };
}

app.delete('/api/projects/:id', (req, res) => res.json(toTrash('projects', req.params.id, projectDir(req.params.id))));
app.delete('/api/offers/:id', (req, res) => res.json(toTrash('offers', req.params.id, offerDir(req.params.id))));

// --- Job offers ---------------------------------------------------------------

// Offer documents: file → [English title, Spanish title].
const OFFER_DOCS = {
  'offer.md': ['Offer', 'Oferta'],
  'analysis.md': ['Analysis', 'Análisis'],
  'cover-letter.md': ['Cover letter', 'Carta'],
  'interview.md': ['Interview', 'Entrevista'],
};

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
const oneLine = (v, max = 120) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const slug = (v) => oneLine(v, 60).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function offerDir(id) {
  if (!/^[\w.-]+$/.test(id ?? '') || /^[._]/.test(id)) throw new HttpError(400, L('Invalid offer', 'Oferta no válida'));
  const dir = safePath(`offers/${id}`);
  if (!existsSync(join(dir, 'offer.md'))) throw new HttpError(404, L('Offer not found', 'Oferta no encontrada'));
  return dir;
}

function offerSummary(id) {
  const abs = join(ROOT, 'offers', id, 'offer.md');
  return {
    id,
    ...parseOffer(readFileSync(abs, 'utf8')),
    analyzed: existsSync(join(ROOT, 'offers', id, 'analysis.md')),
    modified: statSync(abs).mtime.toISOString(),
  };
}

function offers() {
  const dir = join(ROOT, 'offers');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => !n.startsWith('.') && !n.startsWith('_') && existsSync(join(dir, n, 'offer.md')))
    .map(offerSummary)
    .sort((a, b) => b.modified.localeCompare(a.modified));
}

app.get('/api/offers', (req, res) => res.json({ offers: offers(), statuses: OFFER_STATUSES }));

// Creates an offer folder from the text pasted in the app.
app.post('/api/offers', (req, res) => {
  const {
    company, position, location, link, text,
  } = req.body ?? {};
  if (typeof text !== 'string' || text.trim().length < 20) {
    throw new HttpError(400, L('Paste the text of the offer (at least a few lines).', 'Pega el texto de la oferta (al menos unas líneas).'));
  }
  const base = `${today().slice(0, 7)}-${[slug(company), slug(position)].filter(Boolean).join('-') || 'offer'}`;
  let id = base;
  for (let i = 2; existsSync(join(ROOT, 'offers', id)); i++) id = `${base}-${i}`;
  const dir = safePath(`offers/${id}`);
  mkdirSync(join(dir, 'sources'), { recursive: true });

  const templatePath = template('offer/offer.md');
  const base0 = existsSync(templatePath) ? readFileSync(templatePath, 'utf8')
    : L('# Offer: {Position} · {Company}\n\n- **Status:** New\n\n## Offer text\n\n## Notes\n',
      '# Oferta: {Puesto} · {Empresa}\n\n- **Estado:** Nueva\n\n## Texto de la oferta\n\n## Notas\n');
  const T = isSpanish(base0) ? (en, es) => es : (en) => en;
  // Replacement functions are used so that a "$" in the pasted text is not interpreted.
  // Each field is found by its English or Spanish label, and the template's label is kept.
  const put = (md, labels, value) => md.replace(
    new RegExp(`^(- \\*\\*(?:${labels.join('|')}):\\*\\*).*$`, 'm'),
    (_, c) => `${c} ${value}`,
  );
  let md = base0.replace(/^(# (?:Offer|Oferta):).*$/m,
    (_, c) => `${c} ${oneLine(position) || T('Position ❓', 'Puesto ❓')} · ${oneLine(company) || T('Company ❓', 'Empresa ❓')}`);
  md = put(md, ['Company', 'Empresa'], oneLine(company));
  md = put(md, ['Position', 'Puesto'], oneLine(position));
  md = put(md, ['Location / work mode', 'Ubicación / modalidad'], oneLine(location));
  md = put(md, ['Link', 'Enlace'], oneLine(link, 500));
  md = put(md, ['Received', 'Recibida'], today());
  md = md.replace(/^(## (?:Offer text|Texto de la oferta))[ \t]*$/m, (_, c) => `${c}\n\n${text.trim().slice(0, 60000)}`);
  writeFileSync(join(dir, 'offer.md'), md, 'utf8');
  res.json({ id });
});

app.get('/api/offers/:id', (req, res) => {
  const dir = offerDir(req.params.id);
  const files = listFiles(dir, { recursive: true, exclude: LIST_EXCLUDE });
  const order = (n) => { const i = Object.keys(OFFER_DOCS).indexOf(n); return i < 0 ? 99 : i; };
  const docs = files
    .filter((a) => a.name.endsWith('.md') && !a.path.includes('/sources/'))
    .map((a) => ({
      title: OFFER_DOCS[a.name] ? L(...OFFER_DOCS[a.name]) : a.name.replace(/\.md$/, ''), path: a.path, name: a.name,
    }))
    .sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));
  res.json({
    ...offerSummary(req.params.id),
    statuses: OFFER_STATUSES,
    docs,
    files: offerAttachments(req.params.id, files),
  });
});

// Attachments: everything that is not a twin .md document (offer sources, generated PDF/Word files).
function offerAttachments(id, files = listFiles(offerDir(id), { recursive: true, exclude: LIST_EXCLUDE })) {
  return files
    .filter((a) => !a.name.endsWith('.md') || a.path.includes('/sources/'))
    .map((a) => ({ ...a, relative: a.path.split(`offers/${id}/`)[1] }));
}

app.get('/api/offers/:id/files', (req, res) => res.json(offerAttachments(req.params.id)));

app.put('/api/offers/:id/status', (req, res) => {
  const dir = offerDir(req.params.id);
  // Takes the canonical id (a Spanish label is also accepted). The file gets the label in the current
  // language; if the file already has the field with the other language's label, the file's language is kept
  // so as not to mix ("- **Status:** Applied" / "- **Estado:** Postulada").
  const status = canonicalStatus(req.body?.status);
  if (!status || !OFFER_STATUSES.includes(status)) throw new HttpError(400, L('Invalid status', 'Estado no válido'));
  const abs = join(dir, 'offer.md');
  const md = readFileSync(abs, 'utf8');
  const RE_STATUS = /^(- \*\*(Status|Estado):\*\*).*$/m;
  const updated = RE_STATUS.test(md)
    ? md.replace(RE_STATUS, (_, c, label) => `${c} ${statusLabel(status, label === 'Estado' ? 'es' : 'en')}`)
    : md.replace(/^(# .*)$/m, (l) => `${l}\n\n- **${L('Status', 'Estado')}:** ${statusLabel(status, language())}`);
  writeFileSync(abs, updated, 'utf8');
  res.json({ ok: true });
});

const offerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const d = join(offerDir(req.params.id), 'sources');
        mkdirSync(d, { recursive: true });
        cb(null, d);
      } catch (e) { cb(e); }
    },
    filename: (req, file, cb) => {
      try { cb(null, freeName(join(offerDir(req.params.id), 'sources'), file.originalname)); } catch (e) { cb(e); }
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok = UPLOAD_EXT.has(extname(file.originalname).toLowerCase());
    cb(ok ? null : new HttpError(400, L(`File type not allowed: ${file.originalname}`, `Tipo de archivo no permitido: ${file.originalname}`)), ok);
  },
});

app.post('/api/offers/:id/files', offerUpload.array('files'), (req, res) => {
  res.json({ uploaded: (req.files ?? []).map((f) => f.filename) });
});

// Only attachments are deleted (sources, generated PDFs); the .md files are managed by the twin.
app.delete('/api/offers/:id/files', (req, res) => {
  const dir = offerDir(req.params.id);
  const abs = resolve(dir, String(req.query.path ?? ''));
  const r = relative(dir, abs);
  if (!r || r.startsWith('..') || (extname(abs) === '.md' && !r.startsWith('sources'))) throw new HttpError(403, L('Path not allowed', 'Ruta no permitida'));
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new HttpError(404, L('Not found', 'No existe'));
  unlinkSync(abs);
  res.json({ ok: true });
});

// --- Sources (CV, certificates, company material) -----------------------------

function sourcesDir(area) {
  const r = SOURCE_AREAS[area];
  if (!r) throw new HttpError(404, L('Unknown area', 'Área desconocida'));
  const abs = join(ROOT, r);
  mkdirSync(abs, { recursive: true });
  return abs;
}

const safeName = (n) => basename(n)
  .normalize('NFC')
  .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
  .slice(0, 150);

// File name that does not overwrite an existing one.
function freeName(dir, originalname) {
  // multer gives the name in latin1; convert it to UTF-8 to keep accents.
  const original = safeName(Buffer.from(originalname, 'latin1').toString('utf8'));
  const ext = extname(original);
  const base = original.slice(0, original.length - ext.length);
  let name = original;
  for (let i = 2; existsSync(join(dir, name)); i++) name = `${base} (${i})${ext}`;
  return name;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { try { cb(null, sourcesDir(req.params.area)); } catch (e) { cb(e); } },
    filename: (req, file, cb) => {
      try { cb(null, freeName(sourcesDir(req.params.area), file.originalname)); } catch (e) { cb(e); }
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const ok = UPLOAD_EXT.has(extname(file.originalname).toLowerCase());
    cb(ok ? null : new HttpError(400, L(`File type not allowed: ${file.originalname}`, `Tipo de archivo no permitido: ${file.originalname}`)), ok);
  },
});

app.get('/api/sources/:area', (req, res) => res.json(listFiles(sourcesDir(req.params.area))));

app.post('/api/sources/:area', upload.array('files'), (req, res) => {
  res.json({ uploaded: (req.files ?? []).map((f) => f.filename) });
});

app.delete('/api/sources/:area/:name', (req, res) => {
  const abs = join(sourcesDir(req.params.area), safeName(req.params.name));
  safePath(rel(abs));
  if (!existsSync(abs)) throw new HttpError(404, L('Not found', 'No existe'));
  unlinkSync(abs);
  res.json({ ok: true });
});

// --- Client -------------------------------------------------------------------

const DIST = join(ROOT, 'app/client/dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(join(DIST, 'index.html')));
}

app.use((err, req, res, next) => {
  const status = err.status ?? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 && !(err instanceof HttpError) ? L('Internal error', 'Error interno') : err.message });
});

app.listen(PORT, HOST, () => {
  console.log(L(`Professional Twin at http://localhost:${PORT}`, `Gemelo profesional en http://localhost:${PORT}`));
});
