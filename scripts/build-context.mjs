import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://epoch.ai/data/notable_ai_models.csv";
const outPath = path.resolve("data/context-data.js");
const localPath = process.argv[2];

const EUROPE = new Set([
  "Austria", "Belgium", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Russia", "Russian Federation",
  "Spain", "Sweden", "Switzerland", "Ukraine", "Luxembourg", "Slovenia", "Lithuania", "Latvia", "Croatia"
]);

function regionOf(country) {
  if (country === "United States of America") return "US";
  if (country === "China" || country === "Hong Kong") return "China";
  if (country.startsWith("United Kingdom")) return "UK";
  if (EUROPE.has(country)) return "Europe";
  if (!country || country === "Unknown") return null;
  return "Other";
}

// Minimal RFC 4180 parser: quoted fields may contain commas, newlines and doubled quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function decimalYear(date) {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return Number((y + (m - 1) / 12 + (d - 1) / 365).toFixed(3));
}

const text = localPath
  ? await fs.readFile(localPath, "utf8")
  : await (await fetch(SOURCE_URL)).text();
const rows = parseCsv(text);

const models = [];
const byYear = {};
for (const row of rows) {
  const date = row["Publication date"];
  if (!/^\d{4}/.test(date)) continue;
  const year = Number(date.slice(0, 4));
  const regions = new Set(row["Country (of organization)"].split(",").map((c) => regionOf(c.trim())).filter(Boolean));
  byYear[year] ??= { total: 0, US: 0, China: 0, UK: 0, Europe: 0, Other: 0 };
  byYear[year].total += 1;
  for (const region of regions) byYear[year][region] += 1;
  const flop = Number(row["Training compute (FLOP)"]);
  if (!(flop > 0)) continue;
  models.push({
    t: decimalYear(date),
    log: Number(Math.log10(flop).toFixed(2)),
    name: row.Model,
    org: row.Organization,
    region: [...regions][0] || "Unknown"
  });
}
models.sort((a, b) => a.t - b.t);

const frontier = [];
let best = -Infinity;
for (const model of models) {
  if (model.log > best) {
    best = model.log;
    frontier.push(model);
  }
}

const payload = {
  source: {
    name: "Epoch AI, Notable AI Models",
    url: "https://epoch.ai/data/notable-ai-models",
    csv: SOURCE_URL,
    license: "CC BY 4.0",
    fetchedAt: new Date().toISOString(),
    rows: rows.length
  },
  models,
  frontier: frontier.map((m) => m.name),
  modelsByYear: byYear
};

await fs.writeFile(outPath, `export default ${JSON.stringify(payload)};\n`);
console.log(`Wrote ${models.length} models with compute (${rows.length} rows, ${frontier.length} frontier steps) to ${outPath}`);
