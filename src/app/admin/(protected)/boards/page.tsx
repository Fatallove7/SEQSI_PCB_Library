import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { repository } from "@/lib/admin/repository";
import { BoardTable } from "@/components/admin/BoardTable";
export default async function ManagementPage() {
  const user=await requireUser();
  return <><div className="page-heading"><p className="eyebrow">Administration</p><h1>PCB management</h1><p className="lead">Draft, review, and publish board documentation.</p></div><div className="admin-actions"><Link className="button primary" href="/admin/boards/new">+ Upload PCB</Link></div><BoardTable canDelete={user.role==="admin"} boards={repository().list().filter(r=>r.publicationState!=="archived")} /></>;
}
