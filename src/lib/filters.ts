import { boardCategories } from "../data/categories";
import type { BoardSummary } from "../types/board";
import type { Category } from "../types/category";

export type BoardFilters = {
  q?: string;
  category?: string;
  year?: string;
  designer?: string;
  sort?: string;
};

const compareText = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });

export function filterBoards<T extends BoardSummary>(boards: T[], filters: BoardFilters, categories: Pick<Category, "id" | "name">[] = boardCategories.map(c => ({ id: c.id, name: c.label }))): T[] {
  const query = filters.q?.trim().toLowerCase();
  const filtered = boards.filter((board) => {
    if (filters.category && board.category !== filters.category) return false;
    if (filters.year && String(board.year) !== filters.year) return false;
    if (filters.designer && !board.designer?.includes(filters.designer)) return false;
    if (!query) return true;
    const categoryLabel = categories.find((category) => category.id === board.category)?.name;
    return [board.id, board.title, ...(board.designer ?? []), board.category, categoryLabel,
      ...(board.tags ?? []), board.description].join(" ").toLowerCase().includes(query);
  });

  return filtered.sort((a, b) => {
    const idOrder = compareText(a.id, b.id);
    if (filters.sort === "id") return idOrder;
    if (filters.sort === "title") return compareText(a.title, b.title) || idOrder;
    if (filters.sort === "oldest") return a.year - b.year || compareText(a.createdAt ?? "", b.createdAt ?? "") || idOrder;
    return b.year - a.year || compareText(b.createdAt ?? "", a.createdAt ?? "") || idOrder;
  });
}
