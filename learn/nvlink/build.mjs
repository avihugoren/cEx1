import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// Truth: one NVLink link, per generation. Lanes and signalling rate are per direction (one sub-link);
// GB/s is per link per direction; links is the count on that generation's flagship GPU.
const GENS = [
  { gen: 1, gpu: "P100", lanes: 8, gbps: 20, gbs: 20, links: 4 },
  { gen: 2, gpu: "V100", lanes: 8, gbps: 25, gbs: 25, links: 6 },
  { gen: 3, gpu: "A100", lanes: 4, gbps: 50, gbs: 25, links: 12 },
  { gen: 4, gpu: "H100", lanes: 2, gbps: 100, gbs: 25, links: 18 },
  { gen: 5, gpu: "B200", lanes: 2, gbps: 200, gbs: 50, links: 18 },
];

const WIDTH = 600;
const HEIGHT = 330;

const PLATE = { x: -158, y: -66, w: 316, d: 146, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const BOARD_Z = 4;
const BOARD_H = 2.4;
const BOARD_TOP = BOARD_Z + BOARD_H;
const SUB_H = 2;
const SUB_TOP = BOARD_TOP + SUB_H;
const CONN_X = 56;
const CONN_W = 10;
const CONN_H = 13;
const CHAN_H = 1.6;
const NEAR = { y: 6, d: 24 };
const FAR = { y: -30, d: 24 };
const FLIT_W = 10;
const FLIT_H = 3.2;
const TRAVEL = [-CONN_X + FLIT_W / 2, CONN_X + FLIT_W / 2 + 2];

const RACK = { x: -144, y: 56, w: 68, d: 18, r: 2 };
const RACK_H = 4;
const PEG_R = 2.2;
const PEG_H = 6;
const PEGS = [];
for (const y of [61, 69]) for (let i = 0; i < 8; i++) PEGS.push([RACK.x + 6 + i * 8, y]);
const KNOB = [128, 66];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-110, 0, SUB_TOP + 6], [110, 0, SUB_TOP + 6]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 56 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// One GPU on its board: standoffs, PCB, package substrate, die lid, six HBM stacks, mounting screws.
// side = -1 for GPU 0 (left, sender), +1 for GPU 1 (right, receiver).
function gpu(side) {
  const x0 = side < 0 ? -CONN_X - CONN_W - 84 : CONN_X + CONN_W;
  const board = { x: x0, y: -52, w: 84, d: 104, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(board, 4), 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(board, 7))) out.push(S(k.cylinder(x, y, 2.6, 0, BOARD_Z, P, 18), { tone: "mid" }));
  out.push(S(k.slabOf(board, BOARD_Z, BOARD_H, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(board, 3), BOARD_TOP, P, 4), { tone: "faint" }));
  out.push(L(k.corners(board, 7).map(([x, y]) => k.ring(x, y, 1.8, BOARD_TOP, P, 14)).join(""), { tone: "lo" }));
  out.push(D(k.corners(board, 7).map(([x, y]) => at([x, y, BOARD_TOP])), { size: 0.5 }));
  const cx = x0 + 42;
  const sub = { x: cx - 30, y: -40, w: 60, d: 80, r: 2 };
  out.push(S(k.slabOf(sub, BOARD_TOP, SUB_H, P, 3, 0.5), { tone: "lo" }));
  const hbm = [];
  for (const dx of [-21, 21]) for (const y of [-32, -10, 12]) hbm.push({ x: cx + dx - 5, y, w: 10, d: 20, r: 1 });
  const die = { x: cx - 13, y: -30, w: 26, d: 60, r: 1.4 };
  const pieces = [...hbm.map((plan) => ({ plan, h: 5, tone: "mid" })), { plan: die, h: 4, tone: "hi" }];
  pieces.sort((a, b) => k.depthOf([a.plan.x + a.plan.w / 2, a.plan.y + a.plan.d / 2, 0], P) - k.depthOf([b.plan.x + b.plan.w / 2, b.plan.y + b.plan.d / 2, 0], P));
  for (const { plan, h, tone } of pieces) {
    out.push(S(k.slabOf(plan, SUB_TOP, h, P, 3, 0.5), { tone, crease: tone === "hi" ? "lo" : "faint" }));
    if (tone === "hi") out.push(L(k.planOutline(k.insetPlan(plan, 3), SUB_TOP + h, P, 3), { tone: "faint" }));
    else out.push(L([0.25, 0.5, 0.75].map((f) => k.lineOnTop([plan.x, plan.y + plan.d * f], [plan.x + plan.w, plan.y + plan.d * f], SUB_TOP + h, P)).join(""), { tone: "faint" }));
  }
  return out.join("");
}

