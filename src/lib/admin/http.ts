export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function appOrigin(env: Record<string, string | undefined> = process.env): string {
  const value = env.APP_ORIGIN || (env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    return url.origin;
  } catch {
    throw new HttpError(503, "APP_ORIGIN must be configured as the application origin.");
  }
}

export function assertSameOrigin(request: Request, env: Record<string, string | undefined> = process.env): void {
  if (request.headers.get("origin") !== appOrigin(env)) throw new HttpError(403, "Request origin is not allowed.");
}

export async function readJson(request: Request, maxBytes = 65_536): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "Expected application/json.");
  const declared = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes) throw new HttpError(413, "Request is too large.");
  if (!request.body) throw new HttpError(400, "Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}

export function jsonError(error: unknown): Response {
  const known = error instanceof HttpError;
  return Response.json({ error: known ? error.message : "An unexpected error occurred." }, {
    status: known ? error.status : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
