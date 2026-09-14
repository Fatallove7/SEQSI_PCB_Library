import Link from "next/link";

export default function NotFound() {
  return <div className="empty-state not-found"><p className="eyebrow">404 · Not found</p><h1>This page is not in the archive.</h1><p>The board or page may have moved, or the address may be incorrect.</p><Link className="button primary" href="/boards">Browse all boards →</Link></div>;
}
