/**
 * Interactive knowledge-graph dashboard.
 *
 * Renders a self-contained HTML page (no external assets, no build step) from a
 * {@link KnowledgeGraph}: a canvas force layout with wheel-zoom, drag-pan,
 * click-to-select (highlights neighbours) and a search box that filters nodes by
 * label. Kept as a pure string renderer so it is unit-testable without a browser.
 */

import type { KnowledgeGraph } from "./knowledge-graph"

/** Embed JSON safely inside a <script> tag. */
function embed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function renderDashboard(graph: KnowledgeGraph): string {
  const data = embed({ nodes: graph.nodes, edges: graph.edges, stats: graph.stats, root: graph.root })
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Knowledge Graph — ${escapeHtml(graph.root)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; height: 100vh; background: #0b1020; color: #d7dee8; font: 13px/1.4 ui-monospace, monospace; }
  header { display: flex; gap: 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid #1e2a44; }
  #q { background: #131a2e; border: 1px solid #24304d; color: inherit; padding: 4px 8px; border-radius: 6px; min-width: 220px; }
  .stat { color: #7d8aa3; }
  .legend { margin-left: auto; display: flex; gap: 12px; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
  canvas { display: block; width: 100%; height: calc(100vh - 45px); cursor: grab; }
  #tip { position: fixed; pointer-events: none; background: #131a2e; border: 1px solid #24304d; padding: 3px 7px; border-radius: 6px; display: none; }
</style>
</head>
<body>
<header>
  <strong>Knowledge Graph</strong>
  <input id="q" placeholder="search node…" autocomplete="off" />
  <span class="stat" id="stats"></span>
  <span class="legend">
    <span><i class="dot" style="background:#4aa3ff"></i>file</span>
    <span><i class="dot" style="background:#ffb86c"></i>symbol</span>
  </span>
</header>
<canvas id="c"></canvas>
<div id="tip"></div>
<script>
const DATA = ${data};
const COLOR = { file: "#4aa3ff", symbol: "#ffb86c" };
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const tip = document.getElementById("tip");
const statsEl = document.getElementById("stats");
const q = document.getElementById("q");

const nodes = DATA.nodes.map((n, i) => ({ ...n, i, x: Math.cos(i) * 100 + (i % 7) * 20, y: Math.sin(i) * 100 + (i % 5) * 20, vx: 0, vy: 0 }));
const index = new Map(nodes.map((n) => [n.id, n]));
const edges = DATA.edges.map((e) => ({ ...e, a: index.get(e.from), b: index.get(e.to) })).filter((e) => e.a && e.b);
let selected = null, matches = new Set(), scale = 1, ox = 0, oy = 0, dragging = false, panning = false, last = null;

statsEl.textContent = DATA.stats.files + " files · " + DATA.stats.symbols + " symbols · " + DATA.stats.edges + " edges";

function resize() { canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; }
addEventListener("resize", resize); resize();

// Force layout: repulsion + spring, run once at load (n is capped by the scanner).
function layout() {
  const n = nodes.length;
  for (let it = 0; it < 260; it++) {
    for (const a of nodes) { a.vx *= 0.82; a.vy *= 0.82; }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy || 1;
        const f = 900 / d2;
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
    }
    for (const e of edges) {
      let dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 90) * 0.02;
      dx /= d; dy /= d;
      e.a.vx += dx * f; e.a.vy += dy * f; e.b.vx -= dx * f; e.b.vy -= dy * f;
    }
    for (const a of nodes) { a.x += a.vx; a.y += a.vy; }
  }
}
layout();

function neighboursOf(id) {
  const out = new Set([id]);
  for (const e of edges) { if (e.from === id) out.add(e.to); if (e.to === id) out.add(e.from); }
  return out;
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(devicePixelRatio * scale, 0, 0, devicePixelRatio * scale, devicePixelRatio * ox, devicePixelRatio * oy);
  const near = selected ? neighboursOf(selected) : null;
  ctx.lineWidth = 1 / scale;
  for (const e of edges) {
    const hot = near && (e.from === selected || e.to === selected);
    ctx.strokeStyle = hot ? "#5b7cc9" : "#1c2740";
    ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
  }
  for (const nd of nodes) {
    const hit = matches.has(nd.id);
    const hot = near ? near.has(nd.id) : true;
    ctx.globalAlpha = matches.size && !hit ? 0.25 : hot ? 1 : 0.35;
    ctx.fillStyle = COLOR[nd.kind] || "#888";
    ctx.beginPath(); ctx.arc(nd.x, nd.y, (nd.kind === "file" ? 6 : 4) / 1, 0, Math.PI * 2); ctx.fill();
    if (hit || nd.id === selected) {
      ctx.globalAlpha = 1; ctx.fillStyle = "#d7dee8";
      ctx.fillText(nd.label, nd.x + 8, nd.y + 3);
    }
  }
  ctx.globalAlpha = 1;
}

function toWorld(cx, cy) { return { x: (cx - ox) / scale, y: (cy - oy) / scale }; }
function nodeAt(cx, cy) {
  const p = toWorld(cx, cy);
  let best = null, bestD = 14 / scale;
  for (const nd of nodes) { const d = Math.hypot(nd.x - p.x, nd.y - p.y); if (d < bestD) { bestD = d; best = nd; } }
  return best;
}

canvas.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const p = toWorld(ev.offsetX, ev.offsetY);
  scale = Math.min(6, Math.max(0.2, scale * (ev.deltaY < 0 ? 1.1 : 0.9)));
  ox = ev.offsetX - p.x * scale; oy = ev.offsetY - p.y * scale;
  draw();
}, { passive: false });

canvas.addEventListener("mousedown", (ev) => {
  const nd = nodeAt(ev.offsetX, ev.offsetY);
  if (nd) { dragging = true; nd.__drag = true; } else { panning = true; }
  last = { x: ev.offsetX, y: ev.offsetY };
});
canvas.addEventListener("mousemove", (ev) => {
  if (dragging) { const p = toWorld(ev.offsetX, ev.offsetY); const nd = nodes.find((n) => n.__drag); if (nd) { nd.x = p.x; nd.y = p.y; } draw(); return; }
  if (panning) { ox += ev.offsetX - last.x; oy += ev.offsetY - last.y; last = { x: ev.offsetX, y: ev.offsetY }; draw(); return; }
  const nd = nodeAt(ev.offsetX, ev.offsetY);
  if (nd) { tip.style.display = "block"; tip.style.left = ev.clientX + 12 + "px"; tip.style.top = ev.clientY + 12 + "px"; tip.textContent = nd.kind + ": " + nd.label; }
  else tip.style.display = "none";
});
addEventListener("mouseup", () => {
  const nd = nodes.find((n) => n.__drag); if (nd) delete nd.__drag;
  dragging = panning = false;
  draw();
});
canvas.addEventListener("click", (ev) => {
  const nd = nodeAt(ev.offsetX, ev.offsetY);
  selected = nd ? (selected === nd.id ? null : nd.id) : null;
  draw();
});

q.addEventListener("input", () => {
  const term = q.value.trim().toLowerCase();
  matches = new Set(term ? nodes.filter((n) => n.label.toLowerCase().includes(term)).map((n) => n.id) : []);
  draw();
});

draw();
</script>
</body>
</html>
`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
