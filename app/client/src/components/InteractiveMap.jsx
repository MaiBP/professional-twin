import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, MarkerType,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import Icon from './Icon.jsx';
import { L, onThemeChange, theme } from '../i18n.js';
import { normalizeMap } from '../../../shared/mapFormat.mjs';

// Interactive project diagram. The twin writes it in map.md as a ```map block with JSON:
// { "direction": "LR"|"TB", "groups": [{id,title}], "nodes": [{id,type,title,detail,group}], "flows": [{from,to,label}] }
// Old maps (```mapa block with Spanish keys and node types) are translated on read by normalizeMap().

export const TYPES = {
  person: { icon: 'profile', name: L('Person', 'Persona') },
  area: { icon: 'team', name: L('Area or team', 'Área o equipo') },
  system: { icon: 'server', name: L('System', 'Sistema') },
  app: { icon: 'window', name: L('Application', 'Aplicación') },
  data: { icon: 'data', name: L('Data', 'Datos') },
  file: { icon: 'file', name: L('File', 'Archivo') },
  process: { icon: 'gear', name: L('Process', 'Proceso') },
  ai: { icon: 'sparkle', name: L('Artificial intelligence', 'Inteligencia artificial') },
  external: { icon: 'company', name: L('External', 'Externo') },
  email: { icon: 'mail', name: L('Email', 'Correo') },
  dashboard: { icon: 'chart', name: L('Dashboard or report', 'Panel o informe') },
  cloud: { icon: 'cloud', name: L('Cloud', 'Nube') },
  decision: { icon: 'diamond', name: L('Decision', 'Decisión') },
};
const typeOf = (t) => (TYPES[t] ? t : 'process');
const WIDTH = 210;
const HEIGHT = 66;

function MapNode({ data }) {
  const t = TYPES[typeOf(data.type)];
  const horizontal = data.direction !== 'TB';
  return (
    <div className={`node type-${typeOf(data.type)} ${data.active ? 'active' : ''}`}>
      <Handle type="target" position={horizontal ? Position.Left : Position.Top} />
      <span className="node-icon"><Icon name={t.icon} size={20} /></span>
      <div className="node-text">
        <strong>{data.title}</strong>
        {data.detail && <span>{data.detail}</span>}
      </div>
      <Handle type="source" position={horizontal ? Position.Right : Position.Bottom} />
    </div>
  );
}

function MapGroup({ data }) {
  return <div className="map-group"><span>{data.title}</span></div>;
}

