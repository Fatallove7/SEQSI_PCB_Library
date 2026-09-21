import { requirePageUser } from "@/lib/admin/page-auth";
import { repository } from "@/lib/admin/repository";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata = { title: "Manage categories" };
export default async function CategoryManagementPage() {
  await requirePageUser("manage-categories");
  return <CategoryManager initial={repository().categories()} />;
}
