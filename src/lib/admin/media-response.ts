export function mediaResponse(request: Request, bytes: Buffer, asset: { mime: string; name: string }) {
  const inline = asset.mime.startsWith("image/") || asset.mime.startsWith("model/gltf") || asset.mime === "application/pdf";
  const headers = new Headers({
    "Content-Type": asset.mime, "Accept-Ranges": "bytes",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.name.split("/").pop()!)}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'", "Cross-Origin-Resource-Policy": "same-origin",
  });
  const range=request.headers.get("range");
  if(range) {
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    let start=0;let end=bytes.length-1;
    if(match && (match[1] || match[2])) {
      if(!match[1]) start=Math.max(0,bytes.length-Number(match[2]));
      else {start=Number(match[1]);if(match[2]) end=Math.min(end,Number(match[2]));}
    } else start=bytes.length;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length) {
      headers.set("Content-Range",`bytes */${bytes.length}`);return new Response(null,{status:416,headers});
    }
    headers.set("Content-Range",`bytes ${start}-${end}/${bytes.length}`);headers.set("Content-Length",String(end-start+1));
    return new Response(new Uint8Array(bytes.subarray(start,end+1)),{status:206,headers});
  }
  headers.set("Content-Length",String(bytes.length));
  return new Response(new Uint8Array(bytes),{headers});
}
