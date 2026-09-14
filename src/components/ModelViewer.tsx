"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Board } from "@/types/board";
import { AssetImage } from "./AssetImage";
import { ImageGallery } from "./ImageGallery";

const InteractiveModel = dynamic(() => import("./InteractiveModel"), { ssr: false, loading: () => <p className="missing" role="status">Loading 3D viewer…</p> });

export function ModelViewer({ data, title }: { data?: Board["model3d"]; title: string }) {
  const [active, setActive] = useState(false);
  const renders = [...new Set([data?.preview, ...(data?.renders || [])].filter((src): src is string => Boolean(src)))];
  if (!data?.model && !renders.length) return <p className="missing">Not available yet.</p>;
  return <div className="model-section">
    {data?.model && (active ? <InteractiveModel src={data.model} title={title} /> : <div className="model-poster"><AssetImage src={data.preview} alt={`${title} 3D preview`} /><div><button className="button primary" onClick={() => setActive(true)}>Load interactive 3D model</button><p className="muted">Rotate, zoom, and inspect the board.</p></div></div>)}
    {renders.length > 0 && <ImageGallery label="3D render" images={renders.map((src, index) => ({ src, caption: `3D render ${index + 1}` }))} />}
  </div>;
}
