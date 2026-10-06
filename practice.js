import { LANES, ERAS, RHYMES, TOURS } from "./data/curated.js";

const { default: payload } = await import(`./data/events-data.js?h=${Math.floor(Date.now() / 36e5)}`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 864e5;
const STORE_KEY = "aiht-practice-v1";
// Leitner boxes: days until a card comes back after a correct answer.
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
const MAX_BOX = INTERVALS.length - 1;
const SKILLS = { when: "When", what: "What", link: "Connections" };
const STOP = new Set("the and for with from into that this then than about over under after before their there were was are has have had its his her our out not but who what when how why its the a an of in on to by as at or is be".split(" "));

const app = document.getElementById("app");
const topStats = document.getElementById("topStats");
const toastEl = document.getElementById("toast");

// ---------- utils ----------

const esc = (v = "") => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const sample = (a, n) => shuffle(a).slice(0, n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s = "") => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]s\b/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Split only where the next sentence starts with a capital, so "GPT-5.6" and "1995." stay intact.
function sentences(text = "") {
  return text.replace(/\s+/g, " ").trim().split(/(?<=[.!?]["”’)]*)\s+(?=["“‘(]?[A-Z0-9])/).map((s) => `${s} `);
}
function firstSentences(text = "", n = 2) {
  return sentences(text).slice(0, n).join("").trim();
}
function decimalFromDate(date) {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
}
function displayDate(e) {
  if (!e.date) return e.yearLabel;
  const [y, m, d] = e.date.split("-").map(Number);
  if (!m) return String(y);
  return d ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`;
}
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

// ---------- data ----------

const laneOfType = new Map(LANES.flatMap((l) => l.types.map((t) => [t, l])));
const eraOf = (t) => ERAS.find((e) => t >= e.start && t < e.end) || (t < ERAS[0].start ? ERAS[0] : ERAS.at(-1));

function parseQuotes(text = "") {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/^-\s*[“"](.+?)[”"]\s*[.,]?\s*(.*)$/);
    if (!m) return;
    let gloss = m[2].trim();
    if (!gloss && lines[i + 1] && /^\s+\S/.test(lines[i + 1])) gloss = lines[i + 1].trim();
    if (m[1].length >= 25 && m[1].length <= 320) out.push({ text: m[1], gloss });
  });
  return out;
}

// Some notes keep lineage bullets ("- Before: ...") under their why-section; only prose works as a prompt.
function proseOnly(text = "") {
  return text.split("\n").filter((l) => !/^\s*(-\s*)?(Before|After)\b/i.test(l)).map((l) => l.replace(/^\s*-\s+/, "")).join(" ").trim();
}

// Sentences that talk about the vault itself ("For Synthesis — AI as Technology History, ...") make poor prompts.
function dropMeta(text = "") {
  return sentences(text).filter((x) => !/Synthesis|\bvault\b|\bthis note\b/i.test(x)).join("").trim();
}

function lensNotes(text = "") {
  const out = {};
  for (const line of text.split(/\n(?=- )/)) {
    const m = line.replace(/^- /, "").match(/^([A-Z][A-Za-z -]{2,40}?):\s*(.+)$/s);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const EVENTS = payload.events
  .filter((r) => r.status !== "gap" && !/^gap\b/i.test(r.title))
  .map((raw) => {
    const sec = Object.fromEntries((raw.vaultNote?.sections || []).map((s) => [s.id, s]));
    const t = raw.date ? decimalFromDate(raw.date) : raw.startYear + 0.5;
    return {
      ...raw,
      t,
      year: raw.startYear,
      lane: laneOfType.get(raw.type) || LANES[0],
      era: eraOf(t),
      core: [sec["core-claim"]?.text, raw.summary, proseOnly(sec.connections?.text), proseOnly(sec["history-of-technology"]?.text)].map((t) => dropMeta(t)).find((t) => t.length > 80) || raw.summary || "",
      why: dropMeta(proseOnly((sec["why-this-matters"] || sec["place-in-the-ai-story"])?.text)),
      quotes: parseQuotes(sec["useful-quotes-evidence"]?.text),
      lenses: lensNotes((sec["history-of-technology-notes"] || sec["history-of-technology"])?.text),
      centrality: Number(raw.centrality || 0)
    };
  })
  .sort((a, b) => a.t - b.t);

const byId = new Map(EVENTS.map((e) => [e.id, e]));
for (const e of EVENTS) {
  e.related = [...new Set([...(e.links || []), ...(e.backlinks || [])])].filter((id) => id !== e.id && byId.has(id));
}
const CONCEPTS = [...new Set(EVENTS.flatMap((e) => e.concepts || []))];
const eventsIn = (era) => EVENTS.filter((e) => e.era === era);

// The skeleton: the three most-linked events in each era, learned first.
const SKELETON = new Set(ERAS.flatMap((era) => [...eventsIn(era)].sort((a, b) => b.centrality - a.centrality).slice(0, 3).map((e) => e.id)));

// ---------- learner model ----------

function blankStore() {
  return { v: 1, cards: {}, days: {}, xp: 0, goal: 20, best: {}, lessons: {}, recall: {}, placements: [] };
}
let canSave = true;
let store = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    return saved?.v === 1 ? { ...blankStore(), ...saved } : blankStore();
  } catch {
    canSave = false;
    return blankStore();
  }
})();
function save() {
  if (!canSave) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    canSave = false;
    toast("Progress can't be saved in this browser window.");
  }
}

function card(id) {
  return (store.cards[id] ||= { box: 0, due: 0, seen: 0, right: 0, skills: {}, last: 0 });
}
function mastery(id) {
  const c = store.cards[id];
  return c ? c.box / MAX_BOX : 0;
}
// quality: "hard" keeps the box, "easy" skips one.
function grade(id, skill, ok, quality = "good") {
  if (!byId.has(id)) return;
  const c = card(id);
  c.seen++;
  if (ok) c.right++;
  const s = (c.skills[skill] ||= [0, 0]);
  s[1]++;
  if (ok) s[0]++;
  if (ok) {
    c.box = clamp(c.box + (quality === "easy" ? 2 : quality === "hard" ? 0 : 1), 1, MAX_BOX);
    c.due = Date.now() + INTERVALS[c.box] * DAY;
  } else {
    c.box = 1;
    c.due = Date.now() + 10 * 60e3;
  }
  c.last = Date.now();
  store.days[todayKey()] = (store.days[todayKey()] || 0) + 1;
  store.xp += ok ? 10 : 2;
  save();
  renderTop();
}
function flagForReview(id) {
  const c = card(id);
  c.box = Math.min(c.box, 1);
  c.due = Date.now();
  save();
}
function skillAccuracy(skill, ids = EVENTS.map((e) => e.id)) {
  let r = 0, n = 0;
  for (const id of ids) {
    const s = store.cards[id]?.skills[skill];
    if (s) { r += s[0]; n += s[1]; }
  }
  return n ? r / n : null;
}
function streakDays() {
  let n = 0;
  const d = new Date();
  if (!store.days[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (store.days[todayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const dueIds = () => Object.entries(store.cards).filter(([id, c]) => c.due <= Date.now() && byId.has(id)).map(([id]) => id);
const avgMastery = (events) => (events.length ? events.reduce((s, e) => s + mastery(e.id), 0) / events.length : 0);

function renderTop() {
  const today = store.days[todayKey()] || 0;
  const pct = clamp(today / store.goal, 0, 1);
  topStats.innerHTML = `
    <span class="stat" title="Days in a row with practice"><b>${streakDays()}</b> day streak</span>
    <span class="stat ring-stat" title="Today's answers against your daily goal">
      <svg viewBox="0 0 36 36" class="ring"><circle cx="18" cy="18" r="15" class="ring-bg"/><circle cx="18" cy="18" r="15" class="ring-fg" style="stroke-dasharray:${(pct * 94.2).toFixed(1)} 94.2"/></svg>
      <b>${today}</b>/${store.goal} today
    </span>
    <span class="stat" title="Average Leitner box across all events"><b>${Math.round(avgMastery(EVENTS) * 100)}%</b> mastered</span>`;
}

// ---------- question generators ----------

function yearOptions(e, level) {
  const spread = level > 0.6 ? 3 : level > 0.3 ? 7 : 14;
  const set = new Set([e.year]);
  for (let g = 0; set.size < 4 && g < 300; g++) {
    const c = e.year + (1 + rand(spread)) * (Math.random() < 0.5 ? -1 : 1);
    if (c >= 1940 && c <= 2026) set.add(c);
  }
  return shuffle([...set]).map((y) => ({ label: String(y), correct: y === e.year }));
}

function distractorEvents(e, n, level, exclude = new Set()) {
  let pool = EVENTS.filter((x) => x.id !== e.id && !exclude.has(x.id) && x.title !== e.title);
  const tiers = level > 0.5
    ? [(x) => x.era === e.era && x.lane === e.lane, (x) => x.era === e.era]
    : [(x) => Math.abs(x.t - e.t) < (level > 0.2 ? 12 : 25)];
  for (const tier of tiers) {
    const near = pool.filter(tier);
    if (near.length >= n) { pool = near; break; }
  }
  return sample(pool, n);
}

function titleOptions(e, level, exclude) {
  return shuffle([e, ...distractorEvents(e, 3, level, exclude)]).map((x) => ({ label: x.title, correct: x.id === e.id }));
}

function redact(text, e) {
  const tokens = [...new Set(`${e.title} ${e.sourceNote || ""}`.split(/[^A-Za-z0-9À-ž-]+/).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase())))];
  if (!tokens.length) return esc(text);
  const re = new RegExp(`\\b(${tokens.map(escapeRe).join("|")})[\\w’']*`, "gi");
  return esc(text).replace(re, '<span class="redact">▇▇▇</span>');
}

function headline(e) {
  return `<span class="chip lane-${e.lane.id}">${esc(e.lane.short)}</span> <b class="ev-title">${esc(e.title)}</b>`;
}
function dateLine(e) {
  return `<span class="date">${esc(displayDate(e))}</span> · <span class="muted">${esc(e.era.name)}</span>`;
}

const GEN = {
  when(e, level) {
    return {
      type: "mcq", id: e.id, skill: "when", kicker: "When?",
      prompt: `<p>In what year?</p><p class="big">${headline(e)}</p>`,
      options: yearOptions(e, level),
      explain: `<p>${dateLine(e)}</p><p>${esc(firstSentences(e.core, 1))}</p>`
    };
  },
  first(e, level) {
    const [lo, hi] = level > 0.5 ? [0.2, 4] : level > 0.2 ? [2, 12] : [6, 40];
    const pool = EVENTS.filter((x) => x.id !== e.id && Math.abs(x.t - e.t) >= lo && Math.abs(x.t - e.t) <= hi && x.year !== e.year);
    if (!pool.length) return null;
    const o = pick(pool);
    const firstId = e.t < o.t ? e.id : o.id;
    return {
      type: "mcq", id: e.id, skill: "when", kicker: "Which came first?",
      prompt: `<p>Which happened earlier?</p>`,
      options: shuffle([e, o]).map((x) => ({ label: x.title, correct: x.id === firstId })),
      explain: [e, o].sort((a, b) => a.t - b.t).map((x) => `<p><span class="date">${esc(displayDate(x))}</span> ${esc(x.title)}</p>`).join("")
    };
  },
  era(e, level) {
    const i = ERAS.indexOf(e.era);
    const pool = level > 0.4 ? ERAS.filter((x, k) => x !== e.era && Math.abs(k - i) <= 2) : ERAS.filter((x) => x !== e.era);
    const opts = shuffle([e.era, ...sample(pool, 3)]);
    return {
      type: "mcq", id: e.id, skill: "when", kicker: "Which era?",
      prompt: `<p>Which era does this belong to?</p><p class="big">${headline(e)}</p>`,
      options: opts.map((x) => ({ label: `${x.name} (${x.start}–${x.end})`, correct: x === e.era })),
      explain: `<p>${dateLine(e)}</p><p class="muted">${esc(firstSentences(e.era.synopsis, 1))}</p>`
    };
  },
  identify(e, level, ctx = {}) {
    const text = firstSentences(e.core, 2);
    if (text.length < 60) return null;
    return {
      type: "mcq", id: e.id, skill: "what", kicker: "Name the event",
      prompt: `<blockquote>${redact(text, e)}</blockquote>`,
      options: titleOptions(e, level, ctx.exclude),
      explain: `<p>${headline(e)}</p><p>${dateLine(e)}</p>`
    };
  },
  why(e, level, ctx = {}) {
    const text = firstSentences(e.why, 2);
    if (text.length < 60) return null;
    return {
      type: "mcq", id: e.id, skill: "what", kicker: "Why it matters",
      prompt: `<p>Your notes say this about which event?</p><blockquote>${redact(text, e)}</blockquote>`,
      options: titleOptions(e, level, ctx.exclude),
      explain: `<p>${headline(e)}</p><p>${dateLine(e)}</p>`
    };
  },
  quote(e, level, ctx = {}) {
    if (!e.quotes.length) return null;
    const q = pick(e.quotes);
    return {
      type: "mcq", id: e.id, skill: "what", kicker: "Who said it?",
      prompt: `<p>Which source is this from?</p><blockquote class="quote">“${redact(q.text, e)}”</blockquote>`,
      options: titleOptions(e, level, ctx.exclude),
      explain: `<p>${headline(e)}</p>${q.gloss ? `<p class="muted">${esc(q.gloss)}</p>` : ""}`
    };
  },
  cloze(e, level, ctx = {}) {
    const text = ctx.text || firstSentences(e.core, 3);
    const terms = clozeTerms(text).filter((t) => !e.title.toLowerCase().includes(t.value.toLowerCase()));
    if (!terms.length) return null;
    const ranked = shuffle(terms).sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
    for (const term of ranked) {
      const wrong = clozeDistractors(term, text);
      if (wrong.length < 3) continue;
      const sentence = sentences(text).find((s) => s.includes(term.raw)) || text;
      const blanked = esc(sentence.trim()).replace(esc(term.raw), '<span class="blank">_____</span>');
      return {
        type: "mcq", id: e.id, skill: "what", kicker: "Fill the gap",
        prompt: `<p class="muted small">${esc(e.title)}</p><blockquote>${blanked}</blockquote>`,
        options: shuffle([{ label: term.value, correct: true }, ...wrong.slice(0, 3).map((w) => ({ label: w, correct: false }))]),
        explain: `<blockquote class="soft">${esc(sentence.trim())}</blockquote>`
      };
    }
    return null;
  },
  link(e, level) {
    if (!e.related.length) return null;
    const target = byId.get(pick(e.related));
    const related = new Set([e.id, ...e.related]);
    let pool = EVENTS.filter((x) => !related.has(x.id) && Math.abs(x.t - target.t) < (level > 0.4 ? 8 : 25));
    if (pool.length < 3) pool = EVENTS.filter((x) => !related.has(x.id));
    return {
      type: "mcq", id: e.id, skill: "link", kicker: "Connect it",
      prompt: `<p>Your notes draw a direct line from</p><p class="big">${headline(e)}</p><p>to which of these?</p>`,
      options: shuffle([target, ...sample(pool, 3)]).map((x) => ({ label: x.title, correct: x.id === target.id })),
      explain: `<p><span class="date">${esc(displayDate(e))}</span> ${esc(e.title)} <span class="arrow">${target.t < e.t ? "←" : "→"}</span> <span class="date">${esc(displayDate(target))}</span> ${esc(target.title)}</p><p class="muted small">Also linked: ${e.related.filter((id) => id !== target.id).slice(0, 4).map((id) => esc(byId.get(id).title)).join(" · ") || "nothing else"}</p>`
    };
  },
  lens(e) {
    const own = new Set(e.allConcepts || e.concepts || []);
    if (!e.concepts?.length) return null;
    const right = pick(e.concepts);
    const wrong = sample(CONCEPTS.filter((c) => !own.has(c)), 3);
    if (wrong.length < 3) return null;
    const note = e.lenses[right];
    return {
      type: "mcq", id: e.id, skill: "link", kicker: "Which lens?",
      prompt: `<p>Which history-of-technology concept does your note use to read</p><p class="big">${headline(e)}</p>`,
      options: shuffle([right, ...wrong]).map((c) => ({ label: c, correct: c === right })),
      explain: note ? `<p><b>${esc(right)}:</b> ${esc(firstSentences(note, 2))}</p>` : `<p>Your note tags it with ${e.concepts.map(esc).join(", ")}.</p>`
    };
  }
};
const SKILL_GENS = { when: ["when", "first", "era"], what: ["identify", "cloze", "quote", "why"], link: ["link", "lens"] };

const KIND_RANK = { quote: 0, name: 1, number: 2, year: 3 };
const CLOZE_POOL = { quote: [], name: [], number: [], year: [] };
function clozeTerms(text) {
  const terms = [];
  for (const m of text.matchAll(/["“]([^"”]{4,70})["”]/g)) terms.push({ kind: "quote", raw: m[0], value: m[1].trim().replace(/[.,;:]+$/, "") });
  for (const m of text.matchAll(/\$\d[\d.,]*\s?(?:billion|million|trillion)?|\b\d[\d,.]*\s?(?:percent|billion|million|trillion|parameters|tokens|images|GPUs|chips|words|categories|layers|people|hours|days|months)\b/gi)) terms.push({ kind: "number", raw: m[0].trim(), value: m[0].trim() });
  for (const m of text.matchAll(/\b(?:19[4-9]\d|20[0-2]\d)\b/g)) terms.push({ kind: "year", raw: m[0], value: m[0] });
  for (const m of text.matchAll(/(?<=[a-z,;:]\s)([A-Z][a-zA-Z-]+(?:\s(?:[A-Z][a-zA-Z-]+|of|de|von)){0,3}(?<!\s(?:of|de|von)))/g)) {
    if (m[1].length > 3 && !STOP.has(m[1].toLowerCase())) terms.push({ kind: "name", raw: m[1], value: m[1] });
  }
  return terms;
}
for (const e of EVENTS) for (const t of clozeTerms(firstSentences(e.core, 4))) CLOZE_POOL[t.kind].push(t.value);
for (const k of Object.keys(CLOZE_POOL)) CLOZE_POOL[k] = [...new Set(CLOZE_POOL[k])];

function clozeDistractors(term, text) {
  const lower = text.toLowerCase();
  const ok = (v) => v.toLowerCase() !== term.value.toLowerCase() && !lower.includes(v.toLowerCase());
  if (term.kind === "number") {
    const m = term.value.match(/\d[\d,.]*/);
    const num = parseFloat(m[0].replace(/,/g, ""));
    const decimals = (m[0].split(".")[1] || "").length;
    const out = new Set();
    for (const f of shuffle([0.1, 0.25, 0.5, 2, 3, 4, 10])) {
      let v = (num * f).toFixed(decimals);
      if (m[0].includes(",")) v = Number(v).toLocaleString("en-US");
      const s = term.value.replace(m[0], v);
      if (s !== term.value) out.add(s);
    }
    return [...out];
  }
  if (term.kind === "year") {
    const y = Number(term.value);
    return shuffle([-7, -4, -2, -1, 1, 2, 3, 5].map((d) => String(y + d)).filter((v) => Number(v) <= 2026 && ok(v)));
  }
  const words = (v) => v.split(" ").length;
  const capital = (v) => /^[A-Z]/.test(v);
  const pool = CLOZE_POOL[term.kind].filter(ok);
  const near = pool.filter((v) => Math.abs(words(v) - words(term.value)) <= Math.max(1, words(term.value) / 3) && capital(v) === capital(term.value));
  return sample(near.length >= 3 ? near : pool, 3);
}

function weakestSkill(id) {
  const c = store.cards[id];
  const scored = Object.keys(SKILLS).map((k) => {
    const s = c?.skills[k];
    return { k, v: s ? (s[0] + 1) / (s[1] + 2) : 0.4 + Math.random() * 0.2 };
  });
  return scored.sort((a, b) => a.v - b.v)[Math.random() < 0.7 ? 0 : 1].k;
}

function makeQuestion(e, skill = weakestSkill(e.id), ctx) {
  const level = mastery(e.id);
  for (const s of [skill, ...shuffle(Object.keys(SKILLS).filter((k) => k !== skill))]) {
    for (const g of shuffle(SKILL_GENS[s])) {
      const q = GEN[g](e, level, ctx);
      if (q) return q;
    }
  }
  return GEN.when(e, level);
}

function flashItem(e) {
  return { type: "flash", id: e.id, event: e };
}
function orderItem(events) {
  return { type: "order", events };
}

// ---------- scheduling ----------

function buildQueue(n, pool = EVENTS, newCap = 6) {
  const now = Date.now();
  const has = (e) => store.cards[e.id]?.seen;
  const due = pool.filter((e) => has(e) && store.cards[e.id].due <= now).sort((a, b) => store.cards[a.id].due - store.cards[b.id].due);
  const fresh = pool.filter((e) => !has(e)).sort((a, b) => (SKELETON.has(b.id) - SKELETON.has(a.id)) || (b.centrality - a.centrality));
  const weak = pool.filter((e) => has(e) && store.cards[e.id].due > now).sort((a, b) => mastery(a.id) - mastery(b.id) || store.cards[a.id].last - store.cards[b.id].last);
  const out = due.slice(0, n);
  out.push(...fresh.slice(0, clamp(n - out.length, 0, newCap)));
  out.push(...weak.slice(0, n - out.length));
  out.push(...fresh.slice(newCap, newCap + n - out.length));
  return out;
}

function mixItems(queue) {
  const items = [];
  queue.forEach((e, i) => {
    items.push(() => (store.cards[e.id]?.seen ? makeQuestion(e) : flashItem(e)));
    if (i % 5 === 4 && queue.length >= 4) {
      const group = sample(queue.slice(Math.max(0, i - 6), i + 1), 4);
      if (new Set(group.map((x) => x.year)).size === 4) items.push(() => orderItem(group));
    }
  });
  return items;
}

// ---------- keyboard ----------

let keyHandler = null;
const setKeys = (fn) => { keyHandler = fn; };
document.addEventListener("keydown", (ev) => {
  if (ev.target.closest?.("textarea, input, select") || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  keyHandler?.(ev);
});

// ---------- drag helper ----------

function makeDraggable(el, { onMove, onDrop, onTap } = {}) {
  el.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || ev.target.closest("button:not(.draggable)")) return;
    const sx = ev.clientX, sy = ev.clientY;
    const rect = el.getBoundingClientRect();
    const ox = sx - rect.left, oy = sy - rect.top;
    let ghost = null;
    try { el.setPointerCapture(ev.pointerId); } catch { /* synthetic or already-released pointer */ }
    const move = (e) => {
      if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
        ghost = el.cloneNode(true);
        ghost.classList.add("ghost");
        ghost.style.width = `${rect.width}px`;
        document.body.append(ghost);
        el.classList.add("is-dragging");
      }
      if (ghost) {
        ghost.style.transform = `translate(${e.clientX - ox}px, ${e.clientY - oy}px)`;
        onMove?.(e.clientX, e.clientY);
      }
    };
    const up = (e) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (ghost) {
        ghost.remove();
        el.classList.remove("is-dragging");
        if (e.type === "pointerup") onDrop?.(e.clientX, e.clientY);
        else onMove?.(-1, -1);
      } else if (e.type === "pointerup") onTap?.();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  });
}

// ---------- session runner ----------

function mount(html) {
  app.innerHTML = html;
  app.scrollTop = 0;
  window.scrollTo(0, 0);
  return app;
}

function runSession({ title, items, back = "#home", backLabel = "Home", onFinish, intro = "" }) {
  mount(`<section class="session">
    <div class="session-head">
      <a class="back" href="${back}">← ${esc(backLabel)}</a>
      <h2>${esc(title)}</h2>
      <div class="progress" aria-hidden="true"><span></span></div>
      <span class="count muted small"></span>
    </div>
    ${intro}
    <div class="stage"></div>
  </section>`);
  const stage = app.querySelector(".stage");
  const bar = app.querySelector(".progress span");
  const count = app.querySelector(".count");
  const results = [];
  let i = 0;
  const record = (id, ok) => results.push({ id, ok });
  const next = () => {
    if (i >= items.length) return finish();
    let item = items[i];
    if (typeof item === "function") item = item();
    i++;
    bar.style.width = `${(i / items.length) * 100}%`;
    count.textContent = `${i} / ${items.length}`;
    if (!item) return next();
    RENDER[item.type](item, stage, record, next);
  };
  const finish = () => {
    setKeys(null);
    bar.style.width = "100%";
    const graded = results.filter((r) => r.ok !== null);
    const right = graded.filter((r) => r.ok).length;
    const missed = [...new Set(results.filter((r) => r.ok === false && r.id).map((r) => r.id))].map((id) => byId.get(id));
    stage.innerHTML = `<article class="qcard done">
      <div class="q-kicker">Session complete</div>
      <p class="score"><b>${right}</b> / ${graded.length} right</p>
      ${missed.length ? `<h4>Coming back soon</h4><ul class="mini-list">${missed.map((e) => `<li><span class="date">${esc(displayDate(e))}</span> ${esc(e.title)}</li>`).join("")}</ul>` : graded.length ? "<p>Clean sweep. These cards move up a box and come back later.</p>" : ""}
      <div class="row"><a class="btn primary" href="${back}">${esc(backLabel)}</a><a class="btn" href="#map">See your map</a></div>
    </article>`;
    onFinish?.(right, graded.length);
  };
  next();
}

const RENDER = {
  mcq(q, stage, record, next) {
    stage.innerHTML = `<article class="qcard">
      <div class="q-kicker">${esc(q.kicker)} <span class="skill">${SKILLS[q.skill]}</span></div>
      <div class="q-prompt">${q.prompt}</div>
      <div class="opts">${q.options.map((o, k) => `<button type="button" class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o.label)}</span></button>`).join("")}</div>
      <div class="q-feedback" hidden></div>
    </article>`;
    const fb = stage.querySelector(".q-feedback");
    let answered = false;
    const choose = (k) => {
      if (answered || !q.options[k]) return;
      answered = true;
      const ok = !!q.options[k].correct;
      stage.querySelectorAll(".opt").forEach((b, j) => {
        b.disabled = true;
        if (q.options[j].correct) b.classList.add("is-right");
        else if (j === k) b.classList.add("is-wrong");
      });
      grade(q.id, q.skill, ok);
      record(q.id, ok);
      fb.innerHTML = `<p class="verdict ${ok ? "ok" : "no"}">${ok ? "Right." : "Not quite."}</p>${q.explain}
        <div class="row"><button type="button" class="btn primary next">Next <kbd>↵</kbd></button><a class="link small" href="index.html#event=${encodeURIComponent(q.id)}" target="_blank" rel="noopener">Open in timeline ↗</a></div>`;
      fb.hidden = false;
      fb.querySelector(".next").addEventListener("click", next);
      fb.querySelector(".next").focus({ preventScroll: true });
    };
    stage.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => choose(Number(b.dataset.k))));
    setKeys((ev) => {
      if (!answered && /^[1-9]$/.test(ev.key)) choose(Number(ev.key) - 1);
      else if (answered && ev.key === "Enter" && document.activeElement?.tagName !== "BUTTON") next();
    });
  },

  flash(item, stage, record, next) {
    const e = item.event;
    const isNew = !store.cards[e.id]?.seen;
    stage.innerHTML = `<article class="qcard flash">
      <div class="q-kicker">${isNew ? "New card" : "Recall"} ${SKELETON.has(e.id) ? '<span class="skill">Skeleton</span>' : ""}</div>
      <p class="big">${headline(e)}</p>
      <p class="muted">Before you flip: when was it, what happened, and why does it matter?</p>
      <div class="flash-back" hidden>
        <p>${dateLine(e)}</p>
        <p>${esc(firstSentences(e.core, 2))}</p>
        ${e.why ? `<p class="why"><b>Why it matters.</b> ${esc(firstSentences(e.why, 1))}</p>` : ""}
        ${e.concepts?.length ? `<p class="chips">${e.concepts.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</p>` : ""}
      </div>
      <div class="row flip-row"><button type="button" class="btn primary flip">Show answer <kbd>space</kbd></button></div>
      <div class="row rate-row" hidden>
        ${["Again", "Hard", "Good", "Easy"].map((l, k) => `<button type="button" class="btn rate rate-${k}" data-k="${k}"><kbd>${k + 1}</kbd> ${l}</button>`).join("")}
      </div>
    </article>`;
    let flipped = false;
    const flip = () => {
      if (flipped) return;
      flipped = true;
      stage.querySelector(".flash-back").hidden = false;
      stage.querySelector(".flip-row").hidden = true;
      stage.querySelector(".rate-row").hidden = false;
    };
    const rate = (k) => {
      if (!flipped) return;
      grade(e.id, "what", k > 0, ["again", "hard", "good", "easy"][k]);
      record(e.id, k > 0);
      next();
    };
    stage.querySelector(".flip").addEventListener("click", flip);
    stage.querySelectorAll(".rate").forEach((b) => b.addEventListener("click", () => rate(Number(b.dataset.k))));
    setKeys((ev) => {
      if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); flip(); }
      else if (/^[1-4]$/.test(ev.key)) rate(Number(ev.key) - 1);
    });
  },

  order(item, stage, record, next) {
    setKeys(null);
    stage.innerHTML = `<article class="qcard"><div class="q-kicker">Put them in order <span class="skill">When</span></div><div class="order-host"></div></article>`;
    chainGame(stage.querySelector(".order-host"), item.events, (results) => {
      results.forEach((r) => record(r.id, r.ok));
      const btn = document.createElement("button");
      btn.className = "btn primary";
      btn.innerHTML = "Next <kbd>↵</kbd>";
      btn.addEventListener("click", next);
      stage.querySelector(".chain-actions").append(btn);
      btn.focus({ preventScroll: true });
      setKeys((ev) => ev.key === "Enter" && document.activeElement !== btn && next());
    });
  },

  passage(item, stage, record, next) {
    stage.innerHTML = `<article class="passage">
      <div class="q-kicker">${esc(item.kicker || "Read")}</div>
      <h3>${esc(item.title)}</h3>
      ${item.text ? `<p class="lede">${esc(item.text)}</p>` : ""}
      ${item.events.map((e) => `<section class="read-ev">
        <p>${headline(e)}</p>
        <p class="small">${dateLine(e)}</p>
        <p>${esc(item.shown.get(e.id).core)}</p>
        ${item.shown.get(e.id).why ? `<p class="why"><b>Why it matters.</b> ${esc(item.shown.get(e.id).why)}</p>` : ""}
      </section>`).join("")}
      <div class="row"><button type="button" class="btn primary go">${item.events.length ? "Quiz me on this" : "Continue"} <kbd>↵</kbd></button></div>
    </article>`;
    stage.querySelector(".go").addEventListener("click", next);
    setKeys((ev) => ev.key === "Enter" && next());
  }
};

