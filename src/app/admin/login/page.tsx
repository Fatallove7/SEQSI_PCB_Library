import { redirect } from "next/navigation";
import { getUser } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/LoginForm";
export const metadata = {title:"Administrator sign in",robots:{index:false,follow:false}};
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  // Restrict return destinations to local paths; reject protocol-relative URLs and backslashes.
  const redirectTo = typeof next === "string" && /^\/(?!\/)/.test(next) && !/[\\\u0000-\u001f\u007f]/.test(next) && !next.startsWith("/admin/login") ? next : "/admin/boards";
  if (await getUser()) redirect(redirectTo);
  return <><div className="page-heading"><p className="eyebrow">Administration</p><h1>Sign in</h1></div><LoginForm redirectTo={redirectTo} /></>;
}
