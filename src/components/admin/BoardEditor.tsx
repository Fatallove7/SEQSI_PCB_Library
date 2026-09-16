"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board } from "@/types/board";
import type { ManagedBoard, Asset, AssetRole } from "@/lib/admin/repository";
import { boardSchema } from "@/lib/board-schema";
import { boardCategories } from "@/data/categories";
import { assetUrl } from "@/lib/assets";
import { AssetImage } from "@/components/AssetImage";
import { ImageGallery } from "@/components/ImageGallery";
import { ModelViewer } from "@/components/ModelViewer";

const blank: Board = {id:"",slug:"",title:"",year:new Date().getFullYear(),category:boardCategories[0].id,description:""};
const sectionLabels: Record<AssetRole,string> = {source:"Altium / source files",thumbnail:"Thumbnail",schematic:"Schematic images","schematic-pdf":"Schematic PDF",layout:"PCB layout",model:"3D model (GLB / GLTF)",render:"3D renders",photo:"Physical photos",download:"Download files"};
export function BoardEditor({initial,initialAssets=[],role,importMode=false}: {initial?:ManagedBoard;initialAssets?:Asset[];role:"admin"|"editor";importMode?:boolean}) {
  const router = useRouter();
  const [record,setRecord] = useState(initial);
  const [board,setBoard] = useState<Board>(initial?.board || blank);
  const [designerText,setDesignerText] = useState(initial?.board.designer?.join(", ")||"");
  const [tagsText,setTagsText] = useState(initial?.board.tags?.join(", ")||"");
  const [assets,setAssets] = useState(initialAssets);
  const [dirty,setDirty] = useState(false); const [busy,setBusy] = useState(false);
  const [error,setError] = useState(""); const [message,setMessage] = useState("");
  const [uploadRole,setUploadRole] = useState<AssetRole>("source");
  const [mode,setMode] = useState(importMode ? "import" : "manual");
  const [files,setFiles] = useState<File[]>([]); const [replace,setReplace] = useState(false);
  const [advanced,setAdvanced] = useState("");
  const [confirmation,setConfirmation] = useState(""); const deleteDialog = useRef<HTMLDialogElement>(null);
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
  async function accept(next:ManagedBoard) {
    setRecord(next);setBoard(next.board);setDirty(false);
    setDesignerText(next.board.designer?.join(", ")||"");setTagsText(next.board.tags?.join(", ")||"");
    const response = await fetch(assetUrl(`/api/admin/boards/${next.key}`),{cache:"no-store"});
    if(response.ok) setAssets((await response.json()).assets);
    router.refresh();
  }
  async function save() {
    const metadata={...board,designer:designerText.split(",").map(s=>s.trim()).filter(Boolean),tags:tagsText.split(",").map(s=>s.trim()).filter(Boolean)};
    const next = await request(record ? `/api/admin/boards/${record.key}` : "/api/admin/boards",record ? "PATCH" : "POST",record ? {board:metadata,version:record.version} : metadata);
    if(!record) { window.location.assign(assetUrl(`/admin/boards/${next.key}/edit/${mode==="import"?"?mode=import":""}`)); return; }
    await accept(next);setMessage("Draft saved. Public content is unchanged.");
  }
  function requireSaved() {if(dirty) throw new Error("Save your draft changes before this action.");}
  async function action(name:string) {
    if(!record) return;requireSaved();
    await accept(await request(`/api/admin/boards/${record.key}/${name}`,"POST",{version:record.version}));
    setMessage(name==="publish" ? "Published. The public catalog now shows this version." : name==="restore" ? "Restored as a private draft." : name==="archive" ? "Archived. Public access is removed." : "Project inspection finished. Review the processing report below.");
  }
  const selectedUrls = new Set([board.thumbnail,board.schematic?.pdf,...(board.schematic?.images||[]),...(board.layout||[]).map(a=>a.src),board.model3d?.model,board.model3d?.preview,...(board.model3d?.renders||[]),...(board.photos||[]).map(a=>a.src),...(board.downloads||[]).map(a=>a.file)]);
  function remove(url:string) {
    const next = structuredClone(board);
    if(next.thumbnail===url) delete next.thumbnail;
    if(next.schematic) {if(next.schematic.pdf===url) delete next.schematic.pdf;next.schematic.images=next.schematic.images?.filter(p=>p!==url);}
    next.layout=next.layout?.filter(p=>p.src!==url);next.photos=next.photos?.filter(p=>p.src!==url);next.downloads=next.downloads?.filter(p=>p.file!==url);
    if(next.model3d) {if(next.model3d.model===url) delete next.model3d.model;if(next.model3d.preview===url) delete next.model3d.preview;next.model3d.renders=next.model3d.renders?.filter(p=>p!==url);}
    setBoard(next);setDirty(true);
  }
  return <>
    {error && <p role="alert" className="notice admin-message">{error}</p>}
    {message && <p role="status" className="notice admin-message">{message}</p>}
    <form className="admin-form" onSubmit={e=>{e.preventDefault();void operation(save);}}>
      <fieldset disabled={busy || archived} className="admin-form">
        <div className="admin-columns">
          <label>PCB ID<input required value={board.id} readOnly={Boolean(record)} maxLength={100} onChange={e=>change("id",e.target.value)} /></label>
          <label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={board.slug} readOnly={Boolean(record)} maxLength={160} onChange={e=>change("slug",e.target.value)} /></label>
          <label>PCB name<input required value={board.title} maxLength={200} onChange={e=>change("title",e.target.value)} /></label>
          <label>Year<input required type="number" min={1900} max={9999} value={board.year} onChange={e=>change("year",Number(e.target.value))} /></label>
          <label>Category<select value={board.category} onChange={e=>change("category",e.target.value)}>{boardCategories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label>Designer(s), comma-separated<input value={designerText} onChange={e=>{setDesignerText(e.target.value);setDirty(true);}} /></label>
          <label>Revision<input value={board.revision||""} onChange={e=>change("revision",e.target.value||undefined)} /></label>
          <label>Engineering status<select value={board.status||""} onChange={e=>change("status",e.target.value ? e.target.value as Board["status"] : undefined)}><option value="">Not recorded</option>{["design","fabrication","assembled","tested","deprecated"].map(s=><option key={s}>{s}</option>)}</select></label>
        </div>
        <label>Description<textarea required value={board.description} onChange={e=>change("description",e.target.value)} /></label>
        <label>Tags, comma-separated<input value={tagsText} onChange={e=>{setTagsText(e.target.value);setDirty(true);}} /></label>
        <label>Technical notes<textarea value={board.notes||""} onChange={e=>change("notes",e.target.value)} /></label>
        <label className="admin-checkbox"><input type="checkbox" checked={board.demo||false} onChange={e=>change("demo",e.target.checked)} />Demo / placeholder record</label>
        <details onToggle={e=>{if(e.currentTarget.open) setAdvanced(JSON.stringify({...board,designer:designerText.split(",").map(s=>s.trim()).filter(Boolean),tags:tagsText.split(",").map(s=>s.trim()).filter(Boolean)},null,2));}}><summary>Technical specifications, captions, credits, and advanced metadata</summary><p className="muted">Edit the existing metadata structure. Asset paths must belong to this board. PCB ID and slug remain fixed after creation.</p><label>Board metadata JSON<textarea className="technical-json" value={advanced} onChange={e=>setAdvanced(e.target.value)} /></label><button type="button" className="button" onClick={()=>{try {const result=boardSchema.safeParse(JSON.parse(advanced));if(!result.success) throw new Error(result.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; "));setBoard(result.data);setDesignerText(result.data.designer?.join(", ")||"");setTagsText(result.data.tags?.join(", ")||"");setDirty(true);setMessage("Metadata applied locally. Save Draft to validate and persist it.");}catch(e){setError((e as Error).message);}}}>Apply metadata</button></details>
        <div><button className="button primary" disabled={busy}>{record ? "Save Draft" : "Create Draft"}</button>{dirty && <span className="muted"> Unsaved changes</span>}</div>
      </fieldset>
    </form>
    {record && <>
      {!archived && <section className="admin-section"><h2>Upload files</h2><p className="muted">Files stay private until selected in a published record. Maximum 64 MiB per file, 128 MiB per upload.</p>
        <div className="admin-columns"><label>Upload method<select value={mode} onChange={e=>{setMode(e.target.value);setFiles([]);}}><option value="manual">Manual upload / replacement</option><option value="import">Import Altium project</option></select></label>{mode==="manual" && <label>Asset section<select value={uploadRole} onChange={e=>setUploadRole(e.target.value as AssetRole)}>{Object.entries(sectionLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}</div>
        {mode==="import" && <><p className="notice">Select a project folder or ZIP containing .PrjPcb and referenced .SchDoc/.PcbDoc files. A project file alone cannot access sibling files. Altium output generation requires a separate Windows worker; manual exports remain available.</p><label>Select Altium Project Folder<input type="file" multiple {...{webkitdirectory:""}} onChange={e=>setFiles(Array.from(e.target.files||[]))} /></label></>}
        <label>{mode==="import" ? "Or upload project ZIP / project documents" : "Select files"}<input key={mode} type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))} /></label>
        <p className="muted">{files.length} files selected. {uploadRole==="model" && mode==="manual" ? "Include local .bin and texture dependencies with GLTF; they will be embedded." : ""}</p>
        <label className="admin-checkbox"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)} />Replace current section selection (otherwise supplement)</label>
        <button className="button" disabled={busy||!files.length||dirty} onClick={()=>void operation(async()=>{
          requireSaved();const form=new FormData();form.set("version",String(record.version));form.set("role",uploadRole);form.set("replace",String(replace));
          for(const file of files){form.append("files",file);form.append("paths",file.webkitRelativePath||file.name);}
          await accept(await request(`/api/admin/boards/${record.key}/${mode==="import"?"import":"upload"}`,"POST",form));setFiles([]);setMessage("Files uploaded to the private draft. Review before publishing.");
        })}>{busy ? "Working…" : mode==="import" ? "Upload and inspect project" : "Upload to draft"}</button>
      </section>}
      {record.job && <section className="admin-section"><h2>Import preview</h2><p><strong>{record.job.state.replaceAll("-"," ")}</strong></p><p>Detected project: {record.job.projects.join(", ")||"None"}</p><ul>{record.job.documents.map((d,i)=><li key={i}>{d.found?"Found":"Missing"}: {d.name}</li>)}</ul><p>Uploaded external 3D files: {record.job.models.length}. Embedded component models have not been verified.</p><ul>{record.job.models.map(m=><li key={m}>{m}</li>)}</ul><p>Generated outputs: {record.job.generated.length}</p>{record.job.errors.map((e,i)=><p className="notice" key={i}>{e}</p>)}{!archived && <button className="button" disabled={busy||dirty} onClick={()=>void operation(()=>action("process"))}>Recheck project</button>}</section>}
      <section className="admin-section"><h2>Assets and draft preview</h2><p className="muted">Only selected assets become public when published. Historical files remain private unless referenced by the current published version.</p><div className="admin-assets">{assets.map(asset=><div className="admin-asset" key={asset.id}>{asset.mime.startsWith("image/") && <AssetImage src={asset.url} alt={asset.name} />}<a href={assetUrl(asset.url)} target="_blank" rel="noreferrer">{asset.name}</a><p>{sectionLabels[asset.role]} · {asset.origin} · {Math.ceil(asset.size/1024)} KiB</p><p>{selectedUrls.has(asset.url)?"Selected in draft":asset.role==="source"?"Private source file":"Not selected in draft"}</p>{!archived && selectedUrls.has(asset.url) && <button className="text-button" disabled={busy} onClick={()=>remove(asset.url)}>Remove from draft</button>}</div>)}</div>
        <details><summary>Review schematic, layout, model and photos</summary><h3>Schematic</h3><ImageGallery label="Schematic" images={(board.schematic?.images||[]).map(src=>({src}))} /><h3>PCB layout</h3><ImageGallery label="PCB layout" images={board.layout||[]} /><h3>3D model</h3><ModelViewer data={board.model3d} title={board.title} /><h3>Physical photos</h3><ImageGallery label="Physical board" images={board.photos||[]} /></details>
      </section>
      <section className="admin-section"><h2>Publication</h2><p>Current state: <strong>{record.publicationState}</strong>. {record.publishedAt && `Last published ${record.publishedAt}.`}</p><div className="admin-actions">
        {!archived && <><button className="button primary" disabled={busy||dirty} onClick={()=>void operation(()=>action("publish"))}>Publish</button><button className="button" disabled={busy||dirty} onClick={()=>void operation(()=>action("archive"))}>Archive</button></>}
        {archived && role==="admin" && <><button className="button" disabled={busy||record.deleting} onClick={()=>void operation(()=>action("restore"))}>Restore as Draft</button><button className="button" disabled={busy} onClick={()=>{setConfirmation("");deleteDialog.current?.showModal();}}>Permanently delete</button></>}
        {record.publicationState==="published" && <Link className="button" href={`/boards/${record.board.slug}`} target="_blank">View published board ↗</Link>}
      </div><p className="muted">Publish makes the saved metadata and selected assets accessible to everyone. Archive removes public access while retaining files.</p></section>
      <dialog className="lightbox admin-delete" ref={deleteDialog}><h2>Permanently delete PCB</h2><p>This removes PCB metadata, Altium project files, schematic and PCB source files, generated images, 3D models, physical photos, and download files from active storage. This cannot be undone.</p><label>Type {record.board.id} to confirm<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" /></label><div className="admin-actions"><button className="button" onClick={()=>deleteDialog.current?.close()}>Cancel</button><button className="button primary" disabled={busy||confirmation!==record.board.id} onClick={()=>void operation(async()=>{await request(`/api/admin/boards/${record.key}`,"DELETE",{version:record.version,confirmation});window.location.assign(assetUrl("/admin/archive"));})}>Delete permanently</button></div>{error && <p role="alert" className="notice">{error}</p>}</dialog>
    </>}
  </>;
}
