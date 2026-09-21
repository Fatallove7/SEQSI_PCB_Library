"use client";

import { useSearchParams } from "next/navigation";
import type { BoardSummary } from "@/types/board";
import type { Category } from "@/types/category";
import { filterBoards } from "@/lib/filters";
import { BoardGrid } from "./BoardCard";

export function Catalog({ boards, categories }: { boards: BoardSummary[]; categories: Category[] }) {
  const params = useSearchParams();
  const filters = { q: params.get("q") || "", category: params.get("category") || "", year: params.get("year") || "", designer: params.get("designer") || "", sort: params.get("sort") || "newest" };
  const years = [...new Set(boards.map(b => b.year))].sort((a, b) => b - a);
  const designers = [...new Set(boards.flatMap(b => b.designer || []))].sort();
  const category = categories.find(c => c.id === filters.category);
  const invalid = (filters.category && !category) || (filters.year && !years.some(y => String(y) === filters.year)) || (filters.designer && !designers.includes(filters.designer));
  const result = invalid ? [] : filterBoards(boards, filters, categories);
  const changed = Boolean(filters.q || filters.category || filters.year || filters.designer || filters.sort !== "newest");

  function update(key: string, value: string) {
    const query = new URLSearchParams(params.toString());
    if (value && !(key === "sort" && value === "newest")) query.set(key, value); else query.delete(key);
    const url = `${window.location.pathname}${query.size ? `?${query}` : ""}`;
    if (key === "q") window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  }

  return <>
    <div className="page-heading"><p className="eyebrow">The archive</p><h1>{category?.name || "All PCB works"}</h1><p className="lead">{category?.description || "Explore designs, technical drawings, models, and board documentation."}</p></div>
    <div className="filter-panel">
      <label className="search-label">Search the archive<input type="search" placeholder="Search by ID, title, designer, or tag…" value={filters.q} onChange={e => update("q", e.target.value)} /></label>
      <div className="filter-row">
        <label>Category<select value={filters.category} onChange={e => update("category", e.target.value)}><option value="">All categories</option>{filters.category && !category && <option value={filters.category}>Unknown category</option>}{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Year<select value={filters.year} onChange={e => update("year", e.target.value)}><option value="">All years</option>{filters.year && !years.some(y => String(y) === filters.year) && <option value={filters.year}>Unknown year</option>}{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
        <label>Designer<select value={filters.designer} onChange={e => update("designer", e.target.value)}><option value="">All designers</option>{filters.designer && !designers.includes(filters.designer) && <option value={filters.designer}>Unknown designer</option>}{designers.map(d => <option key={d}>{d}</option>)}</select></label>
        <label>Sort by<select value={["newest", "oldest", "id", "title"].includes(filters.sort) ? filters.sort : "newest"} onChange={e => update("sort", e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="id">PCB ID</option><option value="title">Title</option></select></label>
      </div>
    </div>
    <div className="results-toolbar"><p role="status" aria-live="polite">{result.length} {result.length === 1 ? "board" : "boards"}{changed ? ` of ${boards.length}` : " in the archive"}</p>{changed && <button className="text-button" onClick={() => window.history.pushState(null, "", window.location.pathname)}>Clear filters</button>}</div>
    {invalid && <p className="notice" role="alert">The requested category, year, or designer is not in the archive. Clear filters to browse all boards.</p>}
    {result.length ? <BoardGrid boards={result} categories={categories} /> : <div className="empty-state"><h2>No PCB works match the current filters.</h2><p>Try a different search or clear the filters.</p></div>}
  </>;
}