// ---------- chain (ordering) ----------

function chainGame(host, events, onDone) {
  let order = shuffle(events);
  while (events.length > 1 && order.every((e, i) => i === 0 || order[i - 1].t <= e.t)) order = shuffle(events);
  host.innerHTML = `<p class="muted small">Earliest at the top. Drag to reorder, or use the arrows.</p>
    <ol class="chain">${order.map((e) => `<li class="chain-item" data-id="${e.id}">
      <span class="handle" aria-hidden="true">⋮⋮</span>
      <span class="chain-title"><span class="lane-dot lane-${e.lane.id}"></span>${esc(e.title)}</span>
      <span class="chain-year"></span>
      <span class="chain-btns"><button type="button" class="mini up" aria-label="Move up">↑</button><button type="button" class="mini down" aria-label="Move down">↓</button></span>
    </li>`).join("")}</ol>
    <div class="row chain-actions"><button type="button" class="btn primary check">Check order</button></div>`;
  const list = host.querySelector(".chain");
  let checked = false;

  list.addEventListener("click", (ev) => {
    const li = ev.target.closest(".chain-item");
    if (!li || checked) return;
    if (ev.target.closest(".up") && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
    if (ev.target.closest(".down") && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
  });

  list.querySelectorAll(".chain-item").forEach((li) => {
    li.addEventListener("pointerdown", (ev) => {
      if (checked || ev.button !== 0 || ev.target.closest("button")) return;
      if (ev.pointerType === "touch" && !ev.target.closest(".handle")) return;
      ev.preventDefault();
      li.classList.add("lifting");
      // Listen on window: moving li in the DOM drops any pointer capture.
      const move = (e) => {
        const others = [...list.children].filter((x) => x !== li);
        const before = others.find((x) => {
          const r = x.getBoundingClientRect();
          return e.clientY < r.top + r.height / 2;
        });
        if (before) { if (li.nextElementSibling !== before) list.insertBefore(li, before); }
        else if (list.lastElementChild !== li) list.append(li);
      };
      const up = () => {
        li.classList.remove("lifting");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  });

  host.querySelector(".check").addEventListener("click", (ev) => {
    if (checked) return;
    checked = true;
    ev.target.remove();
    const items = [...list.children];
    const placed = items.map((li) => byId.get(li.dataset.id));
    const sorted = [...placed].sort((a, b) => a.t - b.t);
    let pairs = 0, good = 0;
    for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) { pairs++; if (placed[a].t <= placed[b].t) good++; }
    const results = placed.map((e, i) => {
      const ok = e.t === sorted[i].t;
      const li = items[i];
      li.classList.add(ok ? "is-right" : "is-wrong");
      li.querySelector(".chain-year").textContent = displayDate(e);
      grade(e.id, "when", ok);
      return { id: e.id, ok };
    });
    list.insertAdjacentHTML("afterend", `<div class="chain-answer"><p class="verdict ${good === pairs ? "ok" : "no"}">${good === pairs ? "Perfect order." : `${Math.round((good / pairs) * 100)}% of pairs in the right order.`}</p>
      ${good === pairs ? "" : `<ol class="mini-list">${sorted.map((e) => `<li><span class="date">${esc(displayDate(e))}</span> ${esc(e.title)}</li>`).join("")}</ol>`}</div>`);
    onDone(results, good / pairs);
  });
}

// ---------- place on the line ----------

function placeGame(host, events, [y0, y1], onDone) {
  const span = y1 - y0;
  const pct = (t) => clamp(((t - y0) / span) * 100, 0, 100);
  const step = span > 60 ? 10 : span > 25 ? 5 : span > 10 ? 2 : 1;
  const ticks = [];
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) ticks.push(y);
  const bands = ERAS.filter((e) => e.end > y0 && e.start < y1);
  const rowH = 34;
  host.innerHTML = `<div class="place">
    <div class="track" style="--rows:${events.length};--row-h:${rowH}px">
      ${bands.map((b, i) => `<div class="band ${i % 2 ? "alt" : ""} ${/winter/.test(b.id) ? "winter" : ""}" style="left:${pct(b.start)}%;width:${pct(b.end) - pct(b.start)}%"><span>${esc(b.short)}</span></div>`).join("")}
      <div class="pins"></div>
      <div class="axis"></div>
      ${ticks.map((y, i) => `<div class="tick ${i % 2 ? "odd" : ""}" style="left:${pct(y)}%"><span>${y}</span></div>`).join("")}
      <div class="guide" hidden><span></span></div>
    </div>
    <div class="tray">${events.map((e) => `<button type="button" class="tcard draggable" data-id="${e.id}"><span class="lane-dot lane-${e.lane.id}"></span>${esc(e.title)}</button>`).join("")}</div>
    <div class="row"><button type="button" class="btn primary check" disabled>Check</button><span class="muted small hint">Drag each card onto the line. On a phone: tap a card, then tap the line.</span></div>
    <div class="place-result"></div>
  </div>`;
  const track = host.querySelector(".track");
  const pins = host.querySelector(".pins");
  const guide = host.querySelector(".guide");
  const checkBtn = host.querySelector(".check");
  const guesses = new Map();
  let selected = null;
  let checked = false;

  const tAt = (x) => {
    const r = track.getBoundingClientRect();
    return y0 + clamp((x - r.left) / r.width, 0, 1) * span;
  };
  const overTrack = (x, y) => {
    const r = track.getBoundingClientRect();
    return x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 40 && y <= r.bottom + 40;
  };
  const showGuide = (x, y) => {
    if (x < 0 || !overTrack(x, y)) { guide.hidden = true; return; }
    const t = tAt(x);
    guide.hidden = false;
    guide.style.left = `${pct(t)}%`;
    guide.querySelector("span").textContent = Math.floor(t);
  };
  const place = (id, t) => {
    guesses.set(id, t);
    guide.hidden = true;
    renderPins();
    host.querySelector(`.tcard[data-id="${id}"]`).classList.add("placed");
    checkBtn.disabled = guesses.size < events.length;
  };
  const pinHtml = (e, t, row, cls = "") => {
    const p = pct(t);
    return `<div class="pin ${cls}" data-id="${e.id}" style="left:${p}%;top:${row * rowH}px;height:${(events.length - row) * rowH}px">
      <span class="pin-chip ${p > 55 ? "flip" : ""}"><span class="lane-dot lane-${e.lane.id}"></span>${esc(e.title.length > 34 ? `${e.title.slice(0, 32)}…` : e.title)} <b>${Math.floor(t)}</b></span>
    </div>`;
  };
  function renderPins() {
    pins.innerHTML = events.map((e, row) => (guesses.has(e.id) ? pinHtml(e, guesses.get(e.id), row) : "")).join("");
    if (checked) return;
    pins.querySelectorAll(".pin-chip").forEach((chip) => {
      const id = chip.parentElement.dataset.id;
      makeDraggable(chip, { onMove: showGuide, onDrop: (x, y) => (overTrack(x, y) ? place(id, tAt(x)) : (guide.hidden = true)) });
    });
  }

  host.querySelectorAll(".tcard").forEach((c) => {
    const id = c.dataset.id;
    makeDraggable(c, {
      onMove: showGuide,
      onDrop: (x, y) => (overTrack(x, y) ? place(id, tAt(x)) : (guide.hidden = true)),
      onTap: () => {
        if (checked) return;
        host.querySelectorAll(".tcard").forEach((o) => o.classList.toggle("selected", o === c && selected !== id));
        selected = selected === id ? null : id;
      }
    });
  });
  track.addEventListener("click", (ev) => {
    if (!selected || checked || ev.target.closest(".pin")) return;
    place(selected, tAt(ev.clientX));
    host.querySelector(".tcard.selected")?.classList.remove("selected");
    selected = null;
  });

  checkBtn.addEventListener("click", () => {
    checked = true;
    checkBtn.remove();
    host.querySelector(".hint").remove();
    const tol = Math.max(1.5, span * 0.04);
    let total = 0;
    const rows = events.map((e, row) => {
      const g = guesses.get(e.id);
      const err = Math.abs(g - e.t);
      const ok = err <= tol;
      const pts = Math.round(100 * clamp(1 - err / (span * 0.3), 0, 1));
      total += pts;
      grade(e.id, "when", ok);
      return { e, g, err, ok, pts, row };
    });
    renderPins();
    pins.insertAdjacentHTML("beforeend", rows.map(({ e, g, ok, row }) => {
      const a = pct(Math.min(g, e.t)), b = pct(Math.max(g, e.t));
      return `<div class="miss ${ok ? "ok" : "no"}" style="left:${a}%;width:${Math.max(b - a, 0.4)}%;top:${row * rowH + rowH - 8}px"></div>
        <div class="truth ${ok ? "ok" : "no"}" style="left:${pct(e.t)}%;top:${row * rowH + rowH - 12}px" title="${esc(`${displayDate(e)}: ${e.title}`)}"></div>`;
    }).join(""));
    const score = Math.round(total / events.length);
    host.querySelector(".place-result").innerHTML = `<p class="verdict ${score >= 80 ? "ok" : "no"}">Accuracy ${score}%</p>
      <ul class="mini-list">${rows.sort((x, y) => x.e.t - y.e.t).map(({ e, g, err, ok }) => `<li class="${ok ? "ok" : "no"}"><span class="date">${esc(displayDate(e))}</span> ${esc(e.title)} <span class="muted small">you said ${Math.floor(g)}${err >= 1 ? `, off by ${Math.round(err)} yr${Math.round(err) === 1 ? "" : "s"}` : ""}</span></li>`).join("")}</ul>`;
    onDone(score, rows);
  });
}

// ---------- views ----------

const MODES = [
  { href: "#mix", name: "Daily mix", kicker: "Spaced review", text: "Anki-style cards and questions, scheduled by what you're about to forget." },
  { href: "#read", name: "Read & quiz", kicker: "Lessons", text: "Read a passage from a tour or era primer, then answer questions about it." },
  { href: "#place", name: "Drop on the line", kicker: "Drag", text: "Drag event cards to where they belong in time. Scored by how far off you are." },
  { href: "#chain", name: "Chain", kicker: "Order", text: "Shuffle six events back into chronological order." },
  { href: "#sort", name: "Era sort", kicker: "Drag", text: "Drop each event into the right era bucket." },
  { href: "#streak", name: "Earlier or later", kicker: "Speed", text: "One event at a time. How long can your streak go?" },
  { href: "#rhyme", name: "Find the rhyme", kicker: "Patterns", text: "Pick the events that belong to a recurring pattern in AI history." },
  { href: "#blank", name: "Blank page", kicker: "Free recall", text: "Name every event you can remember from an era, against the clock." },
  { href: "#map", name: "Mastery map", kicker: "Progress", text: "Where you're strong and where the gaps are, by era and lane." }
];

function recommendations() {
  const recs = [];
  const seen = Object.keys(store.cards).length;
  if (seen < 10) {
    recs.push({ href: "#placement", title: "Take the placement check", why: "Nine questions, one per era, to see what you already know." });
    recs.push({ href: "#skeleton", title: "Learn the skeleton", why: `${SKELETON.size} anchor events, three per era. Everything else attaches to these.` });
  }
  const cells = [];
  for (const era of ERAS) for (const lane of LANES) {
    const evs = EVENTS.filter((e) => e.era === era && e.lane === lane);
    const touched = evs.filter((e) => store.cards[e.id]?.seen);
    if (evs.length >= 3 && touched.length) cells.push({ era, lane, m: avgMastery(evs), n: evs.length });
  }
  const weak = cells.sort((a, b) => a.m - b.m)[0];
  if (weak) recs.push({ href: `#drill/${weak.era.id}/${weak.lane.id}`, title: `Drill: ${weak.lane.name}, ${weak.era.short}`, why: `Your weakest area so far (${Math.round(weak.m * 100)}% across ${weak.n} events).` });
  const acc = Object.keys(SKILLS).map((k) => ({ k, v: skillAccuracy(k) })).filter((s) => s.v !== null).sort((a, b) => a.v - b.v)[0];
  if (acc && acc.v < 0.75) {
    const href = acc.k === "when" ? "#place" : acc.k === "link" ? "#rhyme" : "#read";
    recs.push({ href, title: `Work on "${SKILLS[acc.k]}"`, why: `You get ${Math.round(acc.v * 100)}% of ${SKILLS[acc.k].toLowerCase()} questions right, your lowest skill.` });
  }
  const lesson = LESSONS.find((l) => !store.lessons[l.id]);
  if (lesson) recs.push({ href: `#read/${lesson.id}`, title: `Read: ${lesson.name}`, why: lesson.dek });
  const staleEra = ERAS.find((e) => eventsIn(e).length >= 4 && !(store.recall[e.id] || []).some((r) => Date.now() - r.ts < 7 * DAY) && eventsIn(e).some((x) => store.cards[x.id]?.seen));
  if (staleEra) recs.push({ href: `#blank/${staleEra.id}`, title: `Blank page: ${staleEra.name}`, why: "Free recall is the honest test. You haven't tried this era this week." });
  return recs.slice(0, 4);
}

function viewHome() {
  setKeys(null);
  const due = dueIds().length;
  const fresh = EVENTS.filter((e) => !store.cards[e.id]?.seen).length;
  const today = store.days[todayKey()] || 0;
  mount(`<section class="home">
    <div class="hero">
      <div>
        <p class="kicker">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1>${today >= store.goal ? "Goal done for today." : today ? "Keep going." : "Ten minutes of history."}</h1>
        <p class="muted">${EVENTS.length} events from your vault. ${due ? `<b>${due}</b> due for review` : "Nothing overdue"}, ${fresh} not yet studied.</p>
      </div>
      <a class="btn primary huge" href="#mix">Start daily mix <span class="muted-on">15 cards · about 10 min</span></a>
    </div>
    <h2 class="section-h">Recommended for you</h2>
    <div class="recs">${recommendations().map((r) => `<a class="rec" href="${r.href}"><b>${esc(r.title)}</b><span>${esc(r.why)}</span></a>`).join("")}</div>
    <h2 class="section-h">Ways to practise</h2>
    <div class="tiles">${MODES.map((m) => `<a class="tile" href="${m.href}"><span class="kicker">${m.kicker}</span><b>${m.name}</b><span>${m.text}</span></a>`).join("")}</div>
    <footer class="foot muted small">
      Progress is saved in this browser only. Daily goal:
      <select id="goal">${[10, 20, 30, 50].map((g) => `<option ${g === store.goal ? "selected" : ""}>${g}</option>`).join("")}</select> answers.
      <button type="button" class="link small" id="reset">Reset progress</button>
    </footer>
  </section>`);
  app.querySelector("#goal").addEventListener("change", (ev) => { store.goal = Number(ev.target.value); save(); renderTop(); });
  app.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("Erase all practice progress in this browser?")) return;
    store = blankStore();
    save();
    renderTop();
    viewHome();
  });
}

