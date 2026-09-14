import { getBoards } from "../src/lib/boards";

try {
  const boards = getBoards();
  console.log(`Validated ${boards.length} PCB record${boards.length === 1 ? "" : "s"}; metadata, unique IDs/slugs, and referenced local files are valid.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
