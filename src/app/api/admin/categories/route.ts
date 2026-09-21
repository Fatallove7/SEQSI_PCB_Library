import { requireUser } from "@/lib/admin/auth";
import { assertSameOrigin, readJson } from "@/lib/admin/http";
import { repository } from "@/lib/admin/repository";
import { managementError } from "@/lib/admin/responses";

export async function GET() {
  try { await requireUser(); return Response.json(repository().categories(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return managementError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser("manage-categories");
    return Response.json(repository().createCategory(await readJson(request), user.username), { status: 201 });
  } catch (error) { return managementError(error); }
}
