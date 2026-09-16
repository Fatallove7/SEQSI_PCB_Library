import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { repository } from "@/lib/admin/repository";
import { BoardTable } from "@/components/admin/BoardTable";
export default async function ArchivePage() {
  await requireUser();
  return <><div className="page-heading"><p className="eyebrow">Administration</p><h1>Archive</h1><p className="lead">Archived boards and their assets are private. Restore returns a board to Draft.</p></div><BoardTable archive boards={repository().list().filter(r=>r.publicationState==="archived")} /></>;
}
