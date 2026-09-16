import path from "node:path";
import { randomUUID } from "node:crypto";
import { type ImportReport, type BoardRepository } from "./repository";
import { projectText, safeRelativePath } from "./uploads";

export interface AltiumProcessor {
  process(input: { project: string; sourceManifest: {name:string;sha256:string}[] }): Promise<{ generated: string[]; errors: string[] }>;
}
export class UnavailableAltiumProcessor implements AltiumProcessor {
  async process() { return { generated: [], errors: ["ALTIUM_WORKER_NOT_CONFIGURED: Automatic Altium outputs are unavailable. Upload exported assets manually, review, then publish."] }; }
}

// Project-manifest inspection only. It does not claim to interpret SchDoc/PcbDoc binary contents.
export async function inspectProject(repo: BoardRepository, key: string, version: number, actor: string, processor: AltiumProcessor = new UnavailableAltiumProcessor()) {
  const assets = repo.assets(key).filter(a => a.role === "source" && !a.superseded);
  const projects = assets.filter(a => /\.prjpcb$/i.test(a.name));
  let record = repo.report(key, version, {id:randomUUID(),state:"uploaded",projects:projects.map(a=>a.name),documents:[],models:[],errors:[],generated:[],updatedAt:new Date().toISOString()}, actor);
  const report: ImportReport = {...record.job!,state:"validating"};
  record = repo.report(key, record.version, report, actor);
  const byName = new Map(assets.map(a => [a.name.toLowerCase(),a]));
  if (byName.size !== assets.length) report.errors.push("Duplicate source paths exist. Resolve the source manifest before automatic processing.");
  if (projects.length !== 1) report.errors.push("Upload exactly one .PrjPcb with its referenced documents for automatic processing.");
  for (const project of projects) {
    if (project.size > 8 * 1024 * 1024) {
      report.errors.push(`Project manifest exceeds the 8 MiB inspection limit: ${project.name}`);
      continue;
    }
    const text = projectText(repo.storage.read(project.storageKey));
    for (const match of text.matchAll(/^DocumentPath\s*=\s*(.+)$/gmi)) {
      const referenced = match[1].trim().replace(/^"|"$/g, "").replace(/\\/g,"/");
      try {
        if(referenced.startsWith("/") || /[:%\x00-\x1f]/.test(referenced)) throw new Error("External reference");
        const name = safeRelativePath(path.posix.join(path.posix.dirname(project.name), referenced));
        const found = byName.has(name.toLowerCase());
        report.documents.push({name,found});
        if (!found) report.errors.push(`Missing referenced document: ${name}`);
      } catch { report.errors.push(`External or unsafe project reference: ${referenced}`); }
    }
  }
  if (!report.documents.some(d=>/\.schdoc$/i.test(d.name))) report.errors.push("No referenced .SchDoc detected.");
  if (!report.documents.some(d=>/\.pcbdoc$/i.test(d.name))) report.errors.push("No referenced .PcbDoc detected.");
  report.models = assets.filter(a=>/\.(step|stp|glb|gltf)$/i.test(a.name)).map(a=>a.name);
  if (!report.errors.length) {
    record = repo.report(key, record.version, {...report,state:"processing"}, actor);
    try {
      const output = await processor.process({project:projects[0].name,sourceManifest:assets.map(a=>({name:a.name,sha256:a.sha256}))});
      report.errors.push(...output.errors);
      // Generated URLs must already be stored and attached by a trusted worker integration.
      report.generated = output.generated.filter(url => repo.assets(key).some(a=>a.url===url && a.origin==="generated"));
      if (report.generated.length !== output.generated.length) report.errors.push("Worker returned unregistered assets");
      if (!report.generated.length && !output.errors.length) report.errors.push("Worker returned no generated outputs");
    } catch { report.errors.push("Altium processor failed; no generated outputs were published."); }
  }
  report.state = report.errors.length ? "processing-failed" : "ready-for-review";
  report.updatedAt = new Date().toISOString();
  return repo.report(key, record.version, report, actor);
}
