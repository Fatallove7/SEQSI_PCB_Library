import { getUser } from "@/lib/admin/auth";
import { repository } from "@/lib/admin/repository";

export async function GET(_request: Request, {params}: {params:Promise<{path:string[]}>}) {
  const parts = (await params).path;
  const repo = repository();
  const asset = repo.asset(`/pcb/${parts.join("/")}`);
  if (!asset) return new Response("Not found", {status:404});
  const owner = repo.get(asset.boardKey);
  if (owner.deleting || (!repo.publicAsset(asset) && !await getUser())) return new Response("Not found", {status:404});
  try {
    const bytes = repo.storage.read(asset.storageKey);
    const inline = asset.mime.startsWith("image/") || asset.mime.startsWith("model/gltf");
    return new Response(new Uint8Array(bytes), {headers:{
      "Content-Type":asset.mime,
      "Content-Length":String(bytes.length),
      "Content-Disposition":`${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.name.split("/").pop()!)}`,
      "Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff",
      "Content-Security-Policy":"sandbox; default-src 'none'",
      "Cross-Origin-Resource-Policy":"same-origin",
    }});
  } catch { return new Response("Not found", {status:404}); }
}
