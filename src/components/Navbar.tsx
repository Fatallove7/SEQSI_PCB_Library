"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";
import { assetUrl } from "@/lib/assets";

const links = [["/", "Home"], ["/boards", "Boards"], ["/categories", "Categories"], ["/years", "Years"], ["/about", "About"]];

export function Navbar() {
  const pathname = usePathname();
  return <header className="site-header"><div className="container nav-inner">
    <Link href="/" className="brand">{site.logo ? <Image src={assetUrl(site.logo)} width={28} height={28} alt="" unoptimized /> : <span className="brand-mark" aria-hidden="true">PCB</span>}{site.title}</Link>
    <nav aria-label="Main navigation">{links.map(([href, label]) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}</nav>
  </div></header>;
}
