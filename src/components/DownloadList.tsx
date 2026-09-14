import { assetUrl } from "@/lib/assets";

export function DownloadList({ downloads }: { downloads: { label: string; file: string }[] }) {
  if (!downloads.length) return <p className="missing">Not available yet.</p>;
  return <ul className="download-list">{downloads.map(item => <li key={item.file}><a href={assetUrl(item.file)} download><span>{item.label}</span><span className="download-type">{item.file.split(".").pop()?.toUpperCase()} <span aria-hidden="true">↓</span></span></a></li>)}</ul>;
}
