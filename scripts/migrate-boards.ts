import { readFileSync } from "node:fs";
import path from "node:path";
import { getBoards } from "../src/lib/boards";
import { BoardRepository, boardAssetPaths } from "../src/lib/admin/repository";
import { dataDirectory } from "../src/lib/admin/storage";
import type { Board } from "../src/types/board";

const repo = new BoardRepository(dataDirectory());
const mime: Record<string,string> = {svg:"image/svg+xml",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",pdf:"application/pdf",glb:"model/gltf-binary",gltf:"model/gltf+json",txt:"text/plain"};
try {
  const boards = getBoards();
  let imported = 0;
  for (const original of boards) {
    const marker = `legacy:${original.id}`;
    if (repo.migrated(marker)) continue;
    if(repo.list().some(r=>r.board.id===original.id || r.board.slug===original.slug)) throw new Error(`Migration conflict for ${original.id}. Existing runtime records will not be overwritten.`);
    // Files have already passed the legacy realpath and schema validator.
    const paths = [...new Set(boardAssetPaths(original))];
    const files = paths.map(url=>({name:url.slice(5),mime:mime[url.split(".").pop()!.toLowerCase()]||"application/octet-stream",data:readFileSync(path.join(process.cwd(),"public",url.slice(1))),role:"source" as const,origin:"migration" as const,url:repo.asset(url) ? undefined : url}));
    const metadata = {...original,thumbnail:undefined,schematic:undefined,layout:undefined,model3d:undefined,photos:undefined,downloads:undefined};
    let record = repo.create(metadata,"migration",true);
    try {
      if(files.length) record=repo.addAssets(record.key,record.version,files,false,"migration");
      const assets=repo.assets(record.key); const mapped = new Map(paths.map((url,i)=>[url,assets[i].url]));
      const restored=JSON.parse(JSON.stringify(original,(_key,value)=>typeof value==="string" && mapped.has(value)?mapped.get(value):value)) as Board;
      record=repo.save(record.key,restored,record.version,"migration",true);
      repo.publish(record.key,record.version,"migration");
      repo.markMigrated(marker); imported++;
    } catch(e) {
      // Roll back this newly created board only, preserving all pre-existing records.
      const latest=repo.get(record.key);const archived=repo.archive(record.key,latest.version,"migration");
      repo.delete(record.key,archived.version,original.id,"migration"); throw e;
    }
  }
  console.log(`Migration complete: ${imported} imported, ${boards.length-imported} already migrated. Legacy JSON/assets were not modified.`);
} finally {repo.close();}
