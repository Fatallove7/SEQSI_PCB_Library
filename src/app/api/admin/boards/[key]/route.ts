import { requireUser } from "@/lib/admin/auth";
import { assertSameOrigin } from "@/lib/admin/http";
import { repository } from "@/lib/admin/repository";
import { managementError, readMutation } from "@/lib/admin/responses";
type Context = {params:Promise<{key:string}>};
export async function GET(_request: Request, context: Context) {
  try { await requireUser(); const {key} = await context.params; return Response.json({record:repository().get(key),assets:repository().assets(key)}, {headers:{"Cache-Control":"no-store"}}); }
  catch (e) { return managementError(e); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request); const user = await requireUser("edit"); const {key} = await context.params;
    const body = await readMutation(request);
    return Response.json(repository().save(key,body.board,body.version,user.username));
  } catch(e) { return managementError(e); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request); const user = await requireUser("delete"); const {key} = await context.params;
    const body = await readMutation(request);
    repository().delete(key,body.version,body.confirmation||"",user.username);
    return Response.json({ok:true});
  } catch(e) { return managementError(e); }
}
