import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(
  fs.readFileSync(path.join(root, "public/data/vocabulary/schema.json")),
);
const check = new Ajv2020({ allErrors: true }).compile(schema);
export function validateVocabulary(
  data,
  grammarIds,
  exists = (p) => fs.existsSync(path.join(root, "public", p)),
) {
  if (!check(data))
    return check.errors.map((e) => e.instancePath + " " + e.message);
  const errors = [];
  const ids = new Set(data.entries.map((e) => e.id));
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  if (ids.size !== data.entries.length) errors.push("Duplicate entry id");
  if (categories.size !== data.categories.length)
    errors.push("Duplicate category id");
  const safeId = (id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  const asset = (url) => {
    if (!url) return;
    if (url.startsWith("/")) {
      if (
        url.includes("..") ||
        url.includes("\\") ||
        url.startsWith("//") ||
        !exists(url)
      )
        errors.push("Invalid or missing local asset: " + url);
    } else if (!url.startsWith("https://")) errors.push("Unsafe URL: " + url);
  };
  for (const c of data.categories) {
    if (!safeId(c.id)) errors.push("Invalid category id");
    asset(c.image);
    asset(c.audioUrl);
    const groups = new Set(c.groups.map((g) => g.id));
    if (groups.size !== c.groups.length)
      errors.push("Duplicate group: " + c.id);
    for (const g of c.groups) {
      if (!safeId(g.id)) errors.push("Invalid group id");
      asset(g.audioUrl);
    }
    for (const h of c.hotspots ?? [])
      if (!groups.has(h.group)) errors.push("Unknown hotspot group");
  }
  for (const e of data.entries) {
    if (!safeId(e.id)) errors.push("Invalid entry id: " + e.id);
    if (!categories.get(e.category)?.groups.some((g) => g.id === e.group))
      errors.push("Unknown category/group: " + e.id);
    for (const id of e.related ?? [])
      if (!ids.has(id)) errors.push("Unknown related entry: " + id);
    for (const id of e.grammar ?? [])
      if (!grammarIds.has(id)) errors.push("Unknown grammar: " + id);
    asset(e.audioUrl);
    asset(e.image?.src);
    for (const t of [...e.examples, ...(e.variants ?? []), ...(e.chunks ?? [])])
      asset(t.audioUrl);
    for (const url of e.sources ?? []) asset(url);
  }
  return errors;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(
    fs.readFileSync(path.join(root, "public/data/vocabulary/catalog.json")),
  );
  const grammar = JSON.parse(
    fs.readFileSync(path.join(root, "public/data/grammar.json")),
  );
  const errors = validateVocabulary(
    data,
    new Set(grammar.lessons.map((e) => e.id)),
  );
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      `Vocabulário válido: ${data.entries.length} verbetes / ${data.categories.length} categorias.`,
    );
}
