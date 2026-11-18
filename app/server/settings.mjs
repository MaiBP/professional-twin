// Settings: connection with the AI (Claude Code account) and desktop shortcut.
// The app stores no credentials: sign-in is handled by Claude Code in its own configuration.
import { execFile, spawn } from 'node:child_process';
import { join } from 'node:path';
import { L, MODELS, model as savedModel } from './i18n.mjs';
import { explainFailure } from './failures.mjs';

const CLAUDE = process.env.CLAUDE_BIN ?? 'claude';
const CACHE_MS = 30000;
const stripEscapes = (t) => String(t).replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, ' ').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

export function createSettings({ ROOT, HttpError }) {
  let cache = null;
  let login = null; // { child, url, output, exited }

  const run = (args, timeout = 20000) => new Promise((done) => {
    execFile(CLAUDE, args, { timeout, windowsHide: true, cwd: ROOT }, (e, stdout, stderr) => done({ e, stdout, stderr }));
  });

  async function status({ refresh = false } = {}) {
    if (!refresh && cache && Date.now() - cache.time < CACHE_MS) return cache.data;
    const { e, stdout } = await run(['auth', 'status', '--json']);
    let data;
    if (e?.code === 'ENOENT') {
      data = { installed: false, connected: false };
    } else {
      let s = {};
      try { s = JSON.parse(stdout); } catch { /* unexpected output: treated as not connected */ }
      const method = s.authMethod === 'claude.ai' ? 'subscription'
        : s.authMethod && s.authMethod !== 'none' ? 'console' : null;
      data = {
        installed: true,
        connected: !!s.loggedIn,
        method,
        email: s.email ?? null,
        plan: s.subscriptionType ?? null,
        organization: s.orgName ?? null,
      };
    }
    cache = { time: Date.now(), data };
    return data;
  }

  // Starts sign-in: Claude Code opens the browser and waits for the code the page shows.
  function startLogin(mode) {
    cancelLogin();
    const child = spawn(CLAUDE, ['auth', 'login', mode === 'console' ? '--console' : '--claudeai'], {
      cwd: ROOT, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const current = { child, url: null, output: '', exited: null };
    login = current;
    return new Promise((ok, fail) => {
      const read = (d) => {
        current.output = (current.output + stripEscapes(d)).slice(-8000);
        const url = current.output.match(/https:\/\/\S+?(?=\s)/);
        if (url && !current.url) { current.url = url[0]; ok({ url: current.url }); }
      };
      child.stdout.on('data', read);
      child.stderr.on('data', read);
      child.on('error', (e) => fail(e.code === 'ENOENT'
        ? new HttpError(503, L('Claude Code is not installed on this PC.', 'Claude Code no está instalado en este PC.')) : e));
      child.on('exit', (code) => {
        current.exited = code;
        cache = null;
        if (!current.url) {
          fail(new HttpError(502, L('Could not start the connection with Claude. Please try again.', 'No se pudo iniciar la conexión con Claude. Inténtalo de nuevo.')));
        }
      });
      setTimeout(() => {
        if (!current.url) { child.kill(); fail(new HttpError(504, L('Claude took too long to respond.', 'Claude tardó demasiado en responder.'))); }
      }, 30000);
    });
  }

  // Sends the code the person copied from the Claude page and waits for sign-in to finish.
  async function sendCode(code) {
    const current = login;
    if (!current || current.exited !== null) {
      throw new HttpError(409, L('First press “Connect” to open the Claude page.', 'Primero pulsa «Conectar» para abrir la página de Claude.'));
    }
    const clean = String(code ?? '').trim();
    if (!clean || clean.length > 2000 || /\s/.test(clean)) {
      throw new HttpError(400, L('Paste the code exactly as the Claude page shows it.', 'Pega el código tal cual te lo muestra la página de Claude.'));
    }
    const end = new Promise((done) => {
      current.child.on('exit', done);
      setTimeout(() => { current.child.kill(); done(null); }, 60000);
    });
    current.child.stdin.write(`${clean}\n`);
    await end;
    login = null;
    const data = await status({ refresh: true });
    if (!data.connected) {
      throw new HttpError(400, L(
        'Claude did not accept the code. Press “Connect” again and copy the new code.',
        'Claude no aceptó el código. Vuelve a pulsar «Conectar» y copia el código nuevo.',
      ));
    }
    return data;
  }

  function cancelLogin() {
    if (login && login.exited === null) login.child.kill();
    login = null;
  }

  async function disconnect() {
    cancelLogin();
    await run(['auth', 'logout']);
    return status({ refresh: true });
  }

  // Middleware: the twin only works if an account is connected.
  const requireAI = (req, res, next) => {
    status().then((s) => {
      if (!s.installed) {
        return next(new HttpError(503, L(
          'The twin needs Claude Code on this PC to work. See Settings.',
          'Para que el gemelo trabaje hace falta Claude Code en este PC. Mira Configuración.',
        )));
      }
      if (!s.connected) {
        return next(new HttpError(409, L(
          'Connect your Claude account in Settings so the twin can work.',
          'Conecta tu cuenta de Claude en Configuración para que el gemelo pueda trabajar.',
        )));
      }
      return next();
    }, next);
  };

  // Sends a tiny message with the chosen model to check that this account can use it.
  // Returns { ok: true, modelId } or { ok: false, code, text, detail }: a failure is an answer, not an HTTP error.
  function testModel(requested) {
    const chosen = requested ?? savedModel();
    if (!MODELS.includes(chosen)) throw new HttpError(400, L('Invalid model', 'Modelo no válido'));
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--max-turns', '1'];
    if (chosen !== 'auto') args.push('--model', chosen);
    return new Promise((done) => {
      const child = spawn(CLAUDE, args, { cwd: ROOT, windowsHide: true, env: process.env });
      let rest = '';
      let stderr = '';
      let result = null;
      let rateLimit = null;
      let spawnError = null;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, 90000);
      const handle = (line) => {
        let ev;
        try { ev = JSON.parse(line); } catch { return; }
        if (ev.type === 'rate_limit_event') rateLimit = ev.rate_limit_info ?? null;
        if (ev.type === 'result') result = ev;
      };
      child.stdout.on('data', (d) => {
        rest += d.toString('utf8');
        const lines = rest.split('\n');
        rest = lines.pop();
        lines.filter(Boolean).forEach(handle);
      });
      child.stderr.on('data', (d) => { stderr = (stderr + d.toString('utf8')).slice(-2000); });
      child.on('error', (e) => { spawnError = e; });
      child.on('close', () => {
        clearTimeout(timer);
        if (rest.trim()) handle(rest);
        if (result && !result.is_error) {
          const modelId = Object.keys(result.modelUsage ?? {})[0] ?? null;
          return done({ ok: true, model: chosen, modelId });
        }
        if (timedOut) {
          return done({ ok: false, model: chosen, code: 'timeout', detail: null, text: L(
            'Claude did not answer within 90 seconds. Check your internet connection and try again.',
            'Claude no respondió en 90 segundos. Revisa tu conexión a internet y vuelve a probar.',
          ) });
        }
        const f = explainFailure({ result, rateLimit, stderr, spawnError, model: chosen });
        return done({ ok: false, model: chosen, code: f.code, text: f.text, detail: f.detail });
      });
      child.stdin.end('Reply with just the word: ok');
    });
  }

  // Desktop shortcut that starts the app (if it is not running) and opens it in the browser.
  function createShortcut() {
    if (process.platform !== 'win32') {
      return Promise.reject(new HttpError(501, L(
        'The automatic shortcut is only available on Windows.',
        'El acceso directo automático solo está disponible en Windows.',
      )));
    }
    const vbs = join(ROOT, 'scripts', 'open-twin.vbs');
    // The shortcut name and description go through environment variables (not interpolated into the script).
    const ps = '$e=[Environment]::GetFolderPath(\'Desktop\');$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $e ($env:TWIN_NAME + \'.lnk\')));'
      + `$s.TargetPath=Join-Path $env:SystemRoot 'System32\\wscript.exe';$s.Arguments='"' + $env:TWIN_VBS + '"';$s.WorkingDirectory=$env:TWIN_ROOT;`
      + `$s.IconLocation=(Join-Path $env:SystemRoot 'System32\\imageres.dll') + ',76';$s.Description=$env:TWIN_DESCRIPTION;$s.Save();Write-Output $e`;
    return new Promise((ok, fail) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      windowsHide: true,
      timeout: 20000,
      env: {
        ...process.env, TWIN_VBS: vbs, TWIN_ROOT: ROOT,
        TWIN_NAME: L('Professional Twin', 'Gemelo profesional'),
        TWIN_DESCRIPTION: L('Opens your Professional Twin', 'Abre tu gemelo profesional'),
      },
    }, (e, stdout) => (e
      ? fail(new HttpError(500, L('Could not create the shortcut.', 'No se pudo crear el acceso directo.')))
      : ok({ desktop: stdout.trim() }))));
  }

  return { status, startLogin, sendCode, cancelLogin, disconnect, requireAI, testModel, createShortcut };
}
