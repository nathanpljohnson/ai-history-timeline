import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import os from "node:os";

const defaultVault = path.join(os.homedir(), "Documents", "Obsidian Vault");
const vaultPath = process.argv[2] || process.env.OBSIDIAN_VAULT || defaultVault;
const outPath = path.resolve("data/events.json");
const moduleOutPath = path.resolve("data/events-data.js");
const TIMELINE_NOTE = "AI — Primary Sources Timeline";
const CONCEPT_INDEX = "Concept Index";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const typeRules = [
  ["Critique / governance", /\b(stochastic|genealogy|power|governance|policy|censorship|public interest|regulat|democracy|liability)\b/i],
  ["Corporate release", /\b(chatgpt|llama|openai|meta|deepseek|moonshot|z\.ai|google|corporate|release|open weight|open-weight|open source)\b/i],
  ["Model innovation", /\b(attention|transformer|gpt|scaling|alexnet|language model|neural|deep learning|rlhf|instruct)\b/i],
  ["Data / benchmark", /\b(imagenet|benchmark|alphago|go|classification|data)\b/i],
  ["Field formation", /\b(dartmouth|proposal|artificial intelligence|agenda|frame)\b/i],
  ["Theory / question", /\b(turing|computing machinery|intelligence|methodology|closure)\b/i]
];

const conceptTypeHints = new Map([
  ["Closure", "Data / benchmark"],
  ["Stabilization", "Data / benchmark"],
  ["Technological Momentum", "Model innovation"],
  ["Appropriation", "Model innovation"],
  ["Agenda Control", "Field formation"],
  ["Technological Frame", "Field formation"],
  ["Co-production", "Critique / governance"],
  ["Revisionist History", "Critique / governance"]
]);

const conceptAliases = new Map([
  ["corporate self regulation", "Corporate Self-regulation"],
  ["corporate self-regulation", "Corporate Self-regulation"],
  ["path dependence", "Path Dependence"],
  ["black box", "Black Box"],
  ["socio technical ensemble", "Sociotechnical Ensemble"],
  ["sociotechnical ensemble", "Sociotechnical Ensemble"],
  ["public interest", "Public Interest"]
]);

const analyticLexicons = {
  decision: ["board", "court", "agency", "congress", "white house", "commission", "company", "lab", "funder", "foundation", "judge", "regulator", "executive order", "senate", "coalition"],
  power: ["state", "market", "corporate", "military", "university", "labor", "labour", "public", "capital", "monopoly", "platform", "institution", "government"],
  material: ["compute", "chip", "gpu", "data center", "dataset", "benchmark", "energy", "labor", "labour", "infrastructure", "cloud", "cuda", "scraping"],
  closure: ["benchmark", "standard", "test", "evaluation", "law", "order", "verdict", "settlement", "demo", "model card", "principles", "framework"],
  controversy: ["sues", "lawsuit", "veto", "withdraw", "leak", "ban", "suspend", "complaint", "critic", "risk", "safety", "copyright", "privacy", "bias"]
};

function stripMarkdown(value = "") {
  return value
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^#+\s*/, "")
    .trim();
}

function normalizeTitle(value) {
  return stripMarkdown(value)
    .replace(/\.md$/i, "")
    .replace(/^["“”]+|["“”.]+$/g, "")
    .trim();
}

function noteKey(value) {
  return normalizeTitle(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value) {
  return noteKey(value).replace(/ /g, "-");
}

function wikilinks(text) {
  return [...text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim());
}

// Handles "1950", "1955/56", "1985–95", "2006-2012".
function parseYearLabel(label) {
  const match = label.match(/(\d{4})(?:\s*[–—\-/]\s*(\d{2,4}))?/);
  if (!match) return { startYear: null, endYear: null };
  const startYear = Number(match[1]);
  let endYear = startYear;
  if (match[2]) {
    endYear = match[2].length === 2 ? Number(match[1].slice(0, 2) + match[2]) : Number(match[2]);
    if (endYear < startYear) endYear = startYear;
  }
  return { startYear, endYear };
}

function isoDate(year, month, day) {
  const mm = String(month).padStart(2, "0");
  return day ? `${year}-${mm}-${String(day).padStart(2, "0")}` : `${year}-${mm}`;
}

function inferType(text, concepts = []) {
  for (const [type, pattern] of typeRules) {
    if (pattern.test(text)) return type;
  }
  for (const concept of concepts) {
    if (conceptTypeHints.has(concept)) return conceptTypeHints.get(concept);
  }
  return "Research source";
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) return {};
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return {};
  const data = {};
  let currentKey = null;
  for (const line of markdown.slice(3, end).trim().split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      const value = kv[2].trim();
      data[currentKey] = value === "[]" ? [] : value.replace(/^["']|["']$/g, "") || [];
      continue;
    }
    const item = line.match(/^\s*-\s*(.*)$/);
    if (item && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
      data[currentKey].push(item[1].trim());
    }
  }
  return data;
}

function bodyOf(markdown) {
  return markdown.replace(/^---[\s\S]*?\n---/, "");
}

// Returns the first paragraph after a heading line such as "## Core Claim" or a bare "Core Claim".
function section(body, name) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^#*\\s*${name}\\s*$`, "i").test(line.trim()));
  if (start === -1) return "";
  const paragraph = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    if (/^#/.test(line.trim())) break;
    paragraph.push(line.trim());
  }
  return paragraph.join(" ");
}

