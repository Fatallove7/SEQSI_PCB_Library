import { redirect } from "next/navigation";
import { getUser, can, type Permission } from "./auth";

export async function requirePageUser(permission?: Permission) {
  const user=await getUser();
  if(!user) redirect("/admin/login");
  if(permission && !can(user.role,permission)) redirect("/admin/boards");
  return user;
}
