// Backups: all of the person's content in one .zip, and restoring it from that same file.
// Before restoring, a copy of the current state is saved automatically in `backups/` (not versioned).
// Old backups (manifest `gemelo-copia.json`, Spanish folder and file names) are also accepted:
// their paths and contents are translated with the same legacy mapping as `npm run migrate`.
import AdmZip from 'adm-zip';
import {
  existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { L } from './i18n.mjs';
import { convertContent, mapLegacyPath } from './legacy.mjs';

const MANIFEST = 'twin-backup.json';
const README = 'README.txt';
const APP_ID = 'professional-twin';
const LEGACY_MANIFEST = 'gemelo-copia.json';
const LEGACY_README = 'LEEME.txt';
const LEGACY_APP_ID = 'gemelo-profesional';
const SKIP = new Set(['node_modules', '.venv', 'venv', '__pycache__', '.git']);
const MAX_UNCOMPRESSED = 4 * 1024 ** 3; // 4 GB

const timestamp = () => new Date().toLocaleString('sv-SE').replace(' ', '_').replace(/:/g, '-'); // YYYY-MM-DD_hh-mm-ss

// Bilingual README: a backup can be restored with the app in either language.
const README_TEXT = (date) => `PROFESSIONAL TWIN BACKUP
Created on ${date}

This file contains all your twin information: profile, company, achievement log,
projects (with their maps, uploaded material and conversations), CV and job offers.

HOW TO RESTORE IT
1. Open Professional Twin and go to Settings → Backups.
2. Press "Restore from a backup" and choose this .zip file (without unzipping it).
3. Confirm. What is in the app is replaced by the content of this backup
   (beforehand, the app automatically saves a copy of what was there, just in case).

KEEP IT IN A SAFE PLACE
It contains personal and work data: keep it in a private folder or on a trusted personal
drive or cloud, and do not share it.

It does not include the network or external folders you pointed to in projects: only their paths.

------------------------------------------------------------------------------------------

COPIA DE SEGURIDAD DEL GEMELO PROFESIONAL
Creada el ${date}

Este archivo contiene toda tu información del gemelo: perfil, empresa, bitácora de logros,
proyectos (con sus mapas, material subido y conversaciones), CV y ofertas.

CÓMO RECUPERARLA
1. Abre el gemelo profesional y ve a Configuración → Copias de seguridad.
2. Pulsa «Restaurar desde una copia» y elige este archivo .zip (sin descomprimirlo).
3. Confirma. Lo que haya en la app se sustituye por el contenido de esta copia
   (antes, la app guarda automáticamente una copia de lo que había, por si acaso).

GUÁRDALA EN UN LUGAR SEGURO
Contiene datos personales y de tu trabajo: guárdala en una carpeta privada o en un disco
o nube personal de confianza, y no la compartas.

No incluye las carpetas de red o externas que indicaste en los proyectos: solo las rutas.
`;

export function createBackups({ ROOT, PRIVATE, HttpError, twin, init }) {
  const backupsDir = join(ROOT, 'backups');

  function addFolder(zip, abs, inZip) {
    const content = readdirSync(abs, { withFileTypes: true });
    if (!content.length) zip.addFile(`${inZip}/`, Buffer.alloc(0)); // empty folders count too (e.g. sources/)
    for (const e of content) {
      if (SKIP.has(e.name)) continue;
      const child = join(abs, e.name);
      const path = posix.join(inZip, e.name);
      if (e.isDirectory()) addFolder(zip, child, path);
      else if (e.isFile()) zip.addLocalFile(child, inZip);
    }
  }

  function create() {
    const zip = new AdmZip();
    const date = new Date().toLocaleString(L('en-GB', 'es-ES'), { dateStyle: 'long', timeStyle: 'short' });
    const folders = PRIVATE.filter((c) => existsSync(join(ROOT, c)));
    for (const c of folders) addFolder(zip, join(ROOT, c), c);
    const files = zip.getEntries().filter((e) => !e.isDirectory).length;
    zip.addFile(MANIFEST, Buffer.from(JSON.stringify({
      app: APP_ID, version: 2, created: new Date().toISOString(), folders, files,
    }, null, 2)));
    zip.addFile(README, Buffer.from(README_TEXT(date).replace(/\n/g, '\r\n')));
    return { buffer: zip.toBuffer(), name: `professional-twin-backup-${timestamp().slice(0, 10)}.zip` };
  }

  // Checks that the .zip is a twin backup (current or old format) and that it only writes inside the private folders.
  function validate(zip) {
    const entries = zip.getEntries();
    const readJson = (name) => {
      try { const e = zip.getEntry(name); return e && JSON.parse(e.getData().toString('utf8')); } catch { return null; }
    };
    let data = readJson(MANIFEST);
    let legacy = false;
    if (data?.app !== APP_ID) {
      const old = readJson(LEGACY_MANIFEST);
      if (old?.app === LEGACY_APP_ID) {
        legacy = true;
        data = { ...old, created: old.creada ?? null };
      } else {
        throw new HttpError(400, L(
          'This file is not a twin backup. Choose the .zip you downloaded from Settings.',
          'Este archivo no es una copia de seguridad del gemelo. Elige el .zip que descargaste desde Configuración.',
        ));
      }
    }
    const skip = legacy ? [LEGACY_MANIFEST, LEGACY_README] : [MANIFEST, README];
    const unexpected = () => new HttpError(400, L(
      'The backup contains unexpected files and cannot be restored.',
      'La copia contiene archivos fuera de lo esperado y no se puede restaurar.',
    ));
    let total = 0;
    const files = [];
    for (const e of entries) {
      if (skip.includes(e.entryName)) continue;
      const raw = e.entryName.replace(/\\/g, '/').replace(/\/$/, '');
      if (posix.isAbsolute(raw) || raw.split('/').includes('..')) throw unexpected();
      const name = legacy ? mapLegacyPath(raw) : raw;
      if (!name || name === 'settings.json') throw unexpected();
      const target = resolve(ROOT, name);
      const rel = relative(ROOT, target);
      const top = rel.split(sep)[0];
      if (rel.startsWith('..') || !PRIVATE.includes(top) || rel === top) throw unexpected();
      total += e.header.size;
      files.push({ entry: e, target, name, folder: e.isDirectory });
    }
    if (total > MAX_UNCOMPRESSED) throw new HttpError(413, L('The backup is too large to restore.', 'La copia es demasiado grande para restaurarla.'));
    if (!files.some((f) => !f.folder)) throw new HttpError(400, L('The backup is empty.', 'La copia está vacía.'));
    return { data, files, legacy };
  }

  function restore(zipPath) {
    if (twin.isWorking()) {
      throw new HttpError(409, L(
        'The twin is working on something. Wait for it to finish (or stop it) and try again.',
        'El gemelo está trabajando en algo. Espera a que termine (o detenlo) y vuelve a intentarlo.',
      ));
    }
    let zip;
    try {
      zip = new AdmZip(zipPath);
    } catch {
      throw new HttpError(400, L(
        'Could not open the file. Is it a .zip downloaded from the twin?',
        'No se pudo abrir el archivo. ¿Es un .zip descargado desde el gemelo?',
      ));
    }
    const { data, files, legacy } = validate(zip);

    // 1. Automatic backup of what is there now.
    mkdirSync(backupsDir, { recursive: true });
    const safetyCopy = `before-restore-${timestamp()}.zip`;
    writeFileSync(join(backupsDir, safetyCopy), create().buffer);

    // 2. Move the current folders aside (to undo if something fails) and write the backup.
    const aside = join(backupsDir, `.restoring-${Date.now()}`);
    mkdirSync(aside, { recursive: true });
    const moved = [];
    try {
      for (const c of PRIVATE) {
        if (existsSync(join(ROOT, c))) { renameSync(join(ROOT, c), join(aside, c)); moved.push(c); }
      }
      for (const { entry, target, name, folder } of files) {
        if (folder) { mkdirSync(target, { recursive: true }); continue; }
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, legacy ? convertContent(name, entry.getData()) : entry.getData());
      }
    } catch (e) {
      for (const c of PRIVATE) rmSync(join(ROOT, c), { recursive: true, force: true });
      for (const c of moved) renameSync(join(aside, c), join(ROOT, c));
      rmSync(aside, { recursive: true, force: true });
      console.error(e);
      throw new HttpError(500, L('Could not restore the backup. Your information is unchanged.', 'No se pudo restaurar la copia. Tu información sigue como estaba.'));
    }
    rmSync(aside, { recursive: true, force: true });
    init(); // fills in whatever is missing from the templates, without overwriting anything
    return {
      files: files.filter((f) => !f.folder).length, created: data.created ?? null, safetyCopy, legacy,
    };
  }

  function lastAutomaticBackup() {
    if (!existsSync(backupsDir)) return null;
    const zips = readdirSync(backupsDir).filter((n) => n.endsWith('.zip'))
      .map((n) => ({ name: n, date: statSync(join(backupsDir, n)).mtime }))
      .sort((a, b) => b.date - a.date);
    return zips[0] ?? null;
  }

  return { create, restore, lastAutomaticBackup, backupsDir };
}
