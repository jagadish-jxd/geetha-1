/* ============================================================
   HAPPY BIRTHDAY — a birthday film in four acts
   Vanilla canvas 2D for the tree + GSAP for the orchestration.

   ACT 1  a real recurve bow with a Cupid's arrow nocked — you
          DRAW the string down and RELEASE to fire (pointer drag,
          or keyboard). A softly beating heart waits above as the
          target.
   ACT 2  the arrow flies up and strikes the heart; the heart
          jolts, falls, and bursts into a flood of rose that
          swallows the frame (no cross-fade).
   ACT 3  a kinetic wish hinges up out of that colour, glyph by
          glyph, under cinema bars and a slow camera push.
   ACT 4  a gold light blooms, and the tree grows into one heart
          of lit blossoms with the hand-lettered wish.

   A GSAP master timeline runs the shot + Acts 2–3; at its end it
   starts the canvas tree (Act 4), which owns its own rAF and
   plays once, then holds — living, never looping.
   ============================================================ */

import gsap from 'gsap';
import { initHeartCursor } from './heart-cursor.js';

const $ = (id) => document.getElementById(id);

const canvas = $('tree');
const ctx    = canvas.getContext('2d');
const wishEl = $('wish');

const hero       = $('hero');
const eyebrow    = $('eyebrow');
const hint       = $('hint');
const motes      = $('motes');
const target     = $('target');
const targetHeart= $('targetHeart');
const heartGlow  = target.querySelector('.heart__glow');
const aim        = $('aim');

const archery = $('archery');
const bow     = $('bow');
const arrow   = $('arrow');
const strL    = $('strL');
const strR    = $('strR');
const serving = $('serving');

const bloom   = $('bloom');
const replay          = $('replay');
const memoriesBtn     = $('memoriesBtn');
const messageBtn      = $('messageBtn');
const letterStage     = $('letterStage');
const letterBackBtn   = $('letterBackBtn');
const letterBackdrop  = $('letterBackdrop');
const envelopeCard    = $('envelopeCard');
const letterContent   = $('letterContent');
const letterCloseBtn  = $('letterCloseBtn');
const letterReturnBtn = $('letterReturnBtn');

const memoriesLanding         = $('memoriesLanding');
const memoriesLandingContent  = $('memoriesLandingContent');
const memoriesLandingPolaroid = $('memoriesLandingPolaroid');
const memoriesLandingBar      = $('memoriesLandingBar');
const memoriesLandingStatus   = $('memoriesLandingStatus');

const loveGate   = $('loveGate');
const loveCard   = $('loveCard');
const loveYesBtn = $('loveYesBtn');
const loveNoBtn  = $('loveNoBtn');
const loveMotes  = $('loveMotes');
const loveBloom  = $('loveBloom');

const loveLoader       = $('loveLoader');
const loveLoaderEmblem = $('loveLoaderEmblem');
const loveLoaderBar    = $('loveLoaderBar');
const loveLoaderStatus = $('loveLoaderStatus');

try { sessionStorage.removeItem('allow_memories'); } catch (_) {}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isRecord     = new URLSearchParams(location.search).has('record');

/* --- cue log for the recorder: the page stays muted, but it timestamps every
   beat the film crosses, and the offline sound synth fires foley at those exact
   times so the audio can never drift from the picture. --- */
if (isRecord) window.bdayCues = [];
let recT0 = 0;
function cue(name){ if (isRecord && recT0) window.bdayCues.push({ cue: name, t: (performance.now() - recT0) / 1000 }); }

/* ============================================================
   MATH HELPERS
   ============================================================ */
const rand  = (a, b) => a + Math.random() * (b - a);
const pick  = (a)    => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack  = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/* ============================================================
   TREE ENGINE (Act 4) — canvas
   ============================================================ */
const BLOSSOM = [
  { c0: '#ffe1ec', c1: '#ff80aa' },
  { c0: '#ffd0e0', c1: '#f4577f' },
  { c0: '#ffc4d2', c1: '#e23b67' },
  { c0: '#ffd9c4', c1: '#ff8a5b' },
  { c0: '#ffeec2', c1: '#f6b13e' },
  { c0: '#ffd2e6', c1: '#e84d9a' },
];

/* timeline (seconds, relative to the tree's own start) — brisk */
const T = {
  trunkStart:  0.10,
  branchSpan:  1.80,
  bloomT0:     1.25,
  bloomSpan:   2.00,
  petalT0:     2.45,
  noteStart:   0.45,
  buttonStart: 5.00,
  done:        4.60,
};

const SS = 168;

function heartShape(c, x, top, w, h){
  c.beginPath();
  c.moveTo(x, top + h * 0.28);
  c.bezierCurveTo(x, top, x - w * 0.5, top, x - w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x - w * 0.5, top + h * 0.60, x - w * 0.16, top + h * 0.80, x, top + h);
  c.bezierCurveTo(x + w * 0.16, top + h * 0.80, x + w * 0.5, top + h * 0.60, x + w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x + w * 0.5, top, x, top, x, top + h * 0.28);
  c.closePath();
}

function makeBlossom({ c0, c1 }, soft){
  const cv = document.createElement('canvas'); cv.width = cv.height = SS;
  const c = cv.getContext('2d');
  const w = SS * 0.62, h = SS * 0.58, x = SS / 2, top = SS * 0.17;

  c.save();
  c.shadowColor = 'rgba(150,38,72,0.32)';
  c.shadowBlur = SS * 0.085; c.shadowOffsetY = SS * 0.05;
  c.fillStyle = c1; heartShape(c, x, top, w, h); c.fill();
  c.restore();

  const g = c.createRadialGradient(x - w * 0.20, top + h * 0.20, h * 0.04, x, top + h * 0.42, h * 0.92);
  g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, shade(c1, -26));
  heartShape(c, x, top, w, h); c.fillStyle = g; c.fill();

  c.save(); heartShape(c, x, top, w, h); c.clip();
  const g2 = c.createLinearGradient(0, top, 0, top + h);
  g2.addColorStop(0, 'rgba(255,255,255,0)');
  g2.addColorStop(0.65, 'rgba(110,16,46,0)');
  g2.addColorStop(1, 'rgba(110,16,46,0.26)');
  c.fillStyle = g2; c.fillRect(0, 0, SS, SS);
  c.globalAlpha = 0.55; c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(x - w * 0.15, top + h * 0.24, w * 0.17, h * 0.11, -0.5, 0, Math.PI * 2); c.fill();
  c.restore();

  if (!soft) return cv;

  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = SS;
  const c2 = cv2.getContext('2d');
  c2.filter = 'blur(2.6px)'; c2.drawImage(cv, 0, 0); c2.filter = 'none';
  c2.globalCompositeOperation = 'source-atop';
  c2.globalAlpha = 0.42; c2.fillStyle = '#fff3ea'; c2.fillRect(0, 0, SS, SS);
  return cv2;
}

