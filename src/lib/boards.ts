import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Board, BoardSummary } from "../types/board";
import { boardCover } from "./board-cover";
import { filterBoards } from "./filters";
import { validateBoardRecords } from "./validation";

// Filesystem access is build-time only; client components use the summaries below.
export function getBoards(rootDirectory = process.cwd()): Board[] {
  const directory = path.join(rootDirectory, "src/data/boards");
  if (!existsSync(directory)) return [];
  const records = readdirSync(directory).filter((file) => file.endsWith(".json")).sort().map((filename) => {
    try {
      return { filename, data: JSON.parse(readFileSync(path.join(directory, filename), "utf8")) as unknown };
    } catch (error) {
      throw new Error(`${filename}: invalid or unreadable JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  const boards = validateBoardRecords(records, path.join(rootDirectory, "public"));
  return filterBoards(boards, {});
}

export function getBoardSummaries(boards: Board[]): BoardSummary[] {
  return boards.map((board) => {
    const { id, slug, title, year, category, designer, description, tags, demo, createdAt } = board;
    return { id, slug, title, year, category, designer, description, tags, cover: boardCover(board), demo, createdAt };
  });
}

export function getYears(boards: Board[]): number[] {
  return [...new Set(boards.map((board) => board.year))].sort((a, b) => b - a);
}
