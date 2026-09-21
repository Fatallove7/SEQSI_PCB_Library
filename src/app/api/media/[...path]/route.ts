import { mediaResponse } from "@/lib/admin/media-response";
import { getUser } from "@/lib/admin/auth";
import { repository } from "@/lib/admin/repository";

export async function GET(request: Request, {params}: {params:Promise<{path:string[]}>}) {
  const parts = (await params).path;
  const repo = repository();
  const asset = repo.asset(`/pcb/${parts.join("/")}`);
  if (!asset) return new Response("Not found", {status:404});
  const owner = repo.get(asset.boardKey);
  if (owner.deleting || (!repo.publicAsset(asset) && !await getUser())) return new Response("Not found", {status:404});
  try {
    const bytes = repo.storage.read(asset.storageKey);
    return mediaResponse(request, bytes, asset);
  } catch { return new Response("Not found", {status:404}); }
}
