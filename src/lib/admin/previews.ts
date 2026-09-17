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
  if (result.model3d) {
    const images = [...new Set([result.model3d.preview, ...(result.model3d.renders || [])].filter((p):p is string=>Boolean(p)))];
    const selected = prefer(images, src=>src);
    if (result.model3d.preview && !selected.includes(result.model3d.preview)) delete result.model3d.preview;
    if (result.model3d.renders) result.model3d.renders = result.model3d.renders.filter(src=>selected.includes(src));
  }
  const sources = assets.filter(a=>a.role==="source" && !a.superseded);
  const schematic = sources.some(a=>/\.schdoc$/i.test(a.name));
  const layout = sources.some(a=>/\.pcbdoc$/i.test(a.name));
  // These flags are server-derived and captured at publication, never source URLs.
  delete result.sourceAvailability;
  if (schematic || layout) result.sourceAvailability = {schematic,layout};
  return result;
}
