import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/Catalog";
import { getBoards, getBoardSummaries } from "@/lib/boards";

export const metadata: Metadata = { title: "Boards", description: "Search and browse PCB designs by category, year, and designer." };

export default function BoardsPage() {
  return <Suspense fallback={<p className="empty-state">Loading catalog controls…</p>}><Catalog boards={getBoardSummaries(getBoards())} /></Suspense>;
}
