/**
 * Makes the sample order pack (an L-shaped kitchen) to show factories:
 *   node --experimental-strip-types --no-warnings --import ./tests/register.mjs scripts/production/sample.ts <out-dir>
 * Writes <out-dir>/order-SAMPLE-001.zip and the files unzipped in <out-dir>/x.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { placeKitchen } from "@/lib/production/placement";
import { buildOrderPack } from "@/lib/production/pack";
import { sampleKitchen } from "@/lib/production/sample";

const outDir = process.argv[2] ?? "/tmp/pk";
const { data, walls, size, openings } = sampleKitchen();
const input = placeKitchen({
  kitchen: data, walls, size, openings,
  order: { orderNo: "SAMPLE-001", client: "Sample client", project: "L-shaped kitchen (sample)", date: new Date().toISOString().slice(0, 10), designer: "Nooi" },
});
const pack = buildOrderPack(input);
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/${pack.filename}`, pack.zip);
for (const f of pack.files) { mkdirSync(`${outDir}/x/${f.name.split("/").slice(0, -1).join("/")}`, { recursive: true }); writeFileSync(`${outDir}/x/${f.name}`, f.data); }
console.log(pack.filename, pack.zip.length, input.runs.map(r => `${r.code}: ${r.modules.map(m => m.kind).join(",")} start ${r.start.toFixed(3)} dir ${r.dir} horiz ${r.horiz}`));
