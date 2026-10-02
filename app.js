import contextData from "./data/context-data.js?v=atlas-21";
import { LANES, ERAS, ERA_SOURCES, WORLD, HARDWARE, RHYMES, ACTORS, REGIONS, MISSING_TOPICS, TOURS } from "./data/curated.js?v=atlas-21";

// The vault export changes daily; an hourly query string keeps returning visitors off stale copies.
const { default: timelinePayload } = await import(`./data/events-data.js?h=${Math.floor(Date.now() / 36e5)}`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ERA_H = 44;
const AXIS_H = 26;
const RUG_H = 14;
const ROW_H = 39;
const CARD_H = 34;
const GAP = 10;
const PAD_R_WIDE = 90;
const MAX_ZOOM = 40;
const LOG_MAX = 28;
const STRIPS = {
  compute: { label: "Training compute", h: 84 },
  countries: { label: "Notable models by country", h: 56 },
  world: { label: "World", h: 48 },
  hardware: { label: "Hardware", h: 48 },
  coverage: { label: "Vault coverage", h: 56 },
  actors: { label: "Actors in the vault", h: 24 + ACTORS.length * 13 }
};
const STRIP_ORDER = ["compute", "countries", "world", "hardware", "coverage", "actors"];
const MODE_STRIPS = {
  explore: ["compute", "world"],
  read: ["compute", "world"],
  analyze: ["compute", "countries", "world", "hardware", "coverage", "actors"]
};
const REGION_COLORS = { US: "var(--r-us)", China: "var(--r-cn)", UK: "var(--r-uk)", Europe: "var(--r-eu)", Other: "var(--r-other)" };
const GLOSSARY = {
  "Agenda Control": "The power to define which questions, metrics, or futures count as legitimate.",
  "Black Box": "A system whose inputs and outputs are visible while its internal workings become socially opaque.",
  "Closure": "The process by which disagreement narrows enough that a technology or interpretation seems settled.",
  "Co-production": "The mutual making of technical systems and social order.",
  "Interpretative Flexibility": "The same artifact can mean different things to different relevant groups.",
  "Naturalization": "A made choice starts to look inevitable, neutral, or simply how things are.",
  "Path Dependence": "Early choices constrain later possibilities even when alternatives remain imaginable.",
  "Relevant Social Groups": "The groups whose interpretations of an artifact shape what it becomes.",
  "Script": "A design or rule that imagines and steers users toward particular behavior.",
  "System Builders": "Actors who assemble technical, institutional, financial, and cultural pieces into a working system.",
  "Technological Frame": "A group's shared assumptions, problems, examples, and standards for judging a technology.",
  "Technological Momentum": "A system becomes harder to redirect as institutions and habits accumulate around it.",
  "Public Interest": "The claim that technical choices should be accountable to publics beyond builders and owners."
};

const els = Object.fromEntries([
  "mastCount", "modeTabs", "search", "filtersBtn", "filtersPop", "menuBtn", "menuPop", "laneFilters", "lensSelect",
  "weekSelect", "weekField", "analysisLens", "landmarksOnly", "newOnly", "resetFilters", "syncTime", "stage", "tourPanel",
  "chart", "toolbar", "eraNow", "rangeNow", "countNow", "activeChips", "analyzeTools", "rhymeSelect", "coverageBtn",
  "sliceBtn", "zoomOut", "zoomRange", "zoomIn", "fitBtn", "scaleBtn", "viewport", "head", "eraLabels", "gridLayer", "gutterHead", "canvas", "eraLayer", "axisLayer",
  "laneLayer", "lineageLayer", "cardLayer", "stripLayer", "sliceLayer", "gutter", "gutterInner", "overview",
  "overviewEras", "overviewRug", "overviewWindow", "drawer", "hover", "listView", "stripToggles"
].map((id) => [id, document.getElementById(id)]));

const laneOfType = new Map(LANES.flatMap((lane) => lane.types.map((type) => [type, lane])));
const glossaryKey = new Map(Object.keys(GLOSSARY).map((term) => [term.toLowerCase(), term]));

const state = {
  mode: "explore",
  W: 1000,
  scale: "activity",
  query: "",
  hiddenLanes: new Set(),
  lens: "",
  week: "",
  analysisLens: "",
  landmarksOnly: false,
  newOnly: false,
  strips: new Set(MODE_STRIPS.explore),
  selected: null,
  drawer: null,
  showNote: false,
  slice: null,
  rhyme: "",
  actor: "",
  tour: null,
  step: 0,
  listView: false
};

let EVENTS = [];
let byId = new Map();
let scale = [];
let layout = { cards: new Map(), lanes: [], strips: [], height: 0 };
let flight = 0;
let flying = false;

// ---------- formatting ----------

function esc(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function excerpt(text = "", limit = 220) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, end > limit * 0.6 ? end + (cut[end] === "." ? 1 : 0) : limit).trim()}…`;
}

function firstSentences(text = "", count = 2, limit = 420) {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["”’)]*\s*/g) || [text];
  return excerpt(sentences.slice(0, count).join("").trim(), limit);
}

function displayDate(event) {
  if (!event.date) return event.yearLabel;
  const [y, m, d] = event.date.split("-").map(Number);
  if (!m) return String(y);
  return d ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`;
}

function shortDate(event) {
  if (!event.date) return event.yearLabel;
  const [y, m] = event.date.split("-").map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}

const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
function pow10(exp) {
  return `10${String(exp).split("").map((c) => SUP[c]).join("")}`;
}

function fmtFlop(log) {
  const exp = Math.floor(log);
  const mant = 10 ** (log - exp);
  return `${mant >= 9.95 ? "1" : mant.toFixed(1).replace(/\.0$/, "")}×${pow10(mant >= 9.95 ? exp + 1 : exp)} FLOP`;
}

function yearLabel(t) {
  const y = Math.floor(t + 1e-6);
  const m = Math.round((t - y) * 12);
  return m > 0 && m < 12 ? `${MONTHS[m]} ${y}` : String(Math.round(t));
}

const measureCtx = document.createElement("canvas").getContext("2d");
const measureCache = new Map();
const FONTS = {};

function loadFonts() {
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue("--serif").trim();
  const sans = css.getPropertyValue("--sans").trim();
  Object.assign(FONTS, {
    landmark: `600 15.2px ${serif}`,
    standard: `13.1px ${serif}`,
    minor: `12.5px ${serif}`,
    era: `italic 600 16px ${serif}`,
    mark: `10.5px ${sans}`
  });
}

function textW(text, font) {
  const key = `${font}|${text}`;
  if (!measureCache.has(key)) {
    measureCtx.font = font;
    measureCache.set(key, measureCtx.measureText(text).width);
  }
  return measureCache.get(key);
}

// ---------- data preparation ----------

function decimalFromDate(date) {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
}

function sectionMap(event) {
  return Object.fromEntries((event.vaultNote?.sections || []).map((section) => [section.id, section]));
}

function firstBullet(text = "") {
  const line = text.split(/\n(?=- )/)[0].replace(/^- /, "").trim();
  const match = line.match(/^((?:[A-Z][A-Za-z-]*|of|and|the)(?: (?:[A-Z][A-Za-z-]*|of|and|the)){0,3}):\s*(.+)$/s);
  return match ? { concept: match[1], text: match[2] } : { concept: "", text: line };
}

function prepare(raw) {
  const sections = sectionMap(raw);
  const lane = laneOfType.get(raw.type) || LANES[0];
  const t = raw.date ? decimalFromDate(raw.date) : raw.startYear + (raw.endYear > raw.startYear ? 0 : 0.5);
  const tEnd = raw.endYear > raw.startYear ? raw.endYear + 1 : null;
  const scot = sections["social-history-scot-notes"] || sections["social-history-scot"];
  const why = sections["why-this-matters"] || sections["place-in-the-ai-story"];
  const core = sections["core-claim"]?.text || raw.summary || "";
  const complication = scot ? firstBullet(scot.text) : null;
  const centrality = Number(raw.centrality || 0);
  const tier = centrality >= 14 ? "landmark" : centrality >= 8 ? "standard" : "minor";
  const text = [raw.title, raw.summary, core, sections["ai-history-notes"]?.text, why?.text].join(" ");
  return {
    ...raw,
    lane,
    t,
    tEnd,
    tier,
    centrality,
    sections,
    story: firstSentences(core, 2, 460),
    complication: complication && { concept: complication.concept, text: firstSentences(complication.text, 2, 440) },
    why: why?.text || "",
    lineageHtml: sections["historical-references-and-lineages"]?.html || "",
    searchText: [raw.title, raw.yearLabel, raw.type, lane.name, raw.summary, raw.sourceNote, core, ...(raw.concepts || [])].join(" ").toLowerCase(),
    actorText: text,
    regionText: [raw.title, raw.summary, core].join(" "),
    gap: raw.status === "gap" || /^gap\b/i.test(raw.title)
  };
}

function buildActors() {
  for (const actor of ACTORS) {
    const pattern = new RegExp(actor.pattern);
    actor.events = EVENTS.filter((event) => pattern.test(event.actorText)).sort((a, b) => a.t - b.t);
  }
}

const MODELS = contextData.models;
const FRONTIER = (() => {
  let best = -Infinity;
  return MODELS.filter((model) => (model.log > best ? (best = model.log, true) : false));
})();

function frontierAt(t) {
  let found = null;
  for (const model of FRONTIER) {
    if (model.t <= t) found = model;
    else break;
  }
  return found;
}

// ---------- time scale ----------
// Eras get width by a blend of their length and how many events they hold, so dense decades are readable.

function buildScale() {
  const totalYears = ERAS.at(-1).end - ERAS[0].start;
  const counts = ERAS.map((era) => EVENTS.filter((event) => event.t >= era.start && event.t < era.end).length);
  const softCounts = counts.map((count) => Math.max(1, count) ** 0.7);
  const softTotal = softCounts.reduce((a, b) => a + b, 0);
  let cursor = 0;
  scale = ERAS.map((era, i) => {
    const years = era.end - era.start;
    const weight = state.scale === "even" ? years / totalYears : 0.2 * (years / totalYears) + 0.8 * (softCounts[i] / softTotal);
    const seg = { era, start: era.start, end: era.end, f0: cursor, w: weight, count: counts[i] };
    cursor += weight;
    return seg;
  });
}

function gutterW() {
  return window.matchMedia("(max-width: 760px)").matches ? 92 : 172;
}

function padR() {
  return window.matchMedia("(max-width: 760px)").matches ? 36 : PAD_R_WIDE;
}

function padL() {
  return gutterW() + 24;
}

function frac(year) {
  const first = scale[0];
  const last = scale.at(-1);
  if (year <= first.start) return 0;
  if (year >= last.end) return 1;
  const seg = scale.find((s) => year >= s.start && year < s.end) || last;
  return seg.f0 + seg.w * ((year - seg.start) / (seg.end - seg.start));
}

function fracToYear(f) {
  const seg = scale.find((s) => f >= s.f0 && f < s.f0 + s.w) || (f <= 0 ? scale[0] : scale.at(-1));
  const local = Math.max(0, Math.min(1, (f - seg.f0) / seg.w));
  return seg.start + local * (seg.end - seg.start);
}

function x(year) {
  return padL() + state.W * frac(year);
}

function yearAt(px) {
  return fracToYear((px - padL()) / state.W);
}

function eraAt(year) {
  return ERAS.find((era) => year >= era.start && year < era.end) || ERAS.at(-1);
}

function fitW() {
  return Math.max(160, els.viewport.clientWidth - padL() - padR());
}

function clampW(w) {
  return Math.max(fitW(), Math.min(fitW() * MAX_ZOOM, w));
}

// ---------- filtering & focus ----------

