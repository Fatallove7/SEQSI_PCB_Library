import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BoardRepository, type UploadAsset } from "../src/lib/admin/repository";
import { prepareUploads } from "../src/lib/admin/uploads";

const board={id:"PREVIEW-TEST",slug:"preview-test",title:"Preview test",year:2026,category:"adapter-board",description:"Test fixture"};
const file=(name:string,role:UploadAsset["role"],origin:UploadAsset["origin"]="manual"):UploadAsset=>({name,role,origin,mime:name.endsWith("pdf")?"application/pdf":"image/png",data:Buffer.from("fixture")});
function fixture() {const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-preview-"));const repo=new BoardRepository(directory);return {repo,close:()=>{repo.close();rmSync(directory,{recursive:true,force:true});}};}

test("published previews prefer generated assets, preserve manual fallback and freeze the snapshot",()=>{
  const {repo,close}=fixture();try {
    let r=repo.create(board,"admin");
    r=repo.addAssets(r.key,r.version,[file("manual.png","layout")],false,"admin");
    const manual=repo.assets(r.key)[0];r=repo.publish(r.key,r.version,"admin");
    r=repo.addAssets(r.key,r.version,[file("generated.png","layout","generated")],false,"worker");
    assert.equal(repo.published()[0].layout![0].src,manual.url);
    r=repo.publish(r.key,r.version,"admin");const generated=repo.assets(r.key)[1];
    assert.deepEqual(r.published?.layout?.map(a=>a.src),[generated.url]);
    assert.equal(repo.publicAsset(manual),false);
    r=repo.addAssets(r.key,r.version,[file("replacement.png","layout")],true,"admin");
    r=repo.publish(r.key,r.version,"admin");
    assert.deepEqual(r.published?.layout?.map(a=>a.src),[generated.url]);
    r=repo.save(r.key,{...r.board,layout:r.board.layout?.filter(a=>a.src!==generated.url)},r.version,"admin");
    r=repo.publish(r.key,r.version,"admin");
    assert.equal(r.published?.layout?.[0].src,repo.assets(r.key)[2].url);
  } finally {close();}
});

test("PDF previews and source availability remain compatible and publication controlled",()=>{
  const {repo,close}=fixture();try {
    let r=repo.create(board,"admin");
    r=repo.addAssets(r.key,r.version,[file("layout.pdf","layout-pdf"),file("original.SchDoc","source")],false,"admin");
    r=repo.publish(r.key,r.version,"admin");
    assert.equal(r.published?.layoutPdfs?.length,1);
    assert.deepEqual(r.published?.sourceAvailability,{schematic:true,layout:false});
    assert.equal(repo.publicAsset(repo.assets(r.key)[1]),false);
    r=repo.addAssets(r.key,r.version,[file("original.PcbDoc","source")],false,"admin");
    assert.equal(repo.published()[0].sourceAvailability?.layout,false);
    r=repo.publish(r.key,r.version,"admin");assert.equal(r.published?.sourceAvailability?.layout,true);
  } finally {close();}
});

test("manual schematic PDF cannot replace a generated PDF and source replacement stays in its section",()=>{
  const {repo,close}=fixture();try {
    let r=repo.create(board,"admin");
    r=repo.addAssets(r.key,r.version,[file("generated.pdf","schematic-pdf","generated")],false,"worker");
    const generated=repo.assets(r.key)[0];
    r=repo.addAssets(r.key,r.version,[file("manual.pdf","schematic-pdf")],true,"admin");
    r=repo.publish(r.key,r.version,"admin");assert.equal(r.published?.schematic?.pdf,generated.url);
    const manual=repo.assets(r.key)[1];
    r=repo.save(r.key,{...r.board,schematic:{...r.board.schematic,pdf:undefined}},r.version,"admin");
    r=repo.publish(r.key,r.version,"admin");assert.equal(r.published?.schematic?.pdf,manual.url);
    r=repo.addAssets(r.key,r.version,[file("first.SchDoc","source"),file("layout.PcbDoc","source")],false,"admin");
    r=repo.addAssets(r.key,r.version,[file("second.SchDoc","source")],true,"admin","schematic");
    assert.deepEqual(repo.assets(r.key).filter(a=>a.role==="source"&&!a.superseded).map(a=>a.name),["layout.PcbDoc","second.SchDoc"]);
  } finally {close();}
});

test("selected renders and invalid source replacements preserve selected content",()=>{
  const {repo,close}=fixture();try {
    let r=repo.create(board,"admin");
    r=repo.addAssets(r.key,r.version,[file("manual.png","render"),file("generated.png","render","generated")],false,"admin");
    r=repo.publish(r.key,r.version,"admin");
    assert.deepEqual(r.published?.model3d?.renders,repo.assets(r.key).map(asset=>asset.url));
    assert.throws(()=>repo.addAssets(r.key,r.version,[file("bad.PcbDoc","source")],true,"admin","schematic"),/Source format/);
    assert.equal(repo.get(r.key).version,r.version);
    assert.equal(repo.assets(r.key).length,2);
  } finally {close();}
});

test("layout PDFs are accepted as PDFs and rejected as gallery images",async()=>{
  const pdf={name:"layout.pdf",mime:"application/pdf",data:Buffer.from("%PDF-1.4\n%%EOF")};
  assert.equal((await prepareUploads([pdf],"layout-pdf",false))[0].role,"layout-pdf");
  await assert.rejects(prepareUploads([pdf],"layout",false),/does not accept/);
});
