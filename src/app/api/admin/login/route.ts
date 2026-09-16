import { consumeLoginAttempt, signIn } from "@/lib/admin/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/admin/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    consumeLoginAttempt();
    const body = await readJson(request, 8192);
    if (!body || typeof body !== "object" || !("username" in body) || !("password" in body) ||
        typeof body.username !== "string" || typeof body.password !== "string" || body.username.length > 128 || body.password.length > 1024) {
      throw new HttpError(400, "Username and password are required.");
    }
    await signIn(body.username, body.password);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
