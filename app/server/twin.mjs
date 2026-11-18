// Twin engine: runs Claude Code non-interactively from the app, so nobody has to type commands.
// Each context (a project, an offer or a general section) has its own conversation, saved next to its content.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { L, language, model } from './i18n.mjs';
import { convertConversation } from './legacy.mjs';
import { explainFailure } from './failures.mjs';

const MAX_CONCURRENT = 3;
const TIME_LIMIT_MS = 20 * 60 * 1000;
const GENERAL = ['home', 'profile', 'company', 'journal', 'cv'];

// What the twin must keep in mind when it speaks through the app, in the language chosen in Settings.
const APP_INSTRUCTIONS = {
  en: `You are replying through the Professional Twin app, not a terminal. The person may not be technical:
- Language: reply and write new content in English. When editing an existing file, keep the field labels and headings exactly as they are in that file, even if they are in Spanish (the app parses them). New files are created from the templates in templates/en/.
- Do not mention commands (anything starting with /), file names, paths, folders, Markdown, git or technical details. Talk about "the analysis", "the project map", "your achievement log", "your profile", "the Material tab", "your CV".
- Be brief and warm: what you did or found in 2-5 lines and, if you need information, your numbered questions (at most 6), each with your suggested answer, so they can reply "ok" or correct it.
- Do not use the AskUserQuestion tool: write the questions in your reply; the person will answer in the app's chat.
- Do not run programs or scripts that come in the person's material, and do not install anything.
- If you left something ready to see, end by saying where to find it in the app (for example: "You'll find it in the Analysis tab").`,
  es: `Estás respondiendo a través de la app del gemelo profesional, no de un terminal. La persona puede no ser técnica:
- Idioma: responde y escribe el contenido nuevo en español. Al editar un archivo existente, conserva sus etiquetas de campo y títulos exactamente como están, aunque estén en inglés (la app los interpreta). Los archivos nuevos se crean desde las plantillas de templates/es/.
- No menciones comandos (nada que empiece por /), nombres de archivo, rutas, carpetas, Markdown, git ni detalles técnicos. Habla de "el análisis", "el mapa del proyecto", "tu bitácora", "tu perfil", "la pestaña Material", "tu CV".
- Sé breve y cercano: qué hiciste o encontraste en 2-5 líneas y, si necesitas información, tus preguntas numeradas (como mucho 6), cada una con tu respuesta sugerida, para que pueda contestar "ok" o corregir.
- No uses la herramienta AskUserQuestion: escribe las preguntas en tu respuesta; la persona contestará en el chat de la app.
- No ejecutes programas ni scripts que vengan en el material de la persona, y no instales nada.
- Si dejaste algo listo para ver, termina diciendo dónde mirarlo en la app (por ejemplo: "Lo tienes en la pestaña Análisis").`,
};

const TOOLS = [
  'Read', 'Glob', 'Grep', 'Edit', 'Write', 'Skill', 'WebFetch', 'TodoWrite',
  'Bash(npm run pdf:*)', 'Bash(node scripts/md-to-pdf.mjs:*)', 'Bash(ls:*)', 'Bash(find:*)', 'Bash(unzip:*)', 'Bash(mkdir:*)',
  'PowerShell(Expand-Archive:*)', 'PowerShell(Get-ChildItem:*)',
];

// Named actions → text the twin receives. Without an action, the person's message goes as is (or with context if it is the first).
// Internal instructions are in English; the reply language is set by APP_INSTRUCTIONS.
const ACTIONS = {
  project: {
    need: (id, m) => `/need The project is already created in projects/${id}/: complete it there and do not create another folder. What the person said:\n\n${m}`,
    document: (id, m) => `/document ${id}${m ? ` ${m}` : ''}`,
    material: (id) => `/advance ${id} review the new material in the Material tab and tell me what it adds`,
    map: (id) => `/advance ${id} update the project map (summary, diagram and components) with what we know today`,
    advance: (id, m) => `/advance ${id}${m ? ` ${m}` : ''}`,
    _first: (id, m) => `/advance ${id} ${m}`,
  },
  offer: {
    analyze: (id) => `/offer ${id}`,
    cv: (id) => `/offer ${id} generate the CV tailored to this offer, with its PDF`,
    letter: (id) => `/offer ${id} write the cover letter, with its PDF`,
    interview: (id) => `/offer ${id} prepare me for the interview`,
    _first: (id, m) => `/offer ${id} ${m}`,
  },
  general: {
    onboarding: (id, m) => `/onboarding${m ? ` ${m}` : ''}`,
    mentor: (id, m) => `/mentor${m ? ` ${m}` : ''}`,
    status: () => '/status',
    log: (id, m) => `/log ${m}`,
    cv: (id, m) => `/cv ${m}`,
    _first: (id, m) => m,
  },
};

