const typeOrder = [
  "Theory / question",
  "Field formation",
  "Data / benchmark",
  "Model innovation",
  "Corporate release",
  "Infrastructure / compute",
  "Critique / governance",
  "State / policy",
  "Court / litigation",
  "Research source"
];

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

const state = {
  events: [],
  selectedId: null,
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
  typeFilters: document.querySelector("#typeFilters"),
  search: document.querySelector("#searchInput"),
  eventCount: document.querySelector("#eventCount"),
  yearRange: document.querySelector("#yearRange"),
  visibleRange: document.querySelector("#visibleRange"),
  viewport: document.querySelector("#timelineViewport"),
  canvas: document.querySelector("#timelineCanvas"),
  tickLayer: document.querySelector("#tickLayer"),
  spanLayer: document.querySelector("#spanLayer"),
  cardLayer: document.querySelector("#cardLayer"),
  arcLayer: document.querySelector("#arcLayer"),
  focusArcLayer: document.querySelector("#focusArcLayer"),
  lensSelect: document.querySelector("#lensSelect"),
  weekSelect: document.querySelector("#weekSelect"),
  linksToggle: document.querySelector("#linksToggle"),
  detail: document.querySelector("#eventDetail"),
  zoomRange: document.querySelector("#zoomRange"),
  zoomIn: document.querySelector("#zoomIn"),
  zoomOut: document.querySelector("#zoomOut"),
  zoomReadout: document.querySelector("#zoomReadout"),
  fitTimeline: document.querySelector("#fitTimeline")
};

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

function eventText(event) {
  return [
    event.title,
    event.yearLabel,
    event.type,
    event.summary,
    event.sourceNote,
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
    return typeMatch && queryMatch && weekMatch;
  });
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
}

function layoutCards(events, axisY) {
  const compact = layoutWithSize(events, axisY, COMPACT);
  if (state.pxPerYear < FULL_CARD_THRESHOLD) return compact;
  const full = layoutWithSize(events, axisY, FULL);
  const viewLeft = els.viewport.scrollLeft;
  const viewRight = viewLeft + els.viewport.clientWidth;
  const pins = (layout) => layout.filter((item) => item.pinOnly && item.x >= viewLeft && item.x <= viewRight).length;
  return pins(full) <= pins(compact) ? full : compact;
}

function layoutWithSize(events, axisY, size) {
  const gap = 10;
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
  if (state.lens && !(event.allConcepts || event.concepts || []).includes(state.lens)) return "dim";
  if (state.lens) return "in-lens";
  if (!state.selectedId || event.id === state.selectedId) return "";
  const connected = connectedIds(state.selectedId);
  if (!connected.size) return "";
  return connected.has(event.id) ? "is-linked" : "dim";
}

function cardTemplate({ event, x, left, top, stem, side, size, pinOnly }) {
  const pressed = state.selectedId === event.id ? "true" : "false";
  if (pinOnly) {
    const label = `${displayDate(event)}: ${event.title}`;
    return `<button class="event-pin ${typeClass(event.type)} ${focusClass(event)}" type="button" data-id="${escapeHtml(event.id)}" aria-pressed="${pressed}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="left:${x.toFixed(1)}px"></button>`;
  }
  const full = size === FULL;
  const concepts = full
    ? `<span class="concepts">${(event.concepts || []).slice(0, 3).map((c) => `<span>${escapeHtml(c)}</span>`).join("")}</span>`
    : "";
  const summary = full ? `<p>${escapeHtml(excerpt(event.summary))}</p>` : "";
  const typePill = full ? `<span class="type-pill">${escapeHtml(event.type)}</span>` : "";
  return `
    <button class="event-card ${full ? "full" : "compact"} ${side} ${typeClass(event.type)} ${event.status === "gap" ? "gap" : ""} ${focusClass(event)}" type="button" data-id="${escapeHtml(event.id)}" aria-pressed="${pressed}" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${size.width}px;height:${size.height}px;--stem:${stem}px">
      <span class="event-meta">
        <span class="year-pill">${escapeHtml(displayDate(event))}</span>
        ${typePill}
      </span>
      <strong>${escapeHtml(event.title)}</strong>
      ${summary}
      ${concepts}
    </button>
  `;
}

