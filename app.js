const typeOrder = [
  "Theory / question",
  "Field formation",
  "Data / benchmark",
  "Infrastructure / compute",
  "Model innovation",
  "Corporate release",
  "Critique / governance",
  "State / policy",
  "Court / litigation",
  "Research source"
];

import timelinePayload from "./data/events-data.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TICK_STEPS = [100, 50, 20, 10, 5, 2, 1, 1 / 2, 1 / 4, 1 / 12];
const MINOR_STEP = new Map([[100, 10], [50, 10], [20, 5], [10, 1], [5, 1], [2, 1], [1, 1 / 12], [1 / 2, 1 / 12], [1 / 4, 1 / 12]]);
const STEP_LABEL = new Map([[100, "Centuries"], [50, "50 years"], [20, "20 years"], [10, "Decades"], [5, "5 years"], [2, "2 years"], [1, "Years"], [1 / 2, "Half-years"], [1 / 4, "Quarters"], [1 / 12, "Months"]]);
const MAX_PX_PER_YEAR = 2400;
const LEFT_PAD = 80;
const RIGHT_PAD = 300;
const COMPACT = { width: 200, height: 74 };
const FULL = { width: 250, height: 150 };
const FULL_CARD_THRESHOLD = 70;
const DENSITY = {
  sparse: { compact: { width: 230, height: 86 }, full: { width: 286, height: 170 }, gap: 16 },
  normal: { compact: COMPACT, full: FULL, gap: 10 },
  dense: { compact: { width: 170, height: 62 }, full: { width: 220, height: 128 }, gap: 6 }
};
const TYPE_ICON = {
  "Theory / question": "?",
  "Field formation": "F",
  "Data / benchmark": "D",
  "Infrastructure / compute": "I",
  "Model innovation": "M",
  "Corporate release": "C",
  "Critique / governance": "!",
  "State / policy": "S",
  "Court / litigation": "§",
  "Research source": "R"
};
const GLOSSARY = {
  "Agenda Control": "The power to define which questions, metrics, or futures count as legitimate.",
  "Black Box": "A system whose inputs and outputs are visible while its internal workings become socially opaque.",
  "Closure": "The process by which disagreement narrows enough that a technology or interpretation seems settled.",
  "Co-production": "The mutual making of technical systems and social order.",
  "Interpretative Flexibility": "The same artifact can mean different things to different relevant groups.",
  "Naturalization": "A made choice starts to look inevitable, neutral, or simply how things are.",
  "Path Dependence": "Early choices constrain later possibilities even when alternatives remain imaginable.",
  "Script": "A design or rule that imagines and steers users toward particular behavior.",
  "System Builders": "Actors who assemble technical, institutional, financial, and cultural pieces into a working system.",
  "Technological Frame": "A group's shared assumptions, problems, examples, and standards for judging a technology.",
  "Technological Momentum": "A system becomes harder to redirect as institutions and habits accumulate around it.",
  "Public Interest": "The claim that technical choices should be accountable to publics beyond builders and owners."
};

const state = {
  events: [],
  selectedId: null,
  showVaultNote: false,
  noteSection: "",
  viewMode: "timeline",
  analysisLens: "",
  density: "normal",
  dark: false,
  showLegend: false,
  showGlossary: false,
  showBibliography: false,
  readingMode: false,
  splitPane: false,
  newOnly: false,
  debateMap: false,
  narrativeMode: false,
  minImportance: 0,
  chainRootId: null,
  worldLayers: new Set(),
  activeTypes: new Set(typeOrder),
  query: "",
  lens: "",
  week: "",
  showLinks: true,
  pxPerYear: 10,
  bounds: { min: 1950, max: 2030 }
};

const els = {
  syncTime: document.querySelector("#syncTime"),
  filtersToggle: document.querySelector("#filtersToggle"),
  filtersClose: document.querySelector("#filtersClose"),
  filterDock: document.querySelector("#filterDock"),
  preferencesToggle: document.querySelector("#preferencesToggle"),
  preferencesClose: document.querySelector("#preferencesClose"),
  preferencesMenu: document.querySelector("#preferencesMenu"),
  typeFilters: document.querySelector("#typeFilters"),
  search: document.querySelector("#searchInput"),
  jumpYear: document.querySelector("#jumpYear"),
  decadeShortcuts: document.querySelector("#decadeShortcuts"),
  resetFilters: document.querySelector("#resetFilters"),
  listToggle: document.querySelector("#listToggle"),
  readingModeToggle: document.querySelector("#readingModeToggle"),
  splitPaneToggle: document.querySelector("#splitPaneToggle"),
  darkToggle: document.querySelector("#darkToggle"),
  printButton: document.querySelector("#printButton"),
  presetRow: document.querySelector("#presetRow"),
  bibliographyToggle: document.querySelector("#bibliographyToggle"),
  newOnlyToggle: document.querySelector("#newOnlyToggle"),
  debateToggle: document.querySelector("#debateToggle"),
  narrativeToggle: document.querySelector("#narrativeToggle"),
  importanceRange: document.querySelector("#importanceRange"),
  importanceReadout: document.querySelector("#importanceReadout"),
  densitySelect: document.querySelector("#densitySelect"),
  eventCount: document.querySelector("#eventCount"),
  yearRange: document.querySelector("#yearRange"),
  visibleRange: document.querySelector("#visibleRange"),
  decadeSummary: document.querySelector("#decadeSummary"),
  stickyDecade: document.querySelector("#stickyDecade"),
  selectedRibbon: document.querySelector("#selectedRibbon"),
  viewport: document.querySelector("#timelineViewport"),
  canvas: document.querySelector("#timelineCanvas"),
  tickLayer: document.querySelector("#tickLayer"),
  densityLayer: document.querySelector("#densityLayer"),
  spanLayer: document.querySelector("#spanLayer"),
  cardLayer: document.querySelector("#cardLayer"),
  arcLayer: document.querySelector("#arcLayer"),
  focusArcLayer: document.querySelector("#focusArcLayer"),
  contextLayer: document.querySelector("#contextLayer"),
  lensSelect: document.querySelector("#lensSelect"),
  weekSelect: document.querySelector("#weekSelect"),
  analysisLens: document.querySelector("#analysisLens"),
  linksToggle: document.querySelector("#linksToggle"),
  legendToggle: document.querySelector("#legendToggle"),
  glossaryToggle: document.querySelector("#glossaryToggle"),
  legendPanel: document.querySelector("#legendPanel"),
  glossaryPanel: document.querySelector("#glossaryPanel"),
  bibliographyPanel: document.querySelector("#bibliographyPanel"),
  trailPanel: document.querySelector("#trailPanel"),
  chainPanel: document.querySelector("#chainPanel"),
  listPanel: document.querySelector("#listPanel"),
  heatmapTrack: document.querySelector("#heatmapTrack"),
  minimapTrack: document.querySelector("#minimapTrack"),
  minimapWindow: document.querySelector("#minimapWindow"),
  hoverPreview: document.querySelector("#hoverPreview"),
  detail: document.querySelector("#eventDetail"),
  zoomRange: document.querySelector("#zoomRange"),
  zoomIn: document.querySelector("#zoomIn"),
  zoomOut: document.querySelector("#zoomOut"),
  zoomReadout: document.querySelector("#zoomReadout"),
  fitTimeline: document.querySelector("#fitTimeline")
};

function setPanelOpen(panel, trigger, open) {
  if (!panel || !trigger) return;
  panel.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  trigger.classList.toggle("is-active", open);
}

function togglePanel(panel, trigger) {
  setPanelOpen(panel, trigger, panel.hidden);
}