function connector(side) {
  const x = side < 0 ? -CONN_X - CONN_W : CONN_X;
  const shell = { x, y: -36, w: CONN_W, d: 72, r: 1.6 };
  const out = [S(k.slabOf(shell, 0, CONN_H, P, 3, 0.6), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(shell, 2), CONN_H, P, 3), { tone: "faint" }));
  out.push(D([at([x + CONN_W / 2, -31, CONN_H]), at([x + CONN_W / 2, 31, CONN_H])], { size: 0.5 }));
  if (side < 0) {
    // The mouth faces +x, toward the viewer: two closed slot outlines on that face, one per sub-link.
    const fx = x + CONN_W;
    for (const ch of [FAR, NEAR]) {
      const ring = [[fx, ch.y, 0.4], [fx, ch.y + ch.d, 0.4], [fx, ch.y + ch.d, CHAN_H + FLIT_H + 1.4], [fx, ch.y, CHAN_H + FLIT_H + 1.4]];
      out.push(L(k.segment(ring[0], ring[1], P) + k.segment(ring[1], ring[2], P) + k.segment(ring[2], ring[3], P) + k.segment(ring[3], ring[0], P), { tone: "lo" }));
    }
    out.push(k.faceTextSvg(k.sideMatrix([fx, 0], CONN_H - 3.6, P, "right"), "NVLINK", { size: 2.2, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}

function channel(ch) {
  const plan = { x: -CONN_X, y: ch.y, w: CONN_X * 2, d: ch.d, r: 0.6 };
  return S(k.slabOf(plan, 0, CHAN_H, P, 2, 0.4), { tone: "lo" });
}

// Lane traces on a channel top, one set per lane count; the page shows the set for the chosen generation.
const laneYs = (ch, n) => Array.from({ length: n }, (_, i) => ch.y + 2 + (ch.d - 4) * (i + 0.5) / n);
function lanes(ch, name) {
  return [8, 4, 2]
    .map((n) => `<g data-lanes="${name}-${n}">${L(laneYs(ch, n).map((y) => k.lineOnTop([-CONN_X, y], [CONN_X, y], CHAN_H, P)).join(""), { tone: "mid" })}</g>`)
    .join("");
}

function spine() {
  const rail = { x: -CONN_X, y: -4, w: CONN_X * 2, d: 8, r: 1 };
  const out = [S(k.slabOf(rail, 0, 3.4, P, 3, 0.4), { tone: "mid" })];
  const ticks = k.topTicks(-CONN_X + 4, CONN_X - 4, 4, 5, -3.2, 3.4, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([-CONN_X + 2, CONN_X - 2].map((x) => at([x, 2, 3.4])), { size: 0.45 }));
  return out.join("");
}

function rack() {
  const out = [`<path class="iso-halo" d="${k.haloOf(RACK, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(RACK, 0, RACK_H, P, 3, 0.6), { tone: "mid" }));
  out.push(L(PEGS.map(([x, y]) => k.ring(x, y, PEG_R + 0.6, RACK_H, P, 16)).join(""), { tone: "lo" }));
  out.push(D([at([RACK.x + 2.4, RACK.y + 2.4, RACK_H]), at([RACK.x + RACK.w - 2.4, RACK.y + RACK.d - 2.4, RACK_H])], { size: 0.45 }));
  return out.join("");
}

const pegSvg = (i) => {
  const [x, y] = PEGS[i];
  return `<g data-peg="${i}">${S(k.cylinder(x, y, PEG_R, RACK_H, PEG_H, P, 18), { tone: "hi", crease: "lo" })}${L(k.ring(x, y, 0.9, RACK_H + PEG_H, P, 10), { tone: "lo" })}</g>`;
};

function labelPlate() {
  const plan = { x: 66, y: 60, w: 40, d: 12, r: 1 };
  const out = [S(k.slabOf(plan, 0, 0.8, P, 3), { tone: "lo", crease: "none" })];
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(L([[26, 63.6], [18, 66], [22, 68.4]].map(([w, y]) => k.lineOnTop([plan.x + 6, y], [plan.x + 6 + w, y], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([plan.x + 3, plan.y + 6, 0.8]), at([plan.x + plan.w - 3, plan.y + 6, 0.8])], { size: 0.45 }));
  return out.join("");
}

// Generation selector: a base disc with five detents across 180°, and a knurled knob with a pointer.
const DETENT = (g) => -Math.PI / 2 + (g / 4) * Math.PI;
function knob() {
  const [x, y] = KNOB;
  const out = [S(k.cylinder(x, y, 11, 0, 2, P, 48), { tone: "lo" })];
  const t = k.radialTicks(x, y, 10.4, 5, 1, 2, [0.1, 2.6], P, DETENT(0), Math.PI * 1.25);
  out.push(L(t.major, { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 6, 2, 5, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(x, y, 6, 2, 7, 36, P), { tone: "lo" }));
  out.push(L(k.ring(x, y, 1.4, 7, P, 14), { tone: "mid" }));
  return out.join("");
}
const pointerAt = (angle) => k.lineOnTop([KNOB[0] + Math.sin(angle) * 1.4, KNOB[1] - Math.cos(angle) * 1.4], [KNOB[0] + Math.sin(angle) * 5.6, KNOB[1] - Math.cos(angle) * 5.6], 7, P);

const flitSvg = (n) => {
  const plan = { x: -FLIT_W / 2, y: NEAR.y + 1, w: FLIT_W, d: NEAR.d - 2, r: 0.8 };
  const cuts = Array.from({ length: n - 1 }, (_, i) => NEAR.y + 2 + (NEAR.d - 4) * (i + 1) / n);
  return S(k.slabOf(plan, CHAN_H, FLIT_H, P, 2, 0.4), {
    tone: "hi",
    lit: true,
    inner: L(cuts.map((y) => k.lineOnTop([plan.x, y], [plan.x + plan.w, y], CHAN_H + FLIT_H, P)).join(""), { tone: "lo" }),
  });
};
const badSvg = () => {
  const plan = { x: -FLIT_W / 2, y: NEAR.y + 1, w: FLIT_W, d: NEAR.d - 2, r: 0.8 };
  const z = CHAN_H + FLIT_H, a = [plan.x + 1, plan.y + 1], b = [plan.x + plan.w - 1, plan.y + plan.d - 1];
  return S(k.slabOf(plan, CHAN_H, FLIT_H, P, 2, 0.4), {
    tone: "lo",
    inner: L(k.lineOnTop(a, b, z, P) + k.lineOnTop([a[0], b[1]], [b[0], a[1]], z, P), { tone: "red", free: true }),
  });
};
const creditSvg = () => S(k.cylinder(0, FAR.y + FAR.d / 2, 3.4, CHAN_H, 2.4, P, 20), { tone: "mid" });
const nakSvg = () => S(k.slabOf({ x: -4, y: FAR.y + 3, w: 8, d: FAR.d - 6, r: 1 }, CHAN_H, 5, P, 2, 0.4), { tone: "hi", crease: "lo" });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Two GPUs on a bench, each a die with six memory stacks on a board, joined by an NVLink connector with two channels. On the near channel, blocks called flits slide from GPU 0 to GPU 1, each one spread across every lane of the channel. On the far channel, credit tokens return to GPU 0, which may only send while it still holds a credit peg in the rack in front of it. A corrupted flit is dropped by GPU 1 and resent from GPU 0's replay buffer.",
  body: [
    plate(),
    gpu(-1),
    connector(-1),
    channel(FAR),
    lanes(FAR, "far"),
    `<g data-layer="tokens"></g>`,
    spine(),
    channel(NEAR),
    lanes(NEAR, "near"),
    `<g data-layer="flits"></g>`,
    connector(1),
    gpu(1),
    rack(),
    `<g data-layer="pegs">${PEGS.map((_, i) => pegSvg(i)).join("")}</g>`,
    labelPlate(),
    knob(),
    `<path data-part="pointer" class="iso-line" data-tone="hi" data-free="end" d="${pointerAt(DETENT(3))}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const GENS = ${JSON.stringify(GENS)};
const NEAR = ${JSON.stringify(NEAR)}, FAR = ${JSON.stringify(FAR)}, KNOB = ${JSON.stringify(KNOB)};
const FLIT_W = ${FLIT_W}, FLIT_H = ${FLIT_H}, CHAN_H = ${CHAN_H}, TRAVEL = ${JSON.stringify(TRAVEL)};
const PEG_COUNT = ${PEGS.length};
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
const flitSvg = ${flitSvg.toString()};
const badSvg = ${badSvg.toString()};
const ARRIVE = ${CONN_X - FLIT_W / 2 - 0.5};
const creditSvg = ${creditSvg.toString()};
const nakSvg = ${nakSvg.toString()};
const DETENT = ${DETENT.toString()};
const pointerAt = ${pointerAt.toString()};
const k = { slabOf, cylinder, lineOnTop };

const FLIGHT = 1.4;          // seconds a flit or token spends on the wire (stands in for wire + SerDes latency)
const DRAIN = 0.25;          // seconds GPU 1 holds a flit before freeing its buffer slot and returning the credit
const VISUAL = 10;           // GB/s per flit/s: the figure sends gbs / 10 flits a second
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const flitLayer = svg.querySelector('[data-layer="flits"]');
const tokenLayer = svg.querySelector('[data-layer="tokens"]');
const pegEls = [...svg.querySelectorAll("[data-peg]")];
const pointer = svg.querySelector('[data-part="pointer"]');
const laneSets = [...svg.querySelectorAll("[data-lanes]")];
const readout = document.querySelector("[data-readout]");
const buttons = [...document.querySelectorAll("[data-gen]")];
const errorButton = document.querySelector("[data-error]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

let g = 3, flitMarkup = flitSvg(GENS[g].lanes);
let credits = PEG_COUNT, sendClock = 0, replayDue = 0, recovering = false, corruptNext = false;
let replays = 0, delivered = 0, stalled = false, droppedSinceError = 0;
let flits = [], tokens = [], pending = [];
const pegShown = new Array(PEG_COUNT).fill(1);
let knobAngle = DETENT(g);

const lerp = (a, b, t) => a + (b - a) * t;
const fadeAt = (x, dir) => {
  const from = dir > 0 ? TRAVEL[0] : TRAVEL[1] - 2, to = dir > 0 ? TRAVEL[1] : TRAVEL[0];
  const s = (x - from) / (to - from);
  return Math.min(1, s / 0.06, dir > 0 ? 1 : (1 - s) / 0.06);
};

function makeEl(layer, markup) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
  el.innerHTML = markup;
  layer.appendChild(el);
  return el;
}

function send(kind) {
  const el = makeEl(flitLayer, flitMarkup);
  const flit = { x: TRAVEL[0], el, bad: corruptNext && kind === "new", replay: kind === "replay", doomed: false, fade: 1 };
  if (flit.bad) { corruptNext = false; el.innerHTML = badSvg(); }
  flits.push(flit);
}
function sendToken(kind) {
  tokens.push({ x: TRAVEL[1] - 2, kind, el: makeEl(tokenLayer, kind === "nak" ? nakSvg() : creditSvg()) });
}

function arrive(flit) {
  if (flit.bad) {
    // CRC check fails: drop it, ask for a replay, and drop everything behind it until the replay arrives.
    recovering = true;
    sendToken("nak");
    return false;
  }
  if (flit.doomed) return false;
  if (recovering && !flit.replay) { droppedSinceError++; return false; }
  if (flit.replay) recovering = false;
  delivered++;
  pending.push(DRAIN);
  return true;
}

function step(dt) {
  const gen = GENS[g];
  const speed = (TRAVEL[1] - TRAVEL[0]) / FLIGHT;
  sendClock += dt;
  const gap = VISUAL / gen.gbs;
  stalled = false;
  while (sendClock >= gap) {
    if (replayDue > 0) { replayDue--; replays++; send("replay"); sendClock -= gap; }
    else if (credits > 0) { credits--; send("new"); sendClock -= gap; }
    else { stalled = true; sendClock = gap; break; }
  }
  for (const flit of flits) {
    // At GPU 1's mouth the CRC is checked: a good flit slides on in, a dropped one stops there and fades.
    if (!flit.checked && flit.x + speed * dt >= ARRIVE) { flit.checked = true; flit.ok = arrive(flit); if (!flit.ok) { flit.x = ARRIVE; flit.done = true; } }
    if (flit.done) flit.fade -= dt / 0.7;
    else { flit.x += speed * dt; if (flit.x >= TRAVEL[1]) { flit.done = true; flit.fade = 0; } }
  }
  flits = flits.filter((flit) => {
    if (flit.done && flit.fade <= 0) { flit.el.remove(); return false; }
    return true;
  });
  pending = pending.map((t) => t - dt).filter((t) => { if (t <= 0) { sendToken("credit"); return false; } return true; });
  for (const token of tokens) token.x -= speed * dt;
  tokens = tokens.filter((token) => {
    if (token.x > TRAVEL[0] - 2) return true;
    token.el.remove();
    if (token.kind === "credit") credits = Math.min(PEG_COUNT, credits + 1);
    else {
      // Go back: replay the bad flit and every flit sent after it. In-flight ones will be dropped on arrival.
      const inFlight = flits.filter((f) => !f.checked && !f.replay);
      inFlight.forEach((f) => { f.doomed = true; });
      replayDue += 1 + inFlight.length + droppedSinceError;
      droppedSinceError = 0;
    }
    return false;
  });
}

function draw(dt, calm) {
  for (const flit of flits) {
    const alpha = flit.done ? Math.max(0, flit.fade) * (flit.bad ? 1 : 0.5) : fadeAt(flit.x, 1);
    flit.el.setAttribute("transform", translateAlong(P, [flit.x, 0, 0]));
    flit.el.setAttribute("opacity", alpha.toFixed(3));
  }
  for (const token of tokens) {
    token.el.setAttribute("transform", translateAlong(P, [token.x, 0, 0]));
    token.el.setAttribute("opacity", fadeAt(token.x, -1).toFixed(3));
  }
  // Pegs: the first \`credits\` pegs stand; spent ones sink out of view.
  for (let i = 0; i < PEG_COUNT; i++) {
    const want = i < credits ? 1 : 0;
    pegShown[i] = calm ? want : pegShown[i] + (want - pegShown[i]) * (1 - Math.exp(-dt / 0.12));
    pegEls[i].setAttribute("opacity", pegShown[i].toFixed(3));
    pegEls[i].setAttribute("transform", translateAlong(P, [0, 0, (pegShown[i] - 1) * 4]));
  }
  knobAngle = calm ? DETENT(g) : knobAngle + (DETENT(g) - knobAngle) * (1 - Math.exp(-dt / 0.2));
  pointer.setAttribute("d", pointerAt(knobAngle));
  const gen = GENS[g];
  const state = recovering || replayDue > 0 ? "replaying" : stalled ? "out of credits" : "credits " + credits + "/" + PEG_COUNT;
  const text = "Gen " + gen.gen + " · " + gen.lanes + "×" + gen.gbps + "G · " + gen.gbs + " GB/s each way · " + state;
  if (readout.textContent !== text) readout.textContent = text;
}

function setGen(next) {
  g = (next + GENS.length) % GENS.length;
  flitMarkup = flitSvg(GENS[g].lanes);
  for (const el of laneSets) el.style.display = el.dataset.lanes.endsWith("-" + GENS[g].lanes) ? "" : "none";
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === g)));
  const gen = GENS[g];
  stage.setAttribute("aria-valuenow", String(gen.gen));
  stage.setAttribute("aria-valuetext", "NVLink " + gen.gen + " (" + gen.gpu + "): " + gen.lanes + " lanes at " + gen.gbps + " Gb/s each way, " + gen.gbs + " GB/s per link per direction, " + gen.links + " links, " + gen.gbs * 2 * gen.links + " GB/s total");
  const total = document.querySelector("[data-total]");
  if (total) total.textContent = "NVLink " + gen.gen + " on " + gen.gpu + ": " + gen.links + " links × " + gen.gbs + " GB/s × 2 directions = " + (gen.gbs * 2 * gen.links).toLocaleString("en-US") + " GB/s per GPU";
}
function corrupt() { corruptNext = true; }

let frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    const before = clock;
    clock += dt;
    if (Math.floor(clock / 7) !== Math.floor(before / 7)) setGen(g + 1);
    if (Math.floor((clock - 1.2) / 7) !== Math.floor((before - 1.2) / 7)) corrupt();
  }
  if (!calm) step(dt);
  draw(dt, calm);
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } else if (still.matches) draw(0, true); };
const touched = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0.01; run(); }, 9000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
buttons.forEach((b, i) => b.addEventListener("click", () => { setGen(i); touched(); }));
errorButton.addEventListener("click", () => { corrupt(); touched(); });
stage.addEventListener("click", () => { corrupt(); touched(); });
stage.addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "5") setGen(Number(event.key) - 1);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") setGen(Math.min(4, g + 1));
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setGen(Math.max(0, g - 1));
  else if (event.key === "Home") setGen(0);
  else if (event.key === "End") setGen(4);
  else if (event.key === "e" || event.key === "E" || event.key === " " || event.key === "Enter") corrupt();
  else return;
  event.preventDefault();
  touched();
});
if (still.matches) {
  // One still frame: a train of flits on the wire and two credits on their way back.
  for (const x of [-30, -6, 18, 42]) { const el = makeEl(flitLayer, flitMarkup); flits.push({ x, el, fade: 1 }); }
  for (const x of [-20, 30]) sendToken("credit"), (tokens[tokens.length - 1].x = x);
  credits = 10;
}
setGen(g);
draw(1, true);
`;

const controls = `<div class="nv-controls" role="group" aria-label="NVLink generation">
${GENS.map((gen, i) => `<button type="button" data-gen="${i}" aria-pressed="${i === 3}">NVLink ${gen.gen}<span>${gen.gpu}</span></button>`).join("")}
<button type="button" data-error>Inject bit error</button>
</div>
<p class="nv-total" data-total></p>`;

const css = `
.nv-controls{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px}
.nv-controls button{font:inherit;font-size:12px;line-height:1.2;padding:6px 10px;border-radius:6px;border:1px solid var(--anatomy-faint);background:transparent;color:var(--anatomy-muted);cursor:pointer;display:flex;flex-direction:column;align-items:flex-start}
.nv-controls button span{font-size:10px;opacity:.7}
.nv-controls button[aria-pressed="true"]{color:var(--anatomy-text);border-color:var(--anatomy-muted)}
.nv-controls button[data-error]{margin-left:auto;justify-content:center}
.nv-controls button:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:3px}
.nv-total{font-size:12px;color:var(--anatomy-muted);margin:6px 0 0;font-variant-numeric:tabular-nums}
@media (max-width:480px){.nv-controls button[data-error]{margin-left:0}}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "One NVLink link",
  hint: "Tap the link to corrupt a flit",
  readout: "Gen 4 · 2×100G · 25 GB/s each way · credits 16/16",
  keys: [
    { mark: "lit", label: "Flits: each one striped across every lane of the GPU 0 → GPU 1 sub-link" },
    { mark: "raised", label: "Credit pegs: free receive-buffer slots at GPU 1, as GPU 0 counts them" },
    { mark: "flat", label: "Far channel: credits (round) and replay requests (tall) going back" },
    { mark: "red", label: "A flit hit by a bit error: its CRC fails at GPU 1" },
  ],
  caption:
    "A link is two one-way sub-links. GPU 0 spends a credit for every flit it sends and stops when it has none; GPU 1 returns a credit when it frees the buffer slot. A flit that fails its CRC is dropped along with everything behind it, and GPU 0 resends them from its replay buffer. Lane counts and rates are real per generation; the 16 credits, the flight time and the flit rate (1 flit/s per 10 GB/s) are slowed down to watch.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="One NVLink link between two GPUs. Keys 1 to 5 or arrows pick the generation; E, Space or a tap corrupts the next flit" aria-valuemin="1" aria-valuemax="5" aria-valuenow="4" style="touch-action:pan-y;cursor:pointer">${svg}</div>${controls}`,
});

