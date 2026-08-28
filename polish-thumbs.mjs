#!/usr/bin/env node
/**
 * polish-thumbs.mjs — flat Blender previews → photoreal product photos
 * ---------------------------------------------------------------------
 * Runs each catalog thumbnail through the same Replicate img2img pipeline the
 * canvas "Render view" button uses, so library cards look like catalog
 * photography instead of grey clay.
 *
 * The polished image is written as <name>.jpg NEXT TO the flat <name>.webp,
 * and the library prefers the .jpg when it exists. So the webp is its own
 * backup: this is re-runnable, and reverting is `rm thumbs/*.jpg`.
 * (sips on macOS cannot write webp, which is why the output is jpeg.)
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 *   export REPLICATE_API_TOKEN=r8_...
 *   ./render-thumbs.sh public/models public/models/thumbs 512 white
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   node polish-thumbs.mjs [thumbs-dir]
 *   node polish-thumbs.mjs public/models/thumbs
 *
 * Cost is roughly $0.02 per image; a 45-model library is well under $1.
 * Already-polished files are skipped, so it is safe to re-run after adding
 * a few models.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const THUMBS = process.argv[2] || "public/models/thumbs";
const TOKEN = process.env.REPLICATE_API_TOKEN;

// NOT the canvas render model: adirik/interior-design is trained on ROOMS and
// has no idea what an isolated object on white is — the first attempt turned a
// sofa into a folded napkin. A general img2img model handles single products.
//
// Strength is deliberately LOW. A catalog thumbnail showing a sofa that is not
// the sofa the user places is worse than a plain one, so fidelity beats beauty.
// Run by owner/name via POST /v1/models/{owner}/{name}/predictions — no
// version hash. Pinned hashes go stale and the API then closes the connection
// mid-request (EPIPE) rather than returning a clean error.
const MODEL = process.env.THUMB_MODEL || "black-forest-labs/flux-kontext-pro";
// Image-editing models disagree on the input field name; try one, fall back.
const IMG_FIELDS = (process.env.THUMB_IMAGE_FIELD || "input_image,image").split(",");
const STRENGTH = Number(process.env.THUMB_STRENGTH ?? 0.38);

if (!TOKEN) {
  console.error("REPLICATE_API_TOKEN is not set.\n  export REPLICATE_API_TOKEN=r8_...");
  process.exit(1);
}
if (!fs.existsSync(THUMBS)) {
  console.error(`No such directory: ${THUMBS}\nRun ./render-thumbs.sh first.`);
  process.exit(1);
}


// The catalog knows what each model actually is; the filename does not.
// "boca_tommy" told the model nothing, which is half of why the first attempt
// invented an unrelated object.
let CATALOG = [];
try {
  const cat = fs.readFileSync("lib/furniture/catalog.ts", "utf8");
  const re = /id:\s*"([^"]+)"[^}]*?name:\s*"([^"]+)"[^}]*?path:\s*"([^"]+)"[^}]*?tags:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(cat))) {
    CATALOG.push({
      name: m[2],
      base: m[3].split("/").pop().replace(/\.glb$/i, ""),
      tags: m[4].split(",").map(s => s.trim().replace(/"/g, "")).filter(Boolean),
    });
  }
} catch { /* fall back to filenames */ }

const subject = (fileBase) => {
  const hit = CATALOG.find(c => c.base === fileBase);
  if (hit) {
    const tags = hit.tags.slice(0, 3).join(", ");
    return tags ? `${hit.name} — ${tags}` : hit.name;
  }
  return fileBase.replace(/[_-]+/g, " ").replace(/\d+/g, "").trim();
};

const sips = (args) => execFileSync("sips", args, { stdio: "ignore" });

