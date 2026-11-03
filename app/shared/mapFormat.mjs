// Project map format, shared by the server (legacy migration) and the client (map renderer).
// Current format, in map.md as a ```map block with JSON:
//   { "direction": "LR"|"TB", "groups": [{id,title}], "nodes": [{id,type,title,detail,group}], "flows": [{from,to,label}] }
// Old format (```mapa block, Spanish keys) is still accepted: normalizeMap() translates it on read.

// Old (Spanish) node type → current node type.
export const LEGACY_NODE_TYPES = {
  persona: 'person',
  area: 'area',
  sistema: 'system',
  app: 'app',
  datos: 'data',
  archivo: 'file',
  proceso: 'process',
  ia: 'ai',
  externo: 'external',
  correo: 'email',
  dashboard: 'dashboard',
  nube: 'cloud',
  decision: 'decision',
};

const pick = (o, a, b) => (o?.[a] !== undefined ? o[a] : o?.[b]);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const node = (n) => {
  if (!n || typeof n !== 'object') return n;
  const { tipo, titulo, detalle, grupo, descripcion, ...rest } = n;
  const type = pick(n, 'type', 'tipo');
  return clean({
    ...rest,
    type: typeof type === 'string' ? (LEGACY_NODE_TYPES[type] ?? type) : type,
    title: pick(n, 'title', 'titulo'),
    detail: pick(n, 'detail', 'detalle'),
    group: pick(n, 'group', 'grupo'),
    description: pick(n, 'description', 'descripcion'),
  });
};

const group = (g) => {
  if (!g || typeof g !== 'object') return g;
  const { titulo, ...rest } = g;
  return clean({ ...rest, title: pick(g, 'title', 'titulo') });
};

const flow = (f) => {
  if (!f || typeof f !== 'object') return f;
  const { de, a, texto, ...rest } = f;
  return clean({ ...rest, from: pick(f, 'from', 'de'), to: pick(f, 'to', 'a'), label: pick(f, 'label', 'texto') });
};

// Any map spec (old or new keys) → current format. Unknown keys are kept as they are.
export function normalizeMap(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return spec;
  const { direccion, grupos, nodos, flujos, ...rest } = spec;
  const list = (x) => (Array.isArray(x) ? x : undefined);
  return clean({
    ...rest,
    direction: pick(spec, 'direction', 'direccion'),
    groups: list(pick(spec, 'groups', 'grupos'))?.map(group),
    nodes: list(pick(spec, 'nodes', 'nodos'))?.map(node),
    flows: list(pick(spec, 'flows', 'flujos'))?.map(flow),
  });
}

// Fenced map block languages: "map" (current) and "mapa" (old).
export const MAP_LANGS = ['map', 'mapa'];

// Map JSON laid out like the templates: one line per group, node and flow.
const inline = (o) => (o && typeof o === 'object' && !Array.isArray(o)
  ? `{ ${Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')} }`
  : JSON.stringify(o));
function formatMap(spec) {
  const entries = Object.entries(spec);
  const lines = ['{'];
  entries.forEach(([k, v], i) => {
    const comma = i < entries.length - 1 ? ',' : '';
    if (Array.isArray(v) && v.length) {
      lines.push(`  ${JSON.stringify(k)}: [`);
      v.forEach((item, j) => lines.push(`    ${inline(item)}${j < v.length - 1 ? ',' : ''}`));
      lines.push(`  ]${comma}`);
    } else {
      lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${comma}`);
    }
  });
  lines.push('}');
  return lines;
}

// Rewrites every ```mapa block of a markdown text as a ```map block with the current keys.
// A block whose JSON cannot be parsed is left untouched (the renderer still accepts ```mapa).
export function convertMapBlocks(md) {
  return String(md).replace(/^([ \t]*)```mapa[ \t]*\r?\n([\s\S]*?)^\1```([ \t]*\r?)$/gm, (whole, indent, body, eol) => {
    try {
      const nl = body.includes('\r\n') || eol.includes('\r') ? '\r\n' : '\n';
      const lines = formatMap(normalizeMap(JSON.parse(body))).map((l) => indent + l);
      return [`${indent}\`\`\`map`, ...lines, `${indent}\`\`\`${eol}`].join(nl).replace(/\r\r/g, '\r');
    } catch {
      return whole;
    }
  });
}