function citationDate(citation, frontmatter) {
  const fmDate = typeof frontmatter.date === "string" ? frontmatter.date : "";
  const fmIso = fmDate.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (fmIso) return { year: Number(fmIso[1]), date: fmIso[0] };

  const fmYear = Number(frontmatter.year) || Number(fmDate.match(/^(\d{4})$/)?.[1]) || null;
  const citationYear = Number(citation.match(/\b(1[89]\d\d|20\d\d)\b/)?.[1]) || null;
  const year = fmYear || citationYear;
  if (!year) return { year: null, date: null };

  const monthPattern = MONTHS.join("|");
  const full = citation.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?`, "i"));
  if (full && (!full[3] || Number(full[3]) === year)) {
    return { year, date: isoDate(year, MONTHS.indexOf(full[1].toLowerCase()) + 1, Number(full[2])) };
  }
  const urlDate = citation.match(/\/(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?\//);
  if (urlDate && Number(urlDate[1]) === year && Number(urlDate[2]) <= 12) {
    return { year, date: isoDate(year, Number(urlDate[2]), urlDate[3] ? Number(urlDate[3]) : null) };
  }
  return { year, date: null };
}

function rankedConcepts(body, conceptNames) {
  const counts = new Map();
  for (const link of wikilinks(body)) {
    const key = noteKey(link);
    if (!conceptNames.has(key)) continue;
    const name = conceptNames.get(key);
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  if (!counts.size) {
    const plain = body.toLowerCase();
    for (const name of conceptNames.values()) {
      if (!/[\s-]/.test(name)) continue;
      const hits = plain.split(name.toLowerCase()).length - 1;
      if (hits) counts.set(name, hits);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => normalizeConcept(name));
}

function normalizeConcept(name) {
  const key = noteKey(name);
  return conceptAliases.get(key) || name;
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => item.replace(/^["']|["']$/g, ""));
  return value ? [value] : [];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value = "") {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\]\]/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function noteHtml(markdown = "") {
  const lines = bodyOf(markdown).split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "---") {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(4, heading[1].length + 2);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }
    if (/^>\s*/.test(line)) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s*/, ""))}</blockquote>`);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return html.join("");
}

function sectionsForNote(markdown = "") {
  const body = bodyOf(markdown);
  const matches = [...body.matchAll(/^#{2,4}\s+(.+)$/gm)];
  const sections = [];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const next = matches[i + 1];
    const title = stripMarkdown(match[1]);
    const start = match.index + match[0].length;
    const end = next ? next.index : body.length;
    const markdownSlice = body.slice(start, end).trim();
    if (!markdownSlice) continue;
    sections.push({
      id: slugify(title).slice(0, 64),
      title,
      html: noteHtml(markdownSlice),
      text: stripMarkdown(markdownSlice).slice(0, 900)
    });
  }
  return sections;
}

function includesAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function countAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term)).length;
}

function eventFacets(event, noteMarkdown = "") {
  const text = `${event.title} ${event.type} ${event.summary} ${event.detail || ""} ${noteMarkdown}`.toLowerCase();
  return {
    decision: analyticLexicons.decision.filter((term) => text.includes(term)),
    power: analyticLexicons.power.filter((term) => text.includes(term)),
    material: analyticLexicons.material.filter((term) => text.includes(term)),
    closure: analyticLexicons.closure.filter((term) => text.includes(term)),
    controversy: analyticLexicons.controversy.filter((term) => text.includes(term)),
    governance: /policy|court|litigation|state|governance|law|order|regulat|safety|principles|framework/i.test(`${event.type} ${text}`)
  };
}

