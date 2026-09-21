import { requireUser } from "@/lib/admin/auth";
import { assertSameOrigin } from "@/lib/admin/http";
import { repository } from "@/lib/admin/repository";
import { managementError } from "@/lib/admin/responses";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser("manage-categories");
    repository().deleteCategory((await params).id, user.username);
    return Response.json({ deleted: true });
  } catch (error) { return managementError(error); }
}
