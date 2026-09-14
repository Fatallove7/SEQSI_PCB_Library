// Reproducible, nontechnical placeholder artwork. No real PCB design is represented.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function write(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function svg(label, variant, color = "#346d60") {
  const frame = `<rect width="960" height="600" fill="#f7f7f8"/><text x="40" y="48" font-family="Arial,sans-serif" font-size="16" fill="#62626c">${label}</text>`;
  const board = `<g transform="translate(265 120)"><rect width="430" height="300" rx="8" fill="${color}" stroke="#23493f" stroke-width="3"/>${[24, 406].flatMap(x => [24, 276].map(y => `<circle cx="${x}" cy="${y}" r="9" fill="#e4e4e7"/>`)).join("")}<rect x="157" y="95" width="116" height="108" fill="#27272a" stroke="#a1a1aa"/><text x="215" y="156" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="white">DEMO</text>${[65, 327].map(x => `<rect x="${x}" y="65" width="38" height="180" rx="3" fill="#d4d4d8"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${x + 11}" y="${78 + i * 20}" width="16" height="8" fill="#71717a"/>`).join("")}`).join("")}<text x="215" y="268" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#e4e4e7">PLACEHOLDER · NOT A CIRCUIT</text></g>`;
  const diagram = `<g fill="white" stroke="#a1a1aa" stroke-width="2"><rect x="120" y="180" width="180" height="160"/><rect x="390" y="180" width="180" height="160"/><rect x="660" y="180" width="180" height="160"/><path d="M300 260H390 M570 260H660"/></g><g font-family="Arial,sans-serif" text-anchor="middle" fill="#62626c" font-size="20"><text x="210" y="268">Placeholder A</text><text x="480" y="268">Placeholder B</text><text x="750" y="268">Placeholder C</text></g>`;
  const content = variant === "schematic" ? diagram : variant === "render" ? `<g transform="translate(80 55) skewX(-12) scale(.94 .84)">${board}</g>` : board;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">${frame}${content}<text x="480" y="520" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#62626c">${variant === "photo" ? "PHOTO PLACEHOLDER — NO PHOTOGRAPH PROVIDED" : "DEMO ASSET — NOT FOR ENGINEERING USE"}</text><text x="480" y="552" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#62626c">Illustrative shapes only. No dimensions, routing, or component data.</text></svg>`;
}

// A single cuboid with arbitrary display units, intentionally no engineering dimensions.
function demoGlb() {
  const faces = [
    { n: [0, 1, 0], v: [[-1,.04,-.65],[-1,.04,.65],[1,.04,.65],[1,.04,-.65]] },
    { n: [0,-1,0], v: [[-1,-.04,.65],[-1,-.04,-.65],[1,-.04,-.65],[1,-.04,.65]] },
    { n: [0,0,1], v: [[-1,.04,.65],[-1,-.04,.65],[1,-.04,.65],[1,.04,.65]] },
    { n: [0,0,-1], v: [[1,.04,-.65],[1,-.04,-.65],[-1,-.04,-.65],[-1,.04,-.65]] },
    { n: [1,0,0], v: [[1,.04,.65],[1,-.04,.65],[1,-.04,-.65],[1,.04,-.65]] },
    { n: [-1,0,0], v: [[-1,.04,-.65],[-1,-.04,-.65],[-1,-.04,.65],[-1,.04,.65]] },
  ];
  const positions = new Float32Array(faces.flatMap(f => f.v.flat()));
  const normals = new Float32Array(faces.flatMap(f => f.v.flatMap(() => f.n)));
  const indices = new Uint16Array(faces.flatMap((_, i) => [0,1,2,0,2,3].map(j => i * 4 + j)));
  const binary = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(normals.buffer), Buffer.from(indices.buffer)]);
  const gltf = { asset: { version: "2.0", generator: "PCB Library demo placeholder; arbitrary units, not an engineering model" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: "DEMO PLACEHOLDER" }], meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }], materials: [{ name: "Demo green", pbrMetallicRoughness: { baseColorFactor: [.08,.28,.20,1], metallicFactor: 0, roughnessFactor: .7 }, doubleSided: true }], buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }, { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength }, { buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: indices.byteLength }], accessors: [{ bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-1,-.04,-.65], max: [1,.04,.65] }, { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" }, { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR" }] };
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, json, binHeader, binary]);
}

for (const [id, color] of [["demo-a", "#346d60"], ["demo-b", "#49617b"]]) {
  const root = `public/pcb/${id}`;
  write(`${root}/thumbnail.svg`, svg("EXAMPLE BOARD / " + id.toUpperCase(), "board", color));
  write(`${root}/schematic/page-1.svg`, svg("SCHEMATIC PLACEHOLDER / PAGE 1", "schematic"));
  write(`${root}/layout/top.svg`, svg("LAYOUT PLACEHOLDER / TOP", "board", color));
  write(`${root}/layout/bottom.svg`, svg("LAYOUT PLACEHOLDER / BOTTOM", "board", color));
  write(`${root}/3d/preview.svg`, svg("3D RENDER PLACEHOLDER", "render", color));
  write(`${root}/photos/photo-placeholder.svg`, svg("PHYSICAL BOARD / IMAGE PENDING", "photo", color));
}
write("public/pcb/demo-a/3d/board.glb", demoGlb());
write("public/pcb/demo-a/files/example-notes.txt", "DEMO CONTENT ONLY\nThis file demonstrates downloadable documentation.\nNo real PCB data, engineering specifications, or manufacturing instructions are supplied.\nThe GLB is a cuboid in arbitrary display units. SVGs are labeled illustrative placeholders.\nReplace all demo records and files with verified group content.\n");
console.log("Generated labeled demo assets for demo-a and demo-b.");
