import data from "../data/events-data.js";
import { RHYMES, TOURS } from "../data/curated.js";

const events = data.events || [];
const warnings = data.warnings || [];
const unavailable = events.filter((event) => !event.vaultNote?.available);
const thin = events.filter((event) => event.quality?.label === "thin" || event.quality?.label === "unavailable");
const noSource = events.filter((event) => !event.sourceUrl && !event.vaultNote?.citation);
const duplicateKeys = new Map();

for (const event of events) {
  const key = event.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  duplicateKeys.set(key, [...(duplicateKeys.get(key) || []), event]);
}

const duplicates = [...duplicateKeys.values()].filter((items) => items.length > 1);

console.log(`AI timeline audit`);
console.log(`Events: ${events.length}`);
console.log(`Full vault notes: ${events.length - unavailable.length}/${events.length}`);
console.log(`Thin or unavailable notes: ${thin.length}`);
console.log(`Missing source/citation signal: ${noSource.length}`);
console.log(`Duplicate title groups: ${duplicates.length}`);
console.log(`Warnings: ${warnings.length}`);

if (unavailable.length) {
  console.log(`\nUnavailable vault notes:`);
  for (const event of unavailable) console.log(`- ${event.yearLabel}: ${event.title} (${event.sourceNote})`);
}

if (thin.length) {
  console.log(`\nThin notes:`);
  for (const event of thin.slice(0, 40)) {
    console.log(`- ${event.yearLabel}: ${event.title} [${event.quality?.label}] missing ${event.quality?.missing?.join(", ") || "details"}`);
  }
}

if (duplicates.length) {
  console.log(`\nDuplicate title groups:`);
  for (const group of duplicates) console.log(`- ${group.map((event) => `${event.yearLabel} ${event.title}`).join(" | ")}`);
}

const ids = new Set(events.map((event) => event.id));
const curatedRefs = [
  ...RHYMES.flatMap((rhyme) => rhyme.ids.map((id) => [`rhyme ${rhyme.id}`, id])),
  ...TOURS.flatMap((tour) => tour.steps.flatMap((step, i) => step.ids.map((id) => [`tour ${tour.id} stop ${i + 1}`, id])))
];
const brokenRefs = curatedRefs.filter(([, id]) => !ids.has(id));
console.log(`Curated references (rhymes, tours): ${curatedRefs.length - brokenRefs.length}/${curatedRefs.length} resolve`);
if (brokenRefs.length) {
  console.log(`\nBroken curated references (fix data/curated.js):`);
  for (const [where, id] of brokenRefs) console.log(`- ${where}: ${id}`);
}

process.exit(thin.length || unavailable.length || duplicates.length || brokenRefs.length ? 1 : 0);
