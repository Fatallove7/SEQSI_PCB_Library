import type { Board } from "../types/board";

export function renderAssets(board: Board): string[] {
  return [...new Set([board.model3d?.preview, ...(board.model3d?.renders || [])].filter((src): src is string => Boolean(src)))];
}

export function boardCover(board: Board): string | undefined {
  const renders = renderAssets(board);
  if (board.model3d?.primary && renders.includes(board.model3d.primary)) return board.model3d.primary;
  return renders.find(src => !/\.pdf$/i.test(src)) || renders[0];
}