function makeBokeh(rgb){
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgba(${rgb},0.9)`); g.addColorStop(0.45, `rgba(${rgb},0.22)`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  return cv;
}

function makeSparkle(){
  const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'); const m = S / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, 'rgba(255,236,200,0.5)'); g.addColorStop(1, 'rgba(255,236,200,0)');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, m, 0, 6.2832); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.translate(m, m);
  for (let k = 0; k < 2; k++){
    c.beginPath();
    c.moveTo(0, -m); c.quadraticCurveTo(0, 0, m, 0); c.quadraticCurveTo(0, 0, 0, m); c.quadraticCurveTo(0, 0, -m, 0); c.quadraticCurveTo(0, 0, 0, -m);
    c.fill(); c.rotate(Math.PI / 4); c.scale(0.5, 0.5);
  }
  return cv;
}

let SPR = { crisp: [], soft: [] }, BOKEH = [], SPARKLE = null;
function buildSprites(){
  SPR = { crisp: BLOSSOM.map((b) => makeBlossom(b, false)), soft: BLOSSOM.map((b) => makeBlossom(b, true)) };
  BOKEH = [makeBokeh('255,224,188'), makeBokeh('255,196,214'), makeBokeh('255,238,210')];
  SPARKLE = makeSparkle();
}

function drawSprite(sprite, x, y, size, rot, alpha){
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, -size * 0.5, -size * 0.47, size, size);
  ctx.restore();
}

let heartPoly = null;
function buildHeartPoly(){
  const raw = []; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i <= 160; i++){
    const t = (i / 160) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push([x, y]);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2, hw = (maxX - minX) / 2, hh = (maxY - minY) / 2;
  heartPoly = raw.map(([x, y]) => [(x - midX) / hw, (y - midY) / hh]);
}
function pointInPoly(x, y){
  let inside = false; const p = heartPoly;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++){
    const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

let W = 0, H = 0, dpr = 1;
let cx = 0, cy = 0, rx = 0, ry = 0, groundY = 0;
let branches = [], hearts = [], petals = [], rested = [], orbs = [], floaters = [], twinkles = [];
let bgGrad = null, glowGrad = null, groundGrad = null;

const quad = (b, t) => { const m = 1 - t, a = m * m, k = 2 * m * t, d = t * t; return { x: a * b.x1 + k * b.cx + d * b.x2, y: a * b.y1 + k * b.cy + d * b.y2 }; };

function barkGrad(x1, y1, x2, y2, depth){
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, `hsl(348 26% ${26 + depth * 3}%)`);
  g.addColorStop(1, `hsl(346 24% ${40 + depth * 5}%)`);
  return g;
}

function buildScene(){
  branches = []; hearts = []; petals = []; rested = []; twinkles = []; orbs = []; floaters = [];
  buildHeartPoly();

  const wide = W / H > 1.2;
  cx = W * (wide ? 0.57 : 0.5);
  cy = H * (wide ? 0.37 : 0.38);
  ry = Math.min(H * (wide ? 0.33 : 0.33), W * 0.34);
  rx = ry * 1.16;
  groundY = H * 0.93;

  bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#fff3e9');
  bgGrad.addColorStop(0.46, '#ffe7d6');
  bgGrad.addColorStop(0.78, '#fcd9c4');
  bgGrad.addColorStop(1, '#f3c4b5');
  glowGrad = ctx.createRadialGradient(cx, cy, ry * 0.1, cx, cy, ry * 1.55);
  glowGrad.addColorStop(0, 'rgba(255,219,170,0.6)');
  glowGrad.addColorStop(0.5, 'rgba(255,170,150,0.2)');
  glowGrad.addColorStop(1, 'rgba(255,170,150,0)');
  groundGrad = ctx.createRadialGradient(cx, H * 1.02, ry * 0.2, cx, H * 1.02, ry * 1.6);
  groundGrad.addColorStop(0, 'rgba(255,205,165,0.5)');
  groundGrad.addColorStop(1, 'rgba(255,205,165,0)');

  for (let i = 0; i < 11; i++){
    orbs.push({ x: rand(0, W), y: rand(0, H), r: rand(W * 0.05, W * 0.17), vy: rand(-6, -16), drift: rand(-0.3, 0.3), phase: rand(0, 6.28), alpha: rand(0.05, 0.13), sprite: pick(BOKEH) });
  }

  const FN = wide ? 18 : 15;
  for (let i = 0; i < FN; i++){
    const depth = Math.random();
    floaters.push({
      x: rand(0, W), y: rand(-H * 0.1, H * 1.1), depth,
      idx: (Math.random() * BLOSSOM.length) | 0,
      box: lerp(Math.min(W, H) * 0.025, Math.min(W, H) * 0.075, depth),
      vy: lerp(7, 20, depth), sway: rand(8, 22), phase: rand(0, 6.28),
      rot: rand(-0.4, 0.4), vrot: rand(-0.5, 0.5),
      baseA: lerp(0.16, 0.5, depth), soft: depth < 0.45,
    });
  }

  const baseX = cx, baseY = H * 1.0;
  const trunkTopY = cy + ry * 0.62;
  const trunkW = Math.max(9, W * 0.024);
  const limbLen = ry * 0.6;
  const insidePx = (x, y, m = 0.9) => pointInPoly((x - cx) / (rx * m), (cy - y) / (ry * m));

  function addBranch(x, y, ang, len, w0, depth, t0){
    let ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, clipped = false;
    if (!insidePx(ex, ey)){
      let lo = 0, hi = 1;
      for (let k = 0; k < 12; k++){ const mid = (lo + hi) / 2; (insidePx(x + Math.cos(ang) * len * mid, y + Math.sin(ang) * len * mid) ? lo = mid : hi = mid); }
      ex = x + Math.cos(ang) * len * lo; ey = y + Math.sin(ang) * len * lo; clipped = true;
    }
    const mx = (x + ex) / 2, my = (y + ey) / 2, perp = ang + Math.PI / 2, bend = rand(-1, 1) * len * 0.12, w1 = w0 * 0.66;
    branches.push({ x1: x, y1: y, cx: mx + Math.cos(perp) * bend, cy: my + Math.sin(perp) * bend, x2: ex, y2: ey, w0, w1, t0, dur: Math.max(0.14, 0.32 - depth * 0.03), depth, grad: barkGrad(x, y, ex, ey, depth) });
    return { ex, ey, w1, clipped };
  }
  function grow(x, y, ang, len, w, depth, t0){
    const r = addBranch(x, y, ang, len, w, depth, t0);
    if (r.clipped || depth >= 6 || len < ry * 0.06) return;
    const childT0 = t0 + (0.32 - depth * 0.03) * 0.6;
    const n = Math.random() < 0.55 ? 2 : 3;
    for (let i = 0; i < n; i++){
      const spread = 0.6 * (i - (n - 1) / 2) + rand(-0.22, 0.22), lift = -0.06 + rand(-0.05, 0.05);
      grow(r.ex, r.ey, ang + spread + lift, len * rand(0.74, 0.84), r.w1, depth + 1, childT0 + i * 0.03);
    }
  }
  addBranch(baseX, baseY, -Math.PI / 2, baseY - trunkTopY, trunkW, 0, T.trunkStart);
  branches[0].dur = 0.55;
  const limbT0 = T.trunkStart + 0.36, L = 3;
  for (let i = 0; i < L; i++){
    const ang = -Math.PI / 2 + 0.62 * (i - (L - 1) / 2) + rand(-0.12, 0.12);
    grow(baseX, trunkTopY, ang, limbLen, trunkW * 0.7, 1, limbT0 + i * 0.05);
  }
  const maxT0 = branches.reduce((m, b) => Math.max(m, b.t0 + b.dur), 0);
  const sc = (T.branchSpan - T.trunkStart) / (maxT0 - T.trunkStart);
  for (const b of branches) b.t0 = T.trunkStart + (b.t0 - T.trunkStart) * sc;

  const COUNT = Math.round(clamp(rx * ry / 56, 250, 440));
  const baseBox = clamp(Math.min(W, H) * 0.115, 30, 74);
  let guard = 0;
  while (hearts.length < COUNT && guard < COUNT * 50){
    guard++;
    const u = rand(-1.06, 1.06), v = rand(-1.06, 1.06);
    if (!pointInPoly(u, v)) continue;
    const x = cx + u * rx, y = cy - v * ry;
    const d = clamp01(Math.hypot(u, v + 1) / 2.4);
    const t0 = T.bloomT0 + d * (T.bloomSpan * 0.82) + rand(0, T.bloomSpan * 0.18);
    const soft = Math.random() < 0.42;
    hearts.push({ x, y, idx: (Math.random() * BLOSSOM.length) | 0, soft, box: baseBox * (soft ? rand(0.6, 0.85) : rand(0.78, 1.12)), rot: rand(-0.55, 0.55), sway: rand(0, 6.28), t0 });
  }
  hearts.sort((a, b) => (a.soft === b.soft ? a.y - b.y : a.soft ? -1 : 1));
}

function drawBackground(){
  ctx.globalAlpha = 1;
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1; ctx.fillStyle = groundGrad; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGodRays(t, intensity){
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ox = cx, oy = cy - ry * 0.35, R = Math.hypot(W, H) * 1.1;
  const rays = 9, sweep = Math.sin(t * 0.07) * 0.18;
  for (let i = 0; i < rays; i++){
    const a = -Math.PI / 2 + sweep + (i - (rays - 1) / 2) * 0.2;
    const hw = 0.035 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7));
    const a1 = a - hw, a2 = a + hw;
    const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * R, oy + Math.sin(a) * R);
    g.addColorStop(0, `rgba(255,232,190,${0.10 * intensity})`);
    g.addColorStop(0.5, `rgba(255,214,170,${0.05 * intensity})`);
    g.addColorStop(1, 'rgba(255,214,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a1) * R, oy + Math.sin(a1) * R);
    ctx.lineTo(ox + Math.cos(a2) * R, oy + Math.sin(a2) * R);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawGlow(t){
  const gi = clamp01((t - T.bloomT0) / (T.bloomSpan * 0.9));
  if (gi <= 0) return;
  ctx.save(); ctx.globalAlpha = gi; ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawBokeh(t, dt){
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const o of orbs){
    o.y += o.vy * dt; o.x += Math.sin(t * 0.3 + o.phase) * o.drift;
    if (o.y < -o.r){ o.y = H + o.r; o.x = rand(0, W); }
    ctx.globalAlpha = o.alpha;
    ctx.drawImage(o.sprite, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
  }
  ctx.restore();
}

function drawFloaters(t, dt, front){
  const appear = clamp01((t - 0.2) / 1.4);
  if (appear <= 0) return;
  for (const f of floaters){
    if ((f.depth >= 0.6) !== front) continue;
    f.y -= f.vy * dt;
    f.x += Math.sin(t * 0.5 + f.phase) * f.sway * dt;
    f.rot += f.vrot * dt;
    if (f.y < -f.box){ f.y = H + f.box; f.x = rand(0, W); }
    drawSprite((f.soft ? SPR.soft : SPR.crisp)[f.idx], f.x, f.y, f.box, f.rot, f.baseA * appear);
  }
}

function drawBranches(t){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of branches){
    const f = clamp01((t - b.t0) / b.dur);
    if (f <= 0) continue;
    const e = easeOutCubic(f);
    ctx.strokeStyle = b.grad;
    const steps = 12, last = Math.max(1, Math.ceil(steps * e));
    let prev = quad(b, 0);
    for (let i = 1; i <= last; i++){
      const tt = Math.min(e, i / steps), p = quad(b, tt);
      ctx.lineWidth = lerp(b.w0, b.w1, tt);
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    }
  }
}

function drawHearts(t){
  const breathe = 1 + Math.sin(t * 0.8) * 0.012;
  for (const h of hearts){
    const p = clamp01((t - h.t0) / 0.6);
    if (p <= 0) continue;
    const scale = Math.max(0, easeOutBack(p));
    let alpha = clamp01(p * 1.7); if (h.soft) alpha *= 0.8;
    const settled = clamp01((t - h.t0 - 0.6) / 0.7);
    const sway = settled * Math.sin(t * 1.5 + h.sway) * (h.box * 0.05);
    const rise = (1 - easeOutCubic(p)) * h.box * 0.45;
    const hx = cx + (h.x - cx) * breathe + sway;
    const hy = cy + (h.y - cy) * breathe - rise;
    drawSprite((h.soft ? SPR.soft : SPR.crisp)[h.idx], hx, hy, h.box * scale, h.rot + sway * 0.012, alpha);
  }
}

function updateTwinkles(t, dt){
  const active = t > T.bloomT0 + T.bloomSpan * 0.45;
  if (active && twinkles.length < 9 && Math.random() < 0.5){
    const h = hearts[(Math.random() * hearts.length) | 0];
    if (h) twinkles.push({ x: h.x, y: h.y, size: rand(0.6, 1.3) * (Math.min(W, H) * 0.05), age: 0, life: rand(0.7, 1.2), rot: rand(0, 6.28) });
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = twinkles.length - 1; i >= 0; i--){
    const s = twinkles[i]; s.age += dt;
    const k = s.age / s.life;
    if (k >= 1){ twinkles.splice(i, 1); continue; }
    const a = Math.sin(k * Math.PI);
    drawSprite(SPARKLE, s.x, s.y, s.size * (0.6 + 0.4 * a), s.rot + k * 1.2, a);
  }
  ctx.restore();
}

function spawnPetal(){
  const h = hearts[(Math.random() * hearts.length) | 0];
  if (!h) return;
  petals.push({ x: h.x + rand(-8, 8), y: h.y + rand(-8, 8), vy: rand(14, 30), vx: rand(-8, 8), sway: rand(0.6, 1.4), phase: rand(0, 6.28), box: h.box * rand(0.34, 0.6), idx: h.idx, rot: rand(0, 6.28), vrot: rand(-1.4, 1.4), age: 0, land: groundY + rand(-6, H * 0.05) });
}
function drawPetals(t, dt){
  for (let i = petals.length - 1; i >= 0; i--){
    const p = petals[i]; p.age += dt; p.vy += 8 * dt;
    p.x += (p.vx + Math.sin(t * p.sway + p.phase) * 16) * dt;
    p.y += p.vy * dt; p.rot += p.vrot * dt;
    if (p.y >= p.land){
      rested.push({ x: clamp(p.x, 6, W - 6), y: p.land, box: p.box, idx: p.idx, rot: p.rot, a: rand(0.7, 0.95) });
      if (rested.length > 90) rested.shift();
      petals.splice(i, 1); continue;
    }
    const a = p.age < 0.3 ? p.age / 0.3 : 1;
    drawSprite(SPR.crisp[p.idx], p.x, p.y, p.box, p.rot, a);
  }
}
function drawRested(){
  for (const r of rested) drawSprite(SPR.crisp[r.idx], r.x, r.y, r.box, r.rot, r.a);
}

function showWish(on){
  wishEl.classList.toggle('is-in', on);
  if (!on){
    closeLetterStage();
  }
}

function showMessageBtn(on){
  if (on){
    if (messageBtn && (messageBtn.hidden || !messageBtn.classList.contains('is-shown'))){
      messageBtn.hidden = false;
      requestAnimationFrame(() => messageBtn.classList.add('is-shown'));
    }
  } else if (messageBtn) {
    messageBtn.classList.remove('is-shown');
    messageBtn.hidden = true;
  }
}

const letterCanvas    = $('letterCanvas');
const lctx = letterCanvas ? letterCanvas.getContext('2d') : null;
let letterPetals = [];
let letterRAF = 0;
let letterLastT = 0;
let lastLetterSpawn = 0;
let letterOpenTime = 0;
const LETTER_SHOWER_DURATION = 10000; // 10 seconds of heart flower shower

function resizeLetterCanvas(){
  if (!letterCanvas) return;
  const lw = window.innerWidth;
  const lh = window.innerHeight;
  const ldpr = Math.min(window.devicePixelRatio || 1, 2);
  letterCanvas.width = Math.round(lw * ldpr);
  letterCanvas.height = Math.round(lh * ldpr);
  if (lctx) lctx.setTransform(ldpr, 0, 0, ldpr, 0, 0);
}

function spawnBurstPetals(count = 32){
  const lw = window.innerWidth;
  const lh = window.innerHeight;
  const cx = lw / 2;
  const cy = lh * 0.52;
  const baseBox = Math.min(lw, lh) * 0.055;
  for (let i = 0; i < count; i++){
    const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
    const speed = rand(160, 380);
    letterPetals.push({
      x: cx + rand(-24, 24),
      y: cy + rand(-16, 16),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: rand(140, 240),
      rot: rand(0, Math.PI * 2),
      vrot: rand(-3.2, 3.2),
      sway: rand(1.6, 3.2),
      phase: rand(0, Math.PI * 2),
      box: clamp(baseBox * rand(0.6, 1.2), 18, 50),
      idx: (Math.random() * (SPR.crisp.length || 6)) | 0,
      alpha: 1,
      age: 0,
      maxAge: rand(4.0, 5.5),
    });
  }
}

function spawnTopPetal(initialY = null){
  const lw = window.innerWidth;
  const lh = window.innerHeight;
  const baseBox = Math.min(lw, lh) * 0.055;
  letterPetals.push({
    x: rand(-20, lw + 20),
    y: initialY !== null ? initialY : rand(-50, -10),
    vx: rand(-30, 30),
    vy: rand(65, 130),
    gravity: rand(18, 42),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-1.8, 1.8),
    sway: rand(1.2, 2.5),
    phase: rand(0, Math.PI * 2),
    box: clamp(baseBox * rand(0.5, 1.15), 16, 46),
    idx: (Math.random() * (SPR.crisp.length || 6)) | 0,
    alpha: initialY !== null ? rand(0.55, 0.9) : 0,
    age: initialY !== null ? 0.35 : 0,
    maxAge: rand(6.5, 9.5),
  });
}

function letterFrame(now){
  if (!letterLastT) letterLastT = now;
  const dt = Math.min(0.05, (now - letterLastT) / 1000);
  letterLastT = now;

  const lw = window.innerWidth;
  const lh = window.innerHeight;
  if (lctx) lctx.clearRect(0, 0, lw, lh);

  if (letterStage && letterStage.classList.contains('is-active') && now - lastLetterSpawn > 150 && letterPetals.length < 45){
    spawnTopPetal();
    if (Math.random() < 0.4) spawnTopPetal();
    lastLetterSpawn = now;
  }

  for (let i = letterPetals.length - 1; i >= 0; i--){
    const p = letterPetals[i];
    p.age += dt;
    p.vy += p.gravity * dt;
    p.x += (p.vx + Math.sin(p.age * p.sway + p.phase) * 34) * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;

    if (p.age < 0.25) {
      p.alpha = Math.min(1, p.age / 0.25);
    } else if (p.age > p.maxAge - 0.7) {
      p.alpha = Math.max(0, (p.maxAge - p.age) / 0.7);
    } else {
      p.alpha = 0.92;
    }

    if (p.y > lh + 50 || p.alpha <= 0 || p.age >= p.maxAge){
      letterPetals.splice(i, 1);
      continue;
    }

    if (lctx && SPR.crisp && SPR.crisp[p.idx]){
      lctx.save();
      lctx.translate(p.x, p.y);
      if (p.rot) lctx.rotate(p.rot);
      lctx.globalAlpha = p.alpha;
      lctx.drawImage(SPR.crisp[p.idx], -p.box * 0.5, -p.box * 0.47, p.box, p.box);
      lctx.restore();
    }
  }

  if (letterStage && letterStage.classList.contains('is-active') && letterPetals.length > 0){
    letterRAF = requestAnimationFrame(letterFrame);
  } else {
    letterRAF = 0;
    if (lctx) lctx.clearRect(0, 0, lw, lh);
  }
}

function openLetterStage(){
  if (letterStage){
    letterStage.classList.add('is-active');
    letterStage.setAttribute('aria-hidden', 'false');
    messageBtn.setAttribute('aria-expanded', 'true');
    cue('open_letter_stage');

    // Subtle press feedback on message button
    gsap.to(messageBtn, {
      scale: 0.94,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });

    // Smooth envelope entrance
    if (envelopeCard){
      gsap.fromTo(envelopeCard,
        { scale: 0.88, y: 24, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.4)' }
      );
    }

    // Immediately start falling heart petals shower
    resizeLetterCanvas();
    letterPetals = [];
    letterOpenTime = performance.now();
    lastLetterSpawn = performance.now();

    for (let i = 0; i < 28; i++){
      spawnTopPetal(rand(-40, window.innerHeight * 0.85));
    }

    if (!letterRAF){
      letterLastT = 0;
      letterRAF = requestAnimationFrame(letterFrame);
    }
  }
}

function closeLetterStage(){
  if (letterStage){
    letterStage.classList.remove('is-active');
    letterStage.setAttribute('aria-hidden', 'true');
    messageBtn.setAttribute('aria-expanded', 'false');
  }
  if (letterRAF){
    cancelAnimationFrame(letterRAF);
    letterRAF = 0;
  }
  letterPetals = [];
  if (lctx) lctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function openLetter(){
  if (envelopeCard && !envelopeCard.classList.contains('is-opened')){
    envelopeCard.classList.add('is-opened');
    if (letterContent) letterContent.setAttribute('aria-hidden', 'false');
    cue('open_letter');
    resizeLetterCanvas();
    letterOpenTime = performance.now();
    lastLetterSpawn = performance.now();
    spawnBurstPetals(36);
    if (!letterRAF){
      letterLastT = 0;
      letterRAF = requestAnimationFrame(letterFrame);
    }
  }
}

function resetLetter(){
  if (envelopeCard){
    envelopeCard.classList.remove('is-opened');
    if (letterContent) letterContent.setAttribute('aria-hidden', 'true');
  }
  if (letterRAF){
    cancelAnimationFrame(letterRAF);
    letterRAF = 0;
  }
  letterPetals = [];
  if (lctx) lctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

messageBtn.addEventListener('click', openLetterStage);
if (letterBackBtn) letterBackBtn.addEventListener('click', closeLetterStage);
if (letterBackdrop) letterBackdrop.addEventListener('click', closeLetterStage);
if (letterCloseBtn) letterCloseBtn.addEventListener('click', closeLetterStage);
let isMemoriesTransitioning = false;

function triggerMemoriesTransition(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (isMemoriesTransitioning) return;
  isMemoriesTransitioning = true;

  try { sessionStorage.setItem('allow_memories', '1'); } catch (_) {}

  // Silently prefetch memory page assets & photos during Chapter 4
  try {
    ['memory.html', './memory.css', './memory.js'].forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
    ['/media/memories/Memory1.jpg', '/media/memories/Memory2.jpg', '/media/memories/Memory3.jpg'].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  } catch (_) {}

  // If reduced motion, navigate immediately
  if (reduceMotion) {
    window.location.href = 'memory.html';
    return;
  }

  // Soft subtle press feedback on button
  if (memoriesBtn) {
    gsap.to(memoriesBtn, {
      scale: 0.95,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });
  }

  // Extra shower of falling heart petals cascading down
  for (let i = 0; i < 24; i++){
    spawnTopPetal(rand(-40, window.innerHeight * 0.5));
  }

  // Smooth fade out of letter modal
  if (letterContent) {
    gsap.to(letterContent, {
      opacity: 0,
      y: -16,
      duration: 0.38,
      ease: 'power2.in',
    });
  }

  // Smoothly reveal the small Our Memories landing screen
  if (memoriesLanding) {
    memoriesLanding.classList.add('is-active');
    memoriesLanding.setAttribute('aria-hidden', 'false');

    gsap.fromTo(memoriesLanding,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'power2.out' }
    );

    if (memoriesLandingContent) {
      gsap.fromTo(memoriesLandingContent,
        { scale: 0.88, y: 22, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.58, ease: 'back.out(1.5)' }
      );
    }

    // 2.2s progress bar animation
    if (memoriesLandingBar) {
      gsap.to(memoriesLandingBar, {
        width: '100%',
        duration: 2.2,
        ease: 'power1.inOut',
      });
    }

    // Dynamic staged subtitle updates
    if (memoriesLandingStatus) {
      setTimeout(() => {
        memoriesLandingStatus.textContent = 'unfolding your memory scrapbook... ✨';
      }, 1100);

      setTimeout(() => {
        memoriesLandingStatus.textContent = 'ready with love... 💖';
      }, 2300);
    }

    // Gentle celebratory pulse on the polaroid keepsake
    if (memoriesLandingPolaroid) {
      setTimeout(() => {
        gsap.to(memoriesLandingPolaroid, {
          scale: 1.12,
          duration: 0.22,
          yoyo: true,
          repeat: 1,
          ease: 'back.out(2)',
        });
      }, 2100);
    }

    // Smooth silky dissolve into memory.html:
    // We gently fade out and lift the inner content (card, title, bar)
    // while keeping the radiant rose-cream background 100% opaque.
    // This prevents any visual flicker or flash of the tree canvas before navigation!
    setTimeout(() => {
      if (memoriesLandingContent) {
        gsap.to(memoriesLandingContent, {
          opacity: 0,
          y: -18,
          scale: 1.04,
          duration: 0.45,
          ease: 'power2.in',
        });
      }
      setTimeout(() => {
        window.location.href = 'memory.html';
      }, 420);
    }, 2650);
  } else {
    setTimeout(() => {
      window.location.href = 'memory.html';
    }, 420);
  }
}

if (memoriesBtn) {
  memoriesBtn.addEventListener('click', triggerMemoriesTransition);
  memoriesBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerMemoriesTransition(e);
    }
  });
}

if (envelopeCard){
  envelopeCard.addEventListener('click', () => {
    if (!envelopeCard.classList.contains('is-opened')) {
      openLetter();
    }
  });
  envelopeCard.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !envelopeCard.classList.contains('is-opened')) {
      e.preventDefault();
      openLetter();
    }
  });
}

if (letterContent){
  letterContent.addEventListener('click', (e) => e.stopPropagation());
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && letterStage && letterStage.classList.contains('is-active')) {
    closeLetterStage();
  }
});

/* the tree's own rAF: plays once from treeStart(), then holds, living */
let treeStartT = 0, treeLastT = 0, treeRAF = 0, lastPetal = 0, replayArmed = false;
window.bdayDone = false;

function treeFrame(now){
  if (!treeStartT){ treeStartT = now; treeLastT = now; }
  const t  = (now - treeStartT) / 1000;
  const dt = Math.min(0.05, (now - treeLastT) / 1000); treeLastT = now;

  const rays = clamp01((t - T.bloomT0) / T.bloomSpan);

  drawBackground();
  drawGodRays(t, rays);
  drawGlow(t);
  drawBranches(t);
  drawHearts(t);
  if (t > T.petalT0 && now - lastPetal > 150){ spawnPetal(); spawnPetal(); lastPetal = now; }
  drawPetals(t, dt);
  drawRested();

  showWish(t >= T.noteStart);
  showMessageBtn(t >= T.buttonStart);

  if (!window.bdayDone && t >= T.done) window.bdayDone = true;
  if (!replayArmed && t >= T.done + 1.0){ replayArmed = true; armReplay(); }

  treeRAF = requestAnimationFrame(treeFrame);
}

function treeStart(){
  treeStartT = 0; treeLastT = 0; lastPetal = 0; replayArmed = false; window.bdayDone = false;
  cue('grow');
  buildScene();
  if (!treeRAF) treeRAF = requestAnimationFrame(treeFrame);
}
function treeStop(){
  if (treeRAF){ cancelAnimationFrame(treeRAF); treeRAF = 0; }
  ctx.clearRect(0, 0, W, H);
  showMessageBtn(false);
}

function drawFinal(){
  buildScene();
  drawBackground(); drawGodRays(0, 1); drawGlow(T.done);
  drawBranches(99); drawHearts(99);
  for (let i = 0; i < 40; i++){ const h = hearts[(Math.random() * hearts.length) | 0]; if (h) rested.push({ x: clamp(h.x + rand(-W * 0.3, W * 0.3), 6, W - 6), y: groundY + rand(-6, H * 0.05), box: h.box * 0.5, idx: h.idx, rot: rand(0, 6.28), a: 0.85 }); }
  drawRested();
  showWish(true);
  showMessageBtn(true);
  window.bdayDone = true;
}

/* drifting light motes behind the scene */
function buildMotes(){
  motes.innerHTML = '';
  for (let i = 0; i < 12; i++){
    const m = document.createElement('span');
    m.className = 'mote';
    const s = rand(4, 12);
    m.style.width = m.style.height = `${s}px`;
    m.style.left = `${rand(4, 96)}%`;
    m.style.top  = `${rand(10, 96)}%`;
    motes.appendChild(m);
    gsap.set(m, { opacity: rand(0.25, 0.7) });
    gsap.to(m, { y: -rand(40, 140), x: rand(-30, 30), duration: rand(7, 14), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -rand(0, 8) });
    gsap.to(m, { opacity: rand(0.1, 0.5), duration: rand(2.5, 5), repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }
}

/* --- bow geometry (measured; re-measured on resize) -------------------------
   The rig lives lower-left and is rotated so its local "up" axis points at the
   heart; the shot therefore travels on a diagonal. The draw + arrow math all
   live in the rig's LOCAL space (offset geometry is transform-independent, so
   rotation never corrupts it); only the aim ANGLE and the flight DISTANCE come
   from screen measurements. */
const tip = $('tip');
let svgScale = 1, arrowBaseX = 0, arrowBaseY = 0, maxDraw = 120, curDraw = 0;
let pullUX = 0, pullUY = 1;                               // screen unit: string pull-back
const REST_NOCK = 96;                                    // string nock, in bow viewBox units
const nockProxy = { val: REST_NOCK };

function applyNock(){
  const y = nockProxy.val;
  strL.setAttribute('y2', y); strR.setAttribute('y2', y); serving.setAttribute('cy', y);
}

function refreshRig(){
  // the grip is anchored here, and the heart sits at its layout centre (33% down,
  // centred) — using the layout point, not a live rect, keeps the aim steady even
  // while the heart is scaling in.
  const gripX = W * 0.24, gripY = H * 0.76;
  const heartX = W * 0.5, heartY = H * 0.33;
  // rotation so local "up" (0,-1) maps to the grip→heart direction
  const aimRad = Math.atan2(heartX - gripX, gripY - heartY);
  pullUX = -Math.sin(aimRad); pullUY = Math.cos(aimRad);  // opposite of aim = pull-back

  // #bow / #arrow are SVG — no offset* — so measure rects in the rig's LOCAL
  // frame: neutralise the rig transform first (getBBox-style, sync, no paint).
  nockProxy.val = REST_NOCK; applyNock();
  gsap.set(archery, { rotation: 0, scale: 1, x: 0, y: 0 });
  archery.style.left = '0px'; archery.style.top = '0px';
  gsap.set(arrow, { x: 0, y: 0 });
  const aR = archery.getBoundingClientRect();
  const bR = bow.getBoundingClientRect();
  const sR = serving.getBoundingClientRect();
  const rR = arrow.getBoundingClientRect();
  svgScale = bR.width / 460;
  const gripLX = (bR.left - aR.left) + 0.5 * bR.width;
  const gripLY = (bR.top  - aR.top ) + (240 / 300) * bR.height;   // grip ~y240 in viewBox
  const nockLX = (sR.left - aR.left) + 0.5 * sR.width;
  const nockLY = (sR.top  - aR.top ) + 0.5 * sR.height;
  arrowBaseX = nockLX - ((rR.left - aR.left) + 0.5 * rR.width);
  arrowBaseY = nockLY - ((rR.top  - aR.top ) + (205 / 220) * rR.height);

  // anchor the grip at (gripX,gripY) and rotate the rig around it
  archery.style.left = (gripX - gripLX) + 'px';
  archery.style.top  = (gripY - gripLY) + 'px';
  gsap.set(archery, { transformOrigin: `${gripLX}px ${gripLY}px`, rotation: aimRad * 180 / Math.PI });
  gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY });
  maxDraw = Math.min(bR.height * 0.72, H * 0.16, 132);
  curDraw = 0;
}

function setDraw(d){
  curDraw = clamp(d, 0, maxDraw);
  gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY + curDraw });   // local +Y = pull back
  nockProxy.val = REST_NOCK + curDraw / svgScale; applyNock();
  gsap.set(aim, { opacity: 0.55 * (curDraw / maxDraw) });
}

/* the target heart's beat — gentle, alive; killed the instant we fire */
let beatTL = null;
function startBeat(){
  gsap.set(targetHeart, { scale: 1 });
  gsap.set(heartGlow, { scale: 1, opacity: 0.7 });
  beatTL = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
  beatTL.to(targetHeart, { scale: 1.07, duration: 0.13, ease: 'power2.out' }, 0)
        .to(heartGlow,   { scale: 1.15, opacity: 0.9, duration: 0.13, ease: 'power2.out' }, 0)
        .to(targetHeart, { scale: 1.0, duration: 0.2, ease: 'power2.in' }, 0.13)
        .to(targetHeart, { scale: 1.05, duration: 0.12, ease: 'power2.out' }, 0.3)
        .to(targetHeart, { scale: 1.0, duration: 0.5, ease: 'power2.inOut' }, 0.42)
        .to(heartGlow,   { scale: 1.0, opacity: 0.7, duration: 0.7, ease: 'power2.inOut' }, 0.3);
}
function stopBeat(){ if (beatTL){ beatTL.kill(); beatTL = null; } gsap.set(targetHeart, { scale: 1 }); }

/* a little burst of hearts + sparks where the arrow strikes */
function miniHeartSVG(fill){
  return `<svg viewBox="0 0 24 22" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z" fill="${fill}"/></svg>`;
}
function burstHearts(){
  const r = target.getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const ox = r.left - hr.left + r.width / 2;
  const oy = r.top - hr.top + r.height * 0.42;
  const cols = ['#ff6f97', '#ffb14e', '#ff8fae', '#ffd36a', '#e23b67'];
  const frag = document.createDocumentFragment();
  const nodes = [];
  for (let i = 0; i < 12; i++){
    const heart = i < 8;
    const el = document.createElement('span');
    el.className = 'burst';
    const s = heart ? rand(12, 22) : rand(4, 8);
    el.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;pointer-events:none;z-index:4;`;
    if (heart) el.innerHTML = miniHeartSVG(pick(cols));
    else { el.style.borderRadius = '50%'; el.style.background = 'radial-gradient(circle,#fff,rgba(255,210,150,0) 70%)'; }
    frag.appendChild(el); nodes.push({ el, heart });
  }
  hero.appendChild(frag);
  nodes.forEach(({ el, heart }) => {
    const ang = rand(-Math.PI, 0);                       // fan upward + out
    const dist = rand(heart ? 70 : 40, heart ? 190 : 120);
    gsap.to(el, {
      x: Math.cos(ang) * dist, y: Math.sin(ang) * dist - rand(10, 50),
      rotation: rand(-120, 120), scale: heart ? rand(0.7, 1.2) : rand(0.4, 1),
      duration: rand(0.7, 1.15), ease: 'power2.out',
    });
    gsap.to(el, { opacity: 0, duration: 0.5, delay: rand(0.35, 0.6), ease: 'power1.in', onComplete: () => el.remove() });
  });
}

/* --- the shot + Acts timeline ---------------------------------------------- */
function shotGeom(){
  // flight distance = straight-line from the arrow tip to the heart (measured on
  // screen, rotation-aware). Moving the arrow that far along its local "up" axis
  // — which is aimed at the heart — lands the tip dead-centre on it.
  const tipR = tip.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const tipX = tipR.left + tipR.width / 2, tipY = tipR.top + tipR.height / 2;
  const tcx = tRect.left + tRect.width / 2, tcy = tRect.top + tRect.height / 2;
  const flightDist = Math.hypot(tcx - tipX, tcy - tipY);
  const fallPx = Math.min(H * 0.26, H - tcy - tRect.height * 0.4);
  const impactX = tcx, impactY = tcy + fallPx;
  const reach = Math.hypot(W / 2, H / 2);
  return {
    arrowStartY: arrowBaseY + curDraw,
    arrowFlyY:   arrowBaseY + curDraw - flightDist,       // local -Y = toward the heart
    drawnNock:   REST_NOCK + curDraw / svgScale,
    fallPx, fx: impactX - W / 2, fy: impactY - H / 2,
    bloomScale: (reach * 1.4) / 30,
  };
}

let filmTL = null;
function buildFilm(m){
  const t = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set(hero, { autoAlpha: 0 });
      treeStart();
      // fade promptly so the growing tree is revealed with no white hold
      gsap.to(bloom, { autoAlpha: 0, duration: 1.15, ease: 'power2.out' });
    },
  });

  // reset (t=0)
  t.set(target, { y: 0, scaleX: 1, scaleY: 1, opacity: 1 })
   .set(arrow, { opacity: 1, x: arrowBaseX, y: m.arrowStartY, scaleY: 1, rotation: 0 })
   .set(bloom, { autoAlpha: 0, scale: 0.001, x: m.fx, y: m.fy });

  // --- the shot: string snaps (twang), arrow flies up into the heart --------
  t.fromTo(nockProxy, { val: m.drawnNock }, { val: REST_NOCK, duration: 0.5, ease: 'elastic.out(1,0.34)', onUpdate: applyNock }, 0)
   .to(arrow, { y: m.arrowFlyY, duration: 0.26, ease: 'power2.in' }, 0)
   .to(arrow, { scaleY: 1.16, duration: 0.14, ease: 'power2.in' }, 0)
   .to(arrow, { scaleY: 1.0, duration: 0.1, ease: 'power1.out' }, 0.16)
   .to(aim, { opacity: 0, duration: 0.18 }, 0)
   .to([eyebrow, hint], { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0);

  // --- the strike: the arrow embeds, the heart recoils, then holds pierced --
  t.add(burstHearts, 0.26)
   // recoil along the arrow's line (up + right), springing back
   .to(target, { x: 7, y: -9, duration: 0.06, ease: 'power2.out' }, 0.26)
   .to(target, { x: 0, y: 0, duration: 0.32, ease: 'power2.out' }, 0.32)
   .to(target, { scale: 1.14, duration: 0.06, ease: 'power2.out' }, 0.26)
   .to(target, { scale: 1.0, duration: 0.26, ease: 'power2.inOut' }, 0.32)
   // the arrow shudders in the wound, holds embedded so the hit reads, then sinks in
   .to(arrow, { rotation: '+=4', duration: 0.05, yoyo: true, repeat: 4, ease: 'sine.inOut' }, 0.27)
   .set(arrow, { rotation: 0 }, 0.52)
   .to(arrow, { opacity: 0, duration: 0.16, ease: 'power1.out' }, 0.56);

  // --- the fall + the bloom transition directly into the tree ---------------
  t.to(target, { y: m.fallPx, scaleX: 0.84, scaleY: 1.3, duration: 0.34, ease: 'power1.in' }, 0.64)
   .to(target, { scaleX: 1.4, scaleY: 0.6, duration: 0.07, ease: 'power2.out' }, 0.98)
   .to(target, { opacity: 0, duration: 0.12, ease: 'power1.out' }, 1.05)
   .set(bloom, { autoAlpha: 1 }, 1.00)
   .fromTo(bloom, { scale: 0.02 }, { scale: m.bloomScale, duration: 0.58, ease: 'power2.in' }, 1.00);

  // beat markers for the recorder's soundtrack (no-ops off ?record)
  t.call(cue, ['hit'], 0.26)
   .call(cue, ['bloom'], 1.00);

  return t;
}

/* --- draw / release interaction -------------------------------------------- */
let played = false, drawing = false, startPX = 0, startPY = 0, startDraw = 0;

function fire(){
  if (played) return;
  played = true;
  drawing = false;
  stopBeat();
  cue('release'); cue('whoosh');
  filmTL = buildFilm(shotGeom());
  filmTL.play(0);
}

function springBack(){
  const from = curDraw;
  gsap.to({ d: from }, { d: 0, duration: 0.55, ease: 'elastic.out(1,0.4)', onUpdate() { setDraw(this.targets()[0].d); } });
}

function autoFire(){
  if (played) return;
  recT0 = performance.now(); cue('draw');       // t=0 of the soundtrack
  gsap.to({ d: curDraw }, {
    d: maxDraw * 0.94, duration: 0.62, ease: 'power2.inOut',
    onUpdate() { setDraw(this.targets()[0].d); },
    onComplete: () => gsap.delayedCall(0.16, fire),
  });
}

archery.addEventListener('pointerdown', (e) => {
  if (played) return;
  drawing = true;
  try { archery.setPointerCapture(e.pointerId); } catch (_) {}
  startPX = e.clientX; startPY = e.clientY; startDraw = curDraw;
  e.preventDefault();
});
archery.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  // project the drag onto the pull-back axis, so dragging back along the aim
  // (down + away from the heart) draws the string — on any shot angle.
  const proj = (e.clientX - startPX) * pullUX + (e.clientY - startPY) * pullUY;
  setDraw(startDraw + proj);
});
function endDraw(){
  if (!drawing) return;
  drawing = false;
  if (curDraw > maxDraw * 0.26) fire(); else springBack();
}
archery.addEventListener('pointerup', endDraw);
archery.addEventListener('pointercancel', endDraw);
archery.addEventListener('keydown', (e) => {
  if (played) return;
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); autoFire(); }
});

/* boot Act 1: reveal the target + bow + hint, then start the beat */
function enter(){
  showMessageBtn(false);
  closeLetterStage();
  resetLetter();

  gsap.set([eyebrow, hint, target, archery, heartGlow], { opacity: 0 });
  refreshRig();
  setDraw(0);
  gsap.set(hero, { autoAlpha: 1 });
  gsap.set([eyebrow, hint], { opacity: 0, y: 14 });
  gsap.set(target, { opacity: 0, y: 10, scaleX: 0.9, scaleY: 0.9 });
  gsap.set(archery, { opacity: 0, scale: 0.85 });        // scale from the grip; keeps rotation
  gsap.set(heartGlow, { opacity: 0, scale: 1 });
  gsap.set(arrow, { opacity: 1 });

  const tl = gsap.timeline({ onComplete: startBeat });
  tl.to(target,   { opacity: 1, y: 0, scaleX: 1, scaleY: 1, duration: 0.85, ease: 'power3.out' }, 0.1)
    .to(heartGlow,{ opacity: 0.7, duration: 0.85, ease: 'power2.out' }, 0.2)
    .to(archery,  { opacity: 1, scale: 1, duration: 0.85, ease: 'power3.out' }, 0.28)
    .to(eyebrow,  { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, 0.45)
    .to(hint,     { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, 0.75);
}

function armReplay(){
  // Replay is available inside the Letter Page footer
}

/* back to Act 1, ready to be drawn again */
function resetAll(){
  treeStop();
  showWish(false);
  showMessageBtn(false);
  closeLetterStage();
  resetLetter();
  window.bdayDone = false; replayArmed = false;
  if (filmTL){ filmTL.pause(0); }
  gsap.set(bloom, { autoAlpha: 0 });
  if (loveBloom){ gsap.set(loveBloom, { autoAlpha: 0, scale: 0.001 }); }
  gsap.set(hero, { autoAlpha: 1 });
  gsap.set(arrow, { opacity: 1, scaleY: 1 });
  played = false;
  enter();
}

/* ============================================================
   ACT 0 — THE LOVE QUESTION (NEW FIRST PAGE)
   ============================================================ */
let loveGateActive = true;
let lastDodgeTime = 0;
let isRunaway = false;

function buildLoveMotes(){
  if (!loveMotes) return;
  loveMotes.innerHTML = '';
  const heartSVGs = [
    '<svg viewBox="0 0 24 22" fill="#ff6f97" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z"/></svg>',
    '<svg viewBox="0 0 24 22" fill="#ff9ebb" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z"/></svg>',
    '<svg viewBox="0 0 24 22" fill="#ffc2d4" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z"/></svg>',
  ];
  for (let i = 0; i < 15; i++){
    const m = document.createElement('span');
    m.className = 'love-mote-heart';
    const s = rand(14, 26);
    m.style.width = `${s}px`;
    m.style.height = `${s}px`;
    m.style.left = `${rand(4, 94)}%`;
    m.style.bottom = `${rand(-60, 20)}px`;
    m.style.animationDuration = `${rand(8, 16)}s`;
    m.style.animationDelay = `${rand(-14, 0)}s`;
    m.innerHTML = pick(heartSVGs);
    loveMotes.appendChild(m);
  }
}

function dodgeNo(pointerX, pointerY){
  if (!loveGateActive || !loveGate || loveGate.style.display === 'none' || !loveNoBtn) return;
  const now = performance.now();
  if (now - lastDodgeTime < 40) return;
  lastDodgeTime = now;

  const btnRect = loveNoBtn.getBoundingClientRect();
  const yesRect = loveYesBtn ? loveYesBtn.getBoundingClientRect() : null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const btnW = btnRect.width || 160;
  const btnH = btnRect.height || 50;

  if (!isRunaway){
    loveNoBtn.style.width = `${btnW}px`;
    loveNoBtn.style.height = `${btnH}px`;
    loveNoBtn.style.left = `${btnRect.left}px`;
    loveNoBtn.style.top = `${btnRect.top}px`;
    loveGate.appendChild(loveNoBtn);
    loveNoBtn.classList.add('is-runaway');
    isRunaway = true;
  }

  const pad = 24;
  const minX = pad;
  const maxX = Math.max(pad, vw - btnW - pad);
  const minY = pad;
  const maxY = Math.max(pad, vh - btnH - pad);

  const currentX = parseFloat(loveNoBtn.style.left) || btnRect.left;
  const currentY = parseFloat(loveNoBtn.style.top) || btnRect.top;

  let targetX = minX;
  let targetY = minY;
  let bestDist = -1;

  for (let i = 0; i < 45; i++){
    const candX = rand(minX, maxX);
    const candY = rand(minY, maxY);

    if (yesRect){
      const safeBuffer = 26;
      const overlapX = candX < yesRect.right + safeBuffer && candX + btnW > yesRect.left - safeBuffer;
      const overlapY = candY < yesRect.bottom + safeBuffer && candY + btnH > yesRect.top - safeBuffer;
      if (overlapX && overlapY) continue;
    }

    const distCurrent = Math.hypot(candX - currentX, candY - currentY);
    if (distCurrent < 140 && (maxX - minX > 200 || maxY - minY > 200)) continue;

    let score = distCurrent;
    if (pointerX !== undefined && pointerY !== undefined){
      const distPointer = Math.hypot(candX + btnW / 2 - pointerX, candY + btnH / 2 - pointerY);
      score += distPointer * 1.5;
    }

    if (score > bestDist){
      bestDist = score;
      targetX = candX;
      targetY = candY;
    }
  }

  targetX = clamp(targetX, minX, maxX);
  targetY = clamp(targetY, minY, maxY);

  const rot = rand(-8, 8);

  gsap.killTweensOf(loveNoBtn);
  gsap.to(loveNoBtn, {
    left: targetX,
    top: targetY,
    rotation: rot,
    scale: 1,
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out',
  });
}

function spawnTrailSpark(x, y){
  const el = document.createElement('span');
  el.className = 'love-trail-spark';
  const s = rand(6, 14);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${s}px`;
  el.style.height = `${s}px`;
  el.style.marginLeft = `${-s / 2}px`;
  el.style.marginTop = `${-s / 2}px`;
  document.body.appendChild(el);

  gsap.to(el, {
    scale: 0.1,
    opacity: 0,
    x: rand(-14, 14),
    y: rand(-8, 16),
    duration: rand(0.35, 0.6),
    ease: 'power2.out',
    onComplete: () => el.remove(),
  });
}

function celebrateYesBurst(cx, cy, count = 30){
  const colors = ['#ff4f81', '#ff7096', '#ff94b4', '#ffd166', '#f39c12', '#e83e8c', '#ffffff'];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++){
    const isHeart = i % 2 === 0;
    const el = document.createElement('span');
    el.className = 'love-celebrate-burst';
    const s = isHeart ? rand(14, 28) : rand(6, 14);
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.style.width = `${s}px`;
    el.style.height = `${s}px`;
    el.style.marginLeft = `${-s / 2}px`;
    el.style.marginTop = `${-s / 2}px`;

    if (isHeart){
      el.innerHTML = miniHeartSVG(pick(colors));
    } else {
      el.style.borderRadius = '50%';
      el.style.background = pick(colors);
      el.style.boxShadow = '0 0 12px rgba(255,220,130,.9)';
    }

    frag.appendChild(el);

    const ang = rand(0, Math.PI * 2);
    const dist = rand(55, 210);
    gsap.to(el, {
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist - rand(15, 55),
      rotation: rand(-140, 140),
      scale: rand(0.7, 1.35),
      duration: rand(0.75, 1.25),
      ease: 'power2.out',
    });
    gsap.to(el, {
      opacity: 0,
      duration: 0.5,
      delay: rand(0.4, 0.75),
      ease: 'power1.in',
      onComplete: () => el.remove(),
    });
  }
  document.body.appendChild(frag);
}