function viewMix() {
  const queue = buildQueue(15);
  runSession({ title: "Daily mix", items: mixItems(queue) });
}

function viewSkeleton() {
  const queue = buildQueue(12, EVENTS.filter((e) => SKELETON.has(e.id)), 12);
  runSession({
    title: "The skeleton",
    intro: `<p class="muted session-intro">Three anchor events per era: the ones most of your notes link to. Learn these cold and place everything else relative to them.</p>`,
    items: mixItems(queue.sort((a, b) => a.t - b.t))
  });
}

function viewPlacement() {
  const items = ERAS.map((era) => () => {
    const evs = [...eventsIn(era)].sort((a, b) => b.centrality - a.centrality).slice(0, 4);
    if (!evs.length) return null;
    const e = pick(evs);
    return makeQuestion(e, pick(["when", "what"]));
  });
  runSession({
    title: "Placement check",
    intro: `<p class="muted session-intro">One question per era, from earliest to latest. Your answers seed the mastery map.</p>`,
    items
  });
}

function viewDrill(eraId, laneId) {
  const era = ERAS.find((e) => e.id === eraId);
  const lane = LANES.find((l) => l.id === laneId);
  const pool = EVENTS.filter((e) => (!era || e.era === era) && (!lane || e.lane === lane));
  if (!pool.length) return viewHome();
  const queue = buildQueue(Math.min(12, pool.length + 2), pool, 12);
  runSession({ title: `Drill: ${[lane?.name, era?.name].filter(Boolean).join(", ")}`, items: mixItems(queue), back: "#map", backLabel: "Map" });
}

