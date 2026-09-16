import Link from "next/link";
import { boardCategories } from "@/data/categories";
import { getPublishedBoards as getBoards } from "@/lib/admin/public-boards";

export const metadata = { title: "Categories" };
export default function CategoriesPage() {
  const boards = getBoards();
  return <><div className="page-heading"><p className="eyebrow">Explore the archive</p><h1>Categories</h1><p className="lead">Find boards by function and application.</p></div><div className="category-index">{boardCategories.map(category => <Link key={category.id} href={`/boards?category=${encodeURIComponent(category.id)}`}><div><h2>{category.label}</h2><p>{category.description}</p></div><span>{boards.filter(b => b.category === category.id).length} boards <span aria-hidden="true">↗</span></span></Link>)}</div></>;
}
