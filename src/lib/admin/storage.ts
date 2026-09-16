import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, realpathSync, lstatSync } from "node:fs";
import path from "node:path";

export interface AssetStorage {
  put(key: string, data: Buffer): void;
  read(key: string): Buffer;
  remove(key: string): void;
  exists(key: string): boolean;
}

export class LocalAssetStorage implements AssetStorage {
  readonly root: string;
  constructor(root: string) {
    mkdirSync(root, { recursive: true });
    this.root = realpathSync(root);
  }
  private resolve(key: string): string {
    if (!/^[a-zA-Z0-9._/-]+$/.test(key) || key.split("/").some(s => !s || s === "." || s === "..")) throw new Error("Invalid storage key");
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    let current = this.root;
    for (const part of key.split("/")) {
      current = path.join(current, part);
      if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("Storage links are not allowed");
    }
    return target;
  }
  put(key: string, data: Buffer) {
    const target = this.resolve(key);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, data, { flag: "wx", mode: 0o600 });
  }
  read(key: string) { return readFileSync(this.resolve(key)); }
  remove(key: string) { const target = this.resolve(key); if (existsSync(target)) unlinkSync(target); }
  exists(key: string) { return existsSync(this.resolve(key)); }
}

export function dataDirectory() {
  const directory = path.resolve(/* turbopackIgnore: true */ process.env.PCB_DATA_DIR || path.join(process.cwd(), "var", "pcb"));
  const normalize = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
  // Resolve existing ancestors as well as lexical paths, including Windows junctions.
  let ancestor = directory;
  while (!existsSync(/* turbopackIgnore: true */ ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error("PCB_DATA_DIR drive or filesystem root is unavailable");
    ancestor = parent;
  }
  const canonical = path.resolve(realpathSync(/* turbopackIgnore: true */ ancestor), path.relative(ancestor,directory));
  for (const forbidden of ["public", ".next", "out"]) {
    const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), forbidden);
    const canonicalRoot = existsSync(root) ? realpathSync(root) : root;
    if ([root,canonicalRoot].some(r => [directory,canonical].some(d => normalize(d) === normalize(r) || normalize(d).startsWith(normalize(r) + path.sep)))) throw new Error("PCB_DATA_DIR must be outside public build directories");
  }
  return canonical;
}
