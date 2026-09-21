import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { initializeCategories, listCategories, createCategory, deleteCategory } from "../src/lib/admin/categories";
import { boardCategories } from "../src/data/categories";
import { filterBoards } from "../src/lib/filters";
import { can } from "../src/lib/admin/auth";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BoardRepository } from "../src/lib/admin/repository";

function database() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE boards (key TEXT PRIMARY KEY, record TEXT NOT NULL); CREATE TABLE migrations (name TEXT PRIMARY KEY, completed_at TEXT NOT NULL); CREATE TABLE audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, board_key TEXT NOT NULL, at TEXT NOT NULL);");
  return db;
}

test("category migration preserves all default IDs and runs only once", () => {
  const db = database();
  try {
    initializeCategories(db);
    assert.deepEqual(listCategories(db).map(c => c.id), boardCategories.map(c => c.id));
    const first = listCategories(db)[0];
    assert.equal(first.slug, first.id);
    assert.equal(first.name, boardCategories[0].label);
    assert.ok(first.createdAt);
    deleteCategory(db, first.id, "admin");
    initializeCategories(db);
    assert.equal(listCategories(db).length, 8);
    assert.equal(listCategories(db).some(c => c.id === first.id), false);
  } finally { db.close(); }
});

test("categories normalize whitespace, Unicode and case before duplicate checks", () => {
  const db = database();
  try {
    initializeCategories(db);
    const category = createCategory(db, { name: "  Quantum   Control  ", slug: "  QUANTUM-Control  ", description: "  Lab hardware  " }, "admin");
    assert.equal(category.name, "Quantum Control");
    assert.equal(category.slug, "quantum-control");
    assert.equal(category.description, "Lab hardware");
    assert.throws(() => createCategory(db, { name: "ＱＵＡＮＴＵＭ control", slug: "another" }), /already exists/i);
    assert.throws(() => createCategory(db, { name: "Different", slug: "QUANTUM-CONTROL" }), /already exists/i);
    for (const input of [{ name: " ", slug: "blank" }, { name: "Fine", slug: "a/b" }, { name: "Fine", slug: "" }, null]) assert.throws(() => createCategory(db, input), /name|slug|category/i);
    assert.equal(listCategories(db).length, 10);
    assert.equal((db.prepare("SELECT count(*) AS n FROM audit WHERE action = 'create-category'").get() as { n: number }).n, 1);
  } finally { db.close(); }
});

test("category deletion counts distinct board keys across drafts, published snapshots and archive", () => {
  const db = database();
  try {
    initializeCategories(db);
    const category = createCategory(db, { name: "Used", slug: "used" });
    const insert = db.prepare("INSERT INTO boards VALUES (?,?)");
    insert.run("draft", JSON.stringify({ board: { category: category.id }, published: null, publicationState: "draft" }));
    insert.run("published", JSON.stringify({ board: { category: category.id }, published: { category: category.id }, publicationState: "published" }));
    insert.run("archived", JSON.stringify({ board: { category: "adapter-board" }, published: { category: category.id }, publicationState: "archived" }));
    assert.throws(() => deleteCategory(db, category.id), /3 boards/);
    assert.ok(listCategories(db).some(c => c.id === category.id));
    db.prepare("DELETE FROM boards").run();
    deleteCategory(db, category.id);
    assert.equal(listCategories(db).some(c => c.id === category.id), false);
    assert.throws(() => deleteCategory(db, category.id), /not found/i);
  } finally { db.close(); }
});

test("category name search uses runtime taxonomy alongside existing filters", () => {
  const categories = [{ id: "custom", name: "Quantum Control", slug: "quantum-control", createdAt: "2026-09-17" }];
  const boards = [{ id: "Q1", slug: "q1", title: "Controller", category: "custom", year: 2026, designer: ["Alice"], tags: ["Flux"], description: "Laboratory circuit" }];
  assert.equal(filterBoards(boards, { q: "QUANTUM", category: "custom", year: "2026", designer: "Alice" }, categories).length, 1);
  for (const q of ["Q1", "controller", "alice", "flux", "laboratory"]) assert.equal(filterBoards(boards, { q }, categories).length, 1);
  assert.equal(filterBoards(boards, { q: "quantum", year: "2025" }, categories).length, 0);
});

test("only administrators can manage categories", () => {
  assert.equal(can("admin", "manage-categories"), true);
  assert.equal(can("editor", "manage-categories"), false);
});

test("runtime board validation and category persistence survive repository reopen", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "pcb-categories-"));
  let repo = new BoardRepository(directory);
  try {
    const category = repo.createCategory({ name: "Runtime Category", slug: "runtime-category" }, "admin");
    const input = { id: "CATEGORY-1", slug: "category-1", title: "Category fixture", category: category.id, year: 2026, description: "Fixture" };
    assert.throws(() => repo.create({ ...input, category: "missing" }, "admin"), /Unknown category/);
    let board = repo.create(input, "admin");
    assert.throws(() => repo.save(board.key, { ...input, category: "missing" }, board.version, "admin"), /Unknown category/);
    board = repo.publish(board.key, board.version, "admin");
    board = repo.save(board.key, { ...input, category: "adapter-board" }, board.version, "admin");
    assert.throws(() => repo.deleteCategory(category.id, "admin"), /1 board references/);
    board = repo.archive(board.key, board.version, "admin");
    assert.throws(() => repo.deleteCategory(category.id, "admin"), /1 board references/);
    repo.deleteCategory("miscellaneous", "admin");
    repo.close();
    repo = new BoardRepository(directory);
    assert.ok(repo.categories().some(c => c.id === category.id));
    assert.equal(repo.categories().some(c => c.id === "miscellaneous"), false);
    assert.throws(() => repo.deleteCategory(category.id, "admin"), /1 board references/);
    repo.delete(board.key, board.version, input.id, "admin");
    repo.deleteCategory(category.id, "admin");
    assert.equal(repo.categories().some(c => c.id === category.id), false);
  } finally {
    repo.close();
    const target = path.resolve(directory);
    if (path.dirname(target) !== path.resolve(tmpdir()) || !path.basename(target).startsWith("pcb-categories-")) throw new Error("Unsafe test cleanup path");
    rmSync(target, { recursive: true, force: true });
  }
});
