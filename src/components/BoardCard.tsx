import Link from "next/link";
import type { BoardSummary } from "@/types/board";
import type { Category } from "@/types/category";
import { PdfThumbnail } from "./PdfPreview";
import { AssetImage } from "./AssetImage";

export function BoardCard({ board, categories }: { board: BoardSummary; categories: Category[] }) {
  return <Link className="board-card" href={`/boards/${board.slug}`}>
    <div className="card-image">{board.cover ? /\.pdf$/i.test(board.cover) ? <PdfThumbnail src={board.cover} /> : <AssetImage src={board.cover} alt={`${board.title} 3D render`} /> : <div className="image-placeholder">3D preview unavailable</div>}{board.demo && <span className="demo-badge">Demo</span>}</div>
    <div className="card-body"><p className="identifier">{board.id}</p><h3>{board.title}</h3>
      <p className="card-meta">{categories.find(c => c.id === board.category)?.name || board.category} <span aria-hidden="true">·</span> {board.year}</p>
      <p className="card-meta">Designer: {board.designer?.join(", ") || "Not recorded"}</p>
      <p className="card-description">{board.description}</p>
      <span className="card-link">View board <span aria-hidden="true">↗</span></span>
    </div>
  </Link>;
}

export function BoardGrid({ boards, categories }: { boards: BoardSummary[]; categories: Category[] }) {
  return <div className="board-grid">{boards.map(board => <BoardCard key={board.id} board={board} categories={categories} />)}</div>;
}
