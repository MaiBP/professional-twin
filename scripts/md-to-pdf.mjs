// Turns a .md file (CV, cover letter) into a clean, ATS-friendly A4 PDF, using Edge or Chrome in headless mode.
// Usage: node scripts/md-to-pdf.mjs <file.md> [output.pdf]   (or: npm run pdf -- <file.md>)
// Consecutive lines that are not headings or bullets are kept as line breaks (contact details, skills).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { micromark } from 'micromark';

const [, , input, outputArg] = process.argv;
if (!input || !existsSync(input)) {
  console.error('Usage: node scripts/md-to-pdf.mjs <file.md> [output.pdf]');
  process.exit(1);
}
const output = resolve(outputArg ?? input.replace(/\.md$/i, '.pdf'));

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = BROWSERS.find(existsSync);
if (!browser) {
  console.error('Could not find Edge or Chrome to create the PDF.');
  process.exit(1);
}

const lines = readFileSync(input, 'utf8').replace(/\r/g, '').split('\n');
const plain = (l) => l.trim() && !/^(#|-\s|\*\s|\d+\.\s|\||>)/.test(l);
const md = lines.map((l, i) => (plain(l) && plain(lines[i + 1] ?? '') ? `${l}  ` : l)).join('\n');
const lang = /[áéíóúñ¿¡]/i.test(md) ? 'es' : 'en';

const css = `@page{size:A4;margin:16mm 18mm}
body{font-family:Calibri,Carlito,Arial,sans-serif;font-size:10.5pt;line-height:1.35;color:#111}
h1{font-size:22pt;margin:0 0 2px}h1+p{margin:0 0 4px;font-size:11.5pt}
h2{font-size:12.5pt;margin:14px 0 5px;border-bottom:1px solid #999;padding-bottom:2px}
h3{font-size:11pt;margin:9px 0 1px}h3+p{margin:0 0 3px}p{margin:3px 0}
ul{margin:3px 0 4px;padding-left:18px}li{margin:1.5px 0}a{color:#111}
table{border-collapse:collapse;width:100%;font-size:9.5pt}th,td{border:1px solid #bbb;padding:3px 5px;text-align:left}
h2,h3{break-after:avoid}li,tr{break-inside:avoid}`;

const tmp = mkdtempSync(join(tmpdir(), 'twin-pdf-'));
try {
  const html = join(tmp, 'document.html');
  writeFileSync(html, `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>Document</title><style>${css}</style></head><body>${micromark(md)}</body></html>`);
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--user-data-dir=${join(tmp, 'profile')}`, `--print-to-pdf=${output}`, pathToFileURL(html).href,
  ], { stdio: 'ignore', timeout: 60000 });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
if (!existsSync(output)) {
  console.error('The browser did not create the PDF.');
  process.exit(1);
}
console.log(`PDF created: ${output}`);
