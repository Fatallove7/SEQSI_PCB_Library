import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { fromBuffer, type Entry } from "yauzl";
import { ManagementError, type AssetRole, type UploadAsset } from "./repository";

export const MAX_FILE_BYTES = 64 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;
const MAX_FILES = 300;
const types: Record<string, string[]> = {
  prjpcb: ["text/plain", "application/octet-stream"], schdoc: ["application/octet-stream"], pcbdoc: ["application/octet-stream"], outjob: ["text/plain", "application/octet-stream"],
  pdf: ["application/pdf"], png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"],
  step: ["application/step", "model/step", "application/octet-stream", "text/plain"], stp: ["application/step", "model/step", "application/octet-stream", "text/plain"],
  glb: ["model/gltf-binary", "application/octet-stream"], gltf: ["model/gltf+json", "application/json", "application/octet-stream"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"], bin: ["application/octet-stream"], txt: ["text/plain"], csv: ["text/csv", "application/vnd.ms-excel", "text/plain"], json: ["application/json", "text/plain"],
};
const roles: Record<AssetRole, string[]> = {
  "layout-pdf": ["pdf"],
  source: ["prjpcb","schdoc","pcbdoc","outjob","step","stp","bin","txt","json","zip","png","jpg","jpeg","webp","glb","gltf","pdf"],
  thumbnail: ["png","jpg","jpeg","webp"], schematic: ["png","jpg","jpeg","webp"], "schematic-pdf": ["pdf"], layout: ["png","jpg","jpeg","webp"], model: ["glb","gltf"], render: ["png","jpg","jpeg","webp","pdf"], photo: ["png","jpg","jpeg","webp","pdf"], download: Object.keys(types),
};
export function safeRelativePath(name: string): string {
  if (name.length > 240 || /[\\:%\x00-\x1f]/.test(name) || name.startsWith("/") || name.split("/").some(p => !p || p === "." || p === ".." || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) throw new ManagementError("Unsafe upload path");
  return name;
}
export function projectText(data: Buffer) { return data[0] === 0xff && data[1] === 0xfe ? data.subarray(2).toString("utf16le") : data.toString("utf8").replace(/^\uFEFF/, ""); }
type Gltf = { asset?: {version?:string}; buffers?: {uri?:string}[]; images?: {uri?:string}[] };
function parseGltf(data: Buffer): Gltf {
  let value: Gltf;
  try { value = JSON.parse(data.toString("utf8")); } catch { throw new ManagementError("Invalid GLTF content"); }
  if (!value || typeof value !== "object" || Array.isArray(value) || value.asset?.version !== "2.0") throw new ManagementError("GLTF content must use version 2.0");
  if ((value.buffers !== undefined && !Array.isArray(value.buffers)) || (value.images !== undefined && !Array.isArray(value.images))) throw new ManagementError("Invalid GLTF dependency list");
  for (const item of [...(value.buffers || []), ...(value.images || [])]) {
    if (!item || typeof item !== "object" || Array.isArray(item) || (item.uri !== undefined && typeof item.uri !== "string")) throw new ManagementError("Invalid GLTF dependency");
    if (!item.uri || item.uri.startsWith("data:")) continue;
    if (/^[a-z]+:/i.test(item.uri) || item.uri.startsWith("/")) throw new ManagementError("External GLTF references are not allowed");
    safeRelativePath(item.uri);
  }
  return value;
}

function validateGlb(data: Buffer) {
  if (data.length < 20 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) throw new ManagementError("Invalid GLB content");
  let offset = 12;
  let document: Gltf | undefined;
  while (offset < data.length) {
    if (offset + 8 > data.length) throw new ManagementError("Invalid GLB chunk");
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    if (length % 4 || offset + 8 + length > data.length) throw new ManagementError("Invalid GLB chunk length");
    if (offset === 12 && type !== 0x4e4f534a) throw new ManagementError("GLB must start with a JSON chunk");
    if (type === 0x4e4f534a) {
      if (document) throw new ManagementError("GLB has duplicate JSON chunks");
      document = parseGltf(data.subarray(offset + 8, offset + 8 + length));
    }
    offset += 8 + length;
  }
  if (!document) throw new ManagementError("GLB JSON content is missing");
  for (const item of [...(document.buffers || []), ...(document.images || [])]) {
    if (item.uri && !item.uri.startsWith("data:")) throw new ManagementError("GLB must be self-contained; use GLTF with its dependencies for external files");
  }
}
export async function validateUpload(name: string, mime: string, data: Buffer): Promise<string> {
  safeRelativePath(name);
  const extension = name.split(".").pop()!.toLowerCase();
  if (!Object.hasOwn(types,extension)) throw new ManagementError(`Unsupported file format: ${extension}`);
  if (!data.length || data.length > MAX_FILE_BYTES) throw new ManagementError("File must be between 1 byte and 64 MiB");
  if (mime && mime !== "application/octet-stream" && !types[extension].includes(mime.toLowerCase())) throw new ManagementError(`MIME type does not match ${name}`);
  if (["png","jpg","jpeg","webp","pdf","zip","glb"].includes(extension)) {
    const detected = await fileTypeFromBuffer(data).catch(() => undefined);
    if (!detected || detected.ext !== (extension === "jpeg" ? "jpg" : extension)) throw new ManagementError(`File content does not match ${name}`);
    if (extension === "glb") validateGlb(data);
    return detected.mime;
  }
  if (["schdoc","pcbdoc"].includes(extension) && data.subarray(0,8).toString("hex") !== "d0cf11e0a1b11ae1") throw new ManagementError(`Expected an Altium compound document container: ${name}`);
  if (["prjpcb","outjob"].includes(extension) && !/^\s*\[[^\]\r\n]+\]/m.test(projectText(data))) throw new ManagementError(`Invalid project document content: ${name}`);
  if (["step","stp"].includes(extension) && !data.subarray(0,4096).toString("ascii").includes("ISO-10303-21")) throw new ManagementError("Invalid STEP content");
  if (extension === "gltf") parseGltf(data);
  return types[extension][0];
}
type Incoming = {name:string;mime:string;data:Buffer};
// The public management workflow is deliberately narrower than legacy import support.
export async function prepareLibraryUploads(incoming: Incoming[], role: AssetRole): Promise<UploadAsset[]> {
  if (!["schematic-pdf", "render", "photo"].includes(role)) throw new ManagementError("Unsupported upload section. Use Schematic, 3D Render, or Physical Board.");
  if (role === "schematic-pdf" && incoming.length !== 1) throw new ManagementError("Select one schematic PDF");
  for (const item of incoming) {
    const extension = item.name.split(".").pop()!.toLowerCase();
    if (!roles[role].includes(extension)) throw new ManagementError(role === "schematic-pdf" ? "Schematic accepts PDF only" : "Select PNG, JPG, JPEG, WebP, or PDF files");
    if (!types[extension].includes(item.mime.toLowerCase())) throw new ManagementError(`MIME type does not match ${item.name}`);
  }
  return prepareUploads(incoming, role, false);
}
export async function unzip(data: Buffer, maxBytes = MAX_EXPANDED_BYTES, maxFiles = MAX_FILES): Promise<Incoming[]> {
  return new Promise((resolve, reject) => {
    fromBuffer(data, {lazyEntries:true,validateEntrySizes:true,strictFileNames:true}, (error, zip) => {
      if (error || !zip) return reject(new ManagementError("Invalid ZIP archive"));
      let total = 0; let count = 0; let actual = 0;
      const files: Incoming[] = []; const names = new Set<string>();
      const fail = (message: string) => { zip.close(); reject(new ManagementError(message)); };
      zip.on("error", () => fail("Invalid ZIP archive contents"));
      zip.on("end", () => resolve(files));
      zip.on("entry", (entry: Entry) => {
        try {
          if (++count > maxFiles || entry.generalPurposeBitFlag & 1 || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) throw new ManagementError("ZIP has too many entries, encryption, or symbolic links");
          const name = safeRelativePath(entry.fileName.replace(/\/$/, ""));
          if (names.has(name.toLowerCase())) throw new ManagementError("Duplicate ZIP paths");
          names.add(name.toLowerCase());
          if (entry.fileName.endsWith("/")) { zip.readEntry(); return; }
          total += entry.uncompressedSize;
          if (entry.uncompressedSize > MAX_FILE_BYTES || total > maxBytes || entry.uncompressedSize / Math.max(1,entry.compressedSize) > 200) throw new ManagementError("ZIP exceeds extraction limits");
          if (name.toLowerCase().endsWith(".zip")) throw new ManagementError("Nested ZIP archives are not accepted");
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail("Cannot read ZIP entry");
            const chunks: Buffer[] = []; let size = 0;
            stream.on("data", chunk => { size += chunk.length; actual += chunk.length; if (size > MAX_FILE_BYTES || actual > maxBytes) { stream.destroy(); fail("ZIP exceeds extraction limits"); } else chunks.push(chunk); });
            stream.on("error", () => fail("Invalid ZIP entry size"));
            stream.on("end", () => { files.push({name,mime:"",data:Buffer.concat(chunks)}); zip.readEntry(); });
          });
        } catch (e) { fail(e instanceof Error ? e.message : "Invalid ZIP"); }
      });
      zip.readEntry();
    });
  });
}