// ----- lessons -----

const LESSONS = [
  ...TOURS.map((t) => ({
    id: `tour-${t.id}`, name: t.name, dek: t.dek, kind: "Tour",
    steps: t.steps.map((s) => ({ title: s.title, text: s.text, ids: s.ids.filter((id) => byId.has(id)) }))
  })),
  ...ERAS.map((era) => ({
    id: `era-${era.id}`, name: era.name, dek: `${era.start}–${era.end}. ${firstSentences(era.synopsis, 1)}`, kind: "Era primer",
    steps: [
      { title: `${era.name}, ${era.start}–${era.end}`, text: `${era.synopsis} ${era.boundary}`, ids: [] },
      ...[...eventsIn(era)].sort((a, b) => b.centrality - a.centrality).slice(0, 4).sort((a, b) => a.t - b.t).map((e) => ({ title: e.title, text: "", ids: [e.id] }))
    ]
  }))
];

function viewReadList() {
  setKeys(null);
  const card = (l) => {
    const done = store.lessons[l.id];
    return `<a class="tile lesson ${done ? "is-done" : ""}" href="#read/${l.id}">
      <span class="kicker">${l.kind} · ${l.steps.length} parts${done ? ` · done, ${done.right}/${done.total}` : ""}</span>
      <b>${esc(l.name)}</b><span>${esc(l.dek)}</span></a>`;
  };
  mount(`<section class="home">
    <a class="back" href="#home">← Home</a>
    <h1>Read &amp; quiz</h1>
    <p class="muted">Each lesson alternates a short reading with questions about what you just read. It ends by asking you to put the lesson's events in order.</p>
    <h2 class="section-h">Tours</h2>
    <div class="tiles">${LESSONS.filter((l) => l.kind === "Tour").map(card).join("")}</div>
    <h2 class="section-h">Era primers</h2>
    <div class="tiles">${LESSONS.filter((l) => l.kind !== "Tour").map(card).join("")}</div>
  </section>`);
}

