// Module resolve hook for the unit tests (registered by tests/register.mjs).
// Maps "@/x/y" to <repo>/x/y.ts and lets relative imports omit ".ts", the way
// the Next.js build resolves them.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isFile = (p) => existsSync(p) && statSync(p).isFile();

function findTs(p) {
  return [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")].find(isFile) ?? null;
}

export async function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith("@/")) {
    target = findTs(path.join(root, specifier.slice(2)));
  } else if (/^\.\.?\//.test(specifier) && !path.extname(specifier)
             && context.parentURL?.startsWith("file:")) {
    target = findTs(path.join(path.dirname(fileURLToPath(context.parentURL)), specifier));
  }
  if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  return next(specifier, context);
}
