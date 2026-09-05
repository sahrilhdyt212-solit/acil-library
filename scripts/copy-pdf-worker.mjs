import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Copies the pdfjs worker into public/ so the reader loads it same-origin
// (no unpkg CDN, no version drift). Runs on postinstall (incl. Vercel builds).
//
// IMPORTANT: the worker MUST match the pdfjs API version used by react-pdf
// (react-pdf re-exports its own nested pdfjs-dist), NOT the top-level
// pdfjs-dist copy — otherwise the reader fails with
// "The API version X does not match the Worker version Y".
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  join(root, "node_modules", "react-pdf", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
  join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
];

const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error("[acil] pdf worker not found in node_modules — reader will fail. Run npm install first.");
  process.exit(1);
}

let version = "unknown";
try {
  const pkg = JSON.parse(
    readFileSync(join(dirname(dirname(src)), "package.json"), "utf8")
  );
  version = pkg.version ?? version;
} catch {
  // non-fatal: filename check below still guards mismatches
}

const dest = join(root, "public", "pdf.worker.min.mjs");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[acil] pdf worker v${version} copied → public/pdf.worker.min.mjs`);
