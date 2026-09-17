import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { BoardEditor } from "@/components/admin/BoardEditor";
export default async function NewBoardPage({searchParams}: {searchParams:Promise<{mode?:string}>}) {
  const user = await requireUser("upload");
  return <BoardEditor role={user.role} importMode={(await searchParams).mode==="import"} />;
}
