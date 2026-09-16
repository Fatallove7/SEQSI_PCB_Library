"use client";
import { useState } from "react";
import { assetUrl } from "@/lib/assets";

export function LoginForm() {
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  return <form className="admin-form admin-login" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(assetUrl("/api/admin/login"), {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:data.get("username"),password:data.get("password")})});
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      window.location.assign(assetUrl("/admin/boards"));
    } catch(e) { setError(e instanceof Error ? e.message : "Sign-in failed"); setBusy(false); }
  }}>
    <label>Username<input name="username" autoComplete="username" required maxLength={128} /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>
    {error && <p role="alert" className="notice">{error}</p>}
    <button className="button primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="muted">Administrator access only. Public browsing does not require an account. Registration is disabled.</p>
  </form>;
}
