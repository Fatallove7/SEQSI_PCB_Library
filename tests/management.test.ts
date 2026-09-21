import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BoardRepository } from "../src/lib/admin/repository";
import { validateUpload, safeRelativePath } from "../src/lib/admin/uploads";
import { LocalAssetStorage } from "../src/lib/admin/storage";

const input = { id: "26-001", slug: "26-001-test", title: "Test board", year: 2026, category: "adapter-board", description: "Test metadata only" };
test("drafts, updates, archive and restore never leak unpublished metadata", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "pcb-management-"));
  const repo = new BoardRepository(directory);
  try {
    let board = repo.create(input, "admin");
    assert.equal(repo.published().length, 0);
    board = repo.publish(board.key, board.version, "admin");
    assert.equal(repo.published()[0].title, "Test board");
    board = repo.save(board.key, { ...input, title: "Private change" }, board.version, "admin");
    assert.equal(repo.published()[0].title, "Test board");
    assert.throws(() => repo.save(board.key, input, board.version - 1, "admin"), /changed/);
    board = repo.archive(board.key, board.version, "admin");
    assert.equal(repo.published().length, 0);
    assert.throws(() => repo.publish(board.key, board.version, "admin"), /archived/i);
    board = repo.restore(board.key, board.version, "admin");
    assert.equal(board.publicationState, "draft");
    assert.equal(repo.published().length, 0);
    assert.throws(() => repo.create(input, "admin"), /already exists/);
    board = repo.archive(board.key, board.version, "admin");
    assert.throws(() => repo.delete(board.key, board.version, "wrong", "admin"), /confirmation/i);
    repo.delete(board.key, board.version, input.id, "admin");
    assert.equal(repo.list().length, 0);
  } finally { repo.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("uploads reject traversal, executable files, false MIME and broken media", async () => {
  for (const name of ["../x", "C:/x", "/x", "a/../../b", "a\\..\\b", "a:stream", "a/%2e%2e/b"]) assert.throws(() => safeRelativePath(name));
  assert.equal(safeRelativePath("project/Main.SchDoc"), "project/Main.SchDoc");
  await assert.rejects(validateUpload("a.exe", "application/octet-stream", Buffer.from("MZ")), /format/i);
  await assert.rejects(validateUpload("a.png", "image/png", Buffer.from("not an image")), /content/i);
  await assert.rejects(validateUpload("a.PrjPcb", "image/png", Buffer.from("[Design]\n")), /MIME/i);
  await assert.rejects(validateUpload("a.gltf", "model/gltf+json", Buffer.from(JSON.stringify({ asset: { version: "2.0" }, buffers: [{uri:"https://evil.example/a.bin"}] }))), /external/i);
});

test("asset replacement preserves published files and deletion cleanup can be retried", () => {
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-assets-test-"));
  const local=new LocalAssetStorage(path.join(directory,"assets"));let failCleanup=false;
  const repo=new BoardRepository(directory,{put:(k,b)=>local.put(k,b),read:k=>local.read(k),exists:k=>local.exists(k),remove:k=>{if(failCleanup) throw new Error("test failure");local.remove(k);}});
  try {
    let r=repo.create(input,"admin");
    r=repo.addAssets(r.key,r.version,[{name:"first.txt",mime:"text/plain",data:Buffer.from("one"),role:"download"}],false,"admin");
    const first=repo.assets(r.key)[0];r=repo.publish(r.key,r.version,"admin");assert.equal(repo.publicAsset(first),true);
    r=repo.addAssets(r.key,r.version,[{name:"second.txt",mime:"text/plain",data:Buffer.from("two"),role:"download"}],true,"admin");
    assert.equal(repo.publicAsset(first),true);assert.equal(repo.publicAsset(repo.assets(r.key)[1]),false);
    r=repo.publish(r.key,r.version,"admin");assert.equal(repo.publicAsset(first),false);
    r=repo.addAssets(r.key,r.version,[{name:"Project.PrjPcb",mime:"text/plain",data:Buffer.from("[Design]"),role:"source"}],false,"admin");
    r=repo.addAssets(r.key,r.version,[{name:"Project.PrjPcb",mime:"text/plain",data:Buffer.from("[Design]\nNew=1"),role:"source"}],false,"admin");
    assert.equal(repo.assets(r.key).filter(a=>a.role==="source"&&!a.superseded).length,1);
    r=repo.archive(r.key,r.version,"admin");failCleanup=true;
    assert.throws(()=>repo.delete(r.key,r.version,input.id,"admin"),/cleanup failed/);
    assert.equal(repo.get(r.key).deleting,true);assert.equal(repo.publicAsset(first),false);
    assert.throws(()=>repo.restore(r.key,r.version,"admin"),/Deletion is pending/);
    failCleanup=false;repo.delete(r.key,r.version,input.id,"admin");assert.equal(local.exists(first.storageKey),false);
  } finally {repo.close();rmSync(directory,{recursive:true,force:true});}
});

test("legacy migration preserves missing dates instead of changing catalog ordering",()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-legacy-dates-"));const repo=new BoardRepository(directory);
  try {
    let r=repo.create(input,"migration",true);
    r=repo.save(r.key,input,r.version,"migration",true);
    repo.publish(r.key,r.version,"migration");
    assert.deepEqual(repo.published()[0],input);
  } finally {repo.close();rmSync(directory,{recursive:true,force:true});}
});