function qualityForEvent(event, noteMarkdown = "") {
  const body = bodyOf(noteMarkdown);
  const sections = sectionsForNote(noteMarkdown);
  const sourceish = section(body, "citation") || section(body, "source") || event.sourceUrl;
  const claimish = section(body, "core claim") || section(body, "why this note belongs in a technology-history vault") || event.summary;
  const concepts = event.allConcepts || event.concepts || [];
  const worldHits = countAny(body, analyticLexicons.power);
  const decisionHits = countAny(body, analyticLexicons.decision);
  const scoreParts = [
    Boolean(noteMarkdown),
    body.length > 1200,
    body.length > 4000,
    Boolean(sourceish),
    Boolean(claimish),
    concepts.length >= 2,
    sections.length >= 3,
    decisionHits >= 2,
    worldHits >= 2,
    (event.links || []).length >= 2
  ];
  const score = scoreParts.filter(Boolean).length;
  const missing = [];
  if (!noteMarkdown) missing.push("vault note");
  if (!sourceish) missing.push("source/citation");
  if (!claimish) missing.push("core claim");
  if (concepts.length < 2) missing.push("concept links");
  if (decisionHits < 2) missing.push("decision-maker context");
  if (worldHits < 2) missing.push("institution/world context");
  return {
    score,
    label: !noteMarkdown ? "unavailable" : score >= 8 ? "complete" : score >= 6 ? "solid draft" : "thin",
    missing,
    sections: sections.length,
    words: body.trim() ? body.trim().split(/\s+/).length : 0
  };
}

function attachVaultNote(event, notesByKey) {
  const note = notesByKey.get(noteKey(event.sourceNote));
  if (!note) {
    event.vaultNote = {
      title: event.sourceNote || event.title,
      available: false,
      html: "",
      sections: [],
      textLength: 0
    };
    event.quality = qualityForEvent(event, "");
    event.facets = eventFacets(event, "");
    event.obsidianUri = "";
    return event;
  }
  const body = bodyOf(note.markdown);
  const noteSections = sectionsForNote(note.markdown);
  event.vaultNote = {
    title: note.name,
    available: true,
    html: noteHtml(note.markdown),
    sections: noteSections,
    citation: stripMarkdown(section(body, "citation") || section(body, "source")).slice(0, 700),
    keyClaim: stripMarkdown(section(body, "core claim") || section(body, "why this note belongs in a technology-history vault") || event.summary).slice(0, 700),
    textLength: bodyOf(note.markdown).trim().length
  };
  event.quality = qualityForEvent(event, note.markdown);
  event.facets = eventFacets(event, note.markdown);
  event.obsidianUri = `obsidian://open?path=${encodeURIComponent(note.file)}`;
  return event;
}

function sourceEvent(note, conceptNames) {
  const frontmatter = parseFrontmatter(note.markdown);
  if (String(frontmatter.timeline).toLowerCase() === "false") return null;
  const body = bodyOf(note.markdown);
  const citation = section(body, "citation");
  if (!citation && !frontmatter.year && !frontmatter.date) return null;

  const { year, date } = citationDate(citation, frontmatter);
  if (!year) return null;
  const title = normalizeTitle(frontmatter.timeline_title || frontmatter.title || note.name);
  const coreClaim = stripMarkdown(section(body, "core claim"));
  const firstProse = body.split(/\r?\n/).map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---") && normalizeTitle(line) !== title);
  const summary = frontmatter.summary || coreClaim || stripMarkdown(firstProse || "");
  const concepts = rankedConcepts(body, conceptNames);
  const sourceUrl = typeof frontmatter.source === "string" && frontmatter.source.startsWith("http")
    ? frontmatter.source
    : citation.match(/https?:\/\/\S+[^\s.,)]/)?.[0] || "";

  return {
    id: slugify(`${year}-${title}`),
    title,
    yearLabel: date || String(year),
    date,
    startYear: year,
    endYear: year,
    type: frontmatter.timeline_type || inferType(`${title} ${summary}`, concepts),
    concepts,
    allConcepts: concepts,
    summary,
    sourceNote: note.name,
    sourceUrl,
    status: "vault",
    draft: String(frontmatter.status).toLowerCase() === "draft",
    week: typeof frontmatter.course_week === "string" ? frontmatter.course_week : "",
    origin: "note"
  };
}

function timelineRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\*{0,2}\d{4}/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4)
    .map(([yearCell, source, summary, conceptCell]) => {
      const yearLabel = stripMarkdown(yearCell);
      const linked = wikilinks(source)[0];
      const title = normalizeTitle(linked || source.replace(/[()*]/g, ""));
      const { startYear, endYear } = parseYearLabel(yearLabel);
      return {
        linkedNote: linked ? normalizeTitle(linked) : null,
        yearLabel,
        startYear,
        endYear,
        title,
        summary: stripMarkdown(summary),
        concepts: wikilinks(conceptCell).map(normalizeTitle),
        gap: /\bgap\b/i.test(source)
      };
    });
}

async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

// iCloud "dataless" placeholders report a size but have no blocks on disk; reading them can hang.
async function isOffloaded(file) {
  const stat = await fs.stat(file);
  return stat.size > 0 && stat.blocks === 0;
}

async function offloadedFiles(files) {
  const offloaded = [];
  for (const file of files) {
    if (await isOffloaded(file)) offloaded.push(file);
  }
  return offloaded;
}

// Reading an offloaded file makes iCloud fetch it; cat runs in a child process so a stuck fetch can be killed.
function fetchFromICloud(file) {
  return new Promise((resolve) => {
    execFile("cat", [file], { timeout: 20000, maxBuffer: 16 * 1024 * 1024 }, () => resolve());
  });
}

async function downloadFromICloud(files) {
  const pending = await offloadedFiles(files);
  if (!pending.length) return [];
  console.log(`Fetching ${pending.length} offloaded note(s) from iCloud...`);
  for (let i = 0; i < pending.length; i += 8) {
    await Promise.all(pending.slice(i, i + 8).map(fetchFromICloud));
  }
  return offloadedFiles(pending);
}

async function readNotes(files) {
  const notes = [];
  for (const file of files) {
    if (await isOffloaded(file)) continue;
    notes.push({ name: path.basename(file, ".md"), file, markdown: await fs.readFile(file, "utf8") });
  }
  return notes;
}

const markdownFiles = await collectMarkdownFiles(vaultPath);
const evicted = (await downloadFromICloud(markdownFiles)).map((file) => path.basename(file, ".md"));
const notes = await readNotes(markdownFiles);
const notesByKey = new Map(notes.map((note) => [noteKey(note.name), note]));

const conceptIndex = notesByKey.get(noteKey(CONCEPT_INDEX));
const conceptNames = new Map(
  (conceptIndex ? wikilinks(conceptIndex.markdown) : [])
    .map(normalizeTitle)
    .filter((name) => notesByKey.has(noteKey(name)) && !/concepts and methods|synthesis|timeline/i.test(name))
    .map((name) => [noteKey(name), normalizeConcept(name)])
);

const eventsByNote = new Map();
for (const note of notes) {
  const event = sourceEvent(note, conceptNames);
  if (event) eventsByNote.set(noteKey(note.name), event);
}

// Rows in the curated timeline note win on label, one-line summary, and concepts; the note adds date, source, and longer claim.
const timelineNote = notesByKey.get(noteKey(TIMELINE_NOTE));
const curated = [];
for (const row of timelineRows(timelineNote?.markdown || "")) {
  const key = row.linkedNote ? noteKey(row.linkedNote) : null;
  const fromNote = key ? eventsByNote.get(key) : null;
  if (key) eventsByNote.delete(key);
  const note = key ? notesByKey.get(key) : null;
  const sameYear = fromNote && fromNote.startYear === row.startYear;
  const noteTitle = note ? parseFrontmatter(note.markdown).timeline_title : "";
  curated.push({
    id: slugify(`${row.yearLabel}-${row.title}`),
    title: noteTitle || fromNote?.title || row.title,
    yearLabel: row.yearLabel,
    date: sameYear && row.startYear === row.endYear ? fromNote.date : null,
    startYear: row.startYear,
    endYear: row.endYear,
    type: inferType(`${row.title} ${row.summary}`, row.concepts),
    concepts: row.concepts,
    allConcepts: [...new Set([...row.concepts, ...(note ? rankedConcepts(bodyOf(note.markdown), conceptNames) : [])])],
    summary: row.summary,
    detail: fromNote && fromNote.summary !== row.summary ? fromNote.summary : "",
    sourceNote: note ? note.name : row.title,
    sourceUrl: fromNote?.sourceUrl || "",
    status: row.gap ? "gap" : "vault",
    draft: fromNote?.draft || false,
    week: fromNote?.week || "",
    origin: TIMELINE_NOTE
  });
}

