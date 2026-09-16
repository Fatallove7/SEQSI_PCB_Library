import { jsonError, readJson, HttpError } from "./http";
import { ManagementError } from "./repository";
import { z } from "zod";
const mutationSchema=z.object({version:z.number().int().positive(),board:z.unknown().optional(),confirmation:z.string().max(65536).optional()});
export async function readMutation(request:Request) {
  const parsed=mutationSchema.safeParse(await readJson(request));
  if(!parsed.success) throw new HttpError(400,"Expected a board version and valid operation fields.");
  return parsed.data;
}
export function managementError(error: unknown) {
  if (error instanceof ManagementError) return Response.json({error:error.message}, {status:error.status});
  return jsonError(error);
}