function typeClass(type) {
  return `type-${type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function eventById(id) {
  return state.events.find((event) => event.id === id);
}

function actorGlyph(event) {
  const type = event.type || "";
  const facets = event.facets || {};
  if (type.includes("Court")) return "§";
  if (type.includes("State") || facets.governance) return "G";
  if (type.includes("Corporate")) return "$";
  if (type.includes("Data")) return "#";
  if (type.includes("Infrastructure")) return "N";
  if (type.includes("Research") || type.includes("Theory")) return "L";
  return TYPE_ICON[type] || "•";
}

function activeDensity() {
  return DENSITY[state.density] || DENSITY.normal;
}

function highlight(value = "") {
  const escaped = escapeHtml(value);
  const query = state.query.trim();
  if (!query) return escaped;
  const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return escaped.replace(pattern, "<mark>$1</mark>");
}

function eventText(event) {
  return [
    event.title,
    event.yearLabel,
    event.type,
    event.summary,
    event.sourceNote,
    event.vaultNote?.keyClaim,
    event.vaultNote?.citation,
    ...(event.concepts || [])
  ].join(" ").toLowerCase();
}

function excerpt(value = "", limit = 180) {
  if (value.length <= limit) return value;
  const slice = value.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 100 ? lastSpace : limit).trim()}…`;
}

function visibleEvents() {
  const query = state.query.trim().toLowerCase();
  return state.events.filter((event) => {
    const typeMatch = state.activeTypes.has(event.type);
    const queryMatch = !query || eventText(event).includes(query);
    const weekMatch = !state.week || event.week === state.week;
    const importanceMatch = importanceScore(event) >= state.minImportance;
    const newMatch = !state.newOnly || event.isNew;
    const lensMatch = !state.analysisLens
      || (state.analysisLens === "governance" && event.facets?.governance)
      || (state.analysisLens !== "governance" && (event.facets?.[state.analysisLens] || []).length);
    return typeMatch && queryMatch && weekMatch && importanceMatch && newMatch && lensMatch;
  });
}

function selectedIndex(events = visibleEvents()) {
  if (!state.selectedId) return -1;
  return events.findIndex((event) => event.id === state.selectedId);
}

function selectEvent(id, options = {}) {
  const event = eventById(id);
  if (!event) return;
  state.selectedId = id;
  state.showVaultNote = Boolean(options.showVaultNote);
  state.noteSection = "";
  scrollEventIntoView(event);
  renderTimeline();
}

function selectAdjacent(direction) {
  const events = visibleEvents();
  if (!events.length) return;
  const current = selectedIndex(events);
  const next = current === -1
    ? (direction > 0 ? 0 : events.length - 1)
    : Math.max(0, Math.min(events.length - 1, current + direction));
  selectEvent(events[next].id);
}

function qualityClass(event) {
  return `quality-${(event.quality?.label || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function eventImportance(event) {
  return event.centrality >= 16 ? "importance-high" : event.centrality >= 8 ? "importance-medium" : "importance-normal";
}

function importanceScore(event) {
  return Number(event.centrality || 0);
}

function whyItMatters(event) {
  const facets = event.facets || {};
  if (facets.governance || event.type.includes("State") || event.type.includes("Court")) {
    return "This is a governance move: it changes who can authorize, constrain, or contest AI systems.";
  }
  if ((facets.material || []).length || event.type.includes("Infrastructure") || event.type.includes("Data")) {
    return "This shifts the material base of AI: data, compute, benchmarks, or infrastructure become historical force.";
  }
  if (event.type.includes("Corporate")) {
    return "This matters because corporate strategy turns technical possibility into institutions, markets, and defaults.";
  }
  if ((facets.closure || []).length) {
    return "This matters as a closure device: it narrows what counts as progress, proof, or success.";
  }
  return "This matters because it changes the vocabulary, institutions, or standards through which AI becomes legible.";
}

function currentDecade() {
  return Math.floor(xToYear(els.viewport.scrollLeft + els.viewport.clientWidth * 0.45) / 10) * 10;
}

function decadeMicroSummary(decade, events = visibleEvents()) {
  const decadeEvents = events.filter((event) => event.startYear >= decade && event.startYear < decade + 10);
  if (!decadeEvents.length) return `${decade}s · no visible events`;
  const topTypes = [...decadeEvents.reduce((map, event) => map.set(event.type, (map.get(event.type) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type]) => type.toLowerCase());
  const high = decadeEvents.filter((event) => importanceScore(event) >= 8).length;
  return `${decade}s · ${decadeEvents.length} visible · ${topTypes.join(" + ")} · ${high} structural`;
}

function chainIds(rootId) {
  if (!rootId) return new Set();
  const ids = new Set([rootId]);
  const root = eventById(rootId);
  (root?.links || []).forEach((id) => ids.add(id));
  for (const event of state.events) {
    if ((event.links || []).includes(rootId)) ids.add(event.id);
  }
  return ids;
}

function analysisSummary(event) {
  if (!state.analysisLens) return "";
  if (state.analysisLens === "governance") return event.facets?.governance ? "governance signal" : "";
  const values = event.facets?.[state.analysisLens] || [];
  return values.length ? values.slice(0, 3).join(", ") : "";
}

function displayDate(event) {
  if (!event.date) return event.yearLabel;
  const [y, m, d] = event.date.split("-").map(Number);
  return d ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`;
}

function decimalFromDate(date) {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 1);
  const days = (Date.UTC(y + 1, 0, 1) - start) / 864e5;
  return y + (Date.UTC(y, m - 1, d) - start) / 864e5 / days;
}

// Year-only events sit mid-year so they land between that year's tick and the next.
function eventStart(event) {
  if (event.date) return decimalFromDate(event.date);
  if (eventEnd(event)) return event.startYear;
  return event.startYear + 0.5;
}

function eventEnd(event) {
  if (event.endYear && event.endYear > event.startYear) return event.endYear + 1;
  return null;
}

function yearToX(year) {
  return LEFT_PAD + (year - state.bounds.min) * state.pxPerYear;
}

function xToYear(x) {
  return state.bounds.min + (x - LEFT_PAD) / state.pxPerYear;
}

function canvasWidth() {
  return Math.ceil(LEFT_PAD + RIGHT_PAD + (state.bounds.max - state.bounds.min) * state.pxPerYear);
}

function fitPxPerYear() {
  const usable = Math.max(200, els.viewport.clientWidth - LEFT_PAD - 120);
  return usable / Math.max(1, state.bounds.max - state.bounds.min);
}

function clampPx(px) {
  return Math.max(fitPxPerYear(), Math.min(MAX_PX_PER_YEAR, px));
}

function sliderFromPx(px) {
  const min = Math.log(fitPxPerYear());
  const max = Math.log(MAX_PX_PER_YEAR);
  return Math.round(((Math.log(px) - min) / (max - min)) * 1000);
}

function pxFromSlider(value) {
  const min = Math.log(fitPxPerYear());
  const max = Math.log(MAX_PX_PER_YEAR);
  return Math.exp(min + (value / 1000) * (max - min));
}

function formatTick(year, step) {
  if (step >= 1) return String(Math.round(year));
  const whole = Math.floor(year + 1e-6);
  const month = Math.round((year - whole) * 12) % 12;
  return month === 0 ? String(whole) : `${MONTHS[month]} ${whole}`;
}

function tickStep() {
  return TICK_STEPS.find((step, index) => {
    const next = TICK_STEPS[index + 1];
    return !next || next * state.pxPerYear < 90;
  });
}

