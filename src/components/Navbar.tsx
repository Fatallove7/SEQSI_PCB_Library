"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { site } from "@/config/site";
import { assetUrl } from "@/lib/assets";
import { LoginForm } from "@/components/admin/LoginForm";
import type { User } from "@/lib/admin/auth";

const links = [["/", "Home"], ["/boards", "Boards"], ["/categories", "Categories"], ["/years", "Years"], ["/about", "About"]];

export function Navbar({ user, permissions }: { user: User | null; permissions: { upload: boolean; manage: boolean; archive: boolean } }) {
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const signInButton = useRef<HTMLButtonElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true); setError("");
    try {
      const response = await fetch(assetUrl("/api/admin/logout"), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      if (pathname === "/admin" || pathname.startsWith("/admin/")) window.location.assign(assetUrl("/boards"));
      else { if (accountMenu.current) accountMenu.current.open = false; router.refresh(); setSigningOut(false); }
    } catch (e) { setError(e instanceof Error ? e.message : "Sign out failed."); setSigningOut(false); }
  }
  return <header className="site-header"><div className="container nav-inner">
    <Link href="/" className="brand">{site.logo ? <Image src={assetUrl(site.logo)} width={28} height={28} alt="" unoptimized /> : <span className="brand-mark" aria-hidden="true">PCB</span>}{site.title}</Link>
    <nav aria-label="Main navigation">{links.map(([href, label]) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}</nav>
    <div className="auth-actions">{user ? <>
      {permissions.upload && <Link className="button primary" href="/admin/boards/new">+ Upload PCB</Link>}
      <details className="account-menu" ref={accountMenu} onKeyDown={event => {
        if (event.key === "Escape" && accountMenu.current) { accountMenu.current.open = false; accountMenu.current.querySelector("summary")?.focus(); }
      }}>
        <summary role="button" className="button">{user.username}<span aria-hidden="true">⌄</span></summary>
        <div className="account-menu-panel">
          {permissions.manage && <Link href="/admin/boards" onClick={() => { if (accountMenu.current) accountMenu.current.open = false; }}>Management</Link>}
          {permissions.archive && <Link href="/admin/archive" onClick={() => { if (accountMenu.current) accountMenu.current.open = false; }}>Archived Boards</Link>}
          <button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign Out"}</button>
          {error && <p role="alert" className="notice">{error}</p>}
        </div>
      </details>
    </> : <button type="button" className="button" ref={signInButton} onClick={() => { setSignInOpen(true); dialog.current?.showModal(); }}>Sign In</button>}</div>
    <dialog ref={dialog} className="auth-dialog" aria-labelledby="sign-in-title" onClose={() => { setSignInOpen(false); signInButton.current?.focus(); }}>
      <div className="auth-dialog-heading"><h2 id="sign-in-title">Sign in</h2><button type="button" className="button" aria-label="Close sign in" onClick={() => dialog.current?.close()}>Close</button></div>
      {signInOpen && <LoginForm onSuccess={() => dialog.current?.close()} />}
    </dialog>
  </div></header>;
}
