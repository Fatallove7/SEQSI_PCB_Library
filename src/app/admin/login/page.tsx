import { redirect } from "next/navigation";
import { getUser } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/LoginForm";
export const metadata = {title:"Administrator sign in",robots:{index:false,follow:false}};
export default async function LoginPage() {
  if (await getUser()) redirect("/admin/boards");
  return <><div className="page-heading"><p className="eyebrow">Administration</p><h1>Sign in</h1></div><LoginForm /></>;
}
