import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { createPasswordHash } from "../src/lib/admin/auth";

async function main() {
  const temporaryRoot = path.resolve(os.tmpdir());
  const directory = mkdtempSync(path.join(temporaryRoot,"pcb-browser-tests-"));
  const env = {...process.env,PCB_DATA_DIR:directory,APP_ORIGIN:"http://localhost:4173",NEXT_PUBLIC_BASE_PATH:"",ADMIN_USERNAME:"browser-test-admin",ADMIN_PASSWORD_HASH:await createPasswordHash("Browser-test-password-2026"),SESSION_SECRET:randomBytes(32).toString("hex")};
  const cleanup = () => {
    const target = path.resolve(directory);
    if (path.dirname(target) !== temporaryRoot || !path.basename(target).startsWith("pcb-browser-tests-")) throw new Error("Unsafe test cleanup path");
    rmSync(target,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  };
  const migration=spawnSync(process.execPath,["--import","tsx","scripts/migrate-boards.ts"],{env,stdio:"inherit"});
  if(migration.status!==0) {cleanup();process.exit(migration.status||1);}
  const require=createRequire(import.meta.url);
  const server=spawn(process.execPath,[require.resolve("next/dist/bin/next"),"start","--hostname","localhost","--port","4173"],{env,stdio:"inherit"});
  process.on("SIGTERM",()=>server.kill());process.on("SIGINT",()=>server.kill());
  server.on("exit",code=>{cleanup();process.exitCode=code||0;});
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