async function polish(file) {
  const name = path.basename(file, path.extname(file));
  const src = path.join(THUMBS, file);
  const dest = path.join(THUMBS, `${name}.jpg`);

  if (fs.existsSync(dest)) {
    console.log(`· skip ${name} (already polished)`);
    return "skipped";
  }

  // Replicate wants png/jpeg, not webp
  const tmpPng = path.join(THUMBS, `${name}.__in.png`);
  fs.copyFileSync(src, tmpPng.replace(".__in.png", ".__in.webp"));
  sips(["-s", "format", "png", tmpPng.replace(".__in.png", ".__in.webp"), "--out", tmpPng]);
  fs.unlinkSync(tmpPng.replace(".__in.png", ".__in.webp"));

  // Keep the upload small. A 512px PNG as base64 can exceed 500KB, which some
  // endpoints refuse outright — JPEG at 384px is a fraction of that and plenty
  // for a thumbnail. (A white matte also gives img2img something to work with
  // where the render was transparent.)
  const tmpJpg = tmpPng.replace(".__in.png", ".__in.jpg");
  sips(["-Z", "384", tmpPng]);
  sips(["-s", "format", "jpeg", "-s", "formatOptions", "85", tmpPng, "--out", tmpJpg]);
  const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(tmpJpg).toString("base64")}`;
  const uploadKb = Math.round(fs.statSync(tmpJpg).size / 1024);
  fs.unlinkSync(tmpJpg);
  if (process.env.DEBUG) console.log(`   upload ${uploadKb} KB`);

  const prompt = [
    `Professional furniture catalog photograph of: ${subject(name)}.`,
    "Identical shape, proportions and camera angle to the input image.",
    "Realistic materials and fabric texture, soft studio lighting,",
    "gentle contact shadow, plain off-white background, sharp focus, 8k.",
  ].join(" ");

  const endpoint = MODEL.includes(":")
    ? "https://api.replicate.com/v1/predictions"
    : `https://api.replicate.com/v1/models/${MODEL}/predictions`;

  const post = (imgField) => fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait",                     // block until finished
    },
    body: JSON.stringify({
      ...(MODEL.includes(":") ? { version: MODEL.split(":")[1] } : {}),
      input: {
        [imgField]: dataUrl,
        prompt,
        negative_prompt:
          "different object, different shape, extra objects, room interior, walls, "
          + "floor, people, hands, text, watermark, logo, cartoon, illustration, "
          + "painting, blurry, deformed, duplicated",
        num_inference_steps: 35,
        guidance_scale: 9,
        prompt_strength: STRENGTH,
      },
    }),
  });

  // Field names differ between models; a 422 usually means the wrong one.
  let res, lastBody = "";
  for (const field of IMG_FIELDS) {
    res = await post(field);
    if (res.ok) break;
    lastBody = (await res.text()).slice(0, 200);
    if (res.status !== 422) break;
    if (process.env.DEBUG) console.log(`   "${field}" rejected, trying next`);
  }

  fs.unlinkSync(tmpPng);

  if (!res || !res.ok) {
    console.log(`✗ ${name}: HTTP ${res?.status} ${lastBody}`);
    return "failed";
  }
  let json = await res.json();

  // `Prefer: wait` only holds the connection for ~60s, and a cold model start
  // routinely exceeds that — the request then returns status "starting" with no
  // output. Poll until it actually finishes.
  const DEADLINE = Date.now() + 5 * 60 * 1000;
  while (
    json?.status && !["succeeded", "failed", "canceled"].includes(json.status)
    && json?.urls?.get && Date.now() < DEADLINE
  ) {
    await new Promise(r => setTimeout(r, 2500));
    const poll = await fetch(json.urls.get, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!poll.ok) break;
    json = await poll.json();
  }

  if (json.status !== "succeeded") {
    console.log(`✗ ${name}: ${json.status ?? "no status"}${json.error ? " — " + json.error : ""}`);
    return "failed";
  }

  const out = Array.isArray(json.output) ? json.output[0] : json.output;
  if (!out) {
    console.log(`✗ ${name}: finished with no image`);
    return "failed";
  }

  const img = await fetch(out);
  if (!img.ok) { console.log(`✗ ${name}: could not download result`); return "failed"; }

  // The flat .webp stays untouched — it is the fallback and the undo.
  const tmpOut = path.join(THUMBS, `${name}.__out.png`);
  fs.writeFileSync(tmpOut, Buffer.from(await img.arrayBuffer()));
  sips(["-Z", "512", tmpOut]);
  sips(["-s", "format", "jpeg", "-s", "formatOptions", "80", tmpOut, "--out", dest]);
  fs.unlinkSync(tmpOut);

  console.log(`✓ ${name}`);
  return "done";
}

const files = fs.readdirSync(THUMBS).filter(f => /\.webp$/i.test(f));
console.log(`Polishing ${files.length} thumbnails (strength ${STRENGTH})…\n`);

let done = 0, skipped = 0, failed = 0;
for (const f of files) {
  try {
    const r = await polish(f);
    if (r === "done") done++; else if (r === "skipped") skipped++; else failed++;
  } catch (e) {
    console.log(`✗ ${f}: ${e.message}`);
    if (e.cause) console.log(`   cause: ${e.cause.message ?? e.cause}`);
    if (process.env.DEBUG) console.log(e);
    failed++;
  }
}

console.log(`\n✅ ${done} polished, ${skipped} skipped, ${failed} failed`);
console.log(`Flat previews kept as .webp alongside the polished .jpg files.`);
console.log(`To revert:  rm ${THUMBS}/*.jpg`);