function viewLesson(id) {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) return viewReadList();
  const items = [];
  const all = [];
  lesson.steps.forEach((s, i) => {
    const events = s.ids.map((x) => byId.get(x));
    const shown = new Map(events.map((e) => [e.id, { core: firstSentences(e.core, 3), why: firstSentences(e.why, 2) }]));
    items.push({ type: "passage", kicker: `${lesson.kind} · part ${i + 1} of ${lesson.steps.length}`, title: s.title, text: s.text, events, shown });
    events.forEach((e, k) => {
      all.push(e);
      const text = `${shown.get(e.id).core} ${shown.get(e.id).why}`;
      const exclude = new Set(s.ids);
      items.push(() => GEN.cloze(e, mastery(e.id), { text }) || GEN.quote(e, mastery(e.id), { exclude }) || GEN.when(e, mastery(e.id)));
      if (events.length === 1 || k === 0) items.push(() => GEN[pick(["when", "link", "lens", "quote", "era"])](e, mastery(e.id), { exclude }) || GEN.era(e, mastery(e.id)));
    });
  });
  const unique = [...new Map(all.map((e) => [e.id, e])).values()];
  const distinct = [...new Map(unique.map((e) => [e.t, e])).values()];
  if (distinct.length >= 3) items.push(orderItem(sample(distinct, Math.min(6, distinct.length))));
  runSession({
    title: lesson.name, items, back: "#read", backLabel: "Lessons",
    onFinish: (right, total) => { store.lessons[lesson.id] = { ts: Date.now(), right, total }; save(); }
  });
}

