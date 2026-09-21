import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { BoardEditor } from "@/components/admin/BoardEditor";
import { repository } from "@/lib/admin/repository";
export default async function NewBoardPage() {
  const user = await requireUser("upload");
  return <BoardEditor categories={repository().categories()} role={user.role} />;
}
