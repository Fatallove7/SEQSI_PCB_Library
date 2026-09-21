import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaResponse } from "../src/lib/admin/media-response";

test("PDF delivery opens inline and serves bounded ranges for lazy previews",async()=>{
  const bytes=Buffer.from("%PDF-example-content");
  const full=mediaResponse(new Request("http://localhost/"),bytes,{mime:"application/pdf",name:"example.pdf"});
  assert.match(full.headers.get("content-disposition")!,/^inline/);
  assert.equal(full.headers.get("accept-ranges"),"bytes");
  const partial=mediaResponse(new Request("http://localhost/",{headers:{Range:"bytes=0-4"}}),bytes,{mime:"application/pdf",name:"example.pdf"});
  assert.equal(partial.status,206);assert.equal(await partial.text(),"%PDF-");
  assert.equal(partial.headers.get("content-range"),`bytes 0-4/${bytes.length}`);
  assert.equal(mediaResponse(new Request("http://localhost/",{headers:{Range:"bytes=999-"}}),bytes,{mime:"application/pdf",name:"example.pdf"}).status,416);
});