// ----- drag games -----

function scopePicker(current, base) {
  return `<div class="scopes" role="group" aria-label="Scope">
    <a class="scope ${current === "all" ? "on" : ""}" href="${base}/all">Everything</a>
    <a class="scope ${current === "weak" ? "on" : ""}" href="${base}/weak">My weak spots</a>
    ${ERAS.map((e) => `<a class="scope ${current === e.id ? "on" : ""}" href="${base}/${e.id}">${esc(e.short)}</a>`).join("")}
  </div>`;
}

function scopePool(scope) {
  const era = ERAS.find((e) => e.id === scope);
  if (era) return { pool: eventsIn(era), range: [era.start, Math.min(era.end, 2027)] };
  if (scope === "weak") {
    const seen = EVENTS.filter((e) => store.cards[e.id]?.seen).sort((a, b) => mastery(a.id) - mastery(b.id));
    const pool = seen.length >= 8 ? seen.slice(0, Math.max(8, Math.ceil(seen.length / 3))) : EVENTS;
    return { pool, range: null };
  }
  return { pool: EVENTS, range: [1940, 2027] };
}

// Spread picks across eras so "Everything" isn't all 2023–26.
function spreadPick(pool, n) {
  const byEra = new Map();
  for (const e of shuffle(pool)) (byEra.get(e.era) || byEra.set(e.era, []).get(e.era)).push(e);
  const groups = shuffle([...byEra.values()]);
  const out = [];
  for (let i = 0; out.length < n && i < n * 4; i++) {
    const g = groups[i % groups.length];
    const e = g.shift();
    if (e && !out.some((x) => x.year === e.year)) out.push(e);
  }
  return out.length >= Math.min(n, pool.length) ? out : sample(pool, n);
}

function gameShell(title, kicker, base, scope, help) {
  setKeys(null);
  mount(`<section class="game">
    <a class="back" href="#home">← Home</a>
    <div class="game-head"><div><p class="kicker">${kicker}</p><h1>${title}</h1><p class="muted">${help}</p></div></div>
    ${scopePicker(scope, base)}
    <div class="game-host"></div>
  </section>`);
  return app.querySelector(".game-host");
}

function viewPlace(scope = "all") {
  const host = gameShell("Drop on the line", "Drag", "#place", scope, "Five events. Put each one where you think it happened. Closer is better.");
  const { pool, range } = scopePool(scope);
  const events = spreadPick(pool, Math.min(5, pool.length));
  const r = range || [Math.floor(Math.min(...events.map((e) => e.t)) / 5) * 5 - 5, Math.min(2027, Math.ceil(Math.max(...events.map((e) => e.t)) / 5) * 5 + 5)];
  placeGame(host, events, r, (score) => {
    store.best.place = Math.max(store.best.place || 0, score);
    save();
    host.insertAdjacentHTML("beforeend", `<div class="row"><button type="button" class="btn primary again">Another round <kbd>↵</kbd></button><span class="muted small">Best: ${store.best.place}%</span></div>`);
    const again = () => viewPlace(scope);
    host.querySelector(".again").addEventListener("click", again);
    setKeys((ev) => ev.key === "Enter" && again());
  });
}

function viewChain(scope = "all") {
  const host = gameShell("Chain", "Order", "#chain", scope, "Six events, shuffled. Rebuild the sequence.");
  const { pool } = scopePool(scope);
  const events = spreadPick(pool, Math.min(6, pool.length));
  chainGame(host, events, (results, frac) => {
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.innerHTML = "Another chain <kbd>↵</kbd>";
    btn.addEventListener("click", () => viewChain(scope));
    host.querySelector(".chain-actions").append(btn);
    setKeys((ev) => ev.key === "Enter" && viewChain(scope));
  });
}