function renderTicks() {
  const step = tickStep();
  const minorStep = MINOR_STEP.get(step);
  const showMinor = minorStep && minorStep * state.pxPerYear >= 8;
  const left = els.viewport.scrollLeft - els.viewport.clientWidth;
  const right = els.viewport.scrollLeft + els.viewport.clientWidth * 2;
  const from = Math.max(state.bounds.min, xToYear(left));
  const to = Math.min(state.bounds.max, xToYear(right));
  const ticks = [];
  const drawStep = showMinor ? minorStep : step;
  const first = Math.ceil((from - 1e-9) / drawStep) * drawStep;
  for (let year = first; year <= to + 1e-9; year += drawStep) {
    const isMajor = Math.abs(year / step - Math.round(year / step)) < 1e-6;
    const x = yearToX(year).toFixed(1);
    ticks.push(isMajor
      ? `<span class="year-tick major" style="left:${x}px"><span>${formatTick(year, step)}</span></span>`
      : `<span class="year-tick minor" style="left:${x}px"></span>`);
  }
  els.tickLayer.innerHTML = ticks.join("");
  els.zoomReadout.textContent = STEP_LABEL.get(step);
  const viewFrom = xToYear(els.viewport.scrollLeft);
  const viewTo = xToYear(els.viewport.scrollLeft + els.viewport.clientWidth);
  els.visibleRange.textContent = `${formatTick(Math.max(state.bounds.min, viewFrom), step)} – ${formatTick(Math.min(state.bounds.max, viewTo), step)}`;
  els.decadeSummary.textContent = decadeMicroSummary(currentDecade());
  els.stickyDecade.textContent = `${currentDecade()}s`;
}

function layoutCards(events, axisY) {
  const density = activeDensity();
  const compact = layoutWithSize(events, axisY, density.compact);
  if (state.pxPerYear < FULL_CARD_THRESHOLD) return compact;
  const full = layoutWithSize(events, axisY, density.full);
  const viewLeft = els.viewport.scrollLeft;
  const viewRight = viewLeft + els.viewport.clientWidth;
  const pins = (layout) => layout.filter((item) => item.pinOnly && item.x >= viewLeft && item.x <= viewRight).length;
  return pins(full) <= pins(compact) ? full : compact;
}

function layoutWithSize(events, axisY, size) {
  const gap = activeDensity().gap;
  const lanesPerSide = Math.max(1, Math.floor((axisY - 34) / (size.height + gap)));
  const lanes = [];
  for (let i = 0; i < lanesPerSide; i += 1) {
    lanes.push({ side: "above", index: i, end: -Infinity });
    lanes.push({ side: "below", index: i, end: -Infinity });
  }
  return events
    .map((event) => ({ event, x: yearToX(eventStart(event)) }))
    .sort((a, b) => a.x - b.x)
    .map(({ event, x }) => {
      const left = x - 18;
      const lane = lanes.find((candidate) => candidate.end + gap < left);
      if (!lane) return { event, x, pinOnly: true };
      lane.end = left + size.width;
      const stem = 22 + lane.index * (size.height + gap);
      const top = lane.side === "above" ? axisY - stem - size.height : axisY + stem;
      return { event, x, left, top, stem, side: lane.side, size };
    });
}

function connectedIds(id) {
  const ids = new Set();
  for (const event of state.events) {
    if (event.id === id) (event.links || []).forEach((link) => ids.add(link));
    else if ((event.links || []).includes(id)) ids.add(event.id);
  }
  return ids;
}

function focusClass(event) {
  if (state.narrativeMode && importanceScore(event) < 12 && !event.isNew) return "dim";
  if (state.debateMap && !(event.facets?.controversy || []).length && !event.type.includes("Court") && !event.type.includes("Critique")) return "dim";
  if (state.chainRootId) {
    return chainIds(state.chainRootId).has(event.id) ? "in-chain" : "dim";
  }
  if (state.lens && !(event.allConcepts || event.concepts || []).includes(state.lens)) return "dim";
  if (state.lens) return "in-lens";
  if (!state.selectedId || event.id === state.selectedId) return "";
  const connected = connectedIds(state.selectedId);
  if (!connected.size) return "";
  return connected.has(event.id) ? "is-linked" : "dim";
}

function cardTemplate({ event, x, left, top, stem, side, size, pinOnly }) {
  const pressed = state.selectedId === event.id ? "true" : "false";
  const icon = TYPE_ICON[event.type] || "•";
  const actor = actorGlyph(event);
  const quality = event.quality?.label || "unknown";
  const analytic = analysisSummary(event);
  if (pinOnly) {
    const label = `${displayDate(event)}: ${event.title}`;
    return `<button class="event-pin ${typeClass(event.type)} ${qualityClass(event)} ${eventImportance(event)} ${focusClass(event)}" type="button" data-id="${escapeHtml(event.id)}" aria-pressed="${pressed}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="left:${x.toFixed(1)}px"><span>${escapeHtml(actor)}</span></button>`;
  }
  const full = size.height >= activeDensity().full.height;
  const concepts = full
    ? `<span class="concepts">${(event.concepts || []).slice(0, 3).map((c) => `<span>${escapeHtml(c)}</span>`).join("")}</span>`
    : "";
  const summary = full ? `<p>${escapeHtml(excerpt(event.summary))}</p>` : "";
  const typePill = full ? `<span class="type-pill"><span class="type-icon">${escapeHtml(icon)}</span>${escapeHtml(event.type)}</span>` : "";
  return `
    <button class="event-card ${full ? "full" : "compact"} ${side} ${typeClass(event.type)} ${qualityClass(event)} ${eventImportance(event)} ${event.status === "gap" ? "gap" : ""} ${event.isNew ? "is-new" : ""} ${focusClass(event)}" type="button" data-id="${escapeHtml(event.id)}" aria-pressed="${pressed}" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${size.width}px;height:${size.height}px;--stem:${stem}px">
      <span class="event-meta">
        <span class="year-pill">${escapeHtml(displayDate(event))}</span>
        <span class="actor-glyph" title="Institutional actor">${escapeHtml(actor)}</span>
        ${typePill}
        ${event.isNew ? `<span class="new-pill">New</span>` : ""}
      </span>
      <strong>${highlight(event.title)}</strong>
      ${summary}
      ${analytic ? `<span class="analysis-hit">${escapeHtml(analytic)}</span>` : ""}
      <span class="quality-dot" title="${escapeHtml(quality)}"></span>
      ${concepts}
    </button>
  `;
}

function renderTimeline() {
  const events = visibleEvents();
  const height = els.viewport.clientHeight;
  const axisY = Math.round(height / 2);
  document.body.classList.toggle("zoom-close", state.pxPerYear >= FULL_CARD_THRESHOLD);
  document.body.classList.toggle("zoom-far", state.pxPerYear < 24);
  document.body.classList.toggle("debate-mode", state.debateMap);
  document.body.classList.toggle("narrative-mode", state.narrativeMode);
  els.canvas.style.width = `${canvasWidth()}px`;
  els.canvas.style.setProperty("--axis-y", `${axisY}px`);

  if (!events.length) {
    els.cardLayer.innerHTML = `<div class="empty-state empty-archive"><b>No visible events</b><span>Relax a filter, clear the preset, or lower the importance threshold.</span></div>`;
    els.spanLayer.innerHTML = "";
  } else {
    els.spanLayer.innerHTML = events
      .filter((event) => eventEnd(event))
      .map((event) => {
        const x1 = yearToX(event.startYear);
        const x2 = yearToX(eventEnd(event));
        return `<span class="event-span ${typeClass(event.type)} ${focusClass(event)}" style="left:${x1.toFixed(1)}px;width:${(x2 - x1).toFixed(1)}px"></span>`;
      })
      .join("");
    els.cardLayer.innerHTML = layoutCards(events, axisY).map(cardTemplate).join("");
  }
  renderArcs(events, axisY);

  els.zoomRange.value = String(sliderFromPx(state.pxPerYear));
  els.eventCount.textContent = String(events.length);
  if (events.length) {
    const min = Math.min(...events.map((event) => event.startYear));
    const max = Math.max(...events.map((event) => event.endYear || event.startYear));
    els.yearRange.textContent = `${min}–${max}`;
  } else {
    els.yearRange.textContent = "-";
  }
  renderTicks();
  renderDensityLayer(events, axisY);
  renderRibbon();
  renderList(events);
  renderMinimap(events);
  renderHeatmap(events);
  renderContextLayer(events);
  renderPanels();
  renderTrailPanel(events);
  renderChainPanel();
  renderDetail(state.events.find((item) => item.id === state.selectedId));
}

