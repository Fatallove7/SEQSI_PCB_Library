import { notFound } from "next/navigation";
import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { repository, ManagementError } from "@/lib/admin/repository";
import { BoardEditor } from "@/components/admin/BoardEditor";
export default async function EditBoardPage({params}: {params:Promise<{id:string}>}) {
  const user = await requireUser(); const {id} = await params;
  let record;
  try {record = repository().get(id);} catch(e) {if(e instanceof ManagementError && e.status===404) notFound(); throw e;}
  return <BoardEditor categories={repository().categories()} initial={record} initialAssets={repository().assets(id)} role={user.role} />;
}
