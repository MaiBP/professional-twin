// Turns a failed Claude Code run into a reason the person can understand and act on.
// Claude Code reports problems in several places (the final result, a rate-limit event, stderr, a spawn error):
// the twin engine and the model test collect them and pass them here.
import { L, locale } from './i18n.mjs';

const NAMES = { fable: 'Fable', opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };
export const modelName = (m) => NAMES[m] ?? L('Claude Code\'s default model', 'el modelo predeterminado de Claude Code');

const firstLines = (t, max = 600) => String(t ?? '').trim().split('\n').filter(Boolean).slice(0, 6).join('\n').slice(0, max);

function resetDate(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toLocaleString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

/**
 * @param {object} f
 * @param {object} [f.result]      the final `result` event of stream-json (if there was one)
 * @param {object} [f.rateLimit]   the last `rate_limit_event.rate_limit_info` (if there was one)
 * @param {string} [f.stderr]      what Claude Code wrote to stderr
 * @param {Error}  [f.spawnError]  error starting the process
 * @param {boolean} [f.timedOut]   the app stopped it for taking too long
 * @param {string} [f.model]       model chosen in Settings
 * @param {number} [f.limitMinutes]
 * @returns {{ code: string, text: string, detail: string|null, action: 'settings'|null }}
 */
export function explainFailure({ result, rateLimit, stderr, spawnError, timedOut, model = 'auto', limitMinutes = 20 } = {}) {
  const resultText = result?.is_error ? String(result.result ?? result.error ?? '') : '';
  const raw = [resultText, stderr, spawnError?.message].filter(Boolean).join('\n');
  const detail = firstLines(raw) || (rateLimit?.errorCode ? `rate_limit: ${rateLimit.errorCode}` : null);
  const all = `${raw}\n${rateLimit?.errorCode ?? ''}`;
  const name = modelName(model);
  const out = (code, text, action = null) => ({ code, text, detail, action });

  if (spawnError?.code === 'ENOENT') {
    return out('missing', L(
      'I could not find Claude Code on this PC. Install it and check the connection in Settings.',
      'No encontré Claude Code en este PC. Instálalo y revisa la conexión en Configuración.',
    ), 'settings');
  }
  if (timedOut) {
    return out('timeout', L(
      `The task took longer than ${limitMinutes} minutes and I stopped it. What I managed to do has been saved. Try asking for something more specific, or try again.`,
      `La tarea tardó más de ${limitMinutes} minutos y la detuve. Lo que alcancé a hacer quedó guardado. Prueba a pedir algo más concreto o vuelve a intentarlo.`,
    ));
  }
  if (/requires usage credits|switch to another model|credits_required|model.{0,40}(not available|not found|does not exist|invalid|not allowed|not supported)|not_found_error.{0,80}model|access to (this|the) model/i.test(all)) {
    return out('model', L(
      `Your Claude account can't use the model chosen for the twin (${name}) right now: on your plan it needs extra usage credits, or it is not enabled for your organization. Choose another model in Settings → Your AI (for example Opus or Sonnet) and send your message again.`,
      `Tu cuenta de Claude no puede usar ahora el modelo elegido para el gemelo (${name}): en tu plan necesita créditos de uso extra o no está habilitado para tu organización. Elige otro modelo en Configuración → Tu IA (por ejemplo Opus o Sonnet) y vuelve a enviar tu mensaje.`,
    ), 'settings');
  }
  if (rateLimit?.status === 'rejected' || /usage limit|rate.?limit|limit reached|rate_limit_error|out of (extra )?usage/i.test(all)) {
    const when = resetDate(rateLimit?.resetsAt);
    return out('limit', L(
      `You have reached the usage limit of your Claude account${when ? `; it renews on ${when}` : ''}. Until then you can try a lighter model in Settings → Your AI (for example Sonnet or Haiku).`,
      `Llegaste al límite de uso de tu cuenta de Claude${when ? `; se renueva el ${when}` : ''}. Mientras tanto puedes probar con un modelo más ligero en Configuración → Tu IA (por ejemplo Sonnet o Haiku).`,
    ), 'settings');
  }
  if (/not logged in|please run \/login|invalid api key|authentication_error|oauth token|unauthorized|\b401\b|token (has )?expired|credit balance is too low/i.test(all)) {
    const credit = /credit balance is too low/i.test(all);
    return out('auth', credit
      ? L('Your Anthropic Console account has no credit left. Top it up, or connect a Claude subscription in Settings → Your AI.',
        'Tu cuenta de Anthropic Console se quedó sin saldo. Recárgala o conecta una suscripción de Claude en Configuración → Tu IA.')
      : L('Your Claude session expired or is no longer valid. Connect your account again in Settings → Your AI.',
        'Tu sesión de Claude caducó o ya no es válida. Vuelve a conectar tu cuenta en Configuración → Tu IA.'), 'settings');
  }
  if (/no conversation found|session.{0,40}not found/i.test(all)) {
    return out('resume', L(
      'I could not pick up our previous conversation (it may have been created on another PC or folder). I\'ll start a fresh one: your documents are all still there. Send your message again.',
      'No pude retomar nuestra conversación anterior (quizá se creó en otro PC o carpeta). Empezaré una nueva: tus documentos siguen intactos. Vuelve a enviar tu mensaje.',
    ));
  }
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|getaddrinfo|connection error|network|certificate|self.signed|UNABLE_TO_GET_ISSUER|proxy/i.test(all)) {
    return out('network', L(
      'I could not reach Claude over the internet. Check your connection; on a company network, a proxy or firewall may be blocking it (IT can help).',
      'No pude conectar con Claude por internet. Revisa tu conexión; si estás en una red de empresa, puede que un proxy o firewall lo esté bloqueando (IT puede ayudarte).',
    ));
  }
  if (/overloaded|\b529\b|\b503\b|\b500\b|internal server error|api_error|service unavailable/i.test(all)) {
    return out('service', L(
      'Claude\'s servers are busy or having trouble right now. Wait a few minutes and try again.',
      'Los servidores de Claude están saturados o con problemas ahora mismo. Espera unos minutos y vuelve a intentarlo.',
    ));
  }
  return out('unknown', L(
    'I could not finish this task. Try again in a moment. If it happens again, check Settings → Your AI and use “Test” to see if the model responds; the technical detail below can help whoever gives you support.',
    'No pude terminar esta tarea. Prueba de nuevo en un momento. Si se repite, revisa Configuración → Tu IA y usa «Probar» para ver si el modelo responde; el detalle técnico de abajo puede ayudar a quien te dé soporte.',
  ), 'settings');
}