function renderDensityLayer(events, axisY) {
  const span = Math.max(1, state.bounds.max - state.bounds.min);
  const buckets = new Map();
  for (const event of events) {
    const decade = Math.floor(event.startYear / 10) * 10;
    buckets.set(decade, (buckets.get(decade) || 0) + 1);
  }
  const max = Math.max(1, ...buckets.values());
  els.densityLayer.innerHTML = Array.from(buckets.entries()).map(([decade, count]) => {
    const left = yearToX(decade);
    const width = Math.max(12, (10 / span) * (canvasWidth() - LEFT_PAD - RIGHT_PAD));
    const height = 4 + Math.round(10 * count / max);
    return `<span class="axis-density-band" style="left:${left.toFixed(1)}px;width:${width.toFixed(1)}px;height:${height}px;top:${axisY - Math.round(height / 2)}px"></span>`;
  }).join("");
}

function renderRibbon() {
  const event = eventById(state.selectedId);
  if (!event) {
    els.selectedRibbon.hidden = true;
    return;
  }
  els.selectedRibbon.hidden = false;
  els.selectedRibbon.className = `selected-ribbon ${typeClass(event.type)}`;
  els.selectedRibbon.innerHTML = `
    <button type="button" data-step="-1" aria-label="Previous event">‹</button>
    <span><b>${escapeHtml(displayDate(event))}</b> ${escapeHtml(event.title)}</span>
    <button type="button" data-step="1" aria-label="Next event">›</button>
  `;
}

function renderList(events) {
  const isListMode = state.viewMode === "list";
  const minimap = els.minimapTrack.closest(".minimap");
  document.body.classList.toggle("is-list-mode", isListMode);
  els.viewport.hidden = isListMode;
  if (minimap) minimap.hidden = isListMode;
  els.listPanel.hidden = !isListMode;
  if (els.listPanel.hidden) return;
  els.listPanel.innerHTML = events.map((event) => `
    <button class="list-event ${typeClass(event.type)} ${qualityClass(event)}" type="button" data-id="${escapeHtml(event.id)}">
      <span>${escapeHtml(displayDate(event))}</span>
      <strong>${highlight(event.title)}</strong>
      <em>${escapeHtml(event.type)}</em>
      <small>${escapeHtml(excerpt(event.summary, 130))}</small>
    </button>
  `).join("") || `<p class="empty-state">No events match those filters.</p>`;
}

function renderMinimap(events) {
  const span = Math.max(1, state.bounds.max - state.bounds.min);
  els.minimapTrack.innerHTML = events.map((event) => {
    const left = ((eventStart(event) - state.bounds.min) / span) * 100;
    const width = eventEnd(event) ? Math.max(0.45, ((eventEnd(event) - event.startYear) / span) * 100) : 0.45;
    return `<span class="${typeClass(event.type)}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span>`;
  }).join("");
  const leftYear = xToYear(els.viewport.scrollLeft);
  const rightYear = xToYear(els.viewport.scrollLeft + els.viewport.clientWidth);
  const left = Math.max(0, ((leftYear - state.bounds.min) / span) * 100);
  const width = Math.min(100 - left, Math.max(6, ((rightYear - leftYear) / span) * 100));
  els.minimapWindow.style.left = `${left}%`;
  els.minimapWindow.style.width = `${width}%`;
}

function renderHeatmap(events) {
  const span = Math.max(1, state.bounds.max - state.bounds.min);
  const buckets = new Map();
  for (const event of events) {
    const decade = Math.floor(event.startYear / 10) * 10;
    buckets.set(decade, (buckets.get(decade) || 0) + 1);
  }
  const max = Math.max(1, ...buckets.values());
  els.heatmapTrack.innerHTML = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]).map(([decade, count]) => {
    const left = ((decade - state.bounds.min) / span) * 100;
    const width = Math.max(3, (10 / span) * 100);
    return `<span title="${decade}s: ${count} events" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;opacity:${(0.24 + 0.64 * count / max).toFixed(2)}"></span>`;
  }).join("");
}

function renderContextLayer(events) {
  if (!state.worldLayers.size) {
    els.contextLayer.innerHTML = "";
    return;
  }
  const layerOrder = ["power", "material", "closure", "controversy"];
  els.contextLayer.innerHTML = events.flatMap((event) => {
    const left = yearToX(eventStart(event));
    return layerOrder
      .filter((layer) => state.worldLayers.has(layer) && (event.facets?.[layer] || []).length)
      .map((layer, index) => `<span class="context-mark context-${layer}" title="${escapeHtml(event.title)} · ${layer}" style="left:${left.toFixed(1)}px;--row:${index}"></span>`);
  }).join("");
}

