import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { getBoards, getBoardSummaries, getYears } from "../src/lib/boards";
import { filterBoards } from "../src/lib/filters";
import { boardSchema, validateBoardRecords } from "../src/lib/validation";

const partial = {
  id: "LAB A", slug: "lab-a", title: "Adapter demo", year: 2026,
  category: "adapter-board", description: "Connector routing example",
};

test("accepts minimal records and optional metadata without inventing values", () => {
  assert.deepEqual(boardSchema.parse(partial), partial);
  assert.equal(boardSchema.safeParse({ ...partial, futureField: "extension" }).success, true);
  assert.equal(boardSchema.safeParse({ ...partial, designer: ["Name A"], revision: "Rev A",
    status: "design", demo: true, notes: "", createdAt: "2024-02-29",
    specifications: { layers: 4, material: "FR-4" }, schematic: {}, model3d: {}, photos: [],
  }).success, true);
});

test("rejects missing required metadata and invalid required values", () => {
  for (const field of ["id", "slug", "title", "year", "category", "description"]) {
    const record: Record<string, unknown> = { ...partial };
    delete record[field];
    assert.equal(boardSchema.safeParse(record).success, false, field);
  }
  for (const change of [
    { id: " " }, { title: "" }, { description: " " }, { slug: "Upper-case" },
    { slug: "../board" }, { slug: "double--dash" }, { year: "2026" },
    { year: 2026.5 }, { year: 1899 }, { year: 10000 }, { category: "unknown" },
  ]) assert.equal(boardSchema.safeParse({ ...partial, ...change }).success, false, JSON.stringify(change));
});

test("rejects malformed optional metadata and impossible dates", () => {
  for (const change of [
    { designer: "Name" }, { designer: [""] }, { tags: [1] }, { revision: 1 },
    { status: "finished" }, { demo: "true" }, { notes: [] },
    { specifications: { layers: [] } }, { specifications: { material: null } },
    { schematic: { images: "file.png" } }, { layout: [{ caption: "No src" }] },
    { model3d: { renders: [null] } }, { downloads: [{ file: "/pcb/a/test.zip" }] },
    { createdAt: "yesterday" }, { updatedAt: "2026-02-29" }, { createdAt: "2026-04-31" },
    { photos: [{ src: "/pcb/a/photo.webp", date: "2026-13-01" }] },
  ]) assert.equal(boardSchema.safeParse({ ...partial, ...change }).success, false, JSON.stringify(change));
});

test("requires safe local paths and field-appropriate formats", () => {
  for (const thumbnail of [
    "https://example.com/board.png", "//example.com/a.png", "/other/a.png", "/pcb/../a.png",
    "/pcb/a/../../b.png", "/pcb/a/%2e%2e/b.png", "/pcb/a\\b.png", "/pcb/a.png?x=1",
    "/pcb/a.png#x", "/pcb//a.png", "/pcb/./a.png", "/pcb/a.exe", "/pcb/a/",
  ]) assert.equal(boardSchema.safeParse({ ...partial, thumbnail }).success, false, thumbnail);
  assert.equal(boardSchema.safeParse({ ...partial, schematic: { pdf: "/pcb/a/test.png" } }).success, false);
  assert.equal(boardSchema.safeParse({ ...partial, model3d: { model: "/pcb/a/test.step" } }).success, false);
  assert.equal(boardSchema.safeParse({ ...partial, downloads: [{ label: "File", file: "/pcb/../test.xln" }] }).success, false);
});

test("download paths accept engineering formats from different EDA tools", () => {
  for (const file of ["drill.xln", "top.gtl", "project.lpp", "LICENSE"]) {
    assert.equal(boardSchema.safeParse({ ...partial, downloads: [{ label: "Engineering file", file: `/pcb/a/${file}` }] }).success, true, file);
  }
});

test("reports duplicate identifiers with both source filenames", () => {
  assert.throws(() => validateBoardRecords([
    { filename: "first.json", data: partial },
    { filename: "second.json", data: partial },
  ], "."), /second\.json.*id.*first\.json[\s\S]*second\.json.*slug.*first\.json/);
});

test("reports schema errors with the source filename and field", () => {
  assert.throws(() => validateBoardRecords([{ filename: "bad.json", data: { ...partial, year: 0 } }], "."), /bad\.json.*year/);
});

