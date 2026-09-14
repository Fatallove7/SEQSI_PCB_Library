"use client";

import { useEffect, useRef, useState } from "react";
import { AssetImage } from "./AssetImage";
import { assetUrl } from "@/lib/assets";

export type GalleryImage = { src: string; caption?: string; alt?: string; photographer?: string; date?: string };

export function ImageGallery({ images, label }: { images: GalleryImage[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const item = active === null ? undefined : images[active];

  useEffect(() => {
    if (active === null) return;
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [active]);

  function close() {
    dialog.current?.close();
    setActive(null);
    opener.current?.focus();
  }
  function step(amount: number) { setActive(current => current === null ? null : (current + amount + images.length) % images.length); }

  if (!images.length) return <p className="missing">Not available yet.</p>;
  return <>
    <div className={`gallery-grid ${images.length === 1 ? "single-image" : ""}`}>{images.map((image, index) => <figure key={`${image.src}-${index}`}>
      <button className="gallery-trigger" aria-label={`Enlarge ${image.caption || `${label} ${index + 1}`}`} onClick={event => { opener.current = event.currentTarget; setActive(index); }}><AssetImage src={image.src} alt={image.alt || image.caption || `${label} ${index + 1}`} /><span className="enlarge-label">Enlarge ↗</span></button>
      <figcaption>{image.caption || `${label} ${index + 1}`}{(image.photographer || image.date) && <span className="photo-credit">{[image.photographer, image.date].filter(Boolean).join(" · ")}</span>}</figcaption>
    </figure>)}</div>
    <dialog ref={dialog} className="lightbox" aria-label={`${label} image viewer`} onCancel={event => { event.preventDefault(); close(); }} onClose={() => { setActive(null); opener.current?.focus(); }} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1); } }}>
      {item && <><div className="lightbox-toolbar"><p>{item.caption || label} <span className="muted">({(active || 0) + 1} / {images.length})</span></p><button className="button" onClick={close} autoFocus>Close <span aria-hidden="true">×</span></button></div>
        <div className="lightbox-image"><AssetImage key={item.src} src={item.src} alt={item.alt || item.caption || label} /></div>
        <div className="lightbox-toolbar"><button className="button" disabled={images.length < 2} onClick={() => step(-1)}>← Previous</button><a href={assetUrl(item.src)} target="_blank" rel="noreferrer">Open original ↗</a><button className="button" disabled={images.length < 2} onClick={() => step(1)}>Next →</button></div>
      </>}
    </dialog>
  </>;
}