const events = [...curated, ...eventsByNote.values()]
  .filter((event) => event.startYear && event.startYear >= 1900)
  .map((event) => attachVaultNote(event, notesByKey))
  .map((event) => ({ ...event, date: event.date || null }))
  .sort((a, b) => (a.date || `${a.startYear}`).localeCompare(b.date || `${b.startYear}`) || a.title.localeCompare(b.title));

// Concepts that tag most events (usually from a note template) say nothing about any one event.
const conceptFrequency = new Map();
for (const event of events) {
  for (const concept of event.allConcepts) conceptFrequency.set(concept, (conceptFrequency.get(concept) || 0) + 1);
}
const commonConcepts = new Set([...conceptFrequency].filter(([, count]) => count > events.length * 0.4).map(([name]) => name));
for (const event of events) {
  event.allConcepts = event.allConcepts.filter((concept) => !commonConcepts.has(concept));
  if (event.origin === "note") event.concepts = event.allConcepts.slice(0, 3);
}

// An event links to another when its note wikilinks that note or mentions one of its Obsidian aliases.
const eventIdByNote = new Map(events.map((event) => [noteKey(event.sourceNote), event.id]));
const aliasPatterns = [];
for (const event of events) {
  const note = notesByKey.get(noteKey(event.sourceNote));
  if (!note) continue;
  for (const alias of asList(parseFrontmatter(note.markdown).aliases)) {
    aliasPatterns.push({ id: event.id, pattern: new RegExp(`(?<![\\w-])${escapeRegex(alias)}(?![\\w-])`) });
  }
}
for (const event of events) {
  const note = notesByKey.get(noteKey(event.sourceNote));
  const links = new Set();
  if (note) {
    const body = bodyOf(note.markdown);
    for (const link of wikilinks(body)) {
      const id = eventIdByNote.get(noteKey(link));
      if (id) links.add(id);
    }
    for (const { id, pattern } of aliasPatterns) {
      if (pattern.test(body)) links.add(id);
    }
  }
  links.delete(event.id);
  event.links = [...links];
}

for (const event of events) {
  event.backlinks = events
    .filter((candidate) => candidate.id !== event.id && (candidate.links || []).includes(event.id))
    .map((candidate) => candidate.id);
  event.centrality = (event.links || []).length + (event.backlinks || []).length;
  event.isNew = Date.parse(event.date || `${event.startYear}-01-01`) > Date.now() - 1000 * 60 * 60 * 24 * 45;
}

const duplicateTitles = [...events.reduce((map, event) => {
  const key = noteKey(event.title);
  map.set(key, [...(map.get(key) || []), event.id]);
  return map;
}, new Map())].filter(([, ids]) => ids.length > 1);

const warnings = [
  ...events.filter((event) => event.quality?.missing?.length).map((event) => ({
    id: event.id,
    title: event.title,
    missing: event.quality.missing
  })),
  ...duplicateTitles.map(([title, ids]) => ({ id: `duplicate-${title}`, title, missing: [`duplicate title: ${ids.join(", ")}`] }))
];

if (evicted.length) {
  console.warn(`Warning: ${evicted.length} note(s) are still offloaded to iCloud:`);
  for (const name of evicted) console.warn(`  - ${name}`);
}
// Refuse to replace good data with a partial import.
if (!timelineNote || evicted.length > 3) {
  console.error(`Not writing ${outPath}: too much of the vault is unavailable. Open the vault in Obsidian (or set the folder to "Keep Downloaded" in Finder) and re-run.`);
  process.exit(1);
}

if (commonConcepts.size) {
  console.log(`Hid concepts that tag most events: ${[...commonConcepts].join(", ")}`);
}

const payload = {
  generatedAt: new Date().toISOString(),
  vaultPath,
  offloadedNotes: evicted,
  warnings,
  events
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
const payloadJson = JSON.stringify(payload, null, 2);
await fs.writeFile(outPath, `${payloadJson}\n`);
await fs.writeFile(moduleOutPath, `const timelinePayload = ${payloadJson};\n\nexport default timelinePayload;\n`);
const linkCount = events.reduce((sum, event) => sum + event.links.length, 0);
console.log(`Wrote ${events.length} events to ${outPath} and ${moduleOutPath} (${curated.length} from the timeline table, ${eventsByNote.size} from dated notes, ${linkCount} links)`);
