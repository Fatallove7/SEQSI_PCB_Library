import { requireUser } from "@/lib/admin/auth";
import { assertSameOrigin, readJson } from "@/lib/admin/http";
import { repository } from "@/lib/admin/repository";
import { managementError } from "@/lib/admin/responses";

export async function GET() {
  try { await requireUser(); return Response.json(repository().list(), {headers:{"Cache-Control":"no-store"}}); }
  catch (e) { return managementError(e); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const user = await requireUser("upload");
    const board = repository().create(await readJson(request), user.username);
    return Response.json(board, {status:201});
  } catch (e) { return managementError(e); }
}
