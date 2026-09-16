import Link from "next/link";
import { getPublishedBoards as getBoards } from "@/lib/admin/public-boards";
import { getBoardSummaries, getYears } from "@/lib/boards";
import { boardCategories } from "@/data/categories";
import { BoardGrid } from "@/components/BoardCard";
import { site } from "@/config/site";
import { assetUrl } from "@/lib/assets";

export default function Home() {
  const boards = getBoards();
  const latest = [...boards].sort((a, b) => (b.createdAt || `${b.year}-01-01`).localeCompare(a.createdAt || `${a.year}-01-01`) || b.id.localeCompare(a.id)).slice(0, 3);
  const years = getYears(boards);
  return <>
    <section className="home-intro"><p className="eyebrow">Engineering archive</p><h1>{site.title}</h1><p className="lead">{site.description}<br />From schematic to assembled board, in one place.</p>
      <form action={assetUrl("/boards/")} className="home-search"><label htmlFor="home-search" className="sr-only">Search PCB archive</label><input id="home-search" name="q" type="search" placeholder="Search by PCB ID, title, or keyword…" /><button className="button primary" type="submit">Search <span aria-hidden="true">→</span></button></form>
      <p className="archive-stats">{boards.length} PCB works <span>·</span> {boardCategories.length} categories <span>·</span> An evolving design archive</p>
    </section>
    {boards.some(b => b.demo) && <p className="notice"><strong>Example archive.</strong> Entries marked Demo use placeholder assets. They are not validated engineering designs.</p>}
    <section className="home-section"><div className="section-heading"><h2>Browse by category</h2><Link href="/categories">All categories ↗</Link></div><div className="category-grid">{boardCategories.map(c => <Link className="category-card" key={c.id} href={`/boards?category=${encodeURIComponent(c.id)}`}><div><h3>{c.label}</h3><p>{boards.filter(b => b.category === c.id).length} boards</p></div><span aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="home-section year-section"><div><h2>Browse by year</h2><p className="muted">A chronological view of the archive.</p></div><div className="year-links">{years.map(year => <Link key={year} href={`/boards?year=${year}`}>{year}<span>{boards.filter(b => b.year === year).length}</span></Link>)}{!years.length && <p className="muted">Years appear when boards are added.</p>}</div></section>
    <section className="home-section"><div className="section-heading"><div><h2>Latest boards</h2><p className="muted">Recently added to the library.</p></div><Link href="/boards">View all boards ↗</Link></div>{latest.length ? <BoardGrid boards={getBoardSummaries(latest)} /> : <p className="empty-state">No PCB works have been added yet.</p>}</section>
  </>;
}
