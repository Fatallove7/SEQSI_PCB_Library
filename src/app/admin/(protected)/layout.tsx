import { redirect } from "next/navigation";
import { getUser } from "@/lib/admin/auth";
export const metadata = {robots:{index:false,follow:false}};
export default async function ProtectedLayout({children}: {children:React.ReactNode}) {
  const user = await getUser(); if (!user) redirect("/admin/login");
  return <>{children}</>;
}
