// Assembles the static site for hosting: web/ at the root and the compiled
// engine at /dist/src/, the same layout scripts/serve.mjs serves locally.
// Run after `npm run build`. Output goes to public/.
import { cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = join(root, "public");

await rm(out, { recursive: true, force: true });
await cp(join(root, "web"), out, { recursive: true });
await cp(join(root, "dist", "src"), join(out, "dist", "src"), { recursive: true });
console.log(`Static site written to ${out}`);
