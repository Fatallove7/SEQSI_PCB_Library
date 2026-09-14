import type { z } from "zod";
import type { boardSchema } from "../lib/validation";

export type Board = z.infer<typeof boardSchema>;

// Only these fields cross into the client-side catalog. Full media stays on detail pages.
export type BoardSummary = Pick<Board,
  "id" | "slug" | "title" | "year" | "category" | "designer" | "description" |
  "tags" | "thumbnail" | "demo" | "createdAt"
>;
