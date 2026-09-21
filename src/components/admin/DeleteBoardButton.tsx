"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ManagedBoard } from "@/lib/admin/repository";
import { assetUrl } from "@/lib/assets";

export function DeleteBoardButton({ record, disabled = false, redirectTo }: { record: ManagedBoard; disabled?: boolean; redirectTo?: string }) {
  const dialog=useRef<HTMLDialogElement>(null);
  const router=useRouter();
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function remove() {
    setBusy(true);setError("");
    try {
      const response=await fetch(assetUrl(`/api/admin/boards/${record.key}`),{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:record.version,confirmation})});
      const result=await response.json();if(!response.ok) throw new Error(result.error || "Deletion failed");
      dialog.current?.close();
      if(redirectTo) router.push(redirectTo);
      router.refresh();
    } catch(error) {setError(error instanceof Error ? error.message : "Deletion failed");}
    finally {setBusy(false);}
  }
  return <>
    <button type="button" className="button" disabled={disabled} onClick={()=>{setConfirmation("");setError("");dialog.current?.showModal();}}>Delete</button>
    <dialog className="lightbox admin-delete" ref={dialog} aria-label={`Delete PCB ${record.board.id}`}>
      <h2>Delete PCB {record.board.id}?</h2><p>This permanently removes this PCB record and all its uploaded assets. This cannot be undone. Use Archive to retain the record and files.</p>
      <label>Type {record.board.id} to confirm<input value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" /></label>
      <div className="admin-actions"><button type="button" className="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="button primary" disabled={busy||confirmation!==record.board.id} onClick={()=>void remove()}>Delete permanently</button></div>
      {error && <p className="notice" role="alert">{error}</p>}
    </dialog>
  </>;
}
