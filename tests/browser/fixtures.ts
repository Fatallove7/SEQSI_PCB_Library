// A small, valid two-page PDF fixture, containing no engineering data.
export function pdfFixture() {
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...[1,2].map(page=>{const stream=`BT /F1 18 Tf 40 220 Td (DEMO PDF - page ${page}) Tj ET`;return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;})
  ];
  let document="%PDF-1.4\n";const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(document));document+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(document);
  document+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1)) document+=`${String(offset).padStart(10,"0")} 00000 n \n`;
  document+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(document);
}
