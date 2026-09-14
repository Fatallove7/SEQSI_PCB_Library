"use client";

import Image from "next/image";
import { useState } from "react";
import { assetUrl } from "@/lib/assets";

export function AssetImage({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}>Image not available yet</div>;
  return <Image src={assetUrl(src)} alt={alt} width={1600} height={1000} unoptimized loading="lazy" className={className} onError={() => setFailed(true)} />;
}
