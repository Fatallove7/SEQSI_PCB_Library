import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { boardSchema } from "../validation";
import type { Board } from "../../types/board";
import { LocalAssetStorage, dataDirectory, type AssetStorage } from "./storage";

export type AssetRole = "source" | "thumbnail" | "schematic" | "schematic-pdf" | "layout" | "model" | "render" | "photo" | "download";
export type Asset = { id: string; boardKey: string; url: string; storageKey: string; name: string; mime: string; size: number; sha256: string; role: AssetRole; origin: "manual" | "generated" | "migration"; superseded?: boolean };
export type ImportReport = { id: string; state: "uploaded" | "validating" | "processing" | "ready-for-review" | "processing-failed"; projects: string[]; documents: { name: string; found: boolean }[]; models: string[]; errors: string[]; generated: string[]; updatedAt: string };
export type ManagedBoard = { key: string; board: Board; published: Board | null; publicationState: "draft" | "published" | "archived"; version: number; createdAt: string; updatedAt: string; publishedAt: string | null; archivedAt: string | null; deleting: boolean; job: ImportReport | null };
export type UploadAsset = { name: string; mime: string; data: Buffer; role: AssetRole; origin?: Asset["origin"]; url?: string };
export class ManagementError extends Error { constructor(message: string, public status = 400) { super(message); } }

export function boardAssetPaths(board: Board): string[] {
  return [board.thumbnail, board.schematic?.pdf, ...(board.schematic?.images || []), ...(board.layout || []).map(a => a.src), board.model3d?.model, board.model3d?.preview, ...(board.model3d?.renders || []), ...(board.photos || []).map(a => a.src), ...(board.downloads || []).map(a => a.file)].filter((p): p is string => Boolean(p));
}

