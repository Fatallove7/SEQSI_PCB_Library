import { requireUser, signOut } from "@/lib/admin/auth";
import { assertSameOrigin, jsonError } from "@/lib/admin/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireUser();
    await signOut();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
