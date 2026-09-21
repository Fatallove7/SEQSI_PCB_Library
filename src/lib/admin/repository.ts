import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { boardSchema } from "../validation";
import type { Board } from "../../types/board";
import { LocalAssetStorage, dataDirectory, type AssetStorage } from "./storage";
import { publishedPreviews } from "./previews";
import { initializeCategories, listCategories, createCategory, deleteCategory } from "./categories";
import { renderAssets } from "../board-cover";

export type AssetRole = "source" | "thumbnail" | "schematic" | "schematic-pdf" | "layout" | "layout-pdf" | "model" | "render" | "photo" | "download";
export type Asset = { id: string; boardKey: string; url: string; storageKey: string; name: string; mime: string; size: number; sha256: string; role: AssetRole; origin: "manual" | "generated" | "migration"; superseded?: boolean };
export type ImportReport = { id: string; state: "uploaded" | "validating" | "processing" | "ready-for-review" | "processing-failed"; projects: string[]; documents: { name: string; found: boolean }[]; models: string[]; errors: string[]; generated: string[]; updatedAt: string };
export type ManagedBoard = { key: string; board: Board; published: Board | null; publicationState: "draft" | "published" | "archived"; version: number; createdAt: string; updatedAt: string; publishedAt: string | null; archivedAt: string | null; deleting: boolean; job: ImportReport | null; schematicPdfCandidates?: string[]; pendingAssetRemovals?: string[] };
export type UploadAsset = { name: string; mime: string; data: Buffer; role: AssetRole; origin?: Asset["origin"]; url?: string };
export class ManagementError extends Error { constructor(message: string, public status = 400) { super(message); } }

