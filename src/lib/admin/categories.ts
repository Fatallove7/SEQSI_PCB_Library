import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { boardCategories } from "../../data/categories";
import type { Category } from "../../types/category";
import { HttpError } from "./http";

const normalizeName = (value: string) => value.normalize("NFKC").trim().replace(/\s+/gu, " ");
const categorySchema = z.object({
  name: z.string().transform(normalizeName).pipe(z.string().min(1).max(100)),
  slug: z.string().transform(value => value.normalize("NFKC").trim().toLowerCase()).pipe(z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  description: z.string().trim().max(1000).optional(),
});

export function initializeCategories(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    normalized_name TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT NOT NULL
  );`);
  db.transaction(() => {
    if (db.prepare("SELECT name FROM migrations WHERE name = ?").get("categories-v1")) return;
    const now = new Date().toISOString();
    const insert = db.prepare("INSERT INTO categories (id,slug,name,normalized_name,description,created_at) VALUES (?,?,?,?,?,?)");
    for (const category of boardCategories) insert.run(category.id, category.id, category.label, normalizeName(category.label).toLowerCase(), category.description, now);
    db.prepare("INSERT INTO migrations (name,completed_at) VALUES (?,?)").run("categories-v1", now);
  }).immediate();
}

export function listCategories(db: Database.Database): Category[] {
  return (db.prepare("SELECT id,slug,name,description,created_at AS createdAt FROM categories ORDER BY rowid").all() as (Category & { description: string | null })[])
    .map(category => ({ ...category, description: category.description || undefined }));
}

export function createCategory(db: Database.Database, input: unknown, actor = "system"): Category {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "Enter a category name (1–100 characters), a slug using lowercase letters, numbers and single hyphens, and an optional description (up to 1000 characters).");
  return db.transaction(() => {
    const { name, slug, description } = parsed.data;
    const normalizedName = name.toLowerCase();
    if (db.prepare("SELECT id FROM categories WHERE normalized_name = ? OR slug = ?").get(normalizedName, slug)) throw new HttpError(409, "A category with this name or slug already exists.");
    const category: Category = { id: randomUUID(), name, slug, description: description || undefined, createdAt: new Date().toISOString() };
    db.prepare("INSERT INTO categories (id,slug,name,normalized_name,description,created_at) VALUES (?,?,?,?,?,?)").run(category.id, slug, name, normalizedName, description || null, category.createdAt);
    db.prepare("INSERT INTO audit(actor,action,board_key,at) VALUES (?,?,?,?)").run(actor, "create-category", category.id, category.createdAt);
    return category;
  }).immediate();
}

export function deleteCategory(db: Database.Database, id: string, actor = "system") {
  db.transaction(() => {
    if (!db.prepare("SELECT id FROM categories WHERE id = ?").get(id)) throw new HttpError(404, "Category not found.");
    const { count } = db.prepare("SELECT count(DISTINCT key) AS count FROM boards WHERE json_extract(record, '$.board.category') = ? OR json_extract(record, '$.published.category') = ?").get(id, id) as { count: number };
    if (count) throw new HttpError(409, `Cannot delete category: ${count} ${count === 1 ? "board references" : "boards reference"} it in a draft, published version, or archive.`);
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    db.prepare("INSERT INTO audit(actor,action,board_key,at) VALUES (?,?,?,?)").run(actor, "delete-category", id, new Date().toISOString());
  }).immediate();
}