function renderPanels() {
  els.legendPanel.hidden = !state.showLegend;
  els.glossaryPanel.hidden = !state.showGlossary;
  els.bibliographyPanel.hidden = !state.showBibliography;
  if (state.showLegend) {
    const warningCount = timelinePayload.warnings?.length || 0;
    els.legendPanel.innerHTML = `
      <h2>Legend</h2>
      <div class="legend-grid">${typeOrder.map((type) => `<span class="${typeClass(type)}"><b>${escapeHtml(TYPE_ICON[type] || "•")}</b>${escapeHtml(type)}</span>`).join("")}</div>
      <p><b>${state.events.length}</b> events · <b>${timelinePayload.offloadedNotes?.length || 0}</b> offloaded note · <b>${warningCount}</b> audit warnings</p>
      <p>Quality dots: complete, solid draft, thin, unavailable. Larger event pins mean more links and backlinks.</p>
    `;
  }
  if (state.showGlossary) {
    els.glossaryPanel.innerHTML = `
      <h2>Technology History Terms</h2>
      <dl>${Object.entries(GLOSSARY).map(([term, definition]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(definition)}</dd>`).join("")}</dl>
    `;
  }
  if (state.showBibliography) {
    const events = visibleEvents().filter((event) => event.vaultNote?.citation || event.sourceNote);
    els.bibliographyPanel.innerHTML = `
      <h2>Visible Bibliography</h2>
      <ol>${events.map((event) => `<li><b>${escapeHtml(displayDate(event))} · ${escapeHtml(event.title)}</b><span>${escapeHtml(event.vaultNote?.citation || event.sourceNote || "No source listed")}</span></li>`).join("")}</ol>
    `;
  }
}

function renderTrailPanel(events) {
  if (!state.lens) {
    els.trailPanel.hidden = true;
    return;
  }
  const trail = events
    .filter((event) => (event.allConcepts || event.concepts || []).includes(state.lens))
    .sort((a, b) => eventStart(a) - eventStart(b))
    .slice(0, 12);
  els.trailPanel.hidden = !trail.length;
  if (!trail.length) return;
  els.trailPanel.innerHTML = `
    <h2>Argument Trail · ${escapeHtml(state.lens)}</h2>
    <ol>${trail.map((event) => `<li><button type="button" data-goto="${escapeHtml(event.id)}"><b>${escapeHtml(displayDate(event))}</b><span>${escapeHtml(event.title)}</span><small>${escapeHtml(whyItMatters(event))}</small></button></li>`).join("")}</ol>
  `;
}

function renderChainPanel() {
  const root = eventById(state.chainRootId);
  if (!root) {
    els.chainPanel.hidden = true;
    return;
  }
  const ids = chainIds(root.id);
  const chain = state.events.filter((event) => ids.has(event.id)).sort((a, b) => eventStart(a) - eventStart(b));
  els.chainPanel.hidden = false;
  els.chainPanel.innerHTML = `
    <div>
      <strong>Chain View</strong>
      <span>${escapeHtml(root.title)} · ${chain.length} connected events</span>
    </div>
    <button class="chip" type="button" data-clear-chain>Clear</button>
  `;
}

function renderDecadeShortcuts() {
  const decades = [];
  for (let year = Math.ceil(state.bounds.min / 10) * 10; year <= state.bounds.max; year += 10) decades.push(year);
  els.decadeShortcuts.innerHTML = decades.map((year) => `<button class="chip" type="button" data-year="${year}">${year}s</button>`).join("");
}

function arcPath(a, b, axisY) {
  const x1 = yearToX(eventStart(a));
  const x2 = yearToX(eventStart(b));
  const height = Math.min((axisY - 16) * 0.75, 20 + Math.abs(x2 - x1) * 0.2);
  return `M${x1.toFixed(1)} ${axisY} C${x1.toFixed(1)} ${axisY - height} ${x2.toFixed(1)} ${axisY - height} ${x2.toFixed(1)} ${axisY}`;
}

function renderArcs(events, axisY) {
  const byId = new Map(events.map((event) => [event.id, event]));
  const pairs = new Map();
  for (const event of events) {
    for (const link of event.links || []) {
      if (!byId.has(link)) continue;
      const key = [event.id, link].sort().join("|");
      if (!pairs.has(key)) pairs.set(key, [event, byId.get(link)]);
    }
  }
  const lensed = (event) => !state.lens || (event.allConcepts || []).includes(state.lens);
  const background = [];
  const focus = [];
  for (const [a, b] of pairs.values()) {
    const path = arcPath(a, b, axisY);
    if (state.selectedId && (a.id === state.selectedId || b.id === state.selectedId)) {
      const other = a.id === state.selectedId ? b : a;
      focus.push(`<path class="arc focus ${typeClass(other.type)}" d="${path}"/>`);
    } else if (state.showLinks) {
      background.push(`<path class="arc ${lensed(a) && lensed(b) ? "" : "dim"}" d="${path}"/>`);
    }
  }
  const width = canvasWidth();
  const height = els.viewport.clientHeight;
  for (const [layer, paths] of [[els.arcLayer, background], [els.focusArcLayer, focus]]) {
    layer.setAttribute("viewBox", `0 0 ${width} ${height}`);
    layer.setAttribute("width", width);
    layer.setAttribute("height", height);
    layer.innerHTML = paths.join("");
  }
}

function renderLensOptions() {
  const counts = new Map();
  for (const event of state.events) {
    for (const concept of event.allConcepts || event.concepts || []) counts.set(concept, (counts.get(concept) || 0) + 1);
  }
  const options = [...counts].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  els.lensSelect.innerHTML = `<option value="">No concept lens</option>${options
    .map(([concept, count]) => `<option value="${escapeHtml(concept)}">${escapeHtml(concept)} (${count})</option>`)
    .join("")}`;
}

// Week labels look like "Sep 21 · Open weights and the China shock"; the course runs Fall 2026.
function renderWeekOptions() {
  const weeks = [...new Set(state.events.map((event) => event.week).filter(Boolean))]
    .sort((a, b) => Date.parse(`${a.split(" · ")[0]} 2026`) - Date.parse(`${b.split(" · ")[0]} 2026`));
  els.weekSelect.innerHTML = `<option value="">All weeks</option>${weeks
    .map((week) => `<option value="${escapeHtml(week)}">${escapeHtml(week)}</option>`)
    .join("")}`;
  els.weekSelect.hidden = !weeks.length;
}

function setLens(concept) {
  state.lens = concept;
  if (concept && ![...els.lensSelect.options].some((option) => option.value === concept)) {
    els.lensSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(concept)}">${escapeHtml(concept)}</option>`);
  }
  els.lensSelect.value = concept;
  renderTimeline();
}

let presetShiftTimer;

