import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BoardRepository } from "../src/lib/admin/repository";
import { prepareLibraryUploads } from "../src/lib/admin/uploads";
import { boardCover } from "../src/lib/board-cover";

const input = { id:"ASSET-1", slug:"asset-1", title:"Test only", year:2026, category:"adapter-board", description:"No engineering data" };
const pdf = {name:"test.pdf",mime:"application/pdf",data:Buffer.from("%PDF-1.4\n%%EOF")};
const png = {name:"test.png",mime:"image/png",data:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=","base64")};
test("normal upload accepts only schematic PDFs and image/PDF render/photo assets",async()=>{
  assert.equal((await prepareLibraryUploads([pdf],"schematic-pdf"))[0].mime,"application/pdf");
  for(const role of ["render","photo"] as const) assert.equal((await prepareLibraryUploads([png,pdf],role)).length,2);
  await assert.rejects(prepareLibraryUploads([png],"schematic-pdf"),/PDF/i);
  await assert.rejects(prepareLibraryUploads([{name:"test.SchDoc",mime:"application/octet-stream",data:Buffer.from("d0cf11e0a1b11ae1","hex")}],"schematic-pdf"),/PDF/i);
  await assert.rejects(prepareLibraryUploads([pdf],"source"),/section/i);
  await assert.rejects(prepareLibraryUploads([{...pdf,mime:"image/png"}],"render"),/MIME/i);
  await assert.rejects(prepareLibraryUploads([{...pdf,mime:"application/octet-stream"}],"render"),/MIME/i);
});
test("covers use only 3D assets, selected primary before image before PDF",()=>{
  const board={...input,thumbnail:"/pcb/test/photo.png",photos:[{src:"/pcb/test/photo.png"}],schematic:{pdf:"/pcb/test/schematic.pdf"}};
  assert.equal(boardCover(board),undefined);
  assert.equal(boardCover({...board,model3d:{renders:["/pcb/test/render.pdf","/pcb/test/render.png"]}}),"/pcb/test/render.png");
  assert.equal(boardCover({...board,model3d:{primary:"/pcb/test/render.pdf",renders:["/pcb/test/render.png","/pcb/test/render.pdf"]}}),"/pcb/test/render.pdf");
  assert.equal(boardCover({...board,model3d:{renders:["/pcb/test/render.pdf"]}}),"/pcb/test/render.pdf");
});
test("primary selection wins over legacy generated render preference",()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-cover-"));const repo=new BoardRepository(directory);
  try {
    let r=repo.create(input,"admin");
    r=repo.addAssets(r.key,r.version,[{...png,role:"render",origin:"generated"},{...pdf,role:"render"}],false,"admin");
    const selected=r.board.model3d!.renders![1];
    r=repo.save(r.key,{...r.board,model3d:{...r.board.model3d,primary:selected}},r.version,"admin");
    r=repo.publish(r.key,r.version,"admin");
    assert.equal(boardCover(r.published!),selected);
  } finally {repo.close();rmSync(directory,{recursive:true,force:true});}
});
test("without a primary, images precede PDFs regardless of legacy provenance",()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-cover-order-"));const repo=new BoardRepository(directory);
  try {
    let r=repo.create(input,"admin");
    r=repo.addAssets(r.key,r.version,[{...pdf,role:"render",origin:"generated"},{...png,role:"render"}],false,"admin");
    const image=r.board.model3d!.renders![1];
    r=repo.publish(r.key,r.version,"admin");
    assert.equal(boardCover(r.published!),image);
  } finally {repo.close();rmSync(directory,{recursive:true,force:true});}
});
test("individual removal keeps published assets until republish, preserves legacy files and other boards",()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-removal-"));const repo=new BoardRepository(directory);
  try {
    let r=repo.create(input,"admin");
    r=repo.addAssets(r.key,r.version,[{...pdf,role:"render"},{...png,role:"photo"},{name:"legacy.SchDoc",mime:"application/octet-stream",data:Buffer.from("legacy"),role:"source"}],false,"admin");
    const [render,photo,legacy]=repo.assets(r.key);
    r=repo.publish(r.key,r.version,"admin");
    r=repo.save(r.key,{...r.board,model3d:{renders:[]}},r.version,"admin");
    assert.equal(repo.publicAsset(render),true);assert.equal(repo.storage.exists(render.storageKey),true);
    r=repo.publish(r.key,r.version,"admin");
    assert.equal(repo.asset(render.url),undefined);assert.equal(repo.storage.exists(render.storageKey),false);
    assert.equal(repo.storage.exists(photo.storageKey),true);assert.equal(repo.storage.exists(legacy.storageKey),true);
    assert.equal(repo.get(r.key).board.id,input.id);
    repo.create({...input,id:"OTHER",slug:"other"},"admin");
    assert.throws(()=>repo.delete(r.key,r.version,"wrong","admin"),/confirmation/);
    repo.delete(r.key,r.version,input.id,"admin");
    assert.equal(repo.list().length,1);assert.equal(repo.storage.exists(photo.storageKey),false);assert.equal(repo.storage.exists(legacy.storageKey),false);
  } finally {repo.close();rmSync(directory,{recursive:true,force:true});}
});

test("asset cleanup locks writers before checking references and unlinking bytes",()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-cleanup-lock-"));
  const bytes=new Map<string,Buffer>();let onRemove=()=>{};
  const storage={put:(key:string,data:Buffer)=>{bytes.set(key,data);},read:(key:string)=>bytes.get(key)!,exists:(key:string)=>bytes.has(key),remove:(key:string)=>{onRemove();bytes.delete(key);}};
  const first=new BoardRepository(directory,storage);const concurrent=new BoardRepository(directory,storage);
  try {
    let record=first.create(input,"admin");
    record=first.addAssets(record.key,record.version,[{...png,role:"render"}],false,"admin");
    const asset=first.assets(record.key)[0];record=first.publish(record.key,record.version,"admin");
    record=first.save(record.key,{...record.board,model3d:{renders:[]}},record.version,"admin");
    let concurrentSave=false;
    onRemove=()=>{
      onRemove=()=>{};
      const latest=concurrent.get(record.key);
      try {concurrent.save(latest.key,{...latest.board,model3d:{renders:[asset.url]}},latest.version,"editor");concurrentSave=true;}
      catch(error) {assert.match((error as Error).message,/locked/);}
    };
    first.publish(record.key,record.version,"admin");
    assert.equal(concurrentSave,false);
    assert.deepEqual(first.get(record.key).board.model3d?.renders,[]);
    assert.equal(storage.exists(asset.storageKey),false);
  } finally {first.close();concurrent.close();rmSync(directory,{recursive:true,force:true});}
});