// Arrow with a dot travelling along the path: shows how the data moves.
function Flow({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, data }) {
  const [path, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14 });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className={`flow ${data?.highlighted ? 'highlighted' : ''}`} />
      {!data?.print && <circle r="4" className="flow-dot">
        <animateMotion dur={`${data?.duration ?? 2.6}s`} repeatCount="indefinite" path={path} />
      </circle>}
      {label && (
        <EdgeLabelRenderer>
          <div className="flow-label" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>{label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { mapNode: MapNode, mapGroup: MapGroup };
const edgeTypes = { flow: Flow };

function layout(spec, selected, forceVertical = false, print = false) {
  const direction = spec.direction === 'TB' || forceVertical ? 'TB' : 'LR';
  const nodes = (spec.nodes ?? []).filter((n) => n?.id);
  const ids = new Set(nodes.map((n) => String(n.id)));
  const groups = (spec.groups ?? []).filter((g) => g?.id && nodes.some((n) => n.group === g.id));
  const flows = (spec.flows ?? []).filter((f) => ids.has(String(f.from)) && ids.has(String(f.to)));

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ rankdir: direction, nodesep: direction === 'TB' ? 40 : 46, ranksep: direction === 'TB' ? 40 : 80, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  groups.forEach((gr) => g.setNode(`group:${gr.id}`, { paddingTop: 34 }));
  nodes.forEach((n) => {
    g.setNode(String(n.id), { width: WIDTH, height: HEIGHT });
    if (groups.some((gr) => gr.id === n.group)) g.setParent(String(n.id), `group:${n.group}`);
  });
  flows.forEach((f) => g.setEdge(String(f.from), String(f.to)));
  dagre.layout(g);

  const connected = new Set();
  if (selected) flows.forEach((f) => { if (f.from === selected || f.to === selected) { connected.add(String(f.from)); connected.add(String(f.to)); } });

  const rfNodes = [
    ...groups.map((gr) => {
      const p = g.node(`group:${gr.id}`);
      const pad = 22;
      return {
        id: `group:${gr.id}`, type: 'mapGroup', data: { title: gr.title ?? gr.id },
        position: { x: p.x - p.width / 2 - pad, y: p.y - p.height / 2 - pad - 18 },
        style: { width: p.width + pad * 2, height: p.height + pad * 2 + 18 },
        selectable: false, draggable: false, zIndex: -1,
      };
    }),
    ...nodes.map((n) => {
      const p = g.node(String(n.id));
      return {
        id: String(n.id), type: 'mapNode',
        data: { ...n, direction, active: selected === String(n.id) || connected.has(String(n.id)) },
        position: { x: p.x - WIDTH / 2, y: p.y - HEIGHT / 2 },
        draggable: false,
      };
    }),
  ];
  const rfEdges = flows.map((f, i) => ({
    id: `f${i}`, source: String(f.from), target: String(f.to), type: 'flow', label: f.label,
    data: { print, highlighted: selected && (f.from === selected || f.to === selected), duration: 2.2 + (i % 3) * 0.4 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
  }));
  const { width = 600, height = 300 } = g.graph();
  return { rfNodes, rfEdges, nodes, flows, width, height, direction };
}

export default function InteractiveMap({ code, print = false }) {
  const [selected, setSelected] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [colorMode, setColorMode] = useState(theme);
  useEffect(() => onThemeChange(() => setColorMode(theme())), []);

  const spec = useMemo(() => {
    try {
      const s = normalizeMap(JSON.parse(code));
      return Array.isArray(s?.nodes) && s.nodes.length ? s : null;
    } catch {
      return null;
    }
  }, [code]);
  // Available width: if the horizontal diagram would be too small, it is laid out top to bottom.
  const [canvasWidth, setCanvasWidth] = useState(880);
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current) return undefined;
    const obs = new ResizeObserver(([e]) => setCanvasWidth(Math.max(280, e.contentRect.width)));
    obs.observe(canvas.current);
    return () => obs.disconnect();
  }, [spec]);
  const map = useMemo(() => {
    if (!spec) return null;
    const horizontal = layout(spec, selected, false, print);
    return spec.direction !== 'TB' && canvasWidth / horizontal.width < 0.72 ? layout(spec, selected, true, print) : horizontal;
  }, [spec, selected, canvasWidth, print]);
  const zoom = map ? Math.min(1, canvasWidth / map.width) : 1;
  const canvasHeight = map ? Math.round(Math.min(920, Math.max(320, map.height * zoom + 40))) : 440;

  if (!map) {
    return <div className="diagram-error"><p><strong>{L('This diagram has an error.', 'Este diagrama tiene un error.')}</strong> {L('Ask your twin to draw it again.', 'Pídele al gemelo que lo vuelva a dibujar.')}</p></div>;
  }
  const node = map.nodes.find((n) => String(n.id) === selected);
  const usedTypes = [...new Set(map.nodes.map((n) => typeOf(n.type)))];
  const nameOf = (id) => map.nodes.find((n) => String(n.id) === String(id))?.title ?? id;

  return (
    <div className={`interactive-map ${fullscreen ? 'fullscreen' : ''} ${print ? 'print' : ''}`}>
      <div className="map-bar">
        <div className="map-legend">
          {usedTypes.map((t) => (
            <span key={t} className={`legend type-${t}`}><span className="node-icon"><Icon name={TYPES[t].icon} size={13} /></span>{TYPES[t].name}</span>
          ))}
        </div>
        {!print && <button type="button" className="button button-secondary" onClick={() => setFullscreen((v) => !v)}>
          <Icon name={fullscreen ? 'close' : 'expand'} size={16} />{fullscreen ? L('Close', 'Cerrar') : L('Full screen', 'Pantalla completa')}
        </button>}
      </div>
      <div className="map-canvas" ref={canvas} style={fullscreen ? undefined : { height: canvasHeight }}>
        <ReactFlow
          key={`${map.direction}-${canvasHeight}-${fullscreen}`}
          nodes={map.rfNodes} edges={map.rfEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          fitView fitViewOptions={{ padding: 0.06 }} maxZoom={print ? 1 : 1.8}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable
          zoomOnScroll={fullscreen} preventScrolling={fullscreen} proOptions={{ hideAttribution: true }}
          colorMode={print ? 'light' : colorMode} minZoom={print ? 0.1 : 0.3}
          onInit={print ? () => document.body.setAttribute('data-map-ready', '1') : undefined}
          onNodeClick={(_, n) => n.type === 'mapNode' && setSelected((s) => (s === n.id ? null : n.id))}
          onPaneClick={() => setSelected(null)}
        >
          {!print && <Background gap={22} size={1.2} />}
          {!print && <Controls showInteractive={false} position="bottom-right" />}
        </ReactFlow>
        {node && !print && (
          <aside className="map-detail">
            <div className="row between">
              <span className={`legend type-${typeOf(node.type)}`}>
                <span className="node-icon"><Icon name={TYPES[typeOf(node.type)].icon} size={13} /></span>{TYPES[typeOf(node.type)].name}
              </span>
              <button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label={L('Close', 'Cerrar')}><Icon name="close" size={16} /></button>
            </div>
            <h3>{node.title}</h3>
            {node.detail && <p>{node.detail}</p>}
            {node.description && <p className="muted">{node.description}</p>}
            {map.flows.some((f) => f.to === node.id) && (
              <p className="muted">{L('Receives from', 'Recibe de')}: {map.flows.filter((f) => f.to === node.id).map((f) => nameOf(f.from)).join(', ')}</p>
            )}
            {map.flows.some((f) => f.from === node.id) && (
              <p className="muted">{L('Sends to', 'Envía a')}: {map.flows.filter((f) => f.from === node.id).map((f) => `${nameOf(f.to)}${f.label ? ` (${f.label})` : ''}`).join(', ')}</p>
            )}
          </aside>
        )}
      </div>
      {!print && <p className="muted map-hint">{L('Click a piece to see its details and connections. Use the + and − buttons to zoom in or out.', 'Haz clic en una pieza para ver su detalle y sus conexiones. Usa los botones + y − para acercar o alejar.')}</p>}
    </div>
  );
}