function applyPreset(name) {
  const allTypes = new Set(typeOrder);
  state.query = "";
  state.week = "";
  state.newOnly = false;
  state.chainRootId = null;
  state.worldLayers.clear();
  state.activeTypes = allTypes;
  if (name === "governance") {
    state.analysisLens = "governance";
    state.worldLayers.add("power").add("closure").add("controversy");
    state.activeTypes = new Set(["Critique / governance", "State / policy", "Court / litigation", "Corporate release"]);
  } else if (name === "infrastructure") {
    state.analysisLens = "material";
    state.worldLayers.add("material").add("power");
    state.activeTypes = new Set(["Infrastructure / compute", "Data / benchmark", "Model innovation", "Corporate release"]);
  } else if (name === "corporate") {
    state.analysisLens = "power";
    state.worldLayers.add("power").add("controversy");
    state.activeTypes = new Set(["Corporate release", "Infrastructure / compute", "Court / litigation", "State / policy"]);
  } else if (name === "benchmarks") {
    state.analysisLens = "closure";
    state.worldLayers.add("closure").add("material");
    state.activeTypes = new Set(["Data / benchmark", "Research source", "Model innovation"]);
  }
  els.search.value = "";
  els.weekSelect.value = "";
  els.analysisLens.value = state.analysisLens;
  document.querySelectorAll("[data-world-layer]").forEach((button) => {
    const active = state.worldLayers.has(button.dataset.worldLayer);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderTypeFilters();
  document.body.classList.remove("preset-shift");
  void document.body.offsetWidth;
  document.body.classList.add("preset-shift");
  clearTimeout(presetShiftTimer);
  presetShiftTimer = setTimeout(() => document.body.classList.remove("preset-shift"), 520);
  renderTimeline();
}

function scrollEventIntoView(event) {
  const x = yearToX(eventStart(event));
  const { scrollLeft, clientWidth } = els.viewport;
  if (x < scrollLeft + 40 || x > scrollLeft + clientWidth - 400) {
    els.viewport.scrollLeft = x - clientWidth / 3;
  }
}

function renderDetail(event) {
  if (!event) {
    els.detail.hidden = true;
    return;
  }
  els.detail.hidden = false;
  const conceptList = event.allConcepts?.length ? event.allConcepts : event.concepts || [];
  const concepts = conceptList.length
    ? conceptList.map((concept) => `<button class="concept-link" type="button" data-lens="${escapeHtml(concept)}">${escapeHtml(concept)}</button>`).join("")
    : "Unclassified";
  const connected = [...connectedIds(event.id)]
    .map((id) => state.events.find((item) => item.id === id))
    .filter(Boolean)
    .sort((a, b) => eventStart(a) - eventStart(b));
  const connections = connected.length
    ? `<div class="connections"><span>Connected</span>${connected
      .map((item) => `<button class="connection-link ${typeClass(item.type)}" type="button" data-goto="${escapeHtml(item.id)}"><b>${escapeHtml(displayDate(item))}</b> ${escapeHtml(item.title)}</button>`)
      .join("")}</div>`
    : "";
  const backlinks = (event.backlinks || [])
    .map((id) => state.events.find((item) => item.id === id))
    .filter(Boolean)
    .sort((a, b) => eventStart(a) - eventStart(b));
  const backlinkPanel = backlinks.length
    ? `<div class="connections"><span>Backlinks</span>${backlinks
      .map((item) => `<button class="connection-link ${typeClass(item.type)}" type="button" data-goto="${escapeHtml(item.id)}"><b>${escapeHtml(displayDate(item))}</b> ${escapeHtml(item.title)}</button>`)
      .join("")}</div>`
    : "";
  const source = event.sourceUrl
    ? `<a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(event.sourceNote || event.sourceUrl)}</a>`
    : escapeHtml(event.sourceNote || "Vault note");
  const noteAvailable = event.vaultNote?.available && event.vaultNote.html;
  const noteSections = event.vaultNote?.sections || [];
  const sectionNav = noteSections.length
    ? `<div class="section-nav" role="group" aria-label="Vault note sections">${noteSections
      .map((section) => `<button type="button" data-note-section="${escapeHtml(section.id)}" class="${state.noteSection === section.id ? "is-active" : ""}">${escapeHtml(section.title)}</button>`)
      .join("")}</div>`
    : "";
  const noteHtml = state.noteSection
    ? noteSections.find((section) => section.id === state.noteSection)?.html || event.vaultNote.html
    : event.vaultNote.html;
  const noteButton = noteAvailable
    ? `<button class="vault-note-toggle" type="button" data-toggle-note aria-expanded="${state.showVaultNote ? "true" : "false"}">${state.showVaultNote ? "Hide full vault note" : "Read full vault note"}</button>`
    : `<p class="vault-note-unavailable">Full vault note is unavailable locally. Open Obsidian or download the iCloud note, then run <code>npm run update</code>.</p>`;
  const notePanel = noteAvailable && state.showVaultNote
    ? `<section class="vault-note" aria-label="Full Obsidian note">
        <div class="vault-note-kicker">Obsidian note · ${escapeHtml(event.vaultNote.title)}</div>
        ${sectionNav}
        ${noteHtml}
      </section>`
    : "";
  const quality = event.quality || { label: "unknown", score: 0, missing: [] };
  const facets = event.facets || {};
  const facetRows = [
    ["Decision makers", facets.decision],
    ["Power / institution", facets.power],
    ["Material infrastructure", facets.material],
    ["Closure devices", facets.closure],
    ["Controversy", facets.controversy]
  ].filter(([, values]) => values?.length);
  const claims = `
    <div class="analysis-boxes">
      ${event.vaultNote?.citation ? `<section><span>Citation / Source</span><p>${escapeHtml(event.vaultNote.citation)}</p></section>` : ""}
      ${event.vaultNote?.keyClaim ? `<section><span>Key Claim</span><p>${escapeHtml(event.vaultNote.keyClaim)}</p></section>` : ""}
      <section><span>Why This Matters</span><p>${escapeHtml(whyItMatters(event))}</p></section>
      <section><span>Reading Prompt</span><p>Who gets to decide what counts as success here, who benefits from that definition, and what world of labs, capital, law, data, labor, or infrastructure makes the event possible?</p></section>
    </div>`;
  const facetHtml = facetRows.length
    ? `<div class="facet-grid">${facetRows.map(([label, values]) => `<div><span>${escapeHtml(label)}</span>${values.slice(0, 6).map((value) => `<b>${escapeHtml(value)}</b>`).join("")}</div>`).join("")}</div>`
    : "";
  const noteStatus = !noteAvailable
    ? `<p class="vault-note-unavailable">This event is missing full note content in the local export.</p>`
    : "";
  els.detail.className = `detail-panel ${typeClass(event.type)}`;
  els.detail.innerHTML = `
    <button class="detail-close" type="button" aria-label="Close details">×</button>
    <div class="detail-nav" role="group" aria-label="Event navigation">
      <button type="button" data-step="-1">Previous</button>
      <button type="button" data-step="1">Next</button>
    </div>
    <span class="type-pill">${escapeHtml(event.type)}</span>
    ${event.draft ? `<span class="draft-pill" title="Drafted by Claude, not yet reviewed">Draft</span>` : ""}
    ${event.isNew ? `<span class="draft-pill">New</span>` : ""}
    <span class="quality-badge ${qualityClass(event)}">${escapeHtml(quality.label)} · ${quality.score}/10</span>
    <h2>${escapeHtml(event.title)}</h2>
    <p>${highlight(event.summary)}</p>
    ${event.detail ? `<p class="detail-claim">${escapeHtml(event.detail)}</p>` : ""}
    <div class="detail-grid">
      <div><span>Date</span>${escapeHtml(displayDate(event))}</div>
      <div><span>Concepts</span>${concepts}</div>
      <div><span>Source</span>${source}</div>
      <div><span>Centrality</span>${event.centrality || 0} links/backlinks</div>
      <div><span>Completeness</span>${quality.missing?.length ? `Missing ${escapeHtml(quality.missing.join(", "))}` : "No major gaps flagged"}</div>
    </div>
    <div class="detail-actions">
      ${event.obsidianUri ? `<a class="vault-note-toggle" href="${escapeHtml(event.obsidianUri)}">Open in Obsidian</a>` : ""}
      <button class="vault-note-toggle secondary-action" type="button" data-show-chain="${escapeHtml(event.id)}">${state.chainRootId === event.id ? "Refresh chain" : "Show chain"}</button>
    </div>
    ${noteStatus}
    ${claims}
    ${facetHtml}
    <div class="vault-note-actions">${noteButton}</div>
    ${notePanel}
    ${connections}
    ${backlinkPanel}
  `;
}

function renderTypeFilters() {
  const present = new Set(state.events.map((event) => event.type));
  els.typeFilters.innerHTML = typeOrder
    .filter((type) => present.has(type))
    .map((type) => {
      const active = state.activeTypes.has(type);
      return `<button class="chip ${active ? "is-active" : ""} ${typeClass(type)}" type="button" data-type="${escapeHtml(type)}" aria-pressed="${active ? "true" : "false"}">${escapeHtml(type)}</button>`;
    })
    .join("");
}

function zoomTo(px, viewportX = els.viewport.clientWidth / 2) {
  const anchorYear = xToYear(els.viewport.scrollLeft + viewportX);
  state.pxPerYear = clampPx(px);
  els.canvas.style.width = `${canvasWidth()}px`;
  els.viewport.scrollLeft = yearToX(anchorYear) - viewportX;
  renderTimeline();
}

function fitTimeline() {
  state.pxPerYear = fitPxPerYear();
  renderTimeline();
  els.viewport.scrollLeft = 0;
  renderTicks();
}

function computeBounds() {
  if (!state.events.length) return;
  const starts = state.events.map((event) => event.startYear);
  const ends = state.events.map((event) => (event.endYear || event.startYear) + 1);
  state.bounds = {
    min: Math.floor(Math.min(...starts) / 10) * 10,
    max: Math.ceil(Math.max(...ends) / 10) * 10
  };
}

async function init() {
  try {
    const payload = timelinePayload;
    state.events = payload.events;
    state.activeTypes = new Set(typeOrder);
    els.syncTime.textContent = new Date(payload.generatedAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    computeBounds();
    renderTypeFilters();
    renderLensOptions();
    renderWeekOptions();
    renderDecadeShortcuts();
    fitTimeline();
  } catch (error) {
    els.cardLayer.innerHTML = `<p class="empty-state">The timeline data could not be loaded. Run <code>npm run update</code>, then refresh.</p>`;
    els.syncTime.textContent = "Data unavailable";
  }
}

els.filtersToggle.addEventListener("click", () => {
  togglePanel(els.filterDock, els.filtersToggle);
});

els.filtersClose.addEventListener("click", () => {
  setPanelOpen(els.filterDock, els.filtersToggle, false);
});

els.preferencesToggle.addEventListener("click", () => {
  togglePanel(els.preferencesMenu, els.preferencesToggle);
});

els.preferencesClose.addEventListener("click", () => {
  setPanelOpen(els.preferencesMenu, els.preferencesToggle, false);
});

els.typeFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-type]");
  if (!button) return;
  const type = button.dataset.type;
  if (state.activeTypes.has(type)) {
    state.activeTypes.delete(type);
  } else {
    state.activeTypes.add(type);
  }
  button.classList.toggle("is-active", state.activeTypes.has(type));
  button.setAttribute("aria-pressed", String(state.activeTypes.has(type)));
  renderTimeline();
});