function visibleEvents() {
  const query = state.query.trim().toLowerCase();
  return EVENTS.filter((event) => {
    if (state.hiddenLanes.has(event.lane.id)) return false;
    if (query && !event.searchText.includes(query)) return false;
    if (state.week && event.week !== state.week) return false;
    if (state.landmarksOnly && event.tier !== "landmark") return false;
    if (state.newOnly && !event.isNew) return false;
    if (state.analysisLens) {
      if (state.analysisLens === "governance" ? !event.facets?.governance : !(event.facets?.[state.analysisLens] || []).length) return false;
    }
    return true;
  });
}

function connected(id) {
  const event = byId.get(id);
  const ids = new Set([...(event?.links || []), ...(event?.backlinks || [])]);
  for (const other of EVENTS) if ((other.links || []).includes(id)) ids.add(other.id);
  ids.delete(id);
  return [...ids].map((key) => byId.get(key)).filter(Boolean).sort((a, b) => a.t - b.t);
}

function highlightIds() {
  if (state.mode === "read" && state.tour) return new Set(tourStep()?.ids || []);
  if (state.rhyme) return new Set(RHYMES.find((r) => r.id === state.rhyme)?.ids || []);
  if (state.actor) return new Set(ACTORS.find((a) => a.id === state.actor)?.events.map((e) => e.id) || []);
  if (state.lens) return new Set(EVENTS.filter((e) => (e.allConcepts || e.concepts || []).includes(state.lens)).map((e) => e.id));
  return null;
}

function focusOf(event, highlight, lineage) {
  if (state.selected) {
    if (event.id === state.selected) return "is-selected";
    if (lineage.has(event.id)) return byId.get(state.selected).t > event.t ? "is-earlier" : "is-later";
    return "is-dim";
  }
  if (highlight) return highlight.has(event.id) ? "is-hl" : "is-dim";
  return "";
}

// ---------- layout ----------

function laneHeightFor(rows) {
  return RUG_H + 6 + rows * ROW_H - (ROW_H - CARD_H);
}

// Vertical budget: lanes keep two card rows first, strips shrink to fit, and strips fold away
// only when the drawer leaves too little room; the canvas scrolls vertically as a last resort.
function computeMetrics() {
  const vh = els.viewport.clientHeight;
  const lanes = LANES.filter((lane) => !state.hiddenLanes.has(lane.id));
  const top = ERA_H + AXIS_H;
  const avail = vh - top - 10;
  const fixed = (id) => id === "actors";
  let strips = STRIP_ORDER.filter((id) => state.strips.has(id));
  const pref = (list) => list.reduce((sum, id) => sum + STRIPS[id].h, 0);
  const minTwoRows = lanes.length * laneHeightFor(2);
  let k = 1;
  const analyze = state.mode === "analyze";
  if (!analyze && avail - pref(strips) < minTwoRows) {
    const flexible = pref(strips.filter((id) => !fixed(id)));
    k = Math.max(0.7, (avail - minTwoRows - pref(strips.filter(fixed))) / Math.max(1, flexible));
    const shrunk = strips.reduce((sum, id) => sum + (fixed(id) ? STRIPS[id].h : STRIPS[id].h * k), 0);
    const mustFold = avail - shrunk < lanes.length * laneHeightFor(1) + 20 || (state.drawer && avail - shrunk < minTwoRows);
    if (mustFold) strips = [];
  }
  const stripH = (id) => Math.round(fixed(id) ? STRIPS[id].h : STRIPS[id].h * k);
  const stripsH = strips.reduce((sum, id) => sum + stripH(id), 0);
  const laneH = Math.max(laneHeightFor(analyze ? 2 : 1), Math.floor((avail - stripsH) / Math.max(1, lanes.length)));
  let y = top;
  const laneBoxes = lanes.map((lane) => {
    const box = { lane, top: y, h: laneH, rows: Math.max(1, Math.floor((laneH - RUG_H - 6 + (ROW_H - CARD_H)) / ROW_H)) };
    y += laneH;
    return box;
  });
  const lanesBottom = y;
  const stripBoxes = strips.map((id) => {
    const box = { id, top: y, h: stripH(id) };
    y += box.h;
    return box;
  });
  const folded = STRIP_ORDER.filter((id) => state.strips.has(id)).length - strips.length;
  return { laneBoxes, stripBoxes, lanesBottom, folded, height: Math.max(vh, y + 10) };
}

// Width follows the measured title so short titles pack tightly and long ones are capped.
function singleWidth(event) {
  const [min, max] = event.tier === "landmark" ? [120, 268] : event.tier === "standard" ? [96, 226] : [86, 186];
  return Math.round(Math.min(max, Math.max(min, textW(event.title, FONTS[event.tier]) + 26)));
}

function cardSize(event, rows) {
  if (event.tier === "landmark" && rows >= 3) return { w: 240, span: 2 };
  return { w: singleWidth(event), span: 1 };
}

function layoutLane(box, events, priority) {
  const occupancy = Array.from({ length: box.rows }, () => []);
  const placed = [];
  const overflow = [];
  const free = (row, left, right) => occupancy[row].every(([a, b]) => right <= a || left >= b);
  const order = [...events].sort((a, b) => priority(b) - priority(a) || a.t - b.t);
  for (const event of order) {
    const left = x(event.t);
    let { w, span } = cardSize(event, box.rows);
    let row = -1;
    const fits = (s) => {
      for (let r = box.rows - 1; r >= s - 1; r -= 1) {
        let ok = true;
        for (let k = 0; k < s; k += 1) if (!free(r - k, left - 2, left + w + GAP)) ok = false;
        if (ok) return r;
      }
      return -1;
    };
    row = fits(span);
    if (row === -1 && span === 2) {
      span = 1;
      w = singleWidth(event);
      row = fits(1);
    }
    if (row === -1) {
      overflow.push(event);
      continue;
    }
    for (let k = 0; k < span; k += 1) occupancy[row - k].push([left - 2, left + w + GAP]);
    const top = box.top + 5 + (row - span + 1) * ROW_H;
    const h = span === 2 ? ROW_H + CARD_H : CARD_H;
    placed.push({ event, left, top, w, h, span, drop: box.top + box.h - RUG_H - (top + h) });
  }
  const clusters = [];
  for (const event of overflow.sort((a, b) => a.t - b.t)) {
    const px = x(event.t);
    const last = clusters.at(-1);
    if (last && px - last.x1 < 28 && px - last.x0 < 56) {
      last.events.push(event);
      last.x1 = px;
    } else clusters.push({ events: [event], x0: px, x1: px });
  }
  return { placed, clusters };
}

function computeLayout(events) {
  const metrics = computeMetrics();
  const highlight = highlightIds();
  const lineage = new Set(state.selected ? connected(state.selected).map((e) => e.id) : []);
  const priority = (event) => (event.id === state.selected ? 1e7 : 0)
    + (lineage.has(event.id) ? 1e6 : 0)
    + (highlight?.has(event.id) ? 1e5 : 0)
    + event.centrality * 100 - (event.gap ? 1e4 : 0);
  const cards = new Map();
  const lanes = metrics.laneBoxes.map((box) => {
    const laneEvents = events.filter((event) => event.lane.id === box.lane.id);
    const { placed, clusters } = layoutLane(box, laneEvents, priority);
    for (const item of placed) cards.set(item.event.id, item);
    return { ...box, events: laneEvents, placed, clusters };
  });
  layout = { ...metrics, lanes, cards, highlight, lineage };
}

// ---------- rendering: canvas ----------

function renderEras() {
  const h = layout.height;
  const parts = [];
  const labels = [];
  scale.forEach((seg, i) => {
    const x0 = x(seg.start);
    const x1 = x(seg.end);
    const winter = seg.era.id.startsWith("winter");
    parts.push(`<div class="era-bg ${winter ? "is-winter" : i % 2 ? "is-alt" : ""}" style="left:${x0}px;width:${x1 - x0}px;height:${h}px"></div>`);
    if (i > 0) parts.push(`<div class="era-edge" style="left:${x0}px;height:${h}px"></div>`);
    const room = x1 - x0 - 12;
    const name = textW(seg.era.name, FONTS.era) <= room ? seg.era.name : textW(seg.era.short, FONTS.era) <= room ? seg.era.short : "";
    labels.push(`<button class="era-label ${winter ? "is-winter" : ""}" type="button" data-era="${seg.era.id}" data-x0="${x0}" data-x1="${x1}" title="${esc(`${seg.era.name}, ${seg.era.start}–${seg.era.end === 2030 ? "present" : seg.era.end}`)}" style="left:${x0 + 6}px;max-width:${Math.max(14, room)}px">
      <b>${esc(name)}</b>${room > 62 ? `<span>${seg.era.start}–${seg.era.end === 2030 ? "now" : seg.era.end}</span>` : ""}</button>`);
  });
  els.eraLayer.innerHTML = parts.join("");
  els.eraLabels.innerHTML = labels.join("");
}

function tickStepFor(seg) {
  const ppy = (state.W * seg.w) / (seg.end - seg.start);
  return [1 / 12, 1 / 4, 1 / 2, 1, 2, 5, 10, 20].find((step) => step * ppy >= 62) || 20;
}

function renderAxis() {
  const ticks = [];
  const grid = [];
  const gridH = layout.lanesBottom - ERA_H - AXIS_H;
  const line = (px, strong) => grid.push(`<i class="${strong ? "is-boundary" : ""}" style="left:${px}px;height:${gridH}px"></i>`);
  for (const seg of scale) {
    const step = tickStepFor(seg);
    const minor = step >= 1 && step <= 10 && (state.W * seg.w) / (seg.end - seg.start) * (step / 5) >= 9 ? step / 5 : null;
    const segW = x(seg.end) - x(seg.start);
    ticks.push(`<span class="tick is-boundary" style="left:${x(seg.start)}px">${segW > 34 ? seg.start : ""}</span>`);
    line(x(seg.start), true);
    const first = Math.ceil(seg.start / step - 1e-9) * step;
    for (let t = first; t < seg.end - 1e-9; t += step) {
      const px = x(t);
      if (px - x(seg.start) < 34 || x(seg.end) - px < 30) continue;
      ticks.push(`<span class="tick" style="left:${px}px">${step < 1 ? yearLabel(t) : Math.round(t)}</span>`);
      line(px, false);
    }
    if (minor) {
      for (let t = Math.ceil(seg.start / minor) * minor; t < seg.end; t += minor) {
        if (Math.abs(t / step - Math.round(t / step)) < 1e-6) continue;
        ticks.push(`<span class="tick is-minor" style="left:${x(t)}px"></span>`);
      }
    }
  }
  ticks.push(`<span class="tick is-boundary" style="left:${x(scale.at(-1).end)}px">${scale.at(-1).end}</span>`);
  line(x(scale.at(-1).end), true);
  els.axisLayer.innerHTML = ticks.join("");
  els.gridLayer.innerHTML = grid.join("");
  els.gridLayer.style.top = `${ERA_H + AXIS_H}px`;
}

