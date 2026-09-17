import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { site } from "@/config/site";
import { getUser, can } from "@/lib/admin/auth";
import "./globals.css";
import "@/components/auth.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: site.title, template: `%s | ${site.title}` },
  description: site.description,
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const permissions = { upload: !!user && can(user.role, "upload"), manage: !!user && can(user.role, "edit"), archive: !!user && can(user.role, "archive") };
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Navbar user={user} permissions={permissions} /><main id="main" className="container main-content">{children}</main><footer className="site-footer"><div className="container footer-inner"><div><strong>{site.title}</strong><p>Designs, drawings, and documentation.</p></div><Link href="/about">About & contribution guide ↗</Link></div></footer></body></html>;
}