// Friendly name of each file: [English, Spanish].
const NAMES = {
  'profile.md': ['your profile', 'tu perfil'], 'criteria.md': ['your working criteria', 'tus criterios'],
  'goals.md': ['your career path', 'tu proyección'], 'company.md': ['the company context', 'el contexto de la empresa'],
  'achievements.md': ['your achievement log', 'tu bitácora'], 'skills.md': ['your skills', 'tus habilidades'],
  'offer.md': ['the offer', 'la oferta'], 'analysis.md': ['the analysis', 'el análisis'],
  'map.md': ['the project map', 'el mapa del proyecto'], 'status.md': ['the project status', 'el estado del proyecto'],
  'decisions.md': ['the decisions', 'las decisiones'], 'SKILL.md': ['the working method', 'el método de trabajo'],
  'CLAUDE.md': ['your instructions', 'tus instrucciones'], 'links.md': ['the material links', 'los enlaces del material'],
  'inventory.md': ['the material inventory', 'el inventario del material'],
  '00-need.md': ['the need', 'la necesidad'], '01-discovery.md': ['the discovery', 'el descubrimiento'],
  '02-definition.md': ['the definition', 'la definición'], '03-plan.md': ['the plan', 'el plan'],
  '04-delivery.md': ['the delivery', 'la entrega'], '05-closure.md': ['the closure', 'el cierre'],
  'cover-letter.md': ['the cover letter', 'la carta'], 'interview.md': ['the interview preparation', 'la preparación de la entrevista'],
};
const friendlyName = (path) => {
  const b = basename(String(path ?? ''));
  if (NAMES[b]) return L(...NAMES[b]);
  return /^cv/i.test(b) ? L('your CV', 'tu CV') : b || L('a file', 'un archivo');
};

// Turns each tool the twin uses into an understandable step.
function step(use) {
  const i = use.input ?? {};
  switch (use.name) {
    case 'Read': return L(`Reading ${friendlyName(i.file_path)}`, `Leyendo ${friendlyName(i.file_path)}`);
    case 'Write': return L(`Writing ${friendlyName(i.file_path)}`, `Escribiendo ${friendlyName(i.file_path)}`);
    case 'Edit': return L(`Updating ${friendlyName(i.file_path)}`, `Actualizando ${friendlyName(i.file_path)}`);
    case 'Glob': case 'Grep': return L('Searching your files', 'Buscando en tus archivos');
    case 'Skill': return L('Applying the working method', 'Aplicando el método de trabajo');
    case 'WebFetch': return L('Reading a web page', 'Leyendo una página web');
    case 'TodoWrite': return null;
    case 'Bash': case 'PowerShell': {
      const c = String(i.command ?? '');
      if (/pdf/i.test(c)) return L('Generating the PDF', 'Generando el PDF');
      if (/Expand-Archive|unzip/i.test(c)) return L('Unzipping files', 'Descomprimiendo archivos');
      return L('Checking folders', 'Revisando carpetas');
    }
    default: return L('Thinking…', 'Pensando…');
  }
}

