import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/admin/page-auth";
import { repository } from "@/lib/admin/repository";
import { BoardTable } from "@/components/admin/BoardTable";
export default async function ManagementPage() {
  await requireUser();
  return <><div className="page-heading"><p className="eyebrow">Administration</p><h1>PCB management</h1><p className="lead">Draft, review, and publish board documentation.</p></div><div className="admin-actions"><Link className="button primary" href="/admin/boards/new?mode=import">+ Import Altium Project</Link><Link className="button" href="/admin/boards/new">+ Manual Upload</Link></div><BoardTable boards={repository().list().filter(r=>r.publicationState!=="archived")} /></>;
}
