import Link from "next/link";
import { getBoards, getYears } from "@/lib/boards";

export const metadata = { title: "Years" };
export default function YearsPage() {
  const boards = getBoards();
  const years = getYears(boards);
  return <><div className="page-heading"><p className="eyebrow">Explore the archive</p><h1>Browse by year</h1><p className="lead">PCB works in chronological order, newest first.</p></div><div className="category-index">{years.map(year => <Link key={year} href={`/boards?year=${year}`}><h2>{year}</h2><span>{boards.filter(b => b.year === year).length} boards <span aria-hidden="true">↗</span></span></Link>)}</div>{!years.length && <p className="empty-state">Years appear automatically when PCB records are added.</p>}</>;
}
