"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Board } from "@/types/board";
import type { ManagedBoard, Asset } from "@/lib/admin/repository";
import { boardSchema } from "@/lib/board-schema";
import type { Category } from "@/types/category";
import { assetUrl } from "@/lib/assets";
import { DeleteBoardButton } from "./DeleteBoardButton";
import { renderAssets } from "@/lib/board-cover";
import { ThreeSectionUploads, uploadGroups, type PendingUploads } from "./ThreeSectionUploads";

const blank: Board = {id:"",slug:"",title:"",year:new Date().getFullYear(),category:"",description:""};
export function BoardEditor({initial,initialAssets=[],role,categories:initialCategories}: {initial?:ManagedBoard;initialAssets?:Asset[];role:"admin"|"editor";categories:Category[]}) {
  const [categories,setCategories] = useState(initialCategories);
  useEffect(()=>{
    const refresh=()=>{void fetch(assetUrl("/api/admin/categories"),{cache:"no-store"}).then(async response=>{if(response.ok) setCategories(await response.json());}).catch(()=>{});};
    window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);
  },[]);
  const [record,setRecord] = useState(initial);
  const [board,setBoard] = useState<Board>(initial?.board || {...blank,category:categories[0]?.id || ""});
  const [designerText,setDesignerText] = useState(initial?.board.designer?.join(", ")||"");
  const [tagsText,setTagsText] = useState(initial?.board.tags?.join(", ")||"");
  const [assets,setAssets] = useState(initialAssets);
  const [dirty,setDirty] = useState(false); const [busy,setBusy] = useState(false);
  const [error,setError] = useState(""); const [message,setMessage] = useState("");
  const [pending,setPending] = useState<PendingUploads>({});
  const hasPending = Object.values(pending).some(group=>group.files.length>0);
  const [advanced,setAdvanced] = useState("");
  const archived = record?.publicationState === "archived";
  function change<K extends keyof Board>(field:K,value:Board[K]) {setBoard(b=>({...b,[field]:value}));setDirty(true);}
  async function request(url:string,method:string,body:unknown) {
    const response = await fetch(assetUrl(url),{method,headers:body instanceof FormData ? {} : {"Content-Type":"application/json"},body:body instanceof FormData ? body : JSON.stringify(body)});
    const value = await response.json(); if (!response.ok) throw new Error(value.error || "Operation failed"); return value;
  }
  async function operation(work:()=>Promise<void>) {
    setBusy(true);setError("");setMessage("");
    try {await work();} catch(e) {setError(e instanceof Error ? e.message : "Operation failed");} finally {setBusy(false);}
  }
  function accept(next:ManagedBoard) {
    setRecord(next);setBoard(next.board);setDirty(false);
    setDesignerText(next.board.designer?.join(", ")||"");setTagsText(next.board.tags?.join(", ")||"");
  }
  async function refreshAssets(next:ManagedBoard) {
    const response = await fetch(assetUrl(`/api/admin/boards/${next.key}`),{cache:"no-store"});
    if(response.ok) setAssets((await response.json()).assets);
  }
  async function save() {
    const metadata={...board,designer:designerText.split(",").map(s=>s.trim()).filter(Boolean),tags:tagsText.split(",").map(s=>s.trim()).filter(Boolean)};
    let next:ManagedBoard = await request(record ? `/api/admin/boards/${record.key}` : "/api/admin/boards",record ? "PATCH" : "POST",record ? {board:metadata,version:record.version} : metadata);
    accept(next);
    if(!record) window.history.replaceState(null,"",assetUrl(`/admin/boards/${next.key}/edit/`));
    for(const group of uploadGroups) {
      const selection=pending[group.id];if(!selection?.files.length) continue;
      const before=group.captions ? new Set((next.board[group.captions]||[]).map(image=>image.src)) : undefined;
      const form=new FormData();form.set("version",String(next.version));form.set("role",group.role);form.set("replace",String(selection.replace));
      for(const item of selection.files) {form.append("files",item.file);form.append("paths",item.file.name);}
      next=await request(`/api/admin/boards/${next.key}/upload`,"POST",form);
      accept(next);
      setPending(current=>({...current,[group.id]:{files:[],replace:false}}));
      if(group.captions && selection.files.some(item=>item.caption.trim())) {
        let index=0;
        const captioned={...next.board,[group.captions]:(next.board[group.captions]||[]).map(image=>{
          if(before!.has(image.src)) return image;
          const caption=selection.files[index++]?.caption.trim();return caption?{...image,caption}:image;
        })};
        setBoard(captioned);setDirty(true);
        next=await request(`/api/admin/boards/${next.key}`,"PATCH",{board:captioned,version:next.version});
        accept(next);
      }
      await refreshAssets(next);
    }
    await refreshAssets(next);
    setMessage("Draft saved. Public content is unchanged.");
    return next;
  }
  async function publish() {
    const saved=await save();
    accept(await request(`/api/admin/boards/${saved.key}/publish`,"POST",{version:saved.version}));
    setMessage("Published. The public catalog now shows this version.");
  }
  function requireSaved() {if(dirty||hasPending) throw new Error("Save your draft changes before this action.");}
  async function action(name:string) {
    if(!record) return;requireSaved();
    await accept(await request(`/api/admin/boards/${record.key}/${name}`,"POST",{version:record.version}));
    setMessage(name==="publish" ? "Published. The public catalog now shows this version." : name==="restore" ? "Restored as a private draft." : name==="archive" ? "Archived. Public access is removed." : "Saved.");
  }
  const selectedUrls = new Set([board.schematic?.pdf,...renderAssets(board),...(board.photos||[]).map(a=>a.src)]);
  function remove(url:string) {
    const next = structuredClone(board);
    if(next.thumbnail===url) delete next.thumbnail;
    if(next.schematic) {if(next.schematic.pdf===url) delete next.schematic.pdf;next.schematic.images=next.schematic.images?.filter(p=>p!==url);}
    next.layout=next.layout?.filter(p=>p.src!==url);next.photos=next.photos?.filter(p=>p.src!==url);next.downloads=next.downloads?.filter(p=>p.file!==url);
    next.layoutPdfs=next.layoutPdfs?.filter(p=>p.file!==url);
    if(next.model3d) {if(next.model3d.primary===url) delete next.model3d.primary;if(next.model3d.model===url) delete next.model3d.model;if(next.model3d.preview===url) delete next.model3d.preview;next.model3d.renders=next.model3d.renders?.filter(p=>p!==url);}
    setBoard(next);setDirty(true);
  }
  return <>
    <div className="page-heading"><p className="eyebrow">{record?record.board.id:"Private draft"}</p><h1>{record?record.board.title:"Upload PCB"}</h1><p className="lead">{record?`${record.publicationState} · Edits remain private until you publish.`:"Add board information and files, then save a private draft or publish."}</p></div>
    {!!record?.pendingAssetRemovals?.length && !dirty && <p className="notice">Removed files are queued for cleanup after publication. If cleanup is still pending, publish again to retry.</p>}
    {error && <p role="alert" className="notice admin-message">{error}</p>}
    {(message || busy) && <p role="status" className="notice admin-message">{busy ? "Working…" : message}</p>}
    <form className="admin-form" onSubmit={e=>{e.preventDefault();const publishing=(e.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="publish";void operation(async()=>{if(publishing) await publish();else await save();});}}>
      <fieldset disabled={busy || archived} className="admin-form">
        <h2>Basic information</h2>
        <div className="admin-columns">
          <label>PCB ID<input required value={board.id} readOnly={Boolean(record)} maxLength={100} onChange={e=>change("id",e.target.value)} /></label>
          <label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={board.slug} readOnly={Boolean(record)} maxLength={160} onChange={e=>change("slug",e.target.value)} /></label>
          <label>PCB name<input required value={board.title} maxLength={200} onChange={e=>change("title",e.target.value)} /></label>
          <label>Year<input required type="number" min={1900} max={9999} value={board.year} onChange={e=>change("year",Number(e.target.value))} /></label>
          <div><label>Category<select required value={board.category} onChange={e=>change("category",e.target.value)}>{(!board.category || !categories.some(c=>c.id===board.category)) && <option value="">Select a category</option>}{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{role==="admin" && <Link href="/admin/categories" target="_blank">Manage categories</Link>}</div>
          <label>Designer(s), comma-separated<input value={designerText} onChange={e=>{setDesignerText(e.target.value);setDirty(true);}} /></label>
          <label>Revision<input value={board.revision||""} onChange={e=>change("revision",e.target.value||undefined)} /></label>
          <label>Engineering status<select value={board.status||""} onChange={e=>change("status",e.target.value ? e.target.value as Board["status"] : undefined)}><option value="">Not recorded</option>{["design","fabrication","assembled","tested","deprecated"].map(s=><option key={s}>{s}</option>)}</select></label>
        </div>
        <label>Description<textarea required value={board.description} onChange={e=>change("description",e.target.value)} /></label>
        <label>Tags, comma-separated<input value={tagsText} onChange={e=>{setTagsText(e.target.value);setDirty(true);}} /></label>
        <label>Technical notes<textarea value={board.notes||""} onChange={e=>change("notes",e.target.value)} /></label>
        <label className="admin-checkbox"><input type="checkbox" checked={board.demo||false} onChange={e=>change("demo",e.target.checked)} />Demo / placeholder record</label>
        <ThreeSectionUploads pending={pending} onPending={setPending} assets={assets} board={board} selectedUrls={selectedUrls} onRemove={remove} archived={archived} onPrimary={src=>change("model3d",{...board.model3d,primary:src})} onCaption={(field,src,caption)=>change(field,(board[field]||[]).map(image=>image.src===src?{...image,caption:caption||undefined}:image))} />
        <p className="muted">Files remain private until publication. Maximum 64 MiB per file and 128 MiB per upload group. Optional previews can be added later.</p>
        <div className="admin-actions admin-save-actions"><button className="button" disabled={busy}>Save Draft</button><button type="submit" name="action" value="publish" className="button primary" disabled={busy}>Publish</button>{(dirty||hasPending) && <span className="muted">Unsaved changes</span>}</div>
      </fieldset>
    </form>
    <details className="admin-advanced"><summary>Technical metadata</summary>
      <p className="muted">Existing legacy metadata remains stored. File uploads use the three sections above.</p>
      <fieldset disabled={busy||archived} className="admin-form">        <details onToggle={e=>{if(e.currentTarget.open) setAdvanced(JSON.stringify({...board,designer:designerText.split(",").map(s=>s.trim()).filter(Boolean),tags:tagsText.split(",").map(s=>s.trim()).filter(Boolean)},null,2));}}><summary>Technical specifications, captions, credits, and advanced metadata</summary><p className="muted">Edit the existing metadata structure. Asset paths must belong to this board. PCB ID and slug remain fixed after creation.</p><label>Board metadata JSON<textarea className="technical-json" value={advanced} onChange={e=>setAdvanced(e.target.value)} /></label><button type="button" className="button" onClick={()=>{try {const result=boardSchema.safeParse(JSON.parse(advanced));if(!result.success) throw new Error(result.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; "));setBoard(result.data);setDesignerText(result.data.designer?.join(", ")||"");setTagsText(result.data.tags?.join(", ")||"");setDirty(true);setMessage("Metadata applied locally. Save Draft to validate and persist it.");}catch(e){setError((e as Error).message);}}}>Apply metadata</button></details></fieldset>
    </details>
    {record && <>
      <section className="admin-section"><h2>Publication</h2><p>Current state: <strong>{record.publicationState}</strong>. {record.publishedAt && `Last published ${record.publishedAt}.`}</p><div className="admin-actions">
        {!archived && <><button className="button" disabled={busy||dirty||hasPending} onClick={()=>void operation(()=>action("archive"))}>Archive</button></>}
        {archived && role==="admin" && <button className="button" disabled={busy||record.deleting} onClick={()=>void operation(()=>action("restore"))}>Restore as Draft</button>}
        {role==="admin" && <DeleteBoardButton record={record} disabled={busy||dirty||hasPending} redirectTo="/admin/boards" />}

        {record.publicationState==="published" && <Link className="button" href={`/boards/${record.board.slug}`} target="_blank">View published board ↗</Link>}
      </div><p className="muted">Publish makes the saved metadata and selected assets accessible to everyone. Archive removes public access while retaining files.</p></section>

    </>}
  </>;
}
