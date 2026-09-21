import { ImageGallery } from "./ImageGallery";
import { PdfPreview } from "./PdfPreview";

export function BoardMedia({ assets, label }: { assets: { src: string; caption?: string; alt?: string }[]; label: string }) {
  if (!assets.length) return <p className="missing">Preview not available</p>;
  const images = assets.filter(asset => !/\.pdf$/i.test(asset.src));
  return <div className="board-media">
    {images.length > 0 && <ImageGallery images={images} label={label} />}
    {assets.filter(asset => /\.pdf$/i.test(asset.src)).map(asset => <PdfPreview key={asset.src} src={asset.src} label={asset.caption || `${label} PDF`} />)}
  </div>;
}
