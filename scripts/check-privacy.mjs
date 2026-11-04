// Privacy guard: fails if personal content could reach the repository.
// Runs in CI on every pull request and locally with `npm run check:privacy`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PRIVATE = ['profile', 'context', 'journal', 'projects', 'cv', 'offers', 'backups'];
const PRIVATE_FILES = ['settings.json'];
// Old Spanish-named private folders from earlier versions: also never versioned.
const LEGACY = ['perfil', 'contexto', 'bitacora', 'proyectos', 'ofertas', 'copias', 'ajustes.json'];
const ALLOWED_EMAIL = /@(example\.(com|org|net)|anthropic\.com|users\.noreply\.github\.com)$/i;
const TEXT = /\.(m?js|jsx|json|md|txt|html|css|ya?ml|bat|vbs|svg)$/i;

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const problems = [];

// 1. No tracked file inside a private folder, and no private settings or backups.
for (const f of files) {
  const top = f.split('/')[0];
  if (PRIVATE.includes(top) || LEGACY.includes(top) || PRIVATE_FILES.includes(f)) {
    problems.push(`${f}: private content must never be committed`);
  }
  if (/\.zip$/i.test(f)) problems.push(`${f}: backups (.zip) must never be committed`);
}

// 2. .gitignore still protects every private folder and file.
const ignore = readFileSync('.gitignore', 'utf8').split(/\r?\n/).map((l) => l.trim().replace(/^\/|\/$/g, ''));
for (const p of [...PRIVATE, ...PRIVATE_FILES]) {
  if (!ignore.includes(p)) problems.push(`.gitignore: "${p}" must stay ignored`);
}

// 3. No real-looking email addresses in tracked text files (use @example.com in examples).
for (const f of files) {
  if (!TEXT.test(f) || f === 'package-lock.json') continue;
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
      if (!ALLOWED_EMAIL.test(m[0])) problems.push(`${f}:${i + 1}: email address "${m[0]}" (use @example.com)`);
    }
  });
}

// 4. No Windows paths with a real user name (use C:\Users\your-user\...).
for (const f of files) {
  if (!TEXT.test(f) || f === 'package-lock.json') continue;
  readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/[A-Za-z]:\\{1,2}Users\\{1,2}([^\\\s"'`<>]+)/gi)) {
      if (!/^(your-user|tu-usuario|<[^>]*>|public|default|\$|%)/i.test(m[1])) {
        problems.push(`${f}:${i + 1}: path with a user name "${m[0]}" (use C:\\Users\\your-user)`);
      }
    }
  });
}

if (problems.length) {
  console.error(`Privacy check failed (${problems.length}):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Privacy check passed (${files.length} tracked files).`);