els.resetFilters.addEventListener("click", () => {
  state.activeTypes = new Set(typeOrder);
  state.query = "";
  state.lens = "";
  state.week = "";
  state.analysisLens = "";
  state.minImportance = 0;
  state.newOnly = false;
  state.debateMap = false;
  state.narrativeMode = false;
  state.chainRootId = null;
  state.worldLayers.clear();
  state.selectedId = null;
  state.showVaultNote = false;
  els.search.value = "";
  els.lensSelect.value = "";
  els.weekSelect.value = "";
  els.analysisLens.value = "";
  els.importanceRange.value = "0";
  els.importanceReadout.textContent = "All";
  els.newOnlyToggle.setAttribute("aria-pressed", "false");
  els.newOnlyToggle.classList.remove("is-active");
  els.debateToggle.setAttribute("aria-pressed", "false");
  els.debateToggle.classList.remove("is-active");
  els.narrativeToggle.setAttribute("aria-pressed", "false");
  els.narrativeToggle.classList.remove("is-active");
  document.querySelectorAll("[data-world-layer]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.classList.remove("is-active");
  });
  renderTypeFilters();
  fitTimeline();
});

els.listToggle.addEventListener("click", () => {
  state.viewMode = state.viewMode === "list" ? "timeline" : "list";
  els.listToggle.setAttribute("aria-pressed", String(state.viewMode === "list"));
  els.listToggle.classList.toggle("is-active", state.viewMode === "list");
  renderTimeline();
});

els.readingModeToggle.addEventListener("click", () => {
  state.readingMode = !state.readingMode;
  document.body.classList.toggle("reading-mode", state.readingMode);
  els.readingModeToggle.setAttribute("aria-pressed", String(state.readingMode));
  els.readingModeToggle.classList.toggle("is-active", state.readingMode);
  setPanelOpen(els.preferencesMenu, els.preferencesToggle, false);
  setPanelOpen(els.filterDock, els.filtersToggle, false);
});

els.splitPaneToggle.addEventListener("click", () => {
  state.splitPane = !state.splitPane;
  document.body.classList.toggle("split-pane", state.splitPane);
  els.splitPaneToggle.setAttribute("aria-pressed", String(state.splitPane));
  els.splitPaneToggle.classList.toggle("is-active", state.splitPane);
  renderTimeline();
});

els.newOnlyToggle.addEventListener("click", () => {
  state.newOnly = !state.newOnly;
  els.newOnlyToggle.setAttribute("aria-pressed", String(state.newOnly));
  els.newOnlyToggle.classList.toggle("is-active", state.newOnly);
  renderTimeline();
});

els.debateToggle.addEventListener("click", () => {
  state.debateMap = !state.debateMap;
  els.debateToggle.setAttribute("aria-pressed", String(state.debateMap));
  els.debateToggle.classList.toggle("is-active", state.debateMap);
  if (state.debateMap) state.worldLayers.add("controversy");
  renderTimeline();
});

els.narrativeToggle.addEventListener("click", () => {
  state.narrativeMode = !state.narrativeMode;
  els.narrativeToggle.setAttribute("aria-pressed", String(state.narrativeMode));
  els.narrativeToggle.classList.toggle("is-active", state.narrativeMode);
  renderTimeline();
});

els.importanceRange.addEventListener("input", (event) => {
  state.minImportance = Number(event.target.value);
  els.importanceReadout.textContent = state.minImportance ? `${state.minImportance}+` : "All";
  renderTimeline();
});

els.presetRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset]");
  if (!button) return;
  applyPreset(button.dataset.preset);
});

els.darkToggle.addEventListener("click", () => {
  state.dark = !state.dark;
  document.documentElement.classList.toggle("theme-dark", state.dark);
  els.darkToggle.setAttribute("aria-pressed", String(state.dark));
  els.darkToggle.classList.toggle("is-active", state.dark);
});

els.printButton.addEventListener("click", () => window.print());

els.densitySelect.addEventListener("change", (event) => {
  state.density = event.target.value;
  renderTimeline();
});

els.jumpYear.addEventListener("change", (event) => {
  const year = Number(event.target.value);
  if (!Number.isFinite(year)) return;
  els.viewport.scrollLeft = Math.max(0, yearToX(year) - els.viewport.clientWidth / 2);
  renderTicks();
  renderMinimap(visibleEvents());
});

els.decadeShortcuts.addEventListener("click", (event) => {
  const button = event.target.closest("[data-year]");
  if (!button) return;
  const year = Number(button.dataset.year);
  els.viewport.scrollLeft = Math.max(0, yearToX(year) - 80);
  renderTicks();
  renderMinimap(visibleEvents());
});

els.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTimeline();
});

els.zoomRange.addEventListener("input", (event) => {
  zoomTo(pxFromSlider(Number(event.target.value)));
});

els.zoomIn.addEventListener("click", () => zoomTo(state.pxPerYear * 1.6));
els.zoomOut.addEventListener("click", () => zoomTo(state.pxPerYear / 1.6));
els.fitTimeline.addEventListener("click", fitTimeline);

// Trackpad pinch arrives as ctrl+wheel in Chrome/Firefox; Safari sends gesture events instead.
els.viewport.addEventListener("wheel", (event) => {
  const bounds = els.viewport.getBoundingClientRect();
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    const delta = Math.max(-60, Math.min(60, event.deltaY));
    zoomTo(state.pxPerYear * Math.exp(-delta * 0.012), event.clientX - bounds.left);
    return;
  }
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault();
    els.viewport.scrollLeft += event.deltaY;
  }
}, { passive: false });

let gestureStartPx = null;
els.viewport.addEventListener("gesturestart", (event) => {
  event.preventDefault();
  gestureStartPx = state.pxPerYear;
});
els.viewport.addEventListener("gesturechange", (event) => {
  event.preventDefault();
  if (gestureStartPx === null) return;
  const bounds = els.viewport.getBoundingClientRect();
  zoomTo(gestureStartPx * event.scale, event.clientX - bounds.left);
});
els.viewport.addEventListener("gestureend", () => {
  gestureStartPx = null;
});

let drag = null;
let suppressClick = false;

els.viewport.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  drag = { x: event.clientX, scrollLeft: els.viewport.scrollLeft, moved: false, id: event.pointerId };
});

els.viewport.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) < 4) return;
  if (!drag.moved) {
    drag.moved = true;
    els.viewport.setPointerCapture(drag.id);
    els.viewport.classList.add("is-dragging");
  }
  els.viewport.scrollLeft = drag.scrollLeft - dx;
});