export async function prepareUploads(incoming: Incoming[], role: AssetRole, importProject: boolean): Promise<UploadAsset[]> {
  if (!Object.hasOwn(roles,role)) throw new ManagementError("Unknown asset role");
  if (!incoming.length || incoming.length > MAX_FILES) throw new ManagementError("Select between 1 and 300 files");
  if (incoming.reduce((n, f) => n + f.data.length, 0) > MAX_UPLOAD_BYTES) throw new ManagementError("Upload exceeds request limits");
  const expanded: Incoming[] = [];
  let inspectedBytes = 0;
  let inspectedFiles = 0;
  for (const item of incoming) {
    const mime = await validateUpload(item.name, item.mime, item.data);
    if (item.name.toLowerCase().endsWith(".zip")) {
      const contents = await unzip(item.data, MAX_EXPANDED_BYTES - inspectedBytes, MAX_FILES - inspectedFiles);
      inspectedBytes += contents.reduce((n, f) => n + f.data.length, 0);
      inspectedFiles += contents.length;
      // Validate every ZIP entry, even when keeping the ZIP as a download.
      for (const child of contents) await validateUpload(child.name, child.mime, child.data);
      if (importProject) expanded.push(...contents);
      else expanded.push({...item,mime});
    } else {
      inspectedBytes += item.data.length;
      inspectedFiles += 1;
      if (inspectedBytes > MAX_EXPANDED_BYTES || inspectedFiles > MAX_FILES) throw new ManagementError("Upload exceeds expanded limits");
      expanded.push({...item,mime});
    }
  }
  if (expanded.length > MAX_FILES || expanded.reduce((n,f) => n + f.data.length, 0) > MAX_EXPANDED_BYTES) throw new ManagementError("Upload exceeds expanded limits");
  const indexed = new Map<string,Incoming>();
  for (const item of expanded) {
    safeRelativePath(item.name);
    if (indexed.has(item.name.toLowerCase())) throw new ManagementError("Duplicate upload paths");
    indexed.set(item.name.toLowerCase(), item);
  }
  const result: UploadAsset[] = [];
  for (const item of expanded) {
    const extension = item.name.split(".").pop()!.toLowerCase();
    if (!roles[role].includes(extension)) {
      if (role === "model" && ["bin","png","jpg","jpeg","webp"].includes(extension)) continue;
      throw new ManagementError(`The selected ${role} section does not accept .${extension} files`);
    }
    let data = item.data;
    if (extension === "gltf" && role !== "source") {
      const gltf = parseGltf(data);
      for (const part of [...(gltf.buffers || []), ...(gltf.images || [])]) {
        if (!part.uri || part.uri.startsWith("data:")) continue;
        const dependency = indexed.get(path.posix.join(path.posix.dirname(item.name), part.uri).toLowerCase());
        if (!dependency) throw new ManagementError(`Missing GLTF dependency: ${part.uri}`);
        const depMime = await validateUpload(dependency.name, dependency.mime, dependency.data);
        part.uri = `data:${depMime};base64,${dependency.data.toString("base64")}`;
      }
      data = Buffer.from(JSON.stringify(gltf));
      if (data.length > MAX_FILE_BYTES) throw new ManagementError("Combined GLTF exceeds file size limit");
    }
    result.push({ ...item, data, role, mime: await validateUpload(item.name, item.mime, data) });
  }
  if (!result.length) throw new ManagementError("No files match the selected asset section");
  return result;
}

export async function boundedBody(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > limit) throw new ManagementError("Request exceeds size limit", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ManagementError("Empty request");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const {done,value} = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new ManagementError("Request exceeds size limit", 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