function viewSort() {
  setKeys(null);
  const start = rand(ERAS.length - 2);
  const eras = ERAS.slice(start, start + 3);
  const events = eras.flatMap((era) => sample(eventsIn(era), 3));
  mount(`<section class="game">
    <a class="back" href="#home">← Home</a>
    <div class="game-head"><div><p class="kicker">Drag</p><h1>Era sort</h1><p class="muted">Drop each event into its era. On a phone: tap a card, then tap a bucket.</p></div></div>
    <div class="tray sort-tray">${shuffle(events).map((e) => `<button type="button" class="tcard draggable" data-id="${e.id}"><span class="lane-dot lane-${e.lane.id}"></span>${esc(e.title)}</button>`).join("")}</div>
    <div class="buckets">${eras.map((era) => `<div class="bucket" data-era="${era.id}"><div class="bucket-h"><b>${esc(era.name)}</b><span class="muted small">${era.start}–${era.end}</span></div><div class="bucket-body"></div></div>`).join("")}</div>
    <div class="row"><button type="button" class="btn primary check" disabled>Check</button></div>
    <div class="sort-result"></div>
  </section>`);
  const tray = app.querySelector(".sort-tray");
  const checkBtn = app.querySelector(".check");
  let selected = null;
  const drop = (cardEl, bucket) => {
    bucket.querySelector(".bucket-body").append(cardEl);
    cardEl.classList.remove("selected");
    selected = null;
    checkBtn.disabled = tray.children.length > 0;
  };
  app.querySelectorAll(".tcard").forEach((c) => makeDraggable(c, {
    onMove: (x, y) => app.querySelectorAll(".bucket").forEach((b) => b.classList.toggle("hover", document.elementFromPoint(x, y)?.closest(".bucket") === b)),
    onDrop: (x, y) => {
      app.querySelectorAll(".bucket").forEach((b) => b.classList.remove("hover"));
      const b = document.elementFromPoint(x, y)?.closest(".bucket");
      if (b) drop(c, b);
    },
    onTap: () => {
      app.querySelectorAll(".tcard").forEach((o) => o.classList.toggle("selected", o === c && selected !== c));
      selected = selected === c ? null : c;
    }
  }));
  app.querySelectorAll(".bucket").forEach((b) => b.addEventListener("click", (ev) => {
    if (selected && !ev.target.closest(".tcard")) drop(selected, b);
  }));
  checkBtn.addEventListener("click", () => {
    checkBtn.remove();
    let right = 0;
    app.querySelectorAll(".bucket").forEach((b) => b.querySelectorAll(".tcard").forEach((c) => {
      const e = byId.get(c.dataset.id);
      const ok = e.era.id === b.dataset.era;
      if (ok) right++;
      c.classList.add(ok ? "is-right" : "is-wrong");
      c.insertAdjacentHTML("beforeend", `<span class="ans"><span class="date">${esc(displayDate(e))}</span>${ok ? "" : ` · belongs in ${esc(e.era.short)}`}</span>`);
      c.disabled = true;
      grade(e.id, "when", ok);
    }));
    app.querySelector(".sort-result").innerHTML = `<p class="verdict ${right === events.length ? "ok" : "no"}">${right} / ${events.length} in the right era.</p>
      <div class="row"><button type="button" class="btn primary again">New set <kbd>↵</kbd></button></div>`;
    app.querySelector(".again").addEventListener("click", viewSort);
    setKeys((ev) => ev.key === "Enter" && viewSort());
  });
}

function viewStreak() {
  let current = pick(EVENTS);
  let streak = 0;
  const trail = [current];
  mount(`<section class="game">
    <a class="back" href="#home">← Home</a>
    <div class="game-head"><div><p class="kicker">Speed</p><h1>Earlier or later</h1><p class="muted">Is the new event earlier or later than the one you know? The gap shrinks as your streak grows. Keys: ← earlier, → later.</p></div>
    <div class="streak-score"><b class="n">0</b><span class="muted small">streak · best ${store.best.streak || 0}</span></div></div>
    <div class="streak-stage"></div>
    <div class="trail"></div>
  </section>`);
  const stage = app.querySelector(".streak-stage");
  const nEl = app.querySelector(".streak-score .n");
  const trailEl = app.querySelector(".trail");
  let nextEv;
  const choose = () => {
    const maxGap = Math.max(1.5, 30 - streak * 2);
    const pool = EVENTS.filter((e) => e.id !== current.id && e.year !== current.year && Math.abs(e.t - current.t) <= maxGap);
    return pick(pool.length ? pool : EVENTS.filter((e) => e.year !== current.year));
  };
  const renderTrail = () => {
    const sorted = [...trail].sort((a, b) => a.t - b.t);
    trailEl.innerHTML = sorted.length > 1 ? `<p class="kicker">Your chain so far</p><ol class="trail-list">${sorted.map((e) => `<li><span class="date">${e.year}</span> ${esc(e.title)}</li>`).join("")}</ol>` : "";
  };
  const round = () => {
    nextEv = choose();
    stage.innerHTML = `<div class="duel">
      <div class="duel-card known"><span class="kicker">You know</span>${headline(current)}<span class="date big-date">${esc(displayDate(current))}</span></div>
      <div class="duel-card unknown"><span class="kicker">Was this…</span>${headline(nextEv)}<span class="date big-date">?</span></div>
    </div>
    <div class="row center"><button type="button" class="btn big-btn" data-dir="-1">← Earlier</button><button type="button" class="btn big-btn" data-dir="1">Later →</button></div>`;
    stage.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => answer(Number(b.dataset.dir))));
    setKeys((ev) => {
      if (ev.key === "ArrowLeft") answer(-1);
      if (ev.key === "ArrowRight") answer(1);
    });
  };
  const answer = (dir) => {
    setKeys(null);
    const ok = Math.sign(nextEv.t - current.t) === dir;
    grade(nextEv.id, "when", ok);
    stage.querySelector(".unknown .big-date").textContent = displayDate(nextEv);
    stage.querySelector(".unknown").classList.add(ok ? "is-right" : "is-wrong");
    stage.querySelectorAll("[data-dir]").forEach((b) => (b.disabled = true));
    if (ok) {
      streak++;
      nEl.textContent = streak;
      trail.push(nextEv);
      renderTrail();
      current = nextEv;
      setTimeout(round, 750);
    } else {
      const best = Math.max(store.best.streak || 0, streak);
      const isBest = streak > (store.best.streak || 0);
      store.best.streak = best;
      save();
      stage.insertAdjacentHTML("beforeend", `<div class="qcard done"><p class="score"><b>${streak}</b> in a row${isBest ? " · new best" : ""}</p><div class="row"><button type="button" class="btn primary again">Play again <kbd>↵</kbd></button></div></div>`);
      stage.querySelector(".again").addEventListener("click", viewStreak);
      setKeys((ev) => ev.key === "Enter" && viewStreak());
    }
  };
  round();
}

function viewRhyme(id) {
  setKeys(null);
  const rhyme = RHYMES.find((r) => r.id === id) || pick(RHYMES);
  const members = rhyme.ids.filter((x) => byId.has(x)).map((x) => byId.get(x));
  const memberIds = new Set(members.map((e) => e.id));
  const decoys = sample(EVENTS.filter((e) => !memberIds.has(e.id) && members.some((m) => m.lane === e.lane || Math.abs(m.t - e.t) < 6)), Math.max(4, 9 - members.length));
  const options = shuffle([...members, ...decoys]);
  mount(`<section class="game">
    <a class="back" href="#home">← Home</a>
    <div class="game-head"><div><p class="kicker">Patterns · ${members.length} belong</p><h1>${esc(rhyme.name)}</h1></div></div>
    <blockquote class="thesis">${esc(firstSentences(rhyme.thesis, 2))}</blockquote>
    <p class="muted">Select the ${members.length} events your timeline files under this pattern.</p>
    <div class="pick-grid">${options.map((e) => `<button type="button" class="pick" data-id="${e.id}" aria-pressed="false"><span class="lane-dot lane-${e.lane.id}"></span>${esc(e.title)}</button>`).join("")}</div>
    <div class="row"><button type="button" class="btn primary check">Check</button></div>
    <div class="rhyme-result"></div>
    <div class="row other-rhymes">${RHYMES.filter((r) => r !== rhyme).map((r) => `<a class="scope" href="#rhyme/${r.id}">${esc(r.name)}</a>`).join("")}</div>
  </section>`);
  app.querySelectorAll(".pick").forEach((b) => b.addEventListener("click", () => {
    if (b.disabled) return;
    b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
  }));
  app.querySelector(".check").addEventListener("click", (ev) => {
    ev.target.remove();
    let hits = 0, falsePos = 0;
    app.querySelectorAll(".pick").forEach((b) => {
      const isMember = memberIds.has(b.dataset.id);
      const chosen = b.getAttribute("aria-pressed") === "true";
      b.disabled = true;
      b.classList.add(isMember ? (chosen ? "is-right" : "is-missed") : chosen ? "is-wrong" : "is-faded");
      if (isMember) { if (chosen) hits++; grade(b.dataset.id, "link", chosen); }
      else if (chosen) falsePos++;
    });
    app.querySelector(".rhyme-result").innerHTML = `<p class="verdict ${hits === members.length && !falsePos ? "ok" : "no"}">${hits} of ${members.length} found${falsePos ? `, ${falsePos} wrong pick${falsePos > 1 ? "s" : ""}` : ""}.</p>
      <ol class="mini-list">${[...members].sort((a, b) => a.t - b.t).map((e) => `<li><span class="date">${esc(displayDate(e))}</span> ${esc(e.title)}</li>`).join("")}</ol>
      <p class="muted">${esc(rhyme.thesis)}</p>
      <div class="row"><a class="btn primary" href="#rhyme/${pick(RHYMES.filter((r) => r !== rhyme)).id}">Next pattern</a><a class="link small" href="index.html#rhyme=${rhyme.id}" target="_blank" rel="noopener">See it on the timeline ↗</a></div>`;
  });
}

