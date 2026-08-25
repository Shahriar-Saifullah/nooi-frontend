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

// Same model family as the canvas render engine. Strength is deliberately LOW:
// a catalog thumbnail that doesn't match the model the user actually places is
// worse than a plain one, so fidelity beats beauty here.
const MODEL = process.env.REPLICATE_RENDER_MODEL
  || "adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38";
const STRENGTH = Number(process.env.THUMB_STRENGTH ?? 0.45);

if (!TOKEN) {
  console.error("REPLICATE_API_TOKEN is not set.\n  export REPLICATE_API_TOKEN=r8_...");
  process.exit(1);
}
if (!fs.existsSync(THUMBS)) {
  console.error(`No such directory: ${THUMBS}\nRun ./render-thumbs.sh first.`);
  process.exit(1);
}


/** filename → a readable subject for the prompt: "bed_king" → "bed king" */
const subject = (name) => name.replace(/[_-]+/g, " ").replace(/\d+/g, "").trim();

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

  const dataUrl = `data:image/png;base64,${fs.readFileSync(tmpPng).toString("base64")}`;

  const prompt = [
    `Professional product photograph of a ${subject(name)}.`,
    "Keep the exact same shape, proportions and viewing angle as the input.",
    "Studio lighting, soft shadow on a plain light background, realistic materials",
    "and fabric texture, sharp focus, furniture catalog photography, 8k.",
  ].join(" ");

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait",                     // block until finished
    },
    body: JSON.stringify({
      version: MODEL.includes(":") ? MODEL.split(":")[1] : undefined,
      model: MODEL.includes(":") ? undefined : MODEL,
      input: {
        image: dataUrl,
        prompt,
        negative_prompt:
          "different shape, different furniture, extra objects, room interior, "
          + "people, text, watermark, cartoon, illustration, blurry, distorted",
        num_inference_steps: 30,
        guidance_scale: 12,
        prompt_strength: STRENGTH,
      },
    }),
  });

  fs.unlinkSync(tmpPng);

  if (!res.ok) {
    console.log(`✗ ${name}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
    return "failed";
  }
  const json = await res.json();
  const out = Array.isArray(json.output) ? json.output[0] : json.output;
  if (!out) {
    console.log(`✗ ${name}: no output (${json.status}${json.error ? ": " + json.error : ""})`);
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
    failed++;
  }
}

console.log(`\n✅ ${done} polished, ${skipped} skipped, ${failed} failed`);
console.log(`Flat previews kept as .webp alongside the polished .jpg files.`);
console.log(`To revert:  rm ${THUMBS}/*.jpg`);