"use client";
import Link from "next/link";
import { useState } from "react";
import { assetUrl } from "@/lib/assets";
export function AdminBar({username}: {username:string}) {
  const [error,setError] = useState("");
  return <><div className="admin-bar"><nav aria-label="Administration"><Link href="/admin/boards">Boards</Link><Link href="/admin/archive">Archive</Link><Link href="/">Public catalog ↗</Link></nav><span className="muted">{username}</span><button className="button" onClick={async()=>{
    try { const response = await fetch(assetUrl("/api/admin/logout"),{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}); if(!response.ok) throw new Error("Sign out failed"); window.location.assign(assetUrl("/admin/login")); } catch(e) {setError((e as Error).message);}
  }}>Sign out</button></div>{error && <p role="alert">{error}</p>}</>;
}