export function boardAssetPaths(board: Board): string[] {
  return [board.thumbnail, board.schematic?.pdf, ...(board.schematic?.images || []), ...(board.layout || []).map(a => a.src), ...(board.layoutPdfs || []).map(a => a.file), board.model3d?.model, board.model3d?.preview, ...(board.model3d?.renders || []), ...(board.photos || []).map(a => a.src), ...(board.downloads || []).map(a => a.file)].filter((p): p is string => Boolean(p));
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
    initializeCategories(this.db);
  }
  categories() { return listCategories(this.db); }
  createCategory(input: unknown, actor: string) { return createCategory(this.db,input,actor); }
  deleteCategory(id: string, actor: string) { return deleteCategory(this.db,id,actor); }
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
    if (!this.categories().some(c=>c.id===result.data.category)) throw new ManagementError("Unknown category");
    return result.data;
  }
  private validateAssets(board: Board, key: string) {
    if (board.model3d?.primary && !renderAssets(board).includes(board.model3d.primary)) throw new ManagementError("The primary cover must be a selected 3D Render asset");
    for (const url of boardAssetPaths(board)) {
      const asset = this.asset(url);
      if (!asset || asset.boardKey !== key || !this.storage.exists(asset.storageKey)) throw new ManagementError("A referenced asset is missing or belongs to another board");
    }
  }
  create(input: unknown, actor: string, preserveDates = false): ManagedBoard {
    return this.db.transaction(() => {
      const board = this.parse(input);
      if (boardAssetPaths(board).length) throw new ManagementError("Upload assets after creating the draft");
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
    return this.mutate(key, version, actor, "save-draft", r => {
      const board = this.parse(input);
      if (r.publicationState === "archived") throw new ManagementError("Restore an archived board before editing");
      if (board.id !== r.board.id || board.slug !== r.board.slug) throw new ManagementError("PCB ID and slug cannot be changed after creation");
      this.validateAssets(board, key);
      this.queueRemovedAssets(r, board);
      if (board.schematic?.pdf !== r.board.schematic?.pdf) {
        r.schematicPdfCandidates = board.schematic?.pdf ? [board.schematic.pdf] : (r.schematicPdfCandidates || []).filter(url=>url!==r.board.schematic?.pdf);
        const generated = r.schematicPdfCandidates.filter(url=>this.asset(url)?.origin==="generated");
        const fallback = (generated.length ? generated : r.schematicPdfCandidates).at(-1);
        if (fallback) board.schematic = {...board.schematic,pdf:fallback};
      }
      r.board = preserveDates ? board : { ...board, createdAt: r.board.createdAt, updatedAt: new Date().toISOString().slice(0,10) };
    });
  }
  publish(key: string, version: number, actor: string) {
    this.mutate(key, version, actor, "publish", r => {
      if (r.publicationState === "archived") throw new ManagementError("Restore an archived board before publishing");
      this.validateAssets(r.board, key);
      r.published = publishedPreviews(this.parse(r.board), this.assets(key));
      r.publicationState = "published";
      r.publishedAt = new Date().toISOString();
    });
    this.cleanupRemovedAssets(key);
    return this.get(key);
  }
  private queueRemovedAssets(record: ManagedBoard, next: Board) {
    const previous = [record.board.schematic?.pdf, ...renderAssets(record.board), ...(record.board.photos || []).map(a=>a.src)].filter((url):url is string=>Boolean(url));
    const selected = new Set(boardAssetPaths(next));
    record.pendingAssetRemovals = [...new Set([...(record.pendingAssetRemovals || []), ...previous.filter(url=>!selected.has(url))])].filter(url=>!selected.has(url));
  }
  private cleanupRemovedAssets(key: string) {
    // Hold the write lock while checking references and removing files. A failed cleanup
    // stays queued and is retried on publication; unrelated historical files are retained.
    this.db.transaction(()=>{
      const record=this.get(key);
      const referenced=new Set([...boardAssetPaths(record.board), ...(record.published ? boardAssetPaths(record.published) : [])]);
      const pending:string[]=[];
      for(const url of record.pendingAssetRemovals || []) {
        if(referenced.has(url)) continue;
        const asset=this.asset(url);
        if(!asset || asset.boardKey!==key) continue;
        try {this.storage.remove(asset.storageKey);this.db.prepare("DELETE FROM assets WHERE id = ?").run(asset.id);}
        catch {pending.push(url);}
      }
      record.pendingAssetRemovals=pending;
      this.db.prepare("UPDATE boards SET record = ? WHERE key = ?").run(JSON.stringify(record),key);
    }).immediate();
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
      if (confirmation !== r.board.id) throw new ManagementError("PCB ID confirmation does not match");
      r.publicationState = "archived";
      r.archivedAt ||= new Date().toISOString();
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
  addAssets(key: string, version: number, files: UploadAsset[], replace: boolean, actor: string, sourceKind?: "schematic" | "layout") {
    const written: string[] = [];
    try {
      return this.mutate(key, version, actor, "upload", r => {
        if (r.publicationState === "archived") throw new ManagementError("Restore an archived board before uploading");
        const before=structuredClone(r.board);
        const replaced = new Set<string>();
        for (const file of files) {
          const id = randomUUID();
          const extension = file.name.split(".").pop()!.toLowerCase();
          const group = file.role === "source" ? "source" : file.role === "photo" ? "photos" : file.role === "download" ? "downloads" : `generated/${["model","render"].includes(file.role) ? "3d" : file.role.startsWith("schematic") ? "schematic" : "layout"}`;
          const storageKey = `${key}/${group}/${id}.${extension}`;
          const asset: Asset = { id, boardKey: key, storageKey, url: file.url || `/pcb/${key}/${id}.${extension}`, name: file.name, mime: file.mime, size: file.data.length, sha256: createHash("sha256").update(file.data).digest("hex"), role: file.role, origin: file.origin || "manual" };
          if (sourceKind && (file.role !== "source" || extension !== (sourceKind === "schematic" ? "schdoc" : "pcbdoc"))) throw new ManagementError("Source format does not match its section");
          const selection = `${file.role}:${asset.origin}`;
          this.storage.put(storageKey, file.data); written.push(storageKey);
          if (file.role === "source") {
            for (const previous of this.assets(key).filter(a => a.role === "source" && !a.superseded && ((replace && !replaced.has(selection) && (!sourceKind || a.name.toLowerCase().endsWith(sourceKind === "schematic" ? ".schdoc" : ".pcbdoc"))) || a.name.toLowerCase() === file.name.toLowerCase()))) {
              this.db.prepare("UPDATE assets SET record = ? WHERE id = ?").run(JSON.stringify({...previous,superseded:true}),previous.id);
            }
          }
          this.db.prepare("INSERT INTO assets VALUES (?,?,?,?)").run(id, key, asset.url, JSON.stringify(asset));
          const clear = replace && !replaced.has(selection); replaced.add(selection);
          // Replacing a manual selection must not discard generated candidates.
          const keep = (url:string) => !clear || (this.asset(url)?.origin === "generated") !== (asset.origin === "generated");
          const b = r.board;
          if (file.role === "thumbnail") b.thumbnail = asset.url;
          if (file.role === "schematic") b.schematic = { ...b.schematic, images: [...(b.schematic?.images || []).filter(keep), asset.url] };
          if (file.role === "schematic-pdf") {
            r.schematicPdfCandidates = [...(r.schematicPdfCandidates || (b.schematic?.pdf ? [b.schematic.pdf] : [])).filter(keep), asset.url];
            const generated = r.schematicPdfCandidates.filter(url=>this.asset(url)?.origin==="generated");
            b.schematic = { ...b.schematic, pdf: (generated.length ? generated : r.schematicPdfCandidates).at(-1) };
          }
          if (file.role === "layout") b.layout = [...(b.layout || []).filter(a=>keep(a.src)), {src:asset.url,caption:file.name}];
          if (file.role === "layout-pdf") b.layoutPdfs = [...(b.layoutPdfs || []).filter(a=>keep(a.file)), {file:asset.url,label:file.name}];
          if (file.role === "model") b.model3d = { ...b.model3d, model: asset.url };
          if (file.role === "render") b.model3d = { ...b.model3d, renders: [...(b.model3d?.renders || []).filter(keep), asset.url] };
          if (file.role === "photo") b.photos = [...(clear ? [] : b.photos || []), {src:asset.url,caption:file.name}];
          if (file.role === "download") b.downloads = [...(clear ? [] : b.downloads || []), {file:asset.url,label:file.name}];
        }
        if(r.board.model3d?.primary && !renderAssets(r.board).includes(r.board.model3d.primary)) delete r.board.model3d.primary;
        const removalState={...r,board:before};this.queueRemovedAssets(removalState,r.board);r.pendingAssetRemovals=removalState.pendingAssetRemovals;
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
