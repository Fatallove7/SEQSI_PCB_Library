import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { boardCategories } from "../data/categories";
import type { Board } from "../types/board";

const text = z.string().trim().min(1, "Must not be empty");
const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a valid calendar date in YYYY-MM-DD format");

const imageExtensions = ["png", "jpg", "jpeg", "webp", "svg", "avif", "gif"];
function assetPath(extensions?: string[]) {
  return z.string().refine((value) => {
    if (!value.startsWith("/pcb/")) return false;
    const segments = value.slice(5).split("/");
    if (!segments.every((segment) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment))) return false;
    if (!extensions) return true;
    const extension = value.split(".").pop()?.toLowerCase();
    return extension !== undefined && extensions.includes(extension);
  }, `Expected a local /pcb/ path without traversal, query, or fragment${extensions ? `; allowed formats: ${extensions.join(", ")}` : ""}`);
}

const imagePath = assetPath(imageExtensions);
const image = z.object({
  src: imagePath,
  caption: text.optional(),
  alt: text.optional(),
  photographer: text.optional(),
  date: date.optional(),
});

// Unknown extension fields are accepted; known fields are validated and returned.
export const boardSchema = z.object({
  id: text,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens"),
  title: text,
  year: z.number().int().min(1900).max(9999),
  category: text.refine((value) => boardCategories.some((category) => category.id === value), "Unknown category; check src/data/categories.ts"),
  description: text,
  designer: z.array(text).optional(),
  revision: text.optional(),
  status: z.enum(["design", "fabrication", "assembled", "tested", "deprecated"]).optional(),
  tags: z.array(text).optional(),
  thumbnail: imagePath.optional(),
  specifications: z.record(z.string(), z.union([text, z.number()])).optional(),
  schematic: z.object({ images: z.array(imagePath).optional(), pdf: assetPath(["pdf"]).optional() }).optional(),
  layout: z.array(image).optional(),
  model3d: z.object({
    model: assetPath(["glb", "gltf"]).optional(),
    preview: imagePath.optional(),
    renders: z.array(imagePath).optional(),
  }).optional(),
  photos: z.array(image).optional(),
  downloads: z.array(z.object({ label: text, file: assetPath() })).optional(),
  notes: z.string().optional(),
  createdAt: date.optional(),
  updatedAt: date.optional(),
  demo: z.boolean().optional(),
});

function referencedAssets(board: Board): { field: string; file: string }[] {
  const assets: { field: string; file: string }[] = [];
  const add = (field: string, file?: string) => { if (file) assets.push({ field, file }); };
  add("thumbnail", board.thumbnail);
  add("schematic.pdf", board.schematic?.pdf);
  board.schematic?.images?.forEach((file, index) => add(`schematic.images.${index}`, file));
  board.layout?.forEach((item, index) => add(`layout.${index}.src`, item.src));
  add("model3d.model", board.model3d?.model);
  add("model3d.preview", board.model3d?.preview);
  board.model3d?.renders?.forEach((file, index) => add(`model3d.renders.${index}`, file));
  board.photos?.forEach((item, index) => add(`photos.${index}.src`, item.src));
  board.downloads?.forEach((item, index) => add(`downloads.${index}.file`, item.file));
  return assets;
}

export function validateBoardRecords(records: { filename: string; data: unknown }[], publicDirectory: string): Board[] {
  const boards: Board[] = [];
  const errors: string[] = [];
  const identifiers = { id: new Map<string, string>(), slug: new Map<string, string>() };

  for (const { filename, data } of records) {
    const result = boardSchema.safeParse(data);
    if (!result.success) {
      errors.push(...result.error.issues.map((issue) => `${filename}: ${issue.path.join(".") || "record"}: ${issue.message}`));
      continue;
    }
    const board = result.data;
    for (const field of ["id", "slug"] as const) {
      const previous = identifiers[field].get(board[field]);
      if (previous) errors.push(`${filename}: ${field}: duplicate "${board[field]}" (already in ${previous})`);
      else identifiers[field].set(board[field], filename);
    }
    for (const { field, file } of referencedAssets(board)) {
      try {
        const fullPath = realpathSync(path.join(publicDirectory, file.slice(1)));
        const pcbDirectory = realpathSync(path.join(publicDirectory, "pcb"));
        const relative = path.relative(pcbDirectory, fullPath);
        if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
          errors.push(`${filename}: ${field}: asset resolves outside public/pcb: ${file}`);
        } else if (!statSync(fullPath).isFile()) {
          errors.push(`${filename}: ${field}: expected a file: ${file}`);
        }
      } catch {
        errors.push(`${filename}: ${field}: referenced asset missing or unreadable: ${file}`);
      }
    }
    boards.push(board);
  }
  if (errors.length) throw new Error(`PCB validation failed:\n${errors.join("\n")}`);
  return boards;
}
