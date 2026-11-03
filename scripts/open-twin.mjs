// Opens Professional Twin: starts the local server if it is not running (building the interface if needed) and opens the browser.
// Used by the desktop shortcut (scripts/open-twin.vbs). Also: `npm run open`.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './init.mjs';

const PORT = Number(process.env.PORT ?? 3210);
const APP_URL = `http://localhost:${PORT}`;
const responds = () => fetch(`${APP_URL}/api/config/ai`).then((r) => r.ok, () => false);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Date of the most recent file in a folder (to know whether the interface is out of date).
function newest(dir) {
  let max = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    max = Math.max(max, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return max;
}

function openBrowser() {
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', APP_URL], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [APP_URL], { detached: true, stdio: 'ignore' }).unref();
}

if (!(await responds())) {
  const index = join(ROOT, 'app/client/dist/index.html');
  const sources = [join(ROOT, 'app/client/src'), join(ROOT, 'app/shared')];
  if (!existsSync(index) || Math.max(...sources.filter(existsSync).map(newest)) > statSync(index).mtimeMs) {
    execFileSync(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: ROOT, stdio: 'ignore' });
  }
  spawn(process.execPath, [join(ROOT, 'app/server/index.mjs')], {
    cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true,
  }).unref();
  for (let i = 0; i < 60 && !(await responds()); i++) await wait(500);
}
openBrowser();