const file = theme === "light" ? "nvlink-light.html" : "nvlink.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "NVLink link", theme, body: `<style>${css}</style>` + body, script: kitScript() + live }));
console.log("wrote", file);

// Hosted-page version: no document skeleton of its own, and it follows the viewer's light/dark theme.
if (theme === "dark") {
  const themeSync = `
const nvRoot = document.getElementById("nv");
const prefersLight = matchMedia("(prefers-color-scheme: light)");
const applyTheme = () => {
  const chosen = document.documentElement.dataset.theme;
  nvRoot.dataset.theme = (chosen ? chosen === "light" : prefersLight.matches) ? "light" : "dark";
};
applyTheme();
prefersLight.addEventListener("change", applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
`;
  const pageCss = `
:root{--nv-page:#0b0b0b;color-scheme:dark}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--nv-page:#f2f2ef;color-scheme:light}}
:root[data-theme="light"]{--nv-page:#f2f2ef;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--nv-page)}
#nv{min-height:100%;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px));padding-block:32px 64px}
#nv .iso-page{width:min(650px,100%);margin:0 auto}
`;
  const page = `<title>NVLink Link Bench</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${pageCss}${k.ISO_CSS}${css}</style>
<div class="iso" id="nv" data-theme="dark"><main class="iso-page">${body}</main></div>
<script type="module">${(themeSync + kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>
`;
  writeFileSync(join(HERE, "nvlink-artifact.html"), page);
  console.log("wrote nvlink-artifact.html");
}