function renderLanes() {
  const parts = [];
  for (const lane of layout.lanes) {
    const rugTop = lane.top + lane.h - RUG_H;
    parts.push(`<div class="lane lane-${lane.lane.id}" style="top:${lane.top}px;height:${lane.h}px"><div class="rug" style="top:${lane.h - RUG_H}px"></div></div>`);
    for (const event of lane.events) {
      const px = x(event.t);
      if (event.tEnd) {
        parts.push(`<span class="rug-span lane-${lane.lane.id} ${event.gap ? "is-gap" : ""}" style="left:${px}px;width:${Math.max(3, x(event.tEnd) - px)}px;top:${rugTop + 4}px" title="${esc(event.title)}"></span>`);
      }
      parts.push(`<span class="rug-tick lane-${lane.lane.id} ${layout.cards.has(event.id) ? "is-placed" : ""}" style="left:${px}px;top:${rugTop + 2}px"></span>`);
    }
    for (const cluster of lane.clusters) {
      const cx = (cluster.x0 + cluster.x1) / 2;
      if (cluster.events.length === 1) {
        const event = cluster.events[0];
        parts.push(`<button class="pin lane-${lane.lane.id} ${focusOf(event, layout.highlight, layout.lineage)}" type="button" data-id="${esc(event.id)}" aria-label="${esc(`${displayDate(event)}: ${event.title}`)}" style="left:${cx}px;top:${rugTop + 1.5}px"></button>`);
      } else {
        const hl = layout.highlight && cluster.events.some((e) => layout.highlight.has(e.id));
        parts.push(`<button class="cluster lane-${lane.lane.id} ${hl ? "is-hl" : ""}" type="button" data-zoom="${cluster.events[0].t},${cluster.events.at(-1).t}" title="${esc(cluster.events.map((e) => `${shortDate(e)} · ${e.title}`).join("\n"))}" style="left:${cx}px;top:${rugTop + 0.5}px">+${cluster.events.length}</button>`);
      }
    }
  }
  els.laneLayer.innerHTML = parts.join("");
}

function renderCards() {
  const rhyme = RHYMES.find((r) => r.id === state.rhyme);
  const tourIds = state.mode === "read" && state.tour ? tourStep()?.ids || [] : [];
  els.cardLayer.innerHTML = [...layout.cards.values()].map(({ event, left, top, w, h, span, drop }) => {
    const focus = focusOf(event, layout.highlight, layout.lineage);
    const rank = rhyme ? rhyme.ids.indexOf(event.id) + 1 : 0;
    const dek = span === 2 ? `<span class="card-dek">${esc(excerpt(event.story, 120))}</span>` : "";
    return `<button class="card tier-${event.tier} lane-${event.lane.id} ${span === 2 ? "is-tall" : ""} ${focus} ${event.gap ? "is-gap" : ""} ${tourIds.includes(event.id) ? "is-tour" : ""}" type="button" data-id="${esc(event.id)}"
      aria-label="${esc(`${displayDate(event)}: ${event.title}. ${event.lane.name}`)}" aria-pressed="${event.id === state.selected}"
      style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;--drop:${drop}px">
      <span class="card-date">${esc(shortDate(event))}${event.draft ? "" : ""}${event.isNew ? ` <em class="card-new">new</em>` : ""}</span>
      <span class="card-title">${esc(event.title)}</span>${dek}${rank ? `<span class="card-rank">${rank}</span>` : ""}</button>`;
  }).join("");
}

function anchor(event) {
  const card = layout.cards.get(event.id);
  if (card) return { x: card.left, y: card.top + card.h / 2, card: true };
  const lane = layout.lanes.find((l) => l.lane.id === event.lane.id);
  if (!lane) return null;
  return { x: x(event.t), y: lane.top + lane.h - RUG_H + 2, card: false };
}

function curve(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
  const dir = b.x >= a.x ? 1 : -1;
  return `M${a.x} ${a.y} C${a.x + dir * dx} ${a.y} ${b.x - dir * dx} ${b.y} ${b.x} ${b.y}`;
}

function renderLineage() {
  const width = padL() + state.W + padR();
  const paths = [];
  const selected = byId.get(state.selected);
  if (selected) {
    const from = anchor(selected);
    for (const other of connected(selected.id)) {
      if (!layout.lanes.some((l) => l.lane.id === other.lane.id)) continue;
      const to = anchor(other);
      if (!from || !to) continue;
      const earlier = other.t < selected.t;
      paths.push(`<path class="lineage ${earlier ? "is-earlier" : "is-later"}" d="${earlier ? curve(to, from) : curve(from, to)}" marker-end="url(#arrow-${earlier ? "earlier" : "later"})"/>`);
    }
  }
  const rhyme = RHYMES.find((r) => r.id === state.rhyme);
  if (rhyme && !selected) {
    const points = rhyme.ids.map((id) => byId.get(id)).filter(Boolean).map(anchor).filter(Boolean);
    for (let i = 1; i < points.length; i += 1) paths.push(`<path class="rhyme-path" d="${curve(points[i - 1], points[i])}"/>`);
  }
  els.lineageLayer.setAttribute("width", width);
  els.lineageLayer.setAttribute("height", layout.height);
  els.lineageLayer.setAttribute("viewBox", `0 0 ${width} ${layout.height}`);
  els.lineageLayer.innerHTML = `<defs>
    <marker id="arrow-earlier" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="arrowhead is-earlier"/></marker>
    <marker id="arrow-later" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="arrowhead is-later"/></marker>
  </defs>${paths.join("")}`;
}

// ---------- rendering: context strips ----------

function stripSvg(box, inner) {
  const width = padL() + state.W + padR();
  return `<div class="strip strip-${box.id}" data-strip="${box.id}" style="top:${box.top}px;height:${box.h}px"><svg width="${width}" height="${box.h}" viewBox="0 0 ${width} ${box.h}">${inner}</svg></div>`;
}

function computeY(log, h) {
  return 8 + (1 - log / LOG_MAX) * (h - 16);
}

function renderComputeStrip(box) {
  const h = box.h;
  const width = padL() + state.W + padR();
  const grid = [5, 10, 15, 20, 25].map((log) => `<line class="grid" x1="${padL()}" x2="${width - 20}" y1="${computeY(log, h)}" y2="${computeY(log, h)}"/>`).join("");
  const dots = MODELS.map((m) => `<circle class="model-dot r-${m.region}" cx="${x(m.t).toFixed(1)}" cy="${computeY(m.log, h).toFixed(1)}" r="1.7"/>`).join("");
  let d = "";
  FRONTIER.forEach((m, i) => {
    const px = x(m.t).toFixed(1);
    const py = computeY(m.log, h).toFixed(1);
    d += i === 0 ? `M${px} ${py}` : `H${px}V${py}`;
  });
  d += `H${x(2026.9).toFixed(1)}`;
  const labels = FRONTIER.filter((m) => m.log >= 13 || m.t < 1960)
    .filter((m, i, arr) => i === arr.length - 1 || x(arr[i + 1].t) - x(m.t) > 110)
    .map((m) => `<text class="frontier-label" x="${x(m.t) + 4}" y="${computeY(m.log, h) - 5}">${esc(m.name)}</text>`).join("");
  return stripSvg(box, `${grid}${dots}<path class="frontier" d="${d}"/>${labels}`);
}

function renderCountriesStrip(box) {
  const h = box.h;
  const years = Object.keys(contextData.modelsByYear).map(Number);
  const max = Math.max(...years.map((y) => contextData.modelsByYear[y].total));
  const bars = years.map((year) => {
    const row = contextData.modelsByYear[year];
    const x0 = x(year) + 0.5;
    const w = Math.max(1, x(year + 1) - x(year) - 1);
    let y = h - 6;
    return ["US", "China", "UK", "Europe", "Other"].map((region) => {
      const bh = (row[region] / max) * (h - 12);
      y -= bh;
      return bh > 0 ? `<rect x="${x0}" y="${y}" width="${w}" height="${bh}" fill="${REGION_COLORS[region]}"><title>${year}: ${row[region]} ${region}</title></rect>` : "";
    }).join("");
  }).join("");
  return stripSvg(box, bars);
}

function markerStrip(box, items, kind) {
  const rows = [-Infinity, -Infinity];
  const marks = items.map((item) => {
    const px = x(item.year);
    const labelW = textW(item.label, FONTS.mark) + 14;
    const row = rows.findIndex((end) => px > end + 6);
    const y = Math.round(row === 1 ? box.h * 0.8 : box.h * 0.42);
    if (row !== -1) rows[row] = px + labelW;
    return `<g class="mark mark-${kind} ${row === -1 ? "is-unlabeled" : ""}" data-tip="${esc(`${yearLabel(item.year)} · ${item.label} — ${item.note}`)}">
      <line x1="${px}" x2="${px}" y1="4" y2="${box.h - 3}"/>
      ${row === -1 ? `<circle cx="${px}" cy="${box.h - 5}" r="2.6"/>` : `<rect x="${px - 3.5}" y="${y - 7.5}" width="7" height="7" transform="rotate(45 ${px} ${y - 4})"/>`}
      ${row !== -1 ? `<text x="${px + 8}" y="${y}">${esc(item.label)}</text>` : ""}
      <rect class="hit" x="${px - 6}" y="0" width="${row !== -1 ? labelW + 8 : 12}" height="${box.h}"/></g>`;
  }).join("");
  return stripSvg(box, marks);
}

function renderCoverageStrip(box) {
  const h = box.h;
  const perYear = new Map();
  for (const event of EVENTS) {
    const year = Math.floor(event.t);
    perYear.set(year, (perYear.get(year) || 0) + 1);
  }
  const max = Math.max(...perYear.values());
  const bars = [...perYear].map(([year, count]) => {
    const bh = (count / max) * (h - 14);
    return `<rect class="cov-bar" x="${x(year) + 0.5}" y="${h - 6 - bh}" width="${Math.max(1.5, x(year + 1) - x(year) - 1)}" height="${bh}"><title>${year}: ${count} vault events</title></rect>`;
  }).join("");
  const years = Object.keys(contextData.modelsByYear).map(Number).sort((a, b) => a - b);
  const epochMax = Math.max(...years.map((y) => contextData.modelsByYear[y].total));
  const line = years.map((year, i) => `${i ? "L" : "M"}${x(year + 0.5).toFixed(1)} ${(h - 6 - (contextData.modelsByYear[year].total / epochMax) * (h - 14)).toFixed(1)}`).join("");
  const gaps = EVENTS.filter((e) => e.gap || !e.vaultNote?.available).map((e) => `<line class="cov-gap" x1="${x(e.t)}" x2="${x(e.tEnd || e.t + 0.2)}" y1="${h - 3}" y2="${h - 3}"><title>${esc(e.title)}: no note</title></line>`).join("");
  return stripSvg(box, `${bars}<path class="cov-line" d="${line}"/>${gaps}`);
}

function renderActorsStrip(box) {
  const rows = ACTORS.map((actor, i) => {
    const y = 17 + i * 13;
    if (!actor.events.length) return "";
    const x0 = x(actor.events[0].t);
    const x1 = x(actor.events.at(-1).t);
    const active = state.actor === actor.id;
    return `<g class="actor-row ${active ? "is-active" : ""} ${state.actor && !active ? "is-dim" : ""}" data-actor="${actor.id}">
      <rect class="hit" x="${padL() - 20}" y="${y - 6}" width="${state.W + 40}" height="12"/>
      <line x1="${x0}" x2="${Math.max(x1, x0 + 2)}" y1="${y}" y2="${y}"/>
      ${actor.events.map((e) => `<circle class="lane-fill-${e.lane.id}" cx="${x(e.t)}" cy="${y}" r="3" data-id="${esc(e.id)}"><title>${esc(`${shortDate(e)} · ${e.title}`)}</title></circle>`).join("")}</g>`;
  }).join("");
  return stripSvg(box, rows);
}

function renderStrips() {
  els.stripLayer.innerHTML = layout.stripBoxes.map((box) => {
    if (box.id === "compute") return renderComputeStrip(box);
    if (box.id === "countries") return renderCountriesStrip(box);
    if (box.id === "world") return markerStrip(box, WORLD, "world");
    if (box.id === "hardware") return markerStrip(box, HARDWARE, "hardware");
    if (box.id === "coverage") return renderCoverageStrip(box);
    return renderActorsStrip(box);
  }).join("");
}