function renderTimeline() {
  const events = visibleEvents();
  const height = els.viewport.clientHeight;
  const axisY = Math.round(height / 2);
  els.canvas.style.width = `${canvasWidth()}px`;
  els.canvas.style.setProperty("--axis-y", `${axisY}px`);

  if (!events.length) {
    els.cardLayer.innerHTML = `<p class="empty-state">No events match those filters.</p>`;
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
  renderDetail(state.events.find((item) => item.id === state.selectedId));
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
  const source = event.sourceUrl
    ? `<a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(event.sourceNote || event.sourceUrl)}</a>`
    : escapeHtml(event.sourceNote || "Vault note");
  els.detail.className = `detail-panel ${typeClass(event.type)}`;
  els.detail.innerHTML = `
    <button class="detail-close" type="button" aria-label="Close details">×</button>
    <span class="type-pill">${escapeHtml(event.type)}</span>
    ${event.draft ? `<span class="draft-pill" title="Drafted by Claude, not yet reviewed">Draft</span>` : ""}
    <h2>${escapeHtml(event.title)}</h2>
    <p>${escapeHtml(event.summary)}</p>
    ${event.detail ? `<p class="detail-claim">${escapeHtml(event.detail)}</p>` : ""}
    <div class="detail-grid">
      <div><span>Date</span>${escapeHtml(displayDate(event))}</div>
      <div><span>Concepts</span>${concepts}</div>
      <div><span>Source</span>${source}</div>
    </div>
    ${connections}
  `;
}

function renderTypeFilters() {
  const present = new Set(state.events.map((event) => event.type));
  els.typeFilters.innerHTML = typeOrder
    .filter((type) => present.has(type))
    .map((type) => `<button class="chip is-active ${typeClass(type)}" type="button" data-type="${escapeHtml(type)}" aria-pressed="true">${escapeHtml(type)}</button>`)
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
    const response = await fetch("data/events.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
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
    fitTimeline();
  } catch (error) {
    els.cardLayer.innerHTML = `<p class="empty-state">The timeline data could not be loaded. Run <code>npm run update</code>, then refresh.</p>`;
    els.syncTime.textContent = "Data unavailable";
  }
}

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
  scrollFrame = requestAnimationFrame(renderTicks);
});

els.cardLayer.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  state.selectedId = card.dataset.id;
  scrollEventIntoView(state.events.find((item) => item.id === state.selectedId));
  renderTimeline();
});

els.detail.addEventListener("click", (event) => {
  const lens = event.target.closest("[data-lens]");
  if (lens) {
    setLens(state.lens === lens.dataset.lens ? "" : lens.dataset.lens);
    return;
  }
  const goto = event.target.closest("[data-goto]");
  if (goto) {
    const target = state.events.find((item) => item.id === goto.dataset.goto);
    if (!target) return;
    state.selectedId = target.id;
    scrollEventIntoView(target);
    renderTimeline();
    return;
  }
  if (!event.target.closest(".detail-close")) return;
  state.selectedId = null;
  renderTimeline();
});

els.lensSelect.addEventListener("change", (event) => setLens(event.target.value));
els.weekSelect.addEventListener("change", (event) => {
  state.week = event.target.value;
  renderTimeline();
});

els.linksToggle.addEventListener("click", () => {
  state.showLinks = !state.showLinks;
  els.linksToggle.setAttribute("aria-pressed", String(state.showLinks));
  els.linksToggle.classList.toggle("is-active", state.showLinks);
  renderTimeline();
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input")) return;
  if (event.key === "Escape" && (state.selectedId || state.lens)) {
    if (state.selectedId) state.selectedId = null;
    else setLens("");
    renderTimeline();
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
