import { requireUser, type Permission } from "@/lib/admin/auth";
import { assertSameOrigin, HttpError } from "@/lib/admin/http";
import { repository, type AssetRole } from "@/lib/admin/repository";
import { managementError, readMutation } from "@/lib/admin/responses";
import { boundedBody, MAX_UPLOAD_BYTES, prepareUploads } from "@/lib/admin/uploads";
import { inspectProject } from "@/lib/admin/processor";

export async function POST(request: Request, {params}: {params:Promise<{key:string;action:string}>}) {
  try {
    assertSameOrigin(request);
    const {key,action} = await params;
    const permissions: Record<string,Permission> = {upload:"upload",import:"upload",publish:"publish",archive:"archive",restore:"restore",process:"upload"};
    if (!Object.hasOwn(permissions,action)) throw new HttpError(404,"Unknown action");
    const user = await requireUser(permissions[action]);
    const repo = repository();
    if (action === "upload" || action === "import") {
      if(!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new HttpError(415,"Expected multipart form data");
      const raw = await boundedBody(request, MAX_UPLOAD_BYTES);
      let form:FormData;
      try {form=await new Response(new Uint8Array(raw), {headers:{"Content-Type":request.headers.get("content-type")!}}).formData();}
      catch {throw new HttpError(400,"Invalid multipart upload");}
      const version = Number(form.get("version"));
      if(!Number.isSafeInteger(version)||version<1) throw new HttpError(400,"Invalid board version");
      const role = action === "import" ? "source" : String(form.get("role")) as AssetRole;
      const files = form.getAll("files");
      const names = form.getAll("paths");
      const incoming = await Promise.all(files.map(async (file,index) => {
        if (!(file instanceof File)) throw new HttpError(400,"Invalid upload");
        return {name:String(names[index] || file.name),mime:file.type,data:Buffer.from(await file.arrayBuffer())};
      }));
      const prepared = await prepareUploads(incoming,role,action === "import");
      let record = repo.addAssets(key,version,prepared,form.get("replace") === "true",user.username);
      if (action === "import") record = await inspectProject(repo,key,record.version,user.username);
      return Response.json(record);
    }
    const body = await readMutation(request);
    if (action === "process") return Response.json(await inspectProject(repo,key,body.version,user.username));
    if (action === "publish") return Response.json(repo.publish(key,body.version,user.username));
    if (action === "archive") return Response.json(repo.archive(key,body.version,user.username));
    return Response.json(repo.restore(key,body.version,user.username));
  } catch(e) { return managementError(e); }
}