function resetNoButton(){
  const actions = $('loveActions');
  if (loveNoBtn){
    if (actions && loveNoBtn.parentElement !== actions){
      actions.appendChild(loveNoBtn);
    }
    loveNoBtn.classList.remove('is-runaway');
    loveNoBtn.style.left = '';
    loveNoBtn.style.top = '';
    loveNoBtn.style.width = '';
    loveNoBtn.style.height = '';
    loveNoBtn.style.transform = '';
    loveNoBtn.style.opacity = '';
    loveNoBtn.style.pointerEvents = '';
    loveNoBtn.disabled = false;
    isRunaway = false;
  }
}

function handleLoveYes(){
  if (!loveGateActive) return;
  loveGateActive = false;

  if (loveYesBtn) loveYesBtn.disabled = true;
  if (loveNoBtn){
    loveNoBtn.disabled = true;
    loveNoBtn.style.pointerEvents = 'none';
    gsap.killTweensOf(loveNoBtn);
    gsap.to(loveNoBtn, { opacity: 0, scale: 0.8, duration: 0.28, ease: 'power2.in' });
  }

  // Button tap pulse
  if (loveYesBtn){
    gsap.to(loveYesBtn, {
      scale: 1.14,
      duration: 0.18,
      ease: 'back.out(2)',
      yoyo: true,
      repeat: 1,
    });
  }

  if (reduceMotion){
    gsap.to(loveGate, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        loveGate.style.display = 'none';
        resetNoButton();
        enter();
      },
    });
    return;
  }

  // Coordinates
  const yesRect = loveYesBtn ? loveYesBtn.getBoundingClientRect() : { left: window.innerWidth / 2 - 80, top: window.innerHeight / 2, width: 160, height: 50 };
  const startX = yesRect.left + yesRect.width / 2;
  const startY = yesRect.top + yesRect.height / 2;
  const endX = window.innerWidth / 2;
  const endY = window.innerHeight * 0.44;

  // Immediate spark burst at button
  celebrateYesBurst(startX, startY, 14);

  // Flying winged Cupid love heart projectile
  const proj = document.createElement('div');
  proj.className = 'love-projectile';
  proj.innerHTML = `
    <svg viewBox="0 0 38 32" width="100%" height="100%" fill="none" style="filter: drop-shadow(0 2px 8px rgba(255,50,100,0.85));">
      <defs>
        <linearGradient id="projH" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff7f9c" />
          <stop offset="50%" stop-color="#e8245f" />
          <stop offset="100%" stop-color="#a8154a" />
        </linearGradient>
        <linearGradient id="projW" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#ffd5df" />
        </linearGradient>
      </defs>
      <path d="M19 14 C10 4, 1 7, 3 18 C8 15, 14 16, 19 21 Z" fill="url(#projW)" opacity="0.95" />
      <path d="M19 14 C28 4, 37 7, 35 18 C30 15, 24 16, 19 21 Z" fill="url(#projW)" opacity="0.95" />
      <path d="M19 28 C12.5 22.5 4.5 17 4.5 9.5 C4.5 4.5 9 1 14 1 C16.8 1 18.2 2.5 19 2.5 C19.8 2.5 21.2 1 24 1 C29 1 33.5 4.5 33.5 9.5 C33.5 17 25.5 22.5 19 28 Z" fill="url(#projH)" stroke="#ffe38c" stroke-width="1.2" />
    </svg>
  `;
  gsap.set(proj, { left: startX, top: startY, scale: 0.6, rotation: -12 });
  document.body.appendChild(proj);

  // Flight to center
  gsap.to(proj, {
    left: endX,
    top: endY,
    scale: 1.35,
    rotation: 6,
    duration: 0.38,
    ease: 'power2.out',
    onUpdate: () => {
      if (Math.random() < 0.6) {
        spawnTrailSpark(gsap.getProperty(proj, 'left'), gsap.getProperty(proj, 'top'));
      }
    },
    onComplete: () => {
      // Pop and remove projectile
      gsap.to(proj, {
        scale: 1.8,
        opacity: 0,
        duration: 0.12,
        ease: 'power1.out',
        onComplete: () => proj.remove(),
      });

      // Expand glowing shockwave
      const wave = document.createElement('div');
      wave.className = 'love-shockwave';
      wave.style.left = `${endX}px`;
      wave.style.top = `${endY}px`;
      document.body.appendChild(wave);
      gsap.fromTo(wave,
        { scale: 0.1, opacity: 1 },
        { scale: 3.8, opacity: 0, duration: 0.55, ease: 'power2.out', onComplete: () => wave.remove() }
      );

      // Grand celebratory explosion of hearts & gold stars
      celebrateYesBurst(endX, endY, 34);

      // Radiant golden-rose bloom (inspired by Act 2->3 arrow hit bloom)
      const reach = Math.hypot(window.innerWidth, window.innerHeight);
      const bloomScale = (reach * 1.5) / 30;

      if (loveBloom){
        gsap.set(loveBloom, { x: endX, y: endY, scale: 0.02, autoAlpha: 1 });
        gsap.fromTo(loveBloom,
          { scale: 0.02 },
          {
            scale: bloomScale,
            duration: 0.65,
            ease: 'power2.in',
            onComplete: () => {
              // Screen is fully enveloped in golden light!
              loveGate.style.display = 'none';
              resetNoButton();

              // Initialize Act 1 (the Cupid archery scene)
              enter();

              // Bloom gracefully dissolves away to reveal the scene (dawn effect)
              gsap.to(loveBloom, {
                autoAlpha: 0,
                duration: 1.15,
                ease: 'power2.out',
              });
            }
          }
        );
      } else {
        loveGate.style.display = 'none';
        resetNoButton();
        enter();
      }

      // Smoothly fade out loveGate as bloom expands
      gsap.to(loveGate, {
        opacity: 0,
        duration: 0.45,
        delay: 0.2,
        ease: 'power2.inOut',
      });
    },
  });
}

