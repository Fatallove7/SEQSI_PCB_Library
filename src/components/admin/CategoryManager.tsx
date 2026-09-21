"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/types/category";
import { assetUrl } from "@/lib/assets";

export function CategoryManager({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Category>();
  const dialog = useRef<HTMLDialogElement>(null);

  async function mutate(work: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await work(); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Operation failed."); }
    finally { setBusy(false); }
  }

  async function create() {
    const response = await fetch(assetUrl("/api/admin/categories"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug, description }) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Could not create category.");
    setCategories(current => [...current, value]);
    setName(""); setSlug(""); setDescription(""); setMessage(`Created ${value.name}.`);
  }

  async function remove() {
    if (!selected) return;
    const response = await fetch(assetUrl(`/api/admin/categories/${selected.id}`), { method: "DELETE" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Could not delete category.");
    setCategories(current => current.filter(category => category.id !== selected.id));
    setMessage(`Deleted ${selected.name}.`);
  }

  return <>
    <div className="page-heading"><p className="eyebrow">Administration</p><h1>Manage categories</h1><p className="lead">Create categories for the archive. Categories referenced by any board cannot be deleted.</p></div>
    {error && <p role="alert" className="notice admin-message">{error}</p>}
    {(message || busy) && <p role="status" className="notice admin-message">{busy ? "Working…" : message}</p>}
    <form className="admin-form" onSubmit={event => { event.preventDefault(); void mutate(create); }}>
      <fieldset disabled={busy} className="admin-form">
        <h2>Create category</h2>
        <div className="admin-columns">
          <label>Category name<input required maxLength={100} value={name} onChange={event => { const value=event.target.value; setName(value); setSlug(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); }} /></label>
          <label>Category slug<input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="quantum-control" value={slug} onChange={event => setSlug(event.target.value)} /></label>
        </div>
        <label>Description (optional)<textarea maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <div className="admin-actions"><button className="button primary">Create category</button></div>
      </fieldset>
    </form>
    <section className="admin-section"><h2>Categories ({categories.length})</h2>
      {categories.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Description</th><th>Actions</th></tr></thead><tbody>{categories.map(category => <tr key={category.id}><td>{category.name}</td><td>{category.slug}</td><td>{category.description || "—"}</td><td><button className="text-button" disabled={busy} aria-label={`Delete ${category.name}`} onClick={() => { setSelected(category); dialog.current?.showModal(); }}>Delete</button></td></tr>)}</tbody></table></div> : <p className="empty-state">No categories. Create one before adding a board.</p>}
    </section>
    <dialog className="lightbox admin-delete" aria-labelledby="delete-category-title" ref={dialog}>
      <h2 id="delete-category-title">Delete category</h2><p>Delete “{selected?.name}”? This is only possible when no draft, published version, or archived board uses it.</p>
      <div className="admin-actions"><button className="button" onClick={() => dialog.current?.close()}>Cancel</button><button className="button primary" disabled={busy} onClick={() => { dialog.current?.close(); void mutate(remove); }}>Delete category</button></div>
    </dialog>
  </>;
}
