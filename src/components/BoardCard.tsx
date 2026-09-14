import Link from "next/link";
import type { BoardSummary } from "@/types/board";
import { boardCategories } from "@/data/categories";
import { AssetImage } from "./AssetImage";

export function BoardCard({ board }: { board: BoardSummary }) {
  return <Link className="board-card" href={`/boards/${board.slug}`}>
    <div className="card-image"><AssetImage src={board.thumbnail} alt={`${board.title} thumbnail${board.demo ? " — demo placeholder" : ""}`} />{board.demo && <span className="demo-badge">Demo</span>}</div>
    <div className="card-body"><p className="identifier">{board.id}</p><h3>{board.title}</h3>
      <p className="card-meta">{boardCategories.find(c => c.id === board.category)?.label} <span aria-hidden="true">·</span> {board.year}</p>
      <p className="card-meta">Designer: {board.designer?.join(", ") || "Not recorded"}</p>
      <p className="card-description">{board.description}</p>
      <span className="card-link">View board <span aria-hidden="true">↗</span></span>
    </div>
  </Link>;
}

export function BoardGrid({ boards }: { boards: BoardSummary[] }) {
  return <div className="board-grid">{boards.map(board => <BoardCard key={board.id} board={board} />)}</div>;
}
