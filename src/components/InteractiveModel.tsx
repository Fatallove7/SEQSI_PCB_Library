"use client";

import "@google/model-viewer";
import type { ModelViewerElement } from "@google/model-viewer";
import { createElement, useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";

export default function InteractiveModel({ src, title }: { src: string; title: string }) {
  const model = useRef<ModelViewerElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading model…");
  useEffect(() => {
    const viewer = model.current;
    const loaded = () => setStatus("Drag to rotate. Scroll or pinch to zoom. Arrow keys rotate the model.");
    const failed = () => setStatus("The interactive model could not be loaded. Use the available renders or download the model.");
    viewer?.addEventListener("load", loaded);
    viewer?.addEventListener("error", failed);
    return () => { viewer?.removeEventListener("load", loaded); viewer?.removeEventListener("error", failed); };
  }, []);
  return <div className="interactive-model" ref={container}>
    {createElement("model-viewer", { ref: model, src: assetUrl(src), alt: `${title} interactive 3D model`, "camera-controls": true, "camera-orbit": "0deg 60deg auto", "interaction-prompt": "none", "touch-action": "pan-y", style: { width: "100%", height: "420px" } })}
    <div className="model-controls"><button className="button" onClick={() => { if (model.current) { model.current.cameraOrbit = "0deg 60deg auto"; model.current.cameraTarget = "auto auto auto"; model.current.fieldOfView = "auto"; model.current.jumpCameraToGoal(); } }}>Reset camera</button><button className="button" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current?.requestFullscreen(); } catch { setStatus("Fullscreen is unavailable in this browser. The model can still be viewed here."); } }}>Toggle fullscreen</button><a href={assetUrl(src)} download>Download model ↓</a></div>
    <p className="muted model-status" role="status">{status}</p>
  </div>;
}
