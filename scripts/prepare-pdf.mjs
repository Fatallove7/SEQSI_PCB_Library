import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
const source = path.join(process.cwd(), "node_modules", "pdfjs-dist");
const target = path.join(process.cwd(), "public", "pdfjs");
mkdirSync(target, { recursive: true });
for (const entry of ["build/pdf.worker.min.mjs", "cmaps", "standard_fonts", "wasm", "LICENSE"]) {
  cpSync(path.join(source, entry), path.join(target, path.basename(entry)), { recursive: true });
}
