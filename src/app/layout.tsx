import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.title, template: `%s | ${site.title}` },
  description: site.description,
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Navbar /><main id="main" className="container main-content">{children}</main><footer className="site-footer"><div className="container footer-inner"><div><strong>{site.title}</strong><p>Designs, drawings, and documentation.</p></div><Link href="/about">About & contribution guide ↗</Link></div></footer></body></html>;
}
