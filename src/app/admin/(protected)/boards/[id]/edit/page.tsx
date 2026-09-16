import { notFound } from "next/navigation";
import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { repository, ManagementError } from "@/lib/admin/repository";
import { BoardEditor } from "@/components/admin/BoardEditor";
export default async function EditBoardPage({params,searchParams}: {params:Promise<{id:string}>;searchParams:Promise<{mode?:string}>}) {
  const user = await requireUser(); const {id} = await params;
  let record;
  try {record = repository().get(id);} catch(e) {if(e instanceof ManagementError && e.status===404) notFound(); throw e;}
  return <><div className="page-heading"><p className="identifier">{record.board.id}</p><h1>{record.board.title}</h1><p className="lead">{record.publicationState} · Edits remain private until you publish.</p></div><BoardEditor initial={record} initialAssets={repository().assets(id)} role={user.role} importMode={(await searchParams).mode==="import"} /></>;
}