export function createTwin({ ROOT, safePath, HttpError }) {
  const active = new Map();

  function conversationFile(type, id) {
    if (!/^[\w.-]+$/.test(id ?? '') || /^[._]/.test(id)) throw new HttpError(400, L('Invalid context', 'Contexto no válido'));
    if (type === 'project' || type === 'offer') {
      const dir = safePath(`${type === 'project' ? 'projects' : 'offers'}/${id}`);
      if (!existsSync(dir)) throw new HttpError(404, L('Not found', 'No encontrado'));
      return join(dir, 'conversation.json');
    }
    if (type === 'general' && GENERAL.includes(id)) return safePath(`journal/conversations/${id}.json`);
    throw new HttpError(400, L('Invalid context', 'Contexto no válido'));
  }

  const empty = () => ({ session: null, state: 'idle', steps: [], messages: [] });
  function read(type, id) {
    const abs = conversationFile(type, id);
    let c = empty();
    try {
      // convertConversation also accepts the old Spanish format (copied by hand into the new folder).
      if (existsSync(abs)) c = { ...c, ...convertConversation(JSON.parse(readFileSync(abs, 'utf8'))) };
    } catch { /* damaged conversation: start from scratch */ }
    if (c.state === 'working' && !active.has(`${type}/${id}`)) {
      c.state = 'interrupted'; // the server restarted in the middle of a task
    }
    return c;
  }
  function save(type, id, c) {
    const abs = conversationFile(type, id);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(c, null, 2), 'utf8');
  }

  // External folders the person gave as sources (in material/links.md): the twin needs permission to read them.
  function extraFolders(type, id) {
    if (type !== 'project') return [];
    const links = join(ROOT, 'projects', id, 'material', 'links.md');
    if (!existsSync(links)) return [];
    return [...readFileSync(links, 'utf8').matchAll(/`([^`]+)`/g)].map((m) => m[1].trim())
      .filter((r) => /^([a-zA-Z]:[\\/]|\\\\)/.test(r) && existsSync(r)).slice(0, 20);
  }

  function send(type, id, { action, message = '', label } = {}) {
    const key = `${type}/${id}`;
    if (active.has(key)) {
      throw new HttpError(409, L('The twin is already working on this. Wait for it to finish.', 'El gemelo ya está trabajando en esto. Espera a que termine.'));
    }
    if (active.size >= MAX_CONCURRENT) {
      throw new HttpError(429, L('The twin is busy with other tasks. Try again in a moment.', 'El gemelo está con otras tareas. Prueba en un momento.'));
    }
    const text = String(message ?? '').trim().slice(0, 20000);
    const actions = ACTIONS[type] ?? {};
    if (action && (!actions[action] || action.startsWith('_'))) throw new HttpError(400, L('Unknown action', 'Acción desconocida'));
    if (!action && !text) throw new HttpError(400, L('Write a message', 'Escribe un mensaje'));

    const c = read(type, id);
    const prompt = action ? actions[action](id, text) : c.session ? text : actions._first(id, text);
    c.messages.push({ role: 'user', text: label ?? text, date: new Date().toISOString() });
    c.state = 'working';
    c.steps = [];
    c.start = new Date().toISOString();
    save(type, id, c);

    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
      '--append-system-prompt', APP_INSTRUCTIONS[language()] ?? APP_INSTRUCTIONS.en, '--allowedTools', ...TOOLS];
    const chosenModel = model();
    if (chosenModel !== 'auto') args.push('--model', chosenModel);
    for (const d of extraFolders(type, id)) args.push('--add-dir', d);
    if (c.session) args.push('--resume', c.session);

    const child = spawn(process.env.CLAUDE_BIN ?? 'claude', args, { cwd: ROOT, windowsHide: true, env: process.env });
    active.set(key, child);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, TIME_LIMIT_MS);
    let rest = '';
    let result = null;
    let rateLimit = null;
    let lastText = '';
    let errorText = '';
    let spawnError = null;
    let sessionId = null;
    let worked = false;

    const handle = (line) => {
      let ev;
      try { ev = JSON.parse(line); } catch { return; }
      if (ev.type === 'rate_limit_event') rateLimit = ev.rate_limit_info ?? null;
      // The session is only kept if the run works (see 'close'): a failed run (model not allowed,
      // limit reached…) opens an empty session that could not be resumed later.
      if (ev.session_id) sessionId = ev.session_id;
      const current = read(type, id);
      if (ev.type === 'assistant' && ev.message?.model !== '<synthetic>') {
        worked = true;
        for (const part of ev.message?.content ?? []) {
          if (part.type === 'tool_use') {
            const s = step(part);
            if (s && current.steps.at(-1)?.text !== s) current.steps.push({ text: s, date: new Date().toISOString() });
          } else if (part.type === 'text' && part.text.trim()) {
            lastText = part.text;
          }
        }
      }
      if (ev.type === 'result') result = ev;
      current.state = 'working';
      save(type, id, current);
    };

    child.stdout.on('data', (d) => {
      rest += d.toString('utf8');
      const lines = rest.split('\n');
      rest = lines.pop();
      lines.filter(Boolean).forEach(handle);
    });
    child.stderr.on('data', (d) => { errorText = (errorText + d.toString('utf8')).slice(-2000); });
    child.on('error', (e) => { spawnError = e; });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (rest.trim()) handle(rest);
      active.delete(key);
      const end = read(type, id);
      const ok = result && !result.is_error;
      const reply = result?.result?.trim() || lastText.trim();
      // Keep the conversation if the twin actually worked (finished, or stopped halfway after doing something).
      if (sessionId && (ok || ((child.stopped || timedOut) && worked))) end.session = sessionId;
      if (ok && reply) {
        end.messages.push({ role: 'twin', text: reply, date: new Date().toISOString() });
        end.state = 'idle';
      } else if (child.stopped) {
        end.messages.push({
          role: 'twin',
          text: L('I stopped here, as you asked. What I managed to do has been saved.', 'Paré aquí, como pediste. Lo que alcancé a hacer quedó guardado.'),
          date: new Date().toISOString(),
          notice: true,
        });
        end.state = 'idle';
      } else {
        const f = explainFailure({
          result, rateLimit, stderr: errorText, spawnError, timedOut, model: chosenModel, limitMinutes: TIME_LIMIT_MS / 60000,
        });
        console.error(`[twin] ${key} ended with code ${code} (${f.code}): ${f.detail ?? ''}`);
        // If the previous conversation can't be resumed, the next message starts a new one.
        if (f.code === 'resume') end.session = null;
        end.messages.push({
          role: 'twin', text: f.text, detail: f.detail, action: f.action, reason: f.code,
          date: new Date().toISOString(), notice: true,
        });
        end.state = 'error';
      }
      end.steps = [];
      if (result?.total_cost_usd) end.cost = Number(((end.cost ?? 0) + result.total_cost_usd).toFixed(4));
      save(type, id, end);
    });

    child.stdin.end(prompt);
    return read(type, id);
  }

  function stop(type, id) {
    const child = active.get(`${type}/${id}`);
    if (child) { child.stopped = true; child.kill(); }
    return { ok: true };
  }

  const isBusy = (type, id) => active.has(`${type}/${id}`);
  const isWorking = () => active.size > 0;

  return { read, send, stop, isBusy, isWorking };
}
