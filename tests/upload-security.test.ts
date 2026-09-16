import assert from "node:assert/strict";
import test from "node:test";
import { crc32 } from "node:zlib";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareUploads, unzip, validateUpload } from "../src/lib/admin/uploads";
import { BoardRepository, ManagementError } from "../src/lib/admin/repository";
import { inspectProject } from "../src/lib/admin/processor";

function glb(document: unknown) {
  const json = JSON.stringify(document);
  const chunk = Buffer.from(json + " ".repeat((4 - Buffer.byteLength(json) % 4) % 4));
  const header = Buffer.alloc(20);
  header.write("glTF");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + chunk.length, 8);
  header.writeUInt32LE(chunk.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, chunk]);
}

function zip(data: Buffer, filename="file.txt") {
  const name = Buffer.from(filename);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + data.length, 16);
  return Buffer.concat([local, name, data, central, name, end]);
}

test("GLB uploads cannot bypass external model dependency validation", async () => {
  for (const uri of ["https://external.example/model.bin", "/private/model.bin", "relative.bin"]) {
    await assert.rejects(prepareUploads([{ name: "board.glb", mime: "model/gltf-binary", data: glb({ asset: { version: "2.0" }, buffers: [{ uri }] }) }], "model", false), ManagementError);
  }
  const malformed = glb({ asset: { version: "2.0" } });
  malformed.writeUInt32LE(0xffffffff, 12);
  await assert.rejects(validateUpload("board.glb", "", malformed), ManagementError);
  assert.equal(await validateUpload("board.glb", "", glb({ asset: { version: "2.0" } })), "model/gltf-binary");
});

test("malformed GLTF shapes return controlled validation errors", async () => {
  for (const input of [null, [], { asset: { version: "2.0" }, buffers: {} }, { asset: { version: "2.0" }, images: [null] }, { asset: { version: "2.0" }, buffers: [{ uri: 123 }] }]) {
    await assert.rejects(validateUpload("invalid.gltf", "", Buffer.from(JSON.stringify(input))), ManagementError);
  }
});

test("ZIP extraction respects the remaining request budget before collecting entries", async () => {
  const archive = zip(Buffer.from("12345678"));
  assert.equal((await unzip(archive))[0].data.toString(), "12345678");
  await assert.rejects(unzip(archive, 7, 300), /limits/i);
  await assert.rejects(unzip(archive, 256, 0), /entries/i);
  await assert.rejects(unzip(zip(Buffer.from("x"),"../escape.txt")), /ZIP|path/i);
  await assert.rejects(prepareUploads([{name:"source.zip",mime:"application/zip",data:zip(Buffer.from("MZ"),"malware.exe")}],"source",true),/format/i);
});

test("source GLTF bytes remain original and invalid prototype roles fail cleanly", async()=>{
  const data=Buffer.from('{ "asset": { "version": "2.0" }, "buffers": [{"uri":"buffer.bin","byteLength":4}] }');
  const files=[{name:"model.gltf",mime:"model/gltf+json",data},{name:"buffer.bin",mime:"application/octet-stream",data:Buffer.alloc(4)}];
  const source=await prepareUploads(files,"source",false);
  assert.deepEqual(source[0].data,data);
  const model=await prepareUploads(files,"model",false);
  assert.match(model[0].data.toString(),/data:application\/octet-stream;base64/);
  await assert.rejects(prepareUploads(files,"constructor" as "source",false),/Unknown asset role/);
});

test("empty processor results are failures and large manifests are not processed", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "pcb-import-security-"));
  const repo = new BoardRepository(directory);
  try {
    let record = repo.create({ id: "26-910", slug: "26-910-review", title: "Test only", year: 2026, category: "adapter-board", description: "Test fixture" }, "admin");
    const files = [
      { name: "test.PrjPcb", mime: "text/plain", data: Buffer.from("[Document1]\nDocumentPath=main.SchDoc\n[Document2]\nDocumentPath=main.PcbDoc"), role: "source" as const },
      ...["main.SchDoc", "main.PcbDoc"].map(name => ({ name, mime: "application/octet-stream", data: Buffer.from("d0cf11e0a1b11ae1", "hex"), role: "source" as const })),
    ];
    record = repo.addAssets(record.key, record.version, files, false, "admin");
    record = await inspectProject(repo, record.key, record.version, "admin", { process: async () => ({ generated: [], errors: [] }) });
    assert.equal(record.job?.state, "processing-failed");
    assert.match(record.job!.errors.join(" "), /no generated outputs/i);
    let oversized = repo.create({ id: "26-911", slug: "26-911-large", title: "Large fixture", year: 2026, category: "adapter-board", description: "Test fixture" }, "admin");
    oversized = repo.addAssets(oversized.key, oversized.version, [{ ...files[0], data: Buffer.alloc(8 * 1024 * 1024 + 1, 32) }], false, "admin");
    oversized = await inspectProject(repo, oversized.key, oversized.version, "admin");
    assert.match(oversized.job!.errors.join(" "), /manifest exceeds/i);
  } finally {
    repo.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("project references resolve within the uploaded tree without reading outside it",async()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),"pcb-project-paths-"));const repo=new BoardRepository(directory);
  try {
    let r=repo.create({id:"PATH-1",slug:"path-1",title:"Reference test",year:2026,category:"adapter-board",description:"Test only"},"admin");
    r=repo.addAssets(r.key,r.version,[
      {name:"folder/project/main.PrjPcb",mime:"text/plain",data:Buffer.from("[Document1]\nDocumentPath=..\\sheets\\Main.SchDoc\n[Document2]\nDocumentPath=.\\Main.PcbDoc\n[Document3]\nDocumentPath=../../../outside.SchDoc"),role:"source"},
      {name:"folder/sheets/Main.SchDoc",mime:"application/octet-stream",data:Buffer.from("fixture"),role:"source"},
      {name:"folder/project/Main.PcbDoc",mime:"application/octet-stream",data:Buffer.from("fixture"),role:"source"},
    ],false,"admin");
    r=await inspectProject(repo,r.key,r.version,"admin");
    assert.equal(r.job!.documents.filter(d=>d.found).length,2);
    assert.match(r.job!.errors.join(" "),/unsafe project reference/);
  } finally {repo.close();rmSync(directory,{recursive:true,force:true});}
});
