"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import { assetUrl } from "@/lib/assets";

function useVisible() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function PdfPage({ document, number, zoom, thumbnail = false }: { document: PDFDocumentProxy; number: number; zoom: number; thumbnail?: boolean }) {
  const { ref, visible } = useVisible();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    void (async () => {
      const page = await document.getPage(number);
      if (cancelled || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(width, thumbnail ? 600 : 1800) / base.width * zoom });
      const ratio = thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      delete canvas.current.dataset.rendered;
      canvas.current.width = Math.ceil(viewport.width * ratio);
      canvas.current.height = Math.ceil(viewport.height * ratio);
      canvas.current.style.width = `${viewport.width}px`;
      canvas.current.style.height = `${viewport.height}px`;
      task = page.render({ canvas: canvas.current, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      if (!cancelled && canvas.current) canvas.current.dataset.rendered = "true";
    })().catch(error => { if (!cancelled && error?.name !== "RenderingCancelledException") setError(true); });
    return () => { cancelled = true; task?.cancel(); };
  }, [document, number, zoom, width, visible, thumbnail]);
  return <div ref={ref} className="pdf-page">
    {error ? <p className="missing">Page preview unavailable. Use Open PDF.</p> : <canvas ref={canvas} role="img" aria-label={`PDF page ${number}`} />}
  </div>;
}

function PdfDocument({ src, thumbnail = false, zoom = 1 }: { src: string; thumbnail?: boolean; zoom?: number }) {
  const { ref, visible } = useVisible();
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let loading: PDFDocumentLoadingTask | undefined;
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = assetUrl("/pdfjs/pdf.worker.min.mjs");
      loading = pdfjs.getDocument({ url: assetUrl(src), disableAutoFetch: true, disableStream: true,
        cMapUrl: assetUrl("/pdfjs/cmaps/"), cMapPacked: true, standardFontDataUrl: assetUrl("/pdfjs/standard_fonts/"), wasmUrl: assetUrl("/pdfjs/wasm/") });
      const loaded = await loading.promise;
      if (!cancelled) setDocument(loaded);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; void loading?.destroy(); };
  }, [src, visible]);
  return <div ref={ref} className={thumbnail ? "pdf-thumbnail" : "pdf-pages"} data-pdf-src={src}>
    {failed ? <p className="image-placeholder">PDF preview unavailable{!thumbnail && ". Use Open PDF."}</p> : document ?
      Array.from({ length: thumbnail ? 1 : document.numPages }, (_, index) => <PdfPage key={index} document={document} number={index + 1} zoom={zoom} thumbnail={thumbnail} />) :
      <p className="image-placeholder">{visible ? "Loading PDF preview…" : "PDF preview"}</p>}
  </div>;
}

export function PdfThumbnail({ src }: { src: string }) { return <PdfDocument key={src} src={src} thumbnail />; }

export function PdfPreview({ src, label = "PDF document" }: { src: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  return <div className="pdf-preview">
    <div className="pdf-toolbar"><span>{label}</span><a className="button" href={assetUrl(src)} target="_blank" rel="noreferrer">Open PDF</a>
      <button type="button" className="button" onClick={() => { setOpen(true); dialog.current?.showModal(); }}>Enlarge PDF</button>
    </div>
    <PdfDocument key={src} src={src} />
    <dialog ref={dialog} className="lightbox pdf-dialog" aria-label={label} onClose={() => setOpen(false)}>
      <div className="pdf-toolbar"><strong>{label}</strong><label>Zoom<select value={zoom} onChange={e => setZoom(Number(e.target.value))}>
        <option value={1}>Fit width</option><option value={1.5}>150%</option><option value={2}>200%</option>
      </select></label><a className="button" href={assetUrl(src)} target="_blank" rel="noreferrer">Open PDF</a><button type="button" className="button" onClick={() => dialog.current?.close()}>Close</button></div>
      {open && <PdfDocument key={src} src={src} zoom={zoom} />}
    </dialog>
  </div>;
}
