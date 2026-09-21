import { DeleteBoardButton } from "./DeleteBoardButton";
import Link from "next/link";
import type { ManagedBoard } from "@/lib/admin/repository";
export function BoardTable({boards,archive=false,canDelete=false}: {boards:ManagedBoard[];archive?:boolean;canDelete?:boolean}) {
  if (!boards.length) return <p className="empty-state">{archive ? "No archived boards." : "No boards yet. Upload a PCB to create a draft."}</p>;
  return <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>PCB ID</th><th>Name</th><th>Publication</th><th>Processing</th><th>Actions</th></tr></thead><tbody>{boards.map(record=><tr key={record.key}><td className="identifier">{record.board.id}</td><td>{record.board.title}</td><td>{record.deleting ? "Deletion pending" : record.publicationState}{record.publicationState === "published" && JSON.stringify(record.board)!==JSON.stringify(record.published) && <small>Unpublished changes</small>}</td><td>{record.job?.state.replaceAll("-"," ") || "Manual"}</td><td><Link href={`/admin/boards/${record.key}/edit`}>{archive ? "Review / restore" : "Edit / archive"}</Link>{canDelete && <DeleteBoardButton record={record} />}</td></tr>)}</tbody></table></div>;
}
