"use client";
import { useEffect, useRef } from "react";
import type { Board } from "@/types/board";
import type { Asset, AssetRole } from "@/lib/admin/repository";
import { AssetImage } from "@/components/AssetImage";
import { assetUrl } from "@/lib/assets";

const images = ".png,.jpg,.jpeg,.webp,.pdf";
export const uploadGroups: {id:string;role:AssetRole;label:string;accept:string;captions?:"photos";single?:boolean}[] = [
  {id:"schematic-pdf",role:"schematic-pdf",label:"Schematic PDF",accept:".pdf,application/pdf",single:true},
  {id:"render",role:"render",label:"3D Render files",accept:images},
  {id:"photo",role:"photo",label:"Physical Board files",accept:images,captions:"photos"},
];
export type PendingFile = {id:string;file:File;caption:string};
export type PendingUploads = Record<string,{files:PendingFile[];replace:boolean}>;
const sections = [
  {title:"Schematic",description:"Upload a schematic PDF for inline viewing.",groups:["schematic-pdf"]},
  {title:"3D Render",description:"Add rendered images or PDFs. Select a primary asset for the catalog cover.",groups:["render"]},
  {title:"Physical Board",description:"Add images or PDF documentation, with optional captions.",groups:["photo"]},
];
function PendingPreview({file}: {file:File}) {
  const preview=useRef<HTMLImageElement>(null);
  useEffect(()=>{const url=URL.createObjectURL(file);if(preview.current) preview.current.src=url;return()=>URL.revokeObjectURL(url);},[file]);
  // Object URLs are local previews, not remotely optimized image assets.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={preview} alt={`Selected file: ${file.name}`} />;
}
export function ThreeSectionUploads({pending,onPending,assets,board,selectedUrls,onRemove,onCaption,onPrimary,archived}: {
  pending:PendingUploads;onPending:(value:PendingUploads)=>void;assets:Asset[];board:Board;selectedUrls:Set<string|undefined>;
  onRemove:(url:string)=>void;onPrimary:(src:string)=>void;onCaption:(field:"photos",src:string,caption:string)=>void;archived:boolean;
}) {
  return <div className="admin-upload-sections">{sections.map((section,index)=><section className="admin-upload-section" key={section.title} aria-labelledby={`upload-section-${index}`}>
    <div className="admin-upload-heading"><span className="admin-step" aria-hidden="true">0{index+1}</span><div><h2 id={`upload-section-${index}`}>{section.title}</h2><p className="muted">{section.description}</p></div></div>
    {section.groups.map(id=>{
      const group=uploadGroups.find(g=>g.id===id)!;
      const selection=pending[id]||{files:[],replace:false};
      const urls=group.role==="schematic-pdf" ? [board.schematic?.pdf] : group.role==="render" ? [board.model3d?.preview,...(board.model3d?.renders||[])] : (board.photos||[]).map(a=>a.src);
      const saved=assets.filter(a=>urls.includes(a.url) && selectedUrls.has(a.url));
      return <div className="admin-upload-field" key={id}>
        {!archived && <><label>{group.label}<input type="file" accept={group.accept} multiple={!group.single} onChange={e=>{
          const added=Array.from(e.target.files||[]).map(file=>({id:crypto.randomUUID(),file,caption:""}));
          if(added.length) onPending({...pending,[id]:{...selection,files:group.single?added:[...selection.files,...added],replace:group.single||selection.replace}});
          e.target.value="";
        }} /></label>
        {!!selection.files.length && <label className="admin-checkbox"><input type="checkbox" checked={selection.replace} onChange={e=>onPending({...pending,[id]:{...selection,replace:e.target.checked}})} />Replace existing {group.label.toLowerCase()}</label>}</>}
        {(saved.length>0 || selection.files.length>0) && <div className="admin-upload-files">
          {saved.map(asset=><div className="admin-upload-file" key={asset.id}>
            {asset.mime.startsWith("image/") && <AssetImage src={asset.url} alt={asset.name} />}
            <div><a href={assetUrl(asset.url)} target="_blank" rel="noreferrer">{asset.name}</a><p className="muted">Saved to draft</p>
            {group.role==="render" && <label className="admin-checkbox"><input type="radio" name="primary-render" checked={board.model3d?.primary===asset.url} onChange={()=>onPrimary(asset.url)} />Primary cover</label>}
            {group.captions && <label>Caption for {asset.name}<input value={board[group.captions]?.find(a=>a.src===asset.url)?.caption||""} onChange={e=>onCaption(group.captions!,asset.url,e.target.value)} /></label>}
            {!archived && <button type="button" className="text-button" onClick={()=>onRemove(asset.url)}>Remove from draft</button>}</div>
          </div>)}
          {selection.files.map(item=><div className="admin-upload-file" key={item.id}>
            {item.file.type.startsWith("image/") && <PendingPreview file={item.file} />}
            <div><strong>{item.file.name}</strong><p className="muted">Pending upload · {Math.ceil(item.file.size/1024)} KiB</p>
            {group.captions && <label>Caption for {item.file.name}<input value={item.caption} onChange={e=>onPending({...pending,[id]:{...selection,files:selection.files.map(f=>f.id===item.id?{...f,caption:e.target.value}:f)}})} /></label>}
            <button type="button" className="text-button" onClick={()=>onPending({...pending,[id]:{...selection,files:selection.files.filter(f=>f.id!==item.id)}})}>Remove selected file</button></div>
          </div>)}
        </div>}
      </div>;
    })}
  </section>)}</div>;
}