function endDrag() {
  if (!drag) return;
  if (drag.moved) {
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
  }
  els.viewport.classList.remove("is-dragging");
  drag = null;
}

els.viewport.addEventListener("pointerup", endDrag);
els.viewport.addEventListener("pointercancel", endDrag);

els.viewport.addEventListener("click", (event) => {
  if (suppressClick) {
    event.stopPropagation();
    event.preventDefault();
  }
}, true);

let scrollFrame = 0;
els.viewport.addEventListener("scroll", () => {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(() => {
    renderTicks();
    renderMinimap(visibleEvents());
  });
});

els.cardLayer.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  selectEvent(card.dataset.id);
});

let hoverTimer;

els.cardLayer.addEventListener("pointerover", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  const item = eventById(card.dataset.id);
  if (!item) return;
  const { clientX, clientY } = event;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => showHoverPreview(item, clientX, clientY), els.hoverPreview.hidden ? 220 : 60);
});

function showHoverPreview(item, clientX, clientY) {
  els.hoverPreview.hidden = false;
  els.hoverPreview.className = `hover-preview ${typeClass(item.type)}`;
  els.hoverPreview.style.left = `${Math.min(window.innerWidth - 300, clientX + 12)}px`;
  els.hoverPreview.style.top = `${Math.max(80, clientY - 16)}px`;
  els.hoverPreview.innerHTML = `
    <b>${escapeHtml(displayDate(item))}</b>
    <strong>${escapeHtml(item.title)}</strong>
    <p>${escapeHtml(excerpt(item.vaultNote?.keyClaim || item.summary, 150))}</p>
    ${(item.vaultNote?.citation || item.sourceNote) ? `<small>${escapeHtml(excerpt(item.vaultNote?.citation || item.sourceNote, 130))}</small>` : ""}
  `;
}

els.cardLayer.addEventListener("pointerout", (event) => {
  if (!event.target.closest("[data-id]")) return;
  clearTimeout(hoverTimer);
  els.hoverPreview.hidden = true;
});

els.detail.addEventListener("click", (event) => {
  const lens = event.target.closest("[data-lens]");
  if (lens) {
    setLens(state.lens === lens.dataset.lens ? "" : lens.dataset.lens);
    return;
  }
  const goto = event.target.closest("[data-goto]");
  if (goto) {
    selectEvent(goto.dataset.goto);
    return;
  }
  const step = event.target.closest("[data-step]");
  if (step) {
    selectAdjacent(Number(step.dataset.step));
    return;
  }
  const noteSection = event.target.closest("[data-note-section]");
  if (noteSection) {
    state.noteSection = state.noteSection === noteSection.dataset.noteSection ? "" : noteSection.dataset.noteSection;
    renderDetail(eventById(state.selectedId));
    return;
  }
  const noteToggle = event.target.closest("[data-toggle-note]");
  if (noteToggle) {
    state.showVaultNote = !state.showVaultNote;
    renderDetail(state.events.find((item) => item.id === state.selectedId));
    return;
  }
  const chain = event.target.closest("[data-show-chain]");
  if (chain) {
    state.chainRootId = chain.dataset.showChain;
    renderTimeline();
    return;
  }
  if (!event.target.closest(".detail-close")) return;
  state.selectedId = null;
  state.showVaultNote = false;
  renderTimeline();
});

els.lensSelect.addEventListener("change", (event) => setLens(event.target.value));
els.weekSelect.addEventListener("change", (event) => {
  state.week = event.target.value;
  renderTimeline();
});
els.analysisLens.addEventListener("change", (event) => {
  state.analysisLens = event.target.value;
  renderTimeline();
});

els.linksToggle.addEventListener("click", () => {
  state.showLinks = !state.showLinks;
  els.linksToggle.setAttribute("aria-pressed", String(state.showLinks));
  els.linksToggle.classList.toggle("is-active", state.showLinks);
  renderTimeline();
});

els.legendToggle.addEventListener("click", () => {
  state.showLegend = !state.showLegend;
  els.legendToggle.setAttribute("aria-pressed", String(state.showLegend));
  els.legendToggle.classList.toggle("is-active", state.showLegend);
  renderPanels();
});

els.glossaryToggle.addEventListener("click", () => {
  state.showGlossary = !state.showGlossary;
  els.glossaryToggle.setAttribute("aria-pressed", String(state.showGlossary));
  els.glossaryToggle.classList.toggle("is-active", state.showGlossary);
  renderPanels();
});

els.bibliographyToggle.addEventListener("click", () => {
  state.showBibliography = !state.showBibliography;
  els.bibliographyToggle.setAttribute("aria-pressed", String(state.showBibliography));
  els.bibliographyToggle.classList.toggle("is-active", state.showBibliography);
  renderPanels();
});

els.preferencesMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-world-layer]");
  if (!button) return;
  const layer = button.dataset.worldLayer;
  if (state.worldLayers.has(layer)) state.worldLayers.delete(layer);
  else state.worldLayers.add(layer);
  const active = state.worldLayers.has(layer);
  button.setAttribute("aria-pressed", String(active));
  button.classList.toggle("is-active", active);
  renderTimeline();
});

els.chainPanel.addEventListener("click", (event) => {
  if (!event.target.closest("[data-clear-chain]")) return;
  state.chainRootId = null;
  renderTimeline();
});

els.trailPanel.addEventListener("click", (event) => {
  const goto = event.target.closest("[data-goto]");
  if (goto) selectEvent(goto.dataset.goto);
});

document.addEventListener("click", (event) => {
  const chain = event.target.closest("[data-show-chain]");
  if (!chain) return;
  state.chainRootId = chain.dataset.showChain;
  renderTimeline();
});

els.listPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  selectEvent(button.dataset.id);
});

els.selectedRibbon.addEventListener("click", (event) => {
  const step = event.target.closest("[data-step]");
  if (step) selectAdjacent(Number(step.dataset.step));
});

els.minimapTrack.addEventListener("click", (event) => {
  const rect = els.minimapTrack.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  const year = state.bounds.min + ratio * (state.bounds.max - state.bounds.min);
  els.viewport.scrollLeft = Math.max(0, yearToX(year) - els.viewport.clientWidth / 2);
  renderTicks();
  renderMinimap(visibleEvents());
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select, textarea")) return;
  if (event.key === "Escape" && state.readingMode) {
    state.readingMode = false;
    document.body.classList.remove("reading-mode");
    els.readingModeToggle.setAttribute("aria-pressed", "false");
    els.readingModeToggle.classList.remove("is-active");
    return;
  }
  if (event.key === "Escape" && (!els.filterDock.hidden || !els.preferencesMenu.hidden)) {
    setPanelOpen(els.filterDock, els.filtersToggle, false);
    setPanelOpen(els.preferencesMenu, els.preferencesToggle, false);
    return;
  }
  if (event.key === "Escape" && (state.selectedId || state.lens)) {
    if (state.selectedId) state.selectedId = null;
    else setLens("");
    renderTimeline();
  } else if (event.key === "ArrowRight") {
    selectAdjacent(1);
  } else if (event.key === "ArrowLeft") {
    selectAdjacent(-1);
  } else if (event.key === "+" || event.key === "=") {
    zoomTo(state.pxPerYear * 1.4);
  } else if (event.key === "-") {
    zoomTo(state.pxPerYear / 1.4);
  }
});

let resizeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    state.pxPerYear = clampPx(state.pxPerYear);
    renderTimeline();
  });
});

init();