// ----- blank page -----

function matchLine(line, pool, taken) {
  const q = norm(line);
  const qTok = q.split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
  if (!qTok.length) return null;
  let best = null, bestScore = 0;
  for (const e of pool) {
    const key = norm(`${e.title} ${e.sourceNote || ""}`);
    const kTok = key.split(" ");
    const hit = qTok.filter((w) => kTok.some((k) => k === w || (w.length >= 4 && k.startsWith(w.slice(0, Math.max(4, w.length - 2)))))).length;
    let score = hit / qTok.length;
    if (taken.has(e.id)) score -= 0.01;
    if (score > bestScore) { best = e; bestScore = score; }
  }
  return bestScore >= 0.5 ? best : null;
}

function viewBlank(eraId) {
  const era = ERAS.find((e) => e.id === eraId);
  if (!era) {
    setKeys(null);
    mount(`<section class="home">
      <a class="back" href="#home">← Home</a>
      <h1>Blank page</h1>
      <p class="muted">Pick an era. You get three minutes to type every event you remember, one per line. Rough names are fine ("lighthill", "alexnet"). Whatever you miss goes straight into your review queue.</p>
      <div class="tiles">${ERAS.map((e) => {
        const hist = store.recall[e.id] || [];
        const last = hist.at(-1);
        return `<a class="tile" href="#blank/${e.id}"><span class="kicker">${e.start}–${e.end} · ${eventsIn(e).length} events</span><b>${esc(e.name)}</b>
          <span>${last ? `Last: ${last.k}/${last.n}${hist.length > 1 ? ` · trend ${hist.slice(-5).map((r) => Math.round((r.k / r.n) * 100)).join(" → ")}%` : ""}` : "Not tried yet"}</span></a>`;
      }).join("")}</div>
    </section>`);
    return;
  }
  setKeys(null);
  const pool = eventsIn(era);
  let left = 180;
  mount(`<section class="game">
    <a class="back" href="#blank">← Eras</a>
    <div class="game-head"><div><p class="kicker">Free recall · ${era.start}–${era.end}</p><h1>${esc(era.name)}</h1><p class="muted">Type every event you remember, one per line. ${pool.length} to find.</p></div>
    <div class="streak-score"><b class="timer">3:00</b><span class="muted small">remaining</span></div></div>
    <div class="blank-wrap">
      <textarea class="blank-input" placeholder="dartmouth&#10;perceptron&#10;…" spellcheck="false" autofocus></textarea>
      <div class="blank-side"><p class="kicker">Recognised <span class="found-n">0</span>/${pool.length}</p><ul class="found"></ul></div>
    </div>
    <div class="row"><button type="button" class="btn primary stop">I'm done</button></div>
    <div class="blank-result"></div>
  </section>`);
  const ta = app.querySelector(".blank-input");
  const timerEl = app.querySelector(".timer");
  const found = new Map();
  const scan = () => {
    found.clear();
    for (const line of ta.value.split("\n")) {
      const e = matchLine(line, pool, new Set(found.keys()));
      if (e) found.set(e.id, e);
    }
    app.querySelector(".found-n").textContent = found.size;
    app.querySelector(".found").innerHTML = [...found.values()].sort((a, b) => a.t - b.t).map((e) => `<li><span class="lane-dot lane-${e.lane.id}"></span>${esc(e.title)}</li>`).join("");
  };
  ta.addEventListener("input", scan);
  ta.focus();
  let done = false;
  const tick = setInterval(() => {
    if (!document.body.contains(timerEl)) return clearInterval(tick);
    left--;
    timerEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    if (left <= 0) finish();
  }, 1000);
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(tick);
    scan();
    ta.disabled = true;
    app.querySelector(".stop").remove();
    const missed = pool.filter((e) => !found.has(e.id));
    for (const e of found.values()) grade(e.id, "what", true, "easy");
    for (const e of missed) flagForReview(e.id);
    (store.recall[era.id] ||= []).push({ ts: Date.now(), k: found.size, n: pool.length });
    save();
    const hist = store.recall[era.id];
    app.querySelector(".blank-result").innerHTML = `<p class="verdict ${found.size / pool.length >= 0.6 ? "ok" : "no"}">You recalled ${found.size} of ${pool.length} (${Math.round((found.size / pool.length) * 100)}%).</p>
      ${hist.length > 1 ? `<p class="muted">Your history for this era: ${hist.slice(-6).map((r) => `${r.k}/${r.n}`).join(" → ")}</p>` : ""}
      <h4>Missed: now in your review queue</h4>
      <ul class="mini-list">${missed.map((e) => `<li><span class="date">${esc(displayDate(e))}</span> ${esc(e.title)}</li>`).join("")}</ul>
      <div class="row"><a class="btn primary" href="#mix">Review them now</a><a class="btn" href="#blank">Another era</a></div>`;
  };
  app.querySelector(".stop").addEventListener("click", finish);
}

// ----- map -----

function viewMap() {
  setKeys(null);
  const cell = (era, lane) => {
    const evs = EVENTS.filter((e) => e.era === era && e.lane === lane);
    if (!evs.length) return `<td class="empty"></td>`;
    const m = avgMastery(evs);
    const seen = evs.filter((e) => store.cards[e.id]?.seen).length;
    return `<td><a class="cell lane-${lane.id}" style="--m:${Math.round(m * 100)}%" href="#drill/${era.id}/${lane.id}" title="${esc(`${lane.name}, ${era.name}: ${seen}/${evs.length} studied`)}">
      <b>${seen ? `${Math.round(m * 100)}%` : "·"}</b><span>${seen}/${evs.length}</span></a></td>`;
  };
  const bar = (k) => {
    const v = skillAccuracy(k);
    return `<div class="skillbar"><span>${SKILLS[k]}</span><div class="sb"><i style="width:${v === null ? 0 : Math.round(v * 100)}%"></i></div><b>${v === null ? "–" : `${Math.round(v * 100)}%`}</b></div>`;
  };
  const boxes = Array.from({ length: MAX_BOX + 1 }, (_, b) => EVENTS.filter((e) => (store.cards[e.id]?.seen ? store.cards[e.id].box : -1) === b).length);
  const unseen = EVENTS.filter((e) => !store.cards[e.id]?.seen).length;
  mount(`<section class="home">
    <a class="back" href="#home">← Home</a>
    <h1>Mastery map</h1>
    <p class="muted">Each cell is an era × lane. Colour fills in as cards climb the boxes. Click a cell to drill it.</p>
    <div class="map-wrap"><table class="map">
      <thead><tr><th></th>${LANES.map((l) => `<th><span class="lane-dot lane-${l.id}"></span>${esc(l.short)}</th>`).join("")}</tr></thead>
      <tbody>${ERAS.map((era) => `<tr><th><b>${esc(era.short)}</b><span class="muted small">${era.start}–${era.end}</span></th>${LANES.map((l) => cell(era, l)).join("")}</tr>`).join("")}</tbody>
    </table></div>
    <div class="map-side">
      <section><h2 class="section-h">Skills</h2>${Object.keys(SKILLS).map(bar).join("")}</section>
      <section><h2 class="section-h">Boxes</h2>
        <div class="boxes">${boxes.map((n, b) => `<div class="box"><b>${n}</b><span>${b === 0 ? "new" : `box ${b}`}</span><span class="muted small">${b ? `${INTERVALS[b]}d` : ""}</span></div>`).join("")}<div class="box faded"><b>${unseen}</b><span>unseen</span></div></div>
      </section>
      <section><h2 class="section-h">Free recall by era</h2>
        <ul class="mini-list">${ERAS.map((e) => {
          const h = store.recall[e.id] || [];
          return `<li><b>${esc(e.short)}</b> <span class="muted">${h.length ? h.slice(-5).map((r) => `${Math.round((r.k / r.n) * 100)}%`).join(" → ") : "not tried"}</span></li>`;
        }).join("")}</ul>
      </section>
    </div>
  </section>`);
}

// ---------- router ----------

function route() {
  const [view, a, b] = location.hash.replace(/^#/, "").split("/");
  ({
    mix: viewMix,
    skeleton: viewSkeleton,
    placement: viewPlacement,
    drill: () => viewDrill(a, b),
    read: () => (a ? viewLesson(a) : viewReadList()),
    place: () => viewPlace(a),
    chain: () => viewChain(a),
    sort: viewSort,
    streak: viewStreak,
    rhyme: () => viewRhyme(a),
    blank: () => viewBlank(a),
    map: viewMap
  }[view] || viewHome)();
  app.focus({ preventScroll: true });
}

window.addEventListener("hashchange", route);
renderTop();
route();
if (!canSave) toast("Progress can't be saved in this browser window.");