function runLoveGateIntro(){
  if (!loveLoader) return;

  if (reduceMotion){
    loveLoader.style.display = 'none';
    try { loveLoader.remove(); } catch (_) {}
    return;
  }

  // Pre-set loveCard with slight offset and zero opacity on GPU layer
  if (loveCard){
    gsap.set(loveCard, { opacity: 0, y: 16 });
  }

  // 5-second choreographed landing screen presentation
  const introTL = gsap.timeline();

  // Progress bar fills smoothly across 4.6 seconds
  if (loveLoaderBar){
    introTL.to(loveLoaderBar, {
      width: '100%',
      duration: 4.6,
      ease: 'power1.inOut',
    }, 0);
  }

  // Staged subtitle updates throughout the 5 seconds
  if (loveLoaderStatus){
    introTL.call(() => {
      loveLoaderStatus.textContent = 'gathering sweet memories... 🌸';
    }, null, 1.5);

    introTL.call(() => {
      loveLoaderStatus.textContent = 'unwrapping your surprise... ✨';
    }, null, 3.2);

    introTL.call(() => {
      loveLoaderStatus.textContent = 'ready for you! 💖';
    }, null, 4.6);
  }

  // At 4.7s: Gentle celebratory pulse on emblem
  if (loveLoaderEmblem){
    introTL.to(loveLoaderEmblem, {
      scale: 1.16,
      duration: 0.28,
      ease: 'back.out(2)',
    }, 4.7);
  }

  // At exactly 5.0 seconds: Silky dissolve of the landing screen
  introTL.to(loveLoader, {
    opacity: 0,
    duration: 0.55,
    ease: 'power2.out',
    onComplete: () => {
      loveLoader.style.display = 'none';
      try { loveLoader.remove(); } catch (_) {}
    },
  }, 5.0);

  // Smooth, lag-free glide entrance of the question card
  if (loveCard){
    introTL.to(loveCard, {
      opacity: 1,
      y: 0,
      duration: 0.65,
      ease: 'power2.out',
      clearProps: 'transform',
    }, 5.1);
  }
}

