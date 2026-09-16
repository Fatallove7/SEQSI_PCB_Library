import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import type { Board } from "../types/board";

import { boardSchema } from "./board-schema";
export { boardSchema } from "./board-schema";

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