export class BoardRepository {
  private db: Database.Database;
  readonly storage: AssetStorage;
  constructor(directory: string, storage?: AssetStorage) {
    mkdirSync(directory, { recursive: true });
    this.storage = storage || new LocalAssetStorage(path.join(directory, "assets"));
    this.db = new Database(path.join(directory, "metadata.sqlite"));
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(`CREATE TABLE IF NOT EXISTS boards (key TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL, record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, board_key TEXT NOT NULL, url TEXT UNIQUE NOT NULL, record TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS assets_board ON assets(board_key);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, board_key TEXT NOT NULL, at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, completed_at TEXT NOT NULL);`);
  }
  close() { this.db.close(); }
  list(): ManagedBoard[] { return (this.db.prepare("SELECT record FROM boards ORDER BY id").all() as {record:string}[]).map(r => JSON.parse(r.record)); }
  get(key: string): ManagedBoard {
    const row = this.db.prepare("SELECT record FROM boards WHERE key = ?").get(key) as {record:string} | undefined;
    if (!row) throw new ManagementError("Board not found", 404);
    return JSON.parse(row.record);
  }
  published(): Board[] { return this.list().filter(b => b.publicationState === "published" && !b.deleting && b.published).map(b => b.published!); }
  assets(key: string): Asset[] { return (this.db.prepare("SELECT record FROM assets WHERE board_key = ? ORDER BY rowid").all(key) as {record:string}[]).map(r => JSON.parse(r.record)); }
  asset(url: string): Asset | undefined {
    const row = this.db.prepare("SELECT record FROM assets WHERE url = ?").get(url) as {record:string} | undefined;
    return row ? JSON.parse(row.record) : undefined;
  }
  publicAsset(asset: Asset) {
    const record = this.get(asset.boardKey);
    return !record.deleting && record.publicationState === "published" && record.published !== null && boardAssetPaths(record.published).includes(asset.url);
  }
  private audit(actor: string, action: string, key: string) { this.db.prepare("INSERT INTO audit(actor,action,board_key,at) VALUES (?,?,?,?)").run(actor, action, key, new Date().toISOString()); }
  private parse(input: unknown): Board {
    const result = boardSchema.safeParse(input);
    if (!result.success) throw new ManagementError(result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
    return result.data;
  }
  private validateAssets(board: Board, key: string) {
    for (const url of boardAssetPaths(board)) {
      const asset = this.asset(url);
      if (!asset || asset.boardKey !== key || !this.storage.exists(asset.storageKey)) throw new ManagementError("A referenced asset is missing or belongs to another board");
    }
  }
  create(input: unknown, actor: string, preserveDates = false): ManagedBoard {
    const board = this.parse(input);
    if (boardAssetPaths(board).length) throw new ManagementError("Upload assets after creating the draft");
    return this.db.transaction(() => {
      if (this.db.prepare("SELECT key FROM boards WHERE id = ? OR slug = ?").get(board.id, board.slug)) throw new ManagementError("PCB ID or slug already exists", 409);
      const now = new Date().toISOString();
      const record: ManagedBoard = { key: randomUUID(), board: preserveDates ? board : { ...board, createdAt: board.createdAt || now.slice(0,10), updatedAt: now.slice(0,10) }, published: null, publicationState: "draft", version: 1, createdAt: now, updatedAt: now, publishedAt: null, archivedAt: null, deleting: false, job: null };
      this.db.prepare("INSERT INTO boards VALUES (?,?,?,?)").run(record.key, board.id, board.slug, JSON.stringify(record));
      this.audit(actor, "create", record.key);
      return record;
    })();
  }
  private mutate(key: string, version: number, actor: string, action: string, change: (record: ManagedBoard) => void): ManagedBoard {
    return this.db.transaction(() => {
      const record = this.get(key);
      if (record.version !== version) throw new ManagementError("This board changed. Reload before saving.", 409);
      if (record.deleting) throw new ManagementError("Deletion is pending; retry permanent deletion", 409);
      change(record);
      record.version++;
      record.updatedAt = new Date().toISOString();
      this.db.prepare("UPDATE boards SET record = ? WHERE key = ?").run(JSON.stringify(record), key);
      this.audit(actor, action, key);
      return record;
    })();
  }
  save(key: string, input: unknown, version: number, actor: string, preserveDates = false) {
    const board = this.parse(input);
    return this.mutate(key, version, actor, "save-draft", r => {
      if (r.publicationState === "archived") throw new ManagementError("Restore an archived board before editing");
      if (board.id !== r.board.id || board.slug !== r.board.slug) throw new ManagementError("PCB ID and slug cannot be changed after creation");
      this.validateAssets(board, key);
      r.board = preserveDates ? board : { ...board, createdAt: r.board.createdAt, updatedAt: new Date().toISOString().slice(0,10) };
    });
  }
  publish(key: string, version: number, actor: string) {
    return this.mutate(key, version, actor, "publish", r => {
      if (r.publicationState === "archived") throw new ManagementError("Restore an archived board before publishing");
      this.validateAssets(r.board, key);
      r.published = this.parse(r.board);
      r.publicationState = "published";
      r.publishedAt = new Date().toISOString();
    });
  }
  archive(key: string, version: number, actor: string) { return this.mutate(key, version, actor, "archive", r => { r.publicationState = "archived"; r.archivedAt = new Date().toISOString(); }); }
  restore(key: string, version: number, actor: string) { return this.mutate(key, version, actor, "restore", r => {
    if (r.publicationState !== "archived") throw new ManagementError("Board is not archived");
    r.publicationState = "draft"; r.archivedAt = null;
  }); }
  delete(key: string, version: number, confirmation: string, actor: string) {
    this.db.transaction(() => {
      const r = this.get(key);
      if (r.version !== version) throw new ManagementError("This board changed. Reload before deleting.", 409);
      if (r.publicationState !== "archived") throw new ManagementError("Archive the board before deleting");
      if (confirmation !== r.board.id) throw new ManagementError("PCB ID confirmation does not match");
      r.deleting = true;
      this.db.prepare("UPDATE boards SET record = ? WHERE key = ?").run(JSON.stringify(r), key);
    })();
    try { for (const asset of this.assets(key)) this.storage.remove(asset.storageKey); }
    catch { throw new ManagementError("File cleanup failed. Board remains private; retry deletion.", 503); }
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM assets WHERE board_key = ?").run(key);
      this.db.prepare("DELETE FROM boards WHERE key = ?").run(key);
      this.audit(actor, "permanent-delete", key);
    })();
  }
  addAssets(key: string, version: number, files: UploadAsset[], replace: boolean, actor: string) {
    const written: string[] = [];
    try {
      return this.mutate(key, version, actor, "upload", r => {
        if (r.publicationState === "archived") throw new ManagementError("Restore an archived board before uploading");
        const replaced = new Set<AssetRole>();
        for (const file of files) {
          const id = randomUUID();
          const extension = file.name.split(".").pop()!.toLowerCase();
          const group = file.role === "source" ? "source" : file.role === "photo" ? "photos" : file.role === "download" ? "downloads" : `generated/${["model","render"].includes(file.role) ? "3d" : file.role.startsWith("schematic") ? "schematic" : "layout"}`;
          const storageKey = `${key}/${group}/${id}.${extension}`;
          const asset: Asset = { id, boardKey: key, storageKey, url: file.url || `/pcb/${key}/${id}.${extension}`, name: file.name, mime: file.mime, size: file.data.length, sha256: createHash("sha256").update(file.data).digest("hex"), role: file.role, origin: file.origin || "manual" };
          this.storage.put(storageKey, file.data); written.push(storageKey);
          if (file.role === "source") {
            for (const previous of this.assets(key).filter(a => a.role === "source" && !a.superseded && ((replace && !replaced.has("source")) || a.name.toLowerCase() === file.name.toLowerCase()))) {
              this.db.prepare("UPDATE assets SET record = ? WHERE id = ?").run(JSON.stringify({...previous,superseded:true}),previous.id);
            }
          }
          this.db.prepare("INSERT INTO assets VALUES (?,?,?,?)").run(id, key, asset.url, JSON.stringify(asset));
          const clear = replace && !replaced.has(file.role); replaced.add(file.role);
          const b = r.board;
          if (file.role === "thumbnail") b.thumbnail = asset.url;
          if (file.role === "schematic") b.schematic = { ...b.schematic, images: [...(clear ? [] : b.schematic?.images || []), asset.url] };
          if (file.role === "schematic-pdf") b.schematic = { ...b.schematic, pdf: asset.url };
          if (file.role === "layout") b.layout = [...(clear ? [] : b.layout || []), {src:asset.url,caption:file.name}];
          if (file.role === "model") b.model3d = { ...b.model3d, model: asset.url };
          if (file.role === "render") b.model3d = { ...b.model3d, renders: [...(clear ? [] : b.model3d?.renders || []), asset.url] };
          if (file.role === "photo") b.photos = [...(clear ? [] : b.photos || []), {src:asset.url,caption:file.name}];
          if (file.role === "download") b.downloads = [...(clear ? [] : b.downloads || []), {file:asset.url,label:file.name}];
        }
        r.board.updatedAt = new Date().toISOString().slice(0,10);
      });
    } catch (error) { for (const file of written) this.storage.remove(file); throw error; }
  }
  report(key: string, version: number, job: ImportReport, actor: string) {
    return this.mutate(key, version, actor, "processing", r => {
      if (r.publicationState === "archived") throw new ManagementError("Restore before processing");
      r.job = job;
    });
  }
  migrated(name: string) { return Boolean(this.db.prepare("SELECT name FROM migrations WHERE name = ?").get(name)); }
  markMigrated(name: string) { this.db.prepare("INSERT INTO migrations VALUES (?,?)").run(name, new Date().toISOString()); }
}

let singleton: BoardRepository | undefined;
export function repository() { return singleton ||= new BoardRepository(dataDirectory()); }
