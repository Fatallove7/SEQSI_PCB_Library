import { BoardRepository, boardAssetPaths } from "../src/lib/admin/repository";
import { dataDirectory } from "../src/lib/admin/storage";
import { boardSchema } from "../src/lib/validation";
import { createHash } from "node:crypto";
const repo = new BoardRepository(dataDirectory());
try {
  const records=repo.list();
  for(const record of records) {
    for(const board of [record.board,record.published].filter(Boolean)) {
      boardSchema.parse(board);
      if (!repo.categories().some(category=>category.id===board!.category)) throw new Error(`Unknown category on ${record.board.id}`);
      for(const url of boardAssetPaths(board!)) {
        const asset=repo.asset(url);
        if(!asset || asset.boardKey!==record.key) throw new Error(`Invalid asset reference on ${record.board.id}`);
      }
    }
    for(const asset of repo.assets(record.key)) {
      const hash=createHash("sha256").update(repo.storage.read(asset.storageKey)).digest("hex");
      if(hash!==asset.sha256) throw new Error(`Asset checksum mismatch on ${record.board.id}: ${asset.name}`);
    }
  }
  console.log(`Validated ${records.length} runtime boards, asset ownership and file checksums.`);
} finally {repo.close();}