function initLoveGate(){
  if (!loveGate) return;
  loveGateActive = true;
  isRunaway = false;
  loveGate.style.display = 'flex';
  gsap.set(loveGate, { opacity: 1 });
  gsap.set(hero, { autoAlpha: 0 });
  gsap.set([eyebrow, hint, target, archery, heartGlow], { opacity: 0 });

  if (loveBloom){
    gsap.set(loveBloom, { autoAlpha: 0, scale: 0.001 });
  }

  resetNoButton();

  if (loveYesBtn){
    loveYesBtn.disabled = false;
    loveYesBtn.style.transform = '';
  }

  buildLoveMotes();

  if (loveNoBtn){
    const onNoClick = (e) => {
      if (!loveGateActive || !loveGate || loveGate.style.display === 'none') return;
      if (e){
        e.preventDefault();
        e.stopPropagation();
      }
      const pX = e && e.clientX !== undefined ? e.clientX : undefined;
      const pY = e && e.clientY !== undefined ? e.clientY : undefined;
      dodgeNo(pX, pY);
      return false;
    };

    loveNoBtn.addEventListener('click', onNoClick);
    loveNoBtn.addEventListener('touchend', (e) => {
      if (!loveGateActive || !loveGate || loveGate.style.display === 'none') return;
      e.preventDefault();
      e.stopPropagation();
      const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null;
      dodgeNo(t ? t.clientX : undefined, t ? t.clientY : undefined);
    }, { passive: false });
  }

  if (loveYesBtn){
    loveYesBtn.addEventListener('click', handleLoveYes);
  }

  // Smooth luxury opening intro ONLY for 1st page
  runLoveGateIntro();
}