function renderSlice() {
  if (state.slice === null) {
    els.sliceLayer.innerHTML = "";
    return;
  }
  const y = state.slice;
  const band0 = x(y - 2);
  const band1 = x(y + 3);
  const core0 = x(y);
  const core1 = x(y + 1);
  els.sliceLayer.innerHTML = `
    <div class="slice-band" style="left:${band0}px;width:${band1 - band0}px;height:${layout.height}px"></div>
    <div class="slice-core" style="left:${core0}px;width:${Math.max(2, core1 - core0)}px;height:${layout.height}px"></div>
    <button class="slice-handle" type="button" data-slice-handle style="left:${(core0 + core1) / 2}px" aria-label="Slice at ${y}; drag to move">${y}</button>`;
}

// ---------- rendering: chrome ----------

function renderGutter() {
  els.gutterHead.innerHTML = `<div class="g-era" style="height:${ERA_H}px">Era</div><div class="g-axis" style="height:${AXIS_H}px">${state.scale === "even" ? "Even years" : "Scaled by activity"}</div>`;
  const parts = [];
  for (const lane of LANES) {
    const box = layout.lanes.find((l) => l.lane.id === lane.id);
    if (!box) continue;
    parts.push(`<button class="g-lane lane-${lane.id}" type="button" data-lane-info="${lane.id}" style="top:${box.top}px;height:${box.h}px" title="${esc(lane.blurb)}">
      <b>${esc(lane.name)}</b><span>${box.events.length} events</span></button>`);
  }
  for (const box of layout.stripBoxes) {
    let extra = "";
    if (box.id === "compute") {
      extra = (box.h >= 70 ? [5, 10, 15, 20, 25] : [10, 20]).map((log) => `<i class="g-tick" style="top:${computeY(log, box.h)}px">${pow10(log)}</i>`).join("") + (box.h >= 70 ? `<small>Epoch AI · line = largest run to date</small>` : "");
    } else if (box.id === "countries") {
      extra = `<small class="g-legend">${Object.entries(REGION_COLORS).map(([r, c]) => `<span><i style="background:${c}"></i>${r}</span>`).join("")}</small>`;
    } else if (box.id === "coverage") {
      extra = `<small>bars: vault events/yr · line: Epoch models/yr · red: missing notes</small>`;
    } else if (box.id === "actors") {
      extra = ACTORS.map((actor, i) => `<button type="button" class="g-actor ${state.actor === actor.id ? "is-active" : ""}" data-actor="${actor.id}" style="top:${17 + i * 13 - 7}px">${esc(actor.name)}</button>`).join("");
    } else if (box.id === "world" || box.id === "hardware") {
      extra = `<small>${box.id === "world" ? "Political & economic context" : "Chips & platforms"}</small>`;
    }
    if (box.h < 46 && box.id !== "countries") extra = extra.replace(/<small>.*?<\/small>/g, "");
    parts.push(`<div class="g-strip g-${box.id}" style="top:${box.top}px;height:${box.h}px"><b>${esc(STRIPS[box.id].label)}</b>${extra}</div>`);
  }
  els.gutterInner.innerHTML = parts.join("");
  els.gutterInner.style.height = `${layout.height}px`;
  els.gutter.style.width = `${gutterW()}px`;
}

function renderOverview(events) {
  els.overviewEras.innerHTML = scale.map((seg) => `<button type="button" class="ov-era ${seg.era.id.startsWith("winter") ? "is-winter" : ""}" data-era-jump="${seg.era.id}" style="left:${seg.f0 * 100}%;width:${seg.w * 100}%" title="${esc(seg.era.name)}"><span>${esc(seg.era.name)}</span></button>`).join("");
  els.overviewRug.innerHTML = events.map((e) => `<i class="lane-bg-${e.lane.id}" style="left:${(frac(e.t) * 100).toFixed(2)}%"></i>`).join("");
  updateOverviewWindow();
}

function updateOverviewWindow() {
  const left = (els.viewport.scrollLeft + gutterW() - padL()) / state.W;
  const right = (els.viewport.scrollLeft + els.viewport.clientWidth - padL()) / state.W;
  const l = Math.max(0, Math.min(1, left));
  const r = Math.max(l, Math.min(1, right));
  els.overviewWindow.style.left = `${l * 100}%`;
  els.overviewWindow.style.width = `${Math.max(1.5, (r - l) * 100)}%`;
}

function viewYears() {
  return [yearAt(els.viewport.scrollLeft + gutterW()), yearAt(els.viewport.scrollLeft + els.viewport.clientWidth)];
}

