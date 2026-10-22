// Lets `node --test` run the TypeScript geometry modules directly, with no
// test framework to install: Node strips the types, and this hook resolves
// the app's "@/…" imports (and extensionless paths) to the .ts files.
import { register } from "node:module";

register("./resolve.mjs", import.meta.url);