/* ============================================================
   SIZING + BOOT
   ============================================================ */
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildSprites();
  buildScene();
  resizeLetterCanvas();

  if (isRunaway && loveNoBtn && loveGate && loveGateActive && loveGate.style.display !== 'none'){
    const pad = 24;
    const r = loveNoBtn.getBoundingClientRect();
    const curL = parseFloat(loveNoBtn.style.left) || r.left;
    const curT = parseFloat(loveNoBtn.style.top) || r.top;
    const maxL = Math.max(pad, window.innerWidth - r.width - pad);
    const maxT = Math.max(pad, window.innerHeight - r.height - pad);
    loveNoBtn.style.left = `${clamp(curL, pad, maxL)}px`;
    loveNoBtn.style.top = `${clamp(curT, pad, maxT)}px`;
  }

  if (reduceMotion){ if (!loveGateActive) drawFinal(); return; }
  if (played && filmTL){
    const at = filmTL.time(); const active = filmTL.isActive();
    filmTL = buildFilm(shotGeom());
    filmTL.pause(at);
    if (active) filmTL.play(at);
  } else {
    refreshRig(); setDraw(0);
  }
}
let resizeRAF = 0;
window.addEventListener('resize', () => { if (resizeRAF) return; resizeRAF = requestAnimationFrame(() => { resizeRAF = 0; resize(); }); });

resize();

motes.innerHTML = '';
document.fonts && document.fonts.ready.then(() => { refreshRig(); setDraw(0); });
replay.addEventListener('click', resetAll);

initLoveGate();
initHeartCursor();

/* ============================================================
   RECORDING HOOK — the rig draws + fires after its pre-roll
   ============================================================ */
if (isRecord){
  window.bdayAPI = {
    start(){ autoFire(); },
    replay(){ resetAll(); },
  };
}