test("loads JSON records, checks every referenced asset, and supports an empty archive", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pcb-data-test-"));
  try {
    assert.deepEqual(getBoards(root), []);
    const records = path.join(root, "src/data/boards");
    const assets = path.join(root, "public/pcb/a");
    mkdirSync(records, { recursive: true });
    mkdirSync(assets, { recursive: true });
    assert.deepEqual(getBoards(root), []);
    writeFileSync(path.join(assets, "image.webp"), "fixture");
    writeFileSync(path.join(assets, "schematic.pdf"), "fixture");
    writeFileSync(path.join(assets, "model.glb"), "fixture");
    writeFileSync(path.join(assets, "source.zip"), "fixture");
    const image = "/pcb/a/image.webp";
    const full = { ...partial, thumbnail: image, schematic: { images: [image], pdf: "/pcb/a/schematic.pdf" },
      layout: [{ src: image }], model3d: { model: "/pcb/a/model.glb", preview: image, renders: [image] },
      photos: [{ src: image }], downloads: [{ label: "Source", file: "/pcb/a/source.zip" }],
    };
    writeFileSync(path.join(records, "a.json"), JSON.stringify(full));
    writeFileSync(path.join(records, "z.json"), JSON.stringify({ ...partial, id: "B", slug: "b", year: 2025 }));
    assert.deepEqual(getBoards(root).map((board) => board.id), ["LAB A", "B"]);
    for (const field of ["thumbnail", "schematic", "layout", "model3d", "photos", "downloads"]) {
      const missing = "/pcb/a/missing.webp";
      const changes: Record<string, unknown> = { thumbnail: missing, schematic: { images: [missing] },
        layout: [{ src: missing }], model3d: { preview: missing }, photos: [{ src: missing }],
        downloads: [{ label: "Missing", file: "/pcb/a/missing.zip" }],
      };
      writeFileSync(path.join(records, "a.json"), JSON.stringify({ ...full, [field]: changes[field] }));
      assert.throws(() => getBoards(root), new RegExp(`a\\.json.*${field}.*missing`));
    }
    writeFileSync(path.join(records, "a.json"), "{ broken json");
    assert.throws(() => getBoards(root), /a\.json.*JSON/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const boards = [
  { ...partial, id: "B", slug: "b", title: "Zulu", designer: ["Alice"], tags: ["MicroD"], createdAt: "2026-01-01" },
  { ...partial, id: "A", slug: "a", title: "Alpha", designer: ["Bob"], createdAt: "2026-02-01" },
  { ...partial, id: "C", slug: "c", title: "Filter", category: "filter-board", year: 2025, designer: ["Alice"] },
];

test("catalog summaries exclude detailed media and technical data", () => {
  const summary = getBoardSummaries([{ ...partial, model3d: { model: "/pcb/a/model.glb" },
    schematic: { images: ["/pcb/a/full.webp"] }, specifications: { layers: 4 }, notes: "Private detail" }])[0];
  assert.equal(summary.id, partial.id);
  for (const field of ["model3d", "schematic", "specifications", "notes"]) assert.equal(field in summary, false);
  assert.deepEqual(getYears(boards), [2026, 2025]);
});

test("search covers ID, title, designer, category label, tags, and description without case sensitivity", () => {
  const summaries = getBoardSummaries(boards);
  for (const [query, ids] of [
    ["MICROD", ["B"]], ["zUlU", ["B"]], [" bob ", ["A"]],
    ["Filter Boards", ["C"]], ["connector routing", ["A", "B", "C"]],
  ] as const) assert.deepEqual(filterBoards(summaries, { q: query }).map((board) => board.id), ids);
  assert.equal(filterBoards(getBoardSummaries([{ ...partial, id: "IDENTIFIER-77" }]), { q: "identifier-77" }).length, 1);
});

test("combines exact filters with search and returns an empty result for invalid filters", () => {
  const summaries = getBoardSummaries(boards);
  assert.deepEqual(filterBoards(summaries, { q: "MicroD", category: "adapter-board", year: "2026", designer: "Alice" }).map((board) => board.id), ["B"]);
  for (const filters of [{ year: "banana" }, { year: "02026" }, { category: "missing" }, { designer: "Ali" }, { q: "missing" }]) {
    assert.deepEqual(filterBoards(summaries, filters), []);
  }
});

test("sorts all catalog orders deterministically without mutating input", () => {
  const summaries = getBoardSummaries(boards);
  const original = structuredClone(summaries);
  for (const [sort, ids] of [
    ["newest", ["A", "B", "C"]], ["oldest", ["C", "B", "A"]],
    ["id", ["A", "B", "C"]], ["title", ["A", "C", "B"]], ["unknown", ["A", "B", "C"]],
  ] as const) assert.deepEqual(filterBoards(summaries, { sort }).map((board) => board.id), ids);
  const tied = getBoardSummaries([{ ...partial, id: "Z" }, { ...partial, id: "A" }]);
  assert.deepEqual(filterBoards(tied, {}).map((board) => board.id), ["A", "Z"]);
  assert.deepEqual(summaries, original);
});
