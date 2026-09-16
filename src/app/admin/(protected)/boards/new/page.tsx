import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { BoardEditor } from "@/components/admin/BoardEditor";
export default async function NewBoardPage({searchParams}: {searchParams:Promise<{mode?:string}>}) {
  const user = await requireUser("upload");
  return <><div className="page-heading"><p className="eyebrow">Private draft</p><h1>Add PCB</h1><p className="lead">Save the board identity first, then upload files and review before publishing.</p></div><BoardEditor role={user.role} importMode={(await searchParams).mode==="import"} /></>;
}
