import type { Board } from "../../types/board";
import type { Asset } from "./repository";

// Only selected draft candidates are considered. Historical files never reappear.
export function publishedPreviews(board: Board, assets: Asset[]): Board {
  const result = structuredClone(board);
  const byUrl = new Map(assets.map(a => [a.url, a]));
  const prefer = <T>(items: T[], url: (item:T)=>string) => {
    const generated = items.filter(item => byUrl.get(url(item))?.origin === "generated");
    return generated.length ? generated : items;
  };
  if (result.schematic?.images) result.schematic.images = prefer(result.schematic.images, src=>src);
  if (result.layout) result.layout = prefer(result.layout, item=>item.src);
  if (result.layoutPdfs) result.layoutPdfs = prefer(result.layoutPdfs, item=>item.file);
  // Every selected 3D asset participates in the new explicit-primary/image/PDF cover order.
  const sources = assets.filter(a=>a.role==="source" && !a.superseded);
  const schematic = sources.some(a=>/\.schdoc$/i.test(a.name));
  const layout = sources.some(a=>/\.pcbdoc$/i.test(a.name));
  // These flags are server-derived and captured at publication, never source URLs.
  delete result.sourceAvailability;
  if (schematic || layout) result.sourceAvailability = {schematic,layout};
  return result;
}
