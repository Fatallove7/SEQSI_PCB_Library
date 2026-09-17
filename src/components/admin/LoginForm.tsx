"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assetUrl } from "@/lib/assets";

export function LoginForm({ onSuccess, redirectTo = "/admin/boards" }: { onSuccess?: () => void; redirectTo?: string }) {
  const router = useRouter();
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  return <form className="auth-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(assetUrl("/api/admin/login"), {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:data.get("username"),password:data.get("password")})});
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (onSuccess) { onSuccess(); router.refresh(); setBusy(false); }
      else window.location.assign(assetUrl(redirectTo));
    } catch(e) { setError(e instanceof Error ? e.message : "Sign-in failed"); setBusy(false); }
  }}>
    <label>Username<input name="username" autoComplete="username" required maxLength={128} /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>
    {error && <p role="alert" className="notice">{error}</p>}
    <button className="button primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="muted">V1 supports one administrator account. Public browsing does not require sign in. Registration is disabled.</p>
  </form>;
}
