/** Asset records stay independent of the deployment's subdirectory. */
export function assetUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}