function renderToolbar(events) {
  updateWhere();
  els.countNow.textContent = `${events.length} of ${EVENTS.length} events${layout.folded ? " · context strips folded to make room" : ""}`;
  els.zoomRange.value = String(Math.round((Math.log(state.W / fitW()) / Math.log(MAX_ZOOM)) * 1000));
  els.scaleBtn.textContent = state.scale === "even" ? "Even years" : "Scaled by activity";
  els.scaleBtn.setAttribute("aria-pressed", String(state.scale === "activity"));
  els.sliceBtn.setAttribute("aria-pressed", String(state.slice !== null));
  const chips = [];
  if (state.lens) chips.push(["lens", `Concept: ${state.lens}`]);
  if (state.rhyme) chips.push(["rhyme", `Rhyme: ${RHYMES.find((r) => r.id === state.rhyme)?.name}`]);
  if (state.actor) chips.push(["actor", `Actor: ${ACTORS.find((r) => r.id === state.actor)?.name}`]);
  if (state.query) chips.push(["query", `Search: “${state.query}”`]);
  if (state.analysisLens) chips.push(["analysisLens", `Lens: ${els.analysisLens.selectedOptions[0]?.textContent}`]);
  if (state.week) chips.push(["week", `Week: ${state.week.split(" · ")[0]}`]);
  if (state.landmarksOnly) chips.push(["landmarksOnly", "Landmarks only"]);
  if (state.newOnly) chips.push(["newOnly", "New only"]);
  for (const id of state.hiddenLanes) chips.push([`lane:${id}`, `Hidden: ${LANES.find((l) => l.id === id).short}`]);
  els.activeChips.innerHTML = chips.map(([key, label]) => `<button type="button" class="active-chip" data-clear="${esc(key)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join("");
  els.analyzeTools.hidden = state.mode !== "analyze";
  els.rhymeSelect.value = state.rhyme;
  const filterCount = chips.filter(([key]) => !["lens", "rhyme", "actor"].includes(key)).length;
  els.filtersBtn.querySelector("b").textContent = filterCount ? String(filterCount) : "";
}

function updateStickyEraLabels() {
  const left = els.viewport.scrollLeft + gutterW() + 8;
  const top = els.viewport.scrollTop;
  els.chart.classList.toggle("is-scrolled-y", top > 0);
  els.chart.classList.toggle("has-more-below", els.viewport.scrollHeight - els.viewport.clientHeight - top > 24);
  for (const label of els.eraLabels.querySelectorAll(".era-label")) {
    const x0 = Number(label.dataset.x0) + 8;
    const x1 = Number(label.dataset.x1);
    const pos = Math.min(Math.max(x0, left), x1 - Math.min(label.offsetWidth, x1 - x0) - 8);
    label.style.left = `${Math.max(x0, pos)}px`;
  }
}

function renderAll() {
  const events = visibleEvents();
  buildScale();
  state.W = clampW(state.W);
  computeLayout(events);
  const width = padL() + state.W + padR();
  els.canvas.style.width = `${width}px`;
  els.canvas.style.height = `${layout.height}px`;
  els.head.style.width = `${width}px`;
  renderEras();
  renderAxis();
  renderLanes();
  renderCards();
  renderLineage();
  renderStrips();
  renderSlice();
  renderGutter();
  renderOverview(events);
  renderToolbar(events);
  renderDrawer();
  renderTourPanel();
  renderList(events);
  updateStickyEraLabels();
  document.body.dataset.mode = state.mode;
  document.body.classList.toggle("has-selection", Boolean(state.selected));
  writeHash();
}

// ---------- drawer ----------

let drawerKey = "";

function openDrawer(kind, id) {
  state.drawer = { kind, id };
  if (kind !== "event") state.selected = null;
  renderAll();
}

function closeDrawer() {
  state.drawer = null;
  state.selected = null;
  state.showNote = false;
  if (state.slice !== null) state.slice = null;
  renderAll();
}

function eventChip(event, extra = "") {
  return `<button type="button" class="ev-chip lane-${event.lane.id}" data-goto="${esc(event.id)}"><i></i><b>${esc(shortDate(event))}</b> ${esc(event.title)}${extra}</button>`;
}

function contextAt(t, span = 2) {
  const frontier = frontierAt(t + 0.5);
  const world = WORLD.filter((w) => Math.abs(w.year - t) <= span);
  const hardware = HARDWARE.filter((h) => Math.abs(h.year - t) <= span + 1);
  const yearModels = contextData.modelsByYear[Math.floor(t)];
  return `
    <dl class="ctx">
      <dt>Era</dt><dd><button type="button" class="link" data-era="${eraAt(t).id}">${esc(eraAt(t).name)}</button></dd>
      ${frontier ? `<dt>Largest training run to date</dt><dd>${esc(frontier.name)} <span class="muted">(${esc(frontier.org || "unknown")}, ${Math.floor(frontier.t)}) · ${fmtFlop(frontier.log)}</span></dd>` : ""}
      ${yearModels ? `<dt>Notable models that year</dt><dd>${yearModels.total} <span class="muted">(US ${yearModels.US} · China ${yearModels.China} · UK ${yearModels.UK} · Europe ${yearModels.Europe})</span></dd>` : ""}
      ${world.length ? `<dt>In the world</dt><dd>${world.map((w) => `<span class="ctx-item" title="${esc(w.note)}">${esc(w.label)} <span class="muted">${Math.floor(w.year)}</span></span>`).join("")}</dd>` : ""}
      ${hardware.length ? `<dt>Hardware</dt><dd>${hardware.map((w) => `<span class="ctx-item" title="${esc(w.note)}">${esc(w.label)} <span class="muted">${Math.floor(w.year)}</span></span>`).join("")}</dd>` : ""}
    </dl>`;
}

function drawerEvent(event) {
  const lineage = connected(event.id);
  const earlier = lineage.filter((e) => e.t < event.t);
  const later = lineage.filter((e) => e.t >= event.t);
  const rhymes = RHYMES.filter((r) => r.ids.includes(event.id));
  const sameMoment = EVENTS.filter((e) => e.id !== event.id && Math.abs(e.t - event.t) <= 1 && e.lane.id !== event.lane.id).sort((a, b) => b.centrality - a.centrality).slice(0, 6);
  const concepts = (event.allConcepts?.length ? event.allConcepts : event.concepts || []);
  const note = event.vaultNote;
  const sections = note?.sections || [];
  const quality = event.quality || { label: "unknown", score: 0, missing: [] };
  return `
    <header class="dw-head">
      <div class="dw-kicker"><span class="lane-dot lane-${event.lane.id}"></span>${esc(event.lane.name)} · ${esc(event.type)}${event.draft ? ` · <span class="tag" title="Drafted by Claude, not yet reviewed">Draft</span>` : ""}${event.isNew ? ` · <span class="tag">New</span>` : ""}</div>
      <h2>${esc(event.title)}</h2>
      <div class="dw-meta">${esc(displayDate(event))} · ${event.centrality} connections · note ${esc(quality.label)}${quality.score ? ` ${quality.score}/10` : ""}</div>
      <div class="dw-actions">
        <button type="button" data-step="-1" aria-label="Previous event">←</button>
        <button type="button" data-step="1" aria-label="Next event">→</button>
        <button type="button" data-slice-at="${Math.floor(event.t)}">Slice ${Math.floor(event.t)}</button>
        ${event.obsidianUri ? `<a href="${esc(event.obsidianUri)}">Obsidian</a>` : ""}
        ${event.sourceUrl ? `<a href="${esc(event.sourceUrl)}" target="_blank" rel="noreferrer">Source ↗</a>` : ""}
        <button type="button" class="dw-close" data-close aria-label="Close">×</button>
      </div>
    </header>
    <div class="dw-grid three">
      <section class="dw-block story"><h3>The story it tells</h3><p>${esc(event.story || event.summary)}</p></section>
      <section class="dw-block complication"><h3>What complicates it${event.complication?.concept ? ` <button type="button" class="concept-tag" data-lens="${esc(glossaryKey.get(event.complication.concept.toLowerCase()) || event.complication.concept)}">${esc(event.complication.concept)}</button>` : ""}</h3>
        <p>${event.complication ? esc(event.complication.text) : `<span class="muted">No social-history reading in the vault note yet.</span>`}</p></section>
      <section class="dw-block why"><h3>Why it matters</h3><p>${event.why ? esc(firstSentences(event.why, 3, 520)) : `<span class="muted">${note?.available ? "The note has no ‘Why this matters’ section." : "No vault note available for this event."}</span>`}</p></section>
    </div>
    <div class="dw-grid three">
      <section class="dw-block"><h3>Lineage <span class="muted">${lineage.length} linked notes</span></h3>
        <div class="lineage-cols">
          <div><h4>← Earlier</h4>${earlier.map((e) => eventChip(e)).join("") || `<p class="muted">None linked</p>`}</div>
          <div><h4>Later →</h4>${later.map((e) => eventChip(e)).join("") || `<p class="muted">None linked</p>`}</div>
        </div>
        ${event.lineageHtml ? `<details class="note-lineage"><summary>Before / after, from the note</summary>${event.lineageHtml}</details>` : ""}
      </section>
      <section class="dw-block"><h3>At that moment</h3>${contextAt(event.t)}
        ${sameMoment.length ? `<h4>Elsewhere within a year</h4>${sameMoment.map((e) => eventChip(e)).join("")}` : ""}</section>
      <section class="dw-block"><h3>Threads</h3>
        ${rhymes.length ? `<h4>Rhymes with</h4>${rhymes.map((r) => `<button type="button" class="thread-btn" data-rhyme="${r.id}">${esc(r.name)}</button>`).join("")}` : ""}
        ${concepts.length ? `<h4>Concepts</h4><div class="concept-row">${concepts.map((c) => `<button type="button" class="concept-tag" data-lens="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
        ${note?.citation ? `<h4>Citation</h4><p class="cite">${esc(note.citation)}</p>` : ""}
        ${quality.missing?.length ? `<h4>Note gaps</h4><p class="muted">Missing ${esc(quality.missing.join(", "))}</p>` : ""}
      </section>
    </div>
    ${note?.available ? `<div class="dw-note">
      <button type="button" class="note-toggle" data-toggle-note aria-expanded="${state.showNote}">${state.showNote ? "Hide the full vault note" : "Read the full vault note"}</button>
      ${state.showNote ? `<article class="vault-note">${sections.length ? sections.map((s) => `<section><h4>${esc(s.title)}</h4>${s.html}</section>`).join("") : note.html}</article>` : ""}
    </div>` : `<p class="muted dw-note">The full vault note is unavailable in this export${event.gap ? ": this is a known gap in the vault" : ""}.</p>`}`;
}

function drawerEra(era) {
  const events = EVENTS.filter((e) => e.t >= era.start && e.t < era.end);
  const landmarks = [...events].sort((a, b) => b.centrality - a.centrality).slice(0, 8).sort((a, b) => a.t - b.t);
  const f0 = frontierAt(era.start + 0.01);
  const f1 = frontierAt(Math.min(era.end, 2026.9));
  const world = WORLD.filter((w) => w.year >= era.start && w.year < era.end);
  const hw = HARDWARE.filter((w) => w.year >= era.start && w.year < era.end);
  const byLane = LANES.map((lane) => [lane, events.filter((e) => e.lane.id === lane.id).length]);
  const max = Math.max(1, ...byLane.map(([, n]) => n));
  return `
    <header class="dw-head">
      <div class="dw-kicker">Era · ${era.start}–${era.end === 2030 ? "present" : era.end}${era.id.startsWith("winter") ? " · contraction" : ""}</div>
      <h2>${esc(era.name)}</h2>
      <div class="dw-actions"><button type="button" data-zoom="${era.start},${era.end}">Zoom to era</button><button type="button" class="dw-close" data-close aria-label="Close">×</button></div>
    </header>
    <div class="dw-grid two">
      <section class="dw-block story"><h3>Synopsis</h3><p>${esc(era.synopsis)}</p><h3>Where the boundary is contested</h3><p>${esc(era.boundary)}</p><p class="muted small">${esc(ERA_SOURCES)} Synopses are Claude drafts.</p></section>
      <section class="dw-block"><h3>${events.length} events in the vault</h3>
        <div class="lane-bars">${byLane.map(([lane, n]) => `<div><span>${esc(lane.short)}</span><i class="lane-bg-${lane.id}" style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`).join("")}</div>
        ${f0 && f1 && f1 !== f0 ? `<h4>Compute across the era</h4><p>${esc(f0.name)} (${fmtFlop(f0.log)}) → ${esc(f1.name)} (${fmtFlop(f1.log)}): ${pow10(Math.round(f1.log - f0.log))}× more.</p>` : ""}
        ${world.length || hw.length ? `<h4>Context</h4><p>${[...world, ...hw].sort((a, b) => a.year - b.year).map((w) => `<span class="ctx-item" title="${esc(w.note)}">${esc(w.label)} <span class="muted">${Math.floor(w.year)}</span></span>`).join("")}</p>` : ""}
      </section>
    </div>
    <section class="dw-block"><h3>Landmarks</h3><div class="chip-grid">${landmarks.map((e) => eventChip(e)).join("") || `<p class="muted">No events yet.</p>`}</div></section>`;
}

function drawerSlice(year) {
  const inWindow = (e) => e.t >= year - 2 && e.t < year + 3;
  const events = visibleEvents().filter(inWindow);
  return `
    <header class="dw-head">
      <div class="dw-kicker">Cross-section · ${year - 2}–${year + 2} · ${esc(eraAt(year + 0.5).name)}</div>
      <h2>${year}: what was happening at once</h2>
      <div class="dw-actions">
        <button type="button" data-slice-step="-1" aria-label="Earlier year">← ${year - 1}</button>
        <button type="button" data-slice-step="1" aria-label="Later year">${year + 1} →</button>
        <button type="button" class="dw-close" data-close aria-label="Close">×</button>
      </div>
    </header>
    <div class="slice-grid">
      ${LANES.map((lane) => {
        const items = events.filter((e) => e.lane.id === lane.id).sort((a, b) => Math.abs(a.t - year - 0.5) - Math.abs(b.t - year - 0.5));
        return `<section class="dw-block slice-col lane-${lane.id}"><h3><span class="lane-dot lane-${lane.id}"></span>${esc(lane.name)}</h3>${items.map((e) => eventChip(e, Math.floor(e.t) === year ? "" : "")).join("") || `<p class="muted">Nothing in the vault</p>`}</section>`;
      }).join("")}
      <section class="dw-block slice-col"><h3>Context</h3>${contextAt(year + 0.5, 2)}</section>
    </div>`;
}

function drawerRhyme(rhyme) {
  const events = rhyme.ids.map((id) => byId.get(id)).filter(Boolean);
  return `
    <header class="dw-head">
      <div class="dw-kicker">Rhyme · a pattern that recurs</div>
      <h2>${esc(rhyme.name)}</h2>
      <div class="dw-actions"><button type="button" data-zoom="${events[0].t - 1},${events.at(-1).t + 1}">Fit on timeline</button><button type="button" class="dw-close" data-close aria-label="Close">×</button></div>
    </header>
    <div class="dw-grid two">
      <section class="dw-block story"><h3>The pattern</h3><p>${esc(rhyme.thesis)}</p><p class="muted small">Interpretive pairing; Claude draft.</p></section>
      <section class="dw-block"><h3>Instances</h3><ol class="rhyme-list">${events.map((e) => `<li>${eventChip(e)}<p>${esc(excerpt(e.story, 170))}</p></li>`).join("")}</ol></section>
    </div>`;
}

function drawerActor(actor) {
  const events = actor.events;
  const byLane = LANES.map((lane) => [lane, events.filter((e) => e.lane.id === lane.id).length]);
  return `
    <header class="dw-head">
      <div class="dw-kicker">Actor · ${esc(actor.kind)} · mentioned in ${events.length} notes</div>
      <h2>${esc(actor.name)}</h2>
      <div class="dw-actions">${events.length ? `<button type="button" data-zoom="${events[0].t - 1},${events.at(-1).t + 1}">Fit on timeline</button>` : ""}<button type="button" class="dw-close" data-close aria-label="Close">×</button></div>
    </header>
    <div class="dw-grid two">
      <section class="dw-block"><h3>Where they act</h3><div class="lane-bars">${byLane.map(([lane, n]) => `<div><span>${esc(lane.short)}</span><i class="lane-bg-${lane.id}" style="width:${(n / Math.max(1, events.length)) * 100}%"></i><b>${n}</b></div>`).join("")}</div>
        <p class="muted small">Found by matching the name in event titles, summaries and note text. This is activity in the vault, not a biography.</p></section>
      <section class="dw-block"><h3>Appearances</h3><div class="chip-grid">${events.map((e) => eventChip(e)).join("")}</div></section>
    </div>`;
}

function regionStats() {
  return REGIONS.map((region) => {
    const pattern = new RegExp(region.pattern);
    return { ...region, count: EVENTS.filter((e) => pattern.test(e.regionText)).length };
  });
}

function drawerCoverage() {
  const regions = regionStats();
  const max = Math.max(...regions.map((r) => r.count));
  const recent = Object.entries(contextData.modelsByYear).filter(([y]) => Number(y) >= 2015);
  const totals = recent.reduce((acc, [, row]) => {
    for (const key of ["total", "US", "China", "UK", "Europe", "Other"]) acc[key] = (acc[key] || 0) + row[key];
    return acc;
  }, {});
  const unavailable = EVENTS.filter((e) => !e.vaultNote?.available);
  const eraRows = scale.map((seg) => [seg.era, seg.count, seg.count / (seg.end - seg.start)]);
  return `
    <header class="dw-head">
      <div class="dw-kicker">Coverage report · how complete is this history?</div>
      <h2>What the vault sees, and what it misses</h2>
      <div class="dw-actions"><button type="button" class="dw-close" data-close aria-label="Close">×</button></div>
    </header>
    <div class="dw-grid three">
      <section class="dw-block"><h3>Places named in events</h3>
        <div class="lane-bars">${regions.map((r) => `<div><span>${esc(r.name)}</span><i class="bar-ink" style="width:${(r.count / max) * 100}%"></i><b>${r.count}</b></div>`).join("")}</div>
        <p class="muted small">Text matching on titles, summaries and core claims. Events naming no place are mostly US by default, so the US count is a floor.</p>
        <h4>For comparison: notable models 2015–2026 (Epoch AI)</h4>
        <div class="lane-bars">${["US", "China", "UK", "Europe", "Other"].map((k) => `<div><span>${k}</span><i style="background:${REGION_COLORS[k]};width:${(totals[k] / totals.total) * 100}%"></i><b>${Math.round((totals[k] / totals.total) * 100)}%</b></div>`).join("")}</div>
      </section>
      <section class="dw-block"><h3>Density by era</h3>
        <div class="lane-bars">${eraRows.map(([era, count, perYear]) => `<div><span>${esc(era.name)}</span><i class="bar-ink" style="width:${Math.min(100, perYear * 7)}%"></i><b>${perYear.toFixed(1)}/yr</b></div>`).join("")}</div>
        <p class="muted small">The present is over-represented, as it is in most archives built during it. Sparse decades are sparse notes, not quiet history.</p>
        ${unavailable.length ? `<h4>Events without a usable note</h4>${unavailable.map((e) => eventChip(e)).join("")}` : ""}
      </section>
      <section class="dw-block"><h3>Not in the vault yet</h3>
        <ul class="missing">${MISSING_TOPICS.map((m) => `<li><b>${m.year} · ${esc(m.title)}</b><span>${esc(m.why)}</span></li>`).join("")}</ul>
        <p class="muted small">Suggestions for notes to write; Claude draft.</p></section>
    </div>`;
}

function drawerConcept(concept) {
  const events = EVENTS.filter((e) => (e.allConcepts || e.concepts || []).includes(concept)).sort((a, b) => a.t - b.t);
  return `
    <header class="dw-head">
      <div class="dw-kicker">Concept lens · ${events.length} events</div>
      <h2>${esc(concept)}</h2>
      <div class="dw-actions"><button type="button" data-clear="lens">Clear lens</button><button type="button" class="dw-close" data-close aria-label="Close">×</button></div>
    </header>
    <div class="dw-grid two">
      <section class="dw-block story"><h3>Definition</h3><p>${esc(GLOSSARY[concept] || "A concept tagged in the vault notes.")}</p></section>
      <section class="dw-block"><h3>Trail through time</h3><ol class="trail">${events.map((e) => `<li>${eventChip(e)}</li>`).join("")}</ol></section>
    </div>`;
}

function drawerReference(kind) {
  if (kind === "glossary") {
    return `<header class="dw-head"><div class="dw-kicker">Reference</div><h2>Technology-history terms</h2><div class="dw-actions"><button type="button" class="dw-close" data-close aria-label="Close">×</button></div></header>
      <dl class="glossary">${Object.entries(GLOSSARY).map(([t, d]) => `<div><dt><button type="button" class="concept-tag" data-lens="${esc(t)}">${esc(t)}</button></dt><dd>${esc(d)}</dd></div>`).join("")}</dl>`;
  }
  if (kind === "bibliography") {
    const events = visibleEvents().filter((e) => e.vaultNote?.citation);
    return `<header class="dw-head"><div class="dw-kicker">Reference · ${events.length} visible sources</div><h2>Bibliography</h2><div class="dw-actions"><button type="button" class="dw-close" data-close aria-label="Close">×</button></div></header>
      <ol class="biblio">${events.map((e) => `<li><button type="button" class="link" data-goto="${esc(e.id)}">${esc(shortDate(e))}</button> ${esc(e.vaultNote.citation)}</li>`).join("")}</ol>
      <p class="muted small">Context data: ${esc(contextData.source.name)} (${esc(contextData.source.license)}), ${esc(contextData.source.url)}, fetched ${new Date(contextData.source.fetchedAt).toLocaleDateString()}.</p>`;
  }
  return `<header class="dw-head"><div class="dw-kicker">How to read this timeline</div><h2>Reading the page</h2><div class="dw-actions"><button type="button" class="dw-close" data-close aria-label="Close">×</button></div></header>
    <div class="dw-grid three">
      <section class="dw-block"><h3>Lanes</h3>${LANES.map((l) => `<p><span class="lane-dot lane-${l.id}"></span><b>${esc(l.name)}</b>: ${esc(l.blurb)}</p>`).join("")}<p class="muted small">Colour always means lane. Card size means importance (how many notes link to it).</p></section>
      <section class="dw-block"><h3>Time</h3><p>Eras get width by how much happens in them, so the 2020s are readable. Switch to <b>Even years</b> to see real proportions. Winters are tinted blue-grey. Faded era edges mark contested boundaries.</p><p>Small ticks under each lane mark every event. <b>+N</b> chips gather events with no room for a card: click one to zoom in.</p></section>
      <section class="dw-block"><h3>Moves</h3><p><b>Click an event</b> to trace its earlier and later links. <b>Click the year axis</b> or press <kbd>S</kbd> for a cross-section. In Analyze, follow <b>rhymes</b>, <b>actors</b> and the <b>coverage report</b>. In Read, take a guided tour.</p><p class="muted small">Keys: ←/→ events or tour steps · [ ] move the slice · +/− zoom · / search · Esc close.</p></section>
    </div>`;
}

function renderDrawer() {
  const d = state.drawer;
  const key = d ? `${d.kind}:${d.id}:${state.showNote}:${d.kind === "slice" ? state.slice : ""}:${state.query}` : "";
  els.drawer.hidden = !d;
  document.body.classList.toggle("drawer-open", Boolean(d));
  if (key === drawerKey) return;
  drawerKey = key;
  if (!d) {
    els.drawer.innerHTML = "";
    return;
  }
  const html = d.kind === "event" ? drawerEvent(byId.get(d.id))
    : d.kind === "era" ? drawerEra(ERAS.find((e) => e.id === d.id))
      : d.kind === "slice" ? drawerSlice(state.slice)
        : d.kind === "rhyme" ? drawerRhyme(RHYMES.find((r) => r.id === d.id))
          : d.kind === "actor" ? drawerActor(ACTORS.find((a) => a.id === d.id))
            : d.kind === "coverage" ? drawerCoverage()
              : d.kind === "concept" ? drawerConcept(d.id)
                : drawerReference(d.id);
  els.drawer.innerHTML = `<div class="drawer-inner">${html}</div>`;
  els.drawer.scrollTop = 0;
}

// ---------- tours (Read mode) ----------

function tourStep() {
  const tour = TOURS.find((t) => t.id === state.tour);
  return tour?.steps[state.step];
}

function renderTourPanel() {
  els.tourPanel.hidden = state.mode !== "read";
  if (state.mode !== "read") return;
  const tour = TOURS.find((t) => t.id === state.tour);
  if (!tour) {
    els.tourPanel.innerHTML = `<div class="tour-head"><span class="kicker">Guided reading</span><h2>Choose a thread</h2><p class="muted">Each tour moves the timeline as you read. Use ← and → to step.</p></div>
      <div class="tour-list">${TOURS.map((t) => `<button type="button" class="tour-card" data-tour="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.dek)}</span><em>${t.steps.length} stops · ${t.steps[0].range[0]}–${t.steps.at(-1).range[1]}</em></button>`).join("")}</div>
      <p class="muted small">Tour text is a Claude draft built from the vault notes.</p>`;
    return;
  }
  const step = tour.steps[state.step];
  const events = step.ids.map((id) => byId.get(id)).filter(Boolean);
  els.tourPanel.innerHTML = `
    <div class="tour-head"><button type="button" class="link" data-tour-exit>← All tours</button><span class="kicker">${esc(tour.name)}</span></div>
    <div class="tour-progress">${tour.steps.map((s, i) => `<button type="button" class="${i === state.step ? "is-current" : i < state.step ? "is-done" : ""}" data-tour-step="${i}" aria-label="Stop ${i + 1}: ${esc(s.title)}"></button>`).join("")}</div>
    <article class="tour-step">
      <span class="kicker">Stop ${state.step + 1} of ${tour.steps.length} · ${esc(eraAt((step.range[0] + step.range[1]) / 2).name)}</span>
      <h2>${esc(step.title)}</h2>
      <p>${esc(step.text)}</p>
      <div class="tour-events">${events.map((e) => eventChip(e)).join("")}</div>
    </article>
    <div class="tour-nav">
      <button type="button" data-tour-move="-1" ${state.step === 0 ? "disabled" : ""}>← Back</button>
      <button type="button" class="primary" data-tour-move="1" ${state.step === tour.steps.length - 1 ? "disabled" : ""}>Next stop →</button>
    </div>`;
}

function goToStep(index) {
  const tour = TOURS.find((t) => t.id === state.tour);
  if (!tour) return;
  state.step = Math.max(0, Math.min(tour.steps.length - 1, index));
  state.selected = null;
  state.drawer = null;
  const step = tour.steps[state.step];
  renderAll();
  flyTo(step.range[0], step.range[1]);
}

// ---------- list view ----------

function renderList(events) {
  els.listView.hidden = !state.listView;
  document.body.classList.toggle("list-mode", state.listView);
  if (!state.listView && !window.__printing) return;
  els.listView.innerHTML = ERAS.map((era) => {
    const items = events.filter((e) => e.t >= era.start && e.t < era.end).sort((a, b) => a.t - b.t);
    if (!items.length) return "";
    return `<section class="list-era"><h2>${esc(era.name)} <span>${era.start}–${era.end === 2030 ? "now" : era.end}</span></h2><p class="list-syn">${esc(era.synopsis)}</p>
      ${items.map((e) => `<button type="button" class="list-item lane-${e.lane.id}" data-goto="${esc(e.id)}"><span class="list-date">${esc(displayDate(e))}</span><b>${esc(e.title)}</b><em>${esc(e.lane.name)}</em><span class="list-story">${esc(excerpt(e.story, 200))}</span></button>`).join("")}</section>`;
  }).join("");
}

// ---------- navigation ----------

function animate(fromW, toW, fromS, toS, done) {
  cancelAnimationFrame(flight);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
  const start = performance.now();
  const duration = reduce ? 0 : 650;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  flying = true;
  const tick = (now) => {
    const p = duration ? Math.min(1, (now - start) / duration) : 1;
    const e = ease(p);
    state.W = Math.exp(Math.log(fromW) + (Math.log(toW) - Math.log(fromW)) * e);
    renderAll();
    els.viewport.scrollLeft = fromS + (toS - fromS) * e;
    if (p < 1) flight = requestAnimationFrame(tick);
    else {
      flying = false;
      onScroll();
      done?.();
    }
  };
  if (duration) flight = requestAnimationFrame(tick);
  else tick(start);
}

function flyTo(y0, y1) {
  const usable = els.viewport.clientWidth - gutterW() - 40;
  const span = Math.max(0.0005, frac(y1) - frac(y0));
  const toW = clampW((usable * 0.9) / span);
  const toS = Math.max(0, padL() + toW * frac(y0) - gutterW() - usable * 0.05);
  animate(state.W, toW, els.viewport.scrollLeft, toS);
}

function zoomTo(w, viewportX = (els.viewport.clientWidth + gutterW()) / 2) {
  const year = yearAt(els.viewport.scrollLeft + viewportX);
  state.W = clampW(w);
  renderAll();
  els.viewport.scrollLeft = x(year) - viewportX;
  onScroll();
}

function fit() {
  state.W = fitW();
  renderAll();
  els.viewport.scrollLeft = 0;
  onScroll();
}

function ensureVisible(event, instant = false) {
  const px = x(event.t);
  const { scrollLeft, clientWidth } = els.viewport;
  if (px < scrollLeft + gutterW() + 30 || px > scrollLeft + clientWidth - 280) {
    const target = Math.max(0, px - gutterW() - (clientWidth - gutterW()) * 0.4);
    if (instant) els.viewport.scrollLeft = target;
    else animate(state.W, state.W, scrollLeft, target);
  }
}

function select(id) {
  const event = byId.get(id);
  if (!event) return;
  if (state.hiddenLanes.has(event.lane.id)) state.hiddenLanes.delete(event.lane.id);
  hideHover();
  state.selected = id;
  state.showNote = false;
  state.drawer = { kind: "event", id };
  state.listView = false;
  renderAll();
  ensureVisible(event);
}

function stepEvent(direction) {
  const events = visibleEvents().sort((a, b) => a.t - b.t);
  if (!events.length) return;
  const index = events.findIndex((e) => e.id === state.selected);
  const next = index === -1 ? (direction > 0 ? 0 : events.length - 1) : Math.max(0, Math.min(events.length - 1, index + direction));
  select(events[next].id);
}

function setSlice(year) {
  state.slice = Math.max(1940, Math.min(2029, Math.round(year)));
  state.selected = null;
  state.drawer = { kind: "slice", id: "slice" };
  renderAll();
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.strips = new Set(MODE_STRIPS[mode]);
  if (mode !== "analyze") {
    state.rhyme = "";
    state.actor = "";
  }
  if (mode !== "read") state.tour = null;
  if (mode === "read") {
    state.selected = null;
    state.drawer = null;
  }
  for (const tab of els.modeTabs.querySelectorAll("[data-mode]")) tab.setAttribute("aria-selected", String(tab.dataset.mode === mode));
  renderStripToggles();
  renderAll();
}

function clearKey(key) {
  if (key === "lens") state.lens = "";
  else if (key === "rhyme") state.rhyme = "";
  else if (key === "actor") state.actor = "";
  else if (key === "query") { state.query = ""; els.search.value = ""; }
  else if (key === "analysisLens") { state.analysisLens = ""; els.analysisLens.value = ""; }
  else if (key === "week") { state.week = ""; els.weekSelect.value = ""; }
  else if (key === "landmarksOnly") { state.landmarksOnly = false; els.landmarksOnly.checked = false; }
  else if (key === "newOnly") { state.newOnly = false; els.newOnly.checked = false; }
  else if (key.startsWith("lane:")) state.hiddenLanes.delete(key.slice(5));
  if (["lens", "rhyme", "actor"].includes(key) && state.drawer && ["concept", "rhyme", "actor"].includes(state.drawer.kind)) state.drawer = null;
  renderLaneFilters();
  els.lensSelect.value = state.lens;
  renderAll();
}

// ---------- URL state ----------

function writeHash() {
  const params = new URLSearchParams();
  if (state.mode !== "explore") params.set("mode", state.mode);
  if (state.selected) params.set("event", state.selected);
  else if (state.drawer?.kind === "era") params.set("era", state.drawer.id);
  if (state.slice !== null) params.set("slice", state.slice);
  if (state.rhyme) params.set("rhyme", state.rhyme);
  if (state.tour) params.set("tour", `${state.tour}/${state.step + 1}`);
  const hash = params.toString();
  if (location.hash.slice(1) !== hash) history.replaceState(null, "", hash ? `#${hash}` : location.pathname + location.search);
}

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const mode = MODE_STRIPS[params.get("mode")] ? params.get("mode") : "explore";
  state.mode = mode;
  state.strips = new Set(MODE_STRIPS[mode]);
  const tour = params.get("tour");
  if (tour) {
    const [id, step] = tour.split("/");
    if (TOURS.some((t) => t.id === id)) {
      state.mode = "read";
      state.strips = new Set(MODE_STRIPS.read);
      state.tour = id;
      state.step = Math.max(0, Number(step || 1) - 1);
      return () => goToStep(state.step);
    }
  }
  if (params.get("rhyme") && RHYMES.some((r) => r.id === params.get("rhyme"))) {
    state.mode = "analyze";
    state.strips = new Set(MODE_STRIPS.analyze);
    state.rhyme = params.get("rhyme");
    state.drawer = { kind: "rhyme", id: state.rhyme };
  }
  if (params.get("slice")) return () => setSlice(Number(params.get("slice")));
  if (params.get("event") && byId.has(params.get("event"))) return () => select(params.get("event"));
  if (params.get("era") && ERAS.some((e) => e.id === params.get("era"))) return () => openDrawer("era", params.get("era"));
  return null;
}

// ---------- controls ----------

function renderLaneFilters() {
  els.laneFilters.innerHTML = LANES.map((lane) => {
    const on = !state.hiddenLanes.has(lane.id);
    const count = EVENTS.filter((e) => e.lane.id === lane.id).length;
    return `<button type="button" class="lane-toggle lane-${lane.id}" data-lane="${lane.id}" aria-pressed="${on}"><i></i>${esc(lane.name)} <span>${count}</span></button>`;
  }).join("");
}

function renderStripToggles() {
  els.stripToggles.innerHTML = STRIP_ORDER.map((id) => `<label><input type="checkbox" data-strip-toggle="${id}" ${state.strips.has(id) ? "checked" : ""}> ${esc(STRIPS[id].label)}</label>`).join("");
}

function renderLensOptions() {
  const counts = new Map();
  for (const event of EVENTS) for (const c of event.allConcepts || event.concepts || []) counts.set(c, (counts.get(c) || 0) + 1);
  const options = [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  els.lensSelect.innerHTML = `<option value="">No concept lens</option>${options.map(([c, n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`).join("")}`;
}

function renderWeekOptions() {
  const weeks = [...new Set(EVENTS.map((e) => e.week).filter(Boolean))]
    .sort((a, b) => Date.parse(`${a.split(" · ")[0]} 2026`) - Date.parse(`${b.split(" · ")[0]} 2026`));
  els.weekSelect.innerHTML = `<option value="">All weeks</option>${weeks.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}`;
  els.weekField.hidden = !weeks.length;
}

function setTheme(theme) {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  for (const b of els.menuPop.querySelectorAll("[data-theme-set]")) b.setAttribute("aria-pressed", String(b.dataset.themeSet === theme));
  try { localStorage.setItem("timeline-theme", theme); } catch { /* storage unavailable */ }
}

function closePopovers(except) {
  for (const [pop, btn] of [[els.filtersPop, els.filtersBtn], [els.menuPop, els.menuBtn]]) {
    if (pop === except) continue;
    pop.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }
}

function togglePopover(pop, btn) {
  const open = pop.hidden;
  closePopovers(pop);
  pop.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
}

let hoverTimer = 0;

function showHover(html, clientX, clientY) {
  els.hover.innerHTML = html;
  els.hover.hidden = false;
  const rect = els.hover.getBoundingClientRect();
  els.hover.style.left = `${Math.min(window.innerWidth - rect.width - 12, clientX + 14)}px`;
  els.hover.style.top = `${Math.max(8, Math.min(window.innerHeight - rect.height - 12, clientY + 14))}px`;
}

function hideHover() {
  clearTimeout(hoverTimer);
  els.hover.hidden = true;
}

function eventHover(event) {
  const frontier = frontierAt(event.t);
  return `<span class="hv-kicker"><i class="lane-dot lane-${event.lane.id}"></i>${esc(event.lane.name)} · ${esc(displayDate(event))}</span>
    <b>${esc(event.title)}</b><p>${esc(excerpt(event.story, 190))}</p>
    ${frontier ? `<small>Largest run to date: ${esc(frontier.name)}, ${fmtFlop(frontier.log)}</small>` : ""}`;
}

function onScroll() {
  if (!els.hover.hidden) hideHover();
  updateOverviewWindow();
  updateStickyEraLabels();
  els.gutterInner.style.transform = `translateY(${-els.viewport.scrollTop}px)`;
  updateWhere();
}

function updateWhere() {
  const [a, b] = viewYears();
  const spanned = ERAS.filter((era) => era.end > a && era.start < b);
  const era = eraAt((a + b) / 2);
  const key = spanned.length > 2 ? "all" : era.id;
  if (els.eraNow.dataset.key !== key) {
    els.eraNow.dataset.key = key;
    els.eraNow.innerHTML = key === "all"
      ? `<span class="era-overview">${spanned.length} eras</span>`
      : `<button type="button" data-era="${era.id}">${esc(era.name)}</button>`;
  }
  els.rangeNow.textContent = `${Math.max(1940, Math.floor(a))}–${Math.min(2030, Math.ceil(b))}`;
}

function bindEvents() {
  els.modeTabs.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-mode]");
    if (tab) setMode(tab.dataset.mode);
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    renderAll();
  });

  els.filtersBtn.addEventListener("click", () => togglePopover(els.filtersPop, els.filtersBtn));
  els.menuBtn.addEventListener("click", () => togglePopover(els.menuPop, els.menuBtn));

  els.laneFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lane]");
    if (!btn) return;
    const id = btn.dataset.lane;
    if (state.hiddenLanes.has(id)) state.hiddenLanes.delete(id);
    else if (state.hiddenLanes.size < LANES.length - 1) state.hiddenLanes.add(id);
    renderLaneFilters();
    renderAll();
  });

  els.lensSelect.addEventListener("change", () => {
    state.lens = els.lensSelect.value;
    state.drawer = state.lens ? { kind: "concept", id: state.lens } : null;
    state.selected = null;
    renderAll();
  });
  els.weekSelect.addEventListener("change", () => { state.week = els.weekSelect.value; renderAll(); });
  els.analysisLens.addEventListener("change", () => { state.analysisLens = els.analysisLens.value; renderAll(); });
  els.landmarksOnly.addEventListener("change", () => { state.landmarksOnly = els.landmarksOnly.checked; renderAll(); });
  els.newOnly.addEventListener("change", () => { state.newOnly = els.newOnly.checked; renderAll(); });
  els.resetFilters.addEventListener("click", () => {
    Object.assign(state, { query: "", lens: "", week: "", analysisLens: "", landmarksOnly: false, newOnly: false, rhyme: "", actor: "", selected: null, drawer: null, slice: null });
    state.hiddenLanes.clear();
    els.search.value = "";
    els.lensSelect.value = "";
    els.weekSelect.value = "";
    els.analysisLens.value = "";
    els.landmarksOnly.checked = false;
    els.newOnly.checked = false;
    renderLaneFilters();
    fit();
  });

  els.menuPop.addEventListener("click", (e) => {
    const theme = e.target.closest("[data-theme-set]");
    if (theme) return setTheme(theme.dataset.themeSet);
    const scaleBtn = e.target.closest("[data-scale-set]");
    if (scaleBtn) {
      setScale(scaleBtn.dataset.scaleSet);
      return;
    }
    const ref = e.target.closest("[data-ref]");
    if (ref) {
      closePopovers();
      if (ref.dataset.ref === "list") {
        state.listView = !state.listView;
        renderAll();
      } else if (ref.dataset.ref === "print") {
        window.print();
      } else openDrawer("ref", ref.dataset.ref);
    }
  });
  els.menuPop.addEventListener("change", (e) => {
    const toggle = e.target.closest("[data-strip-toggle]");
    if (!toggle) return;
    if (toggle.checked) state.strips.add(toggle.dataset.stripToggle);
    else state.strips.delete(toggle.dataset.stripToggle);
    renderAll();
  });

  els.zoomIn.addEventListener("click", () => zoomTo(state.W * 1.6));
  els.zoomOut.addEventListener("click", () => zoomTo(state.W / 1.6));
  els.zoomRange.addEventListener("input", () => zoomTo(fitW() * Math.exp((Number(els.zoomRange.value) / 1000) * Math.log(MAX_ZOOM))));
  els.fitBtn.addEventListener("click", fit);
  els.scaleBtn.addEventListener("click", () => setScale(state.scale === "even" ? "activity" : "even"));
  els.sliceBtn.addEventListener("click", () => {
    if (state.slice !== null) closeDrawer();
    else {
      const [a, b] = viewYears();
      setSlice((a + b) / 2);
    }
  });
  els.coverageBtn.addEventListener("click", () => openDrawer("coverage", "coverage"));
  els.rhymeSelect.addEventListener("change", () => {
    state.rhyme = els.rhymeSelect.value;
    state.actor = "";
    if (state.rhyme) {
      openDrawer("rhyme", state.rhyme);
      const events = RHYMES.find((r) => r.id === state.rhyme).ids.map((id) => byId.get(id)).filter(Boolean);
      flyTo(events[0].t - 2, events.at(-1).t + 2);
    } else closeDrawer();
  });

  els.viewport.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = els.viewport.getBoundingClientRect();
      zoomTo(state.W * Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.012), e.clientX - rect.left);
    } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey && els.viewport.scrollHeight <= els.viewport.clientHeight + 1) {
      e.preventDefault();
      els.viewport.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  let gestureW = null;
  els.viewport.addEventListener("gesturestart", (e) => { e.preventDefault(); gestureW = state.W; });
  els.viewport.addEventListener("gesturechange", (e) => {
    e.preventDefault();
    if (gestureW === null) return;
    zoomTo(gestureW * e.scale, e.clientX - els.viewport.getBoundingClientRect().left);
  });
  els.viewport.addEventListener("gestureend", () => { gestureW = null; });

  let drag = null;
  let suppress = false;
  els.viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const handle = e.target.closest("[data-slice-handle]");
    drag = { x: e.clientX, y: e.clientY, sl: els.viewport.scrollLeft, st: els.viewport.scrollTop, moved: false, id: e.pointerId, slice: Boolean(handle) };
  });
  els.viewport.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 4 && Math.abs(e.clientY - drag.y) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      els.viewport.setPointerCapture(drag.id);
      els.viewport.classList.add("is-dragging");
      hideHover();
    }
    if (drag.slice) {
      const year = Math.floor(yearAt(e.clientX - els.viewport.getBoundingClientRect().left + els.viewport.scrollLeft));
      if (year !== state.slice) setSlice(year);
    } else {
      els.viewport.scrollLeft = drag.sl - dx;
      els.viewport.scrollTop = drag.st - (e.clientY - drag.y);
    }
  });
  const endDrag = () => {
    if (drag?.moved) {
      suppress = true;
      setTimeout(() => { suppress = false; }, 0);
    }
    els.viewport.classList.remove("is-dragging");
    drag = null;
  };
  els.viewport.addEventListener("pointerup", endDrag);
  els.viewport.addEventListener("pointercancel", endDrag);
  els.viewport.addEventListener("click", (e) => {
    if (suppress) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  let scrollFrame = 0;
  els.viewport.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(onScroll);
  });

  els.viewport.addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (card) {
      if (state.selected === card.dataset.id) closeDrawer();
      else select(card.dataset.id);
      return;
    }
    const zoom = e.target.closest("[data-zoom]");
    if (zoom) {
      const [a, b] = zoom.dataset.zoom.split(",").map(Number);
      flyTo(a - 0.6, b + 0.8);
      return;
    }
    const era = e.target.closest("[data-era]");
    if (era) return openDrawer("era", era.dataset.era);
    const actor = e.target.closest("[data-actor]");
    if (actor) return toggleActor(actor.dataset.actor);
    if (e.target.closest("#axisLayer") && !e.target.closest(".era-label")) {
      setSlice(Math.floor(yearAt(e.clientX - els.viewport.getBoundingClientRect().left + els.viewport.scrollLeft)));
    }
  });

  els.viewport.addEventListener("pointerover", (e) => {
    const card = e.target.closest(".card, .pin");
    const mark = e.target.closest("[data-tip]");
    if (!card && !mark) return;
    clearTimeout(hoverTimer);
    const { clientX, clientY } = e;
    const html = card ? eventHover(byId.get(card.dataset.id)) : `<p>${esc(mark.dataset.tip)}</p>`;
    hoverTimer = setTimeout(() => showHover(html, clientX, clientY), els.hover.hidden ? 200 : 40);
  });
  els.viewport.addEventListener("pointerout", (e) => {
    if (e.target.closest(".card, .pin, [data-tip]")) hideHover();
  });

  els.viewport.addEventListener("pointermove", (e) => {
    const strip = e.target.closest(".strip-compute");
    if (!strip || drag?.moved) return;
    const rect = strip.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = null;
    let bestD = 81;
    for (const m of MODELS) {
      const dx = x(m.t) - px;
      if (Math.abs(dx) > 9) continue;
      const dy = computeY(m.log, rect.height) - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = m; }
    }
    if (best) showHover(`<span class="hv-kicker">${yearLabel(best.t)} · ${esc(best.org || "")}</span><b>${esc(best.name)}</b><small>${fmtFlop(best.log)} training compute · Epoch AI</small>`, e.clientX, e.clientY);
    else hideHover();
  });

  els.gutter.addEventListener("click", (e) => {
    const actor = e.target.closest("[data-actor]");
    if (actor) return toggleActor(actor.dataset.actor);
    const lane = e.target.closest("[data-lane-info]");
    if (lane) {
      state.hiddenLanes = new Set(LANES.filter((l) => l.id !== lane.dataset.laneInfo).map((l) => l.id));
      if ([...state.hiddenLanes].length === LANES.length - 1 && layout.lanes.length === 1) state.hiddenLanes.clear();
      renderLaneFilters();
      renderAll();
    }
  });

  els.overview.addEventListener("pointerdown", (e) => {
    const rect = els.overview.getBoundingClientRect();
    const jump = (clientX) => {
      const f = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      els.viewport.scrollLeft = padL() + f * state.W - (els.viewport.clientWidth + gutterW()) / 2;
    };
    jump(e.clientX);
    const move = (ev) => jump(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  const drawerOrTour = (e) => {
    const goto = e.target.closest("[data-goto]");
    if (goto) return select(goto.dataset.goto);
    if (e.target.closest("[data-close]")) return closeDrawer();
    const step = e.target.closest("[data-step]");
    if (step) return stepEvent(Number(step.dataset.step));
    const lens = e.target.closest("[data-lens]");
    if (lens) {
      state.lens = lens.dataset.lens;
      els.lensSelect.value = state.lens;
      state.selected = null;
      return openDrawer("concept", state.lens);
    }
    const rhyme = e.target.closest("[data-rhyme]");
    if (rhyme) {
      if (state.mode !== "analyze") setMode("analyze");
      state.rhyme = rhyme.dataset.rhyme;
      state.selected = null;
      return openDrawer("rhyme", state.rhyme);
    }
    const era = e.target.closest("[data-era]");
    if (era) return openDrawer("era", era.dataset.era);
    const zoom = e.target.closest("[data-zoom]");
    if (zoom) {
      const [a, b] = zoom.dataset.zoom.split(",").map(Number);
      return flyTo(a, b);
    }
    const sliceAt = e.target.closest("[data-slice-at]");
    if (sliceAt) return setSlice(Number(sliceAt.dataset.sliceAt));
    const sliceStep = e.target.closest("[data-slice-step]");
    if (sliceStep) return setSlice(state.slice + Number(sliceStep.dataset.sliceStep));
    const clear = e.target.closest("[data-clear]");
    if (clear) return clearKey(clear.dataset.clear);
    if (e.target.closest("[data-toggle-note]")) {
      state.showNote = !state.showNote;
      return renderDrawer();
    }
    const tour = e.target.closest("[data-tour]");
    if (tour) {
      state.tour = tour.dataset.tour;
      return goToStep(0);
    }
    if (e.target.closest("[data-tour-exit]")) {
      state.tour = null;
      return renderAll();
    }
    const move = e.target.closest("[data-tour-move]");
    if (move) return goToStep(state.step + Number(move.dataset.tourMove));
    const jumpStep = e.target.closest("[data-tour-step]");
    if (jumpStep) return goToStep(Number(jumpStep.dataset.tourStep));
  };
  els.drawer.addEventListener("click", drawerOrTour);
  els.tourPanel.addEventListener("click", drawerOrTour);
  els.listView.addEventListener("click", drawerOrTour);
  els.toolbar.addEventListener("click", (e) => {
    const clear = e.target.closest("[data-clear]");
    if (clear) return clearKey(clear.dataset.clear);
    const era = e.target.closest("[data-era]");
    if (era) openDrawer("era", era.dataset.era);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".popover, #filtersBtn, #menuBtn")) closePopovers();
  });

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof Element && e.target.matches("input, select, textarea")) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      if (!els.filtersPop.hidden || !els.menuPop.hidden) return closePopovers();
      if (state.drawer || state.selected) return closeDrawer();
      if (state.rhyme || state.actor || state.lens) {
        state.rhyme = "";
        state.actor = "";
        state.lens = "";
        els.lensSelect.value = "";
        return renderAll();
      }
      if (state.listView) {
        state.listView = false;
        return renderAll();
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (state.mode === "read" && state.tour && !state.selected) goToStep(state.step + dir);
      else stepEvent(dir);
    } else if (e.key === "+" || e.key === "=") zoomTo(state.W * 1.4);
    else if (e.key === "-") zoomTo(state.W / 1.4);
    else if (e.key === "/") {
      e.preventDefault();
      els.search.focus();
    } else if (e.key === "s" || e.key === "S") {
      els.sliceBtn.click();
    } else if ((e.key === "[" || e.key === "]") && state.slice !== null) {
      setSlice(state.slice + (e.key === "]" ? 1 : -1));
    }
  });

  window.addEventListener("hashchange", () => {
    Object.assign(state, { selected: null, drawer: null, slice: null, rhyme: "", actor: "", tour: null });
    const after = readHash();
    for (const tab of els.modeTabs.querySelectorAll("[data-mode]")) tab.setAttribute("aria-selected", String(tab.dataset.mode === state.mode));
    renderStripToggles();
    renderAll();
    after?.();
  });

  window.addEventListener("beforeprint", () => {
    window.__printing = true;
    renderList(visibleEvents());
  });
  window.addEventListener("afterprint", () => {
    window.__printing = false;
    renderList(visibleEvents());
  });

  let resizeFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (flying) return;
      const selected = byId.get(state.selected);
      const center = yearAt(els.viewport.scrollLeft + (els.viewport.clientWidth + gutterW()) / 2);
      renderAll();
      if (selected) ensureVisible(selected, true); else els.viewport.scrollLeft = x(center) - (els.viewport.clientWidth + gutterW()) / 2;
      onScroll();
    });
  }).observe(els.viewport);
}

function setScale(mode) {
  const center = yearAt(els.viewport.scrollLeft + (els.viewport.clientWidth + gutterW()) / 2);
  state.scale = mode;
  for (const b of els.menuPop.querySelectorAll("[data-scale-set]")) b.setAttribute("aria-pressed", String(b.dataset.scaleSet === mode));
  document.body.classList.add("is-rescaling");
  renderAll();
  els.viewport.scrollLeft = x(center) - (els.viewport.clientWidth + gutterW()) / 2;
  onScroll();
  setTimeout(() => document.body.classList.remove("is-rescaling"), 500);
}

function toggleActor(id) {
  if (state.actor === id) {
    state.actor = "";
    closeDrawer();
    return;
  }
  state.actor = id;
  state.rhyme = "";
  openDrawer("actor", id);
}

function init() {
  loadFonts();
  EVENTS = timelinePayload.events.map(prepare).sort((a, b) => a.t - b.t);
  byId = new Map(EVENTS.map((e) => [e.id, e]));
  buildActors();
  els.mastCount.textContent = `${EVENTS.length} events · ${Math.floor(EVENTS[0].t)}–${Math.floor(EVENTS.at(-1).t)}`;
  els.syncTime.textContent = new Date(timelinePayload.generatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  els.rhymeSelect.innerHTML = `<option value="">Follow a rhyme…</option>${RHYMES.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}`;
  let theme = "auto";
  try { theme = localStorage.getItem("timeline-theme") || "auto"; } catch { /* storage unavailable */ }
  setTheme(theme);
  renderLaneFilters();
  renderLensOptions();
  renderWeekOptions();
  bindEvents();
  const after = readHash();
  for (const tab of els.modeTabs.querySelectorAll("[data-mode]")) tab.setAttribute("aria-selected", String(tab.dataset.mode === state.mode));
  renderStripToggles();
  fit();
  after?.();
}

init();
