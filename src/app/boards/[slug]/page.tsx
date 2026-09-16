import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBoards as getBoards } from "@/lib/admin/public-boards";
import { boardCategories } from "@/data/categories";
import { ImageGallery } from "@/components/ImageGallery";
import { ModelViewer } from "@/components/ModelViewer";
import { TechnicalSpecs } from "@/components/TechnicalSpecs";
import { DownloadList } from "@/components/DownloadList";
import { assetUrl } from "@/lib/assets";
import { site } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const board = getBoards().find(b => b.slug === slug);
  if (!board) return { title: "Board not found" };
  const title = `${board.id} ${board.title}`;
  return { title, description: board.description, openGraph: { title: `${title} | ${site.title}`, description: board.description, ...(board.thumbnail && site.url ? { images: [{ url: new URL(assetUrl(board.thumbnail), site.url).href, alt: board.title }] } : {}) } };
}

export default async function BoardDetail({ params }: Props) {
  const { slug } = await params;
  const board = getBoards().find(b => b.slug === slug);
  if (!board) notFound();
  const category = boardCategories.find(c => c.id === board.category);
  const downloads = [...(board.downloads || [])];
  for (const entry of [{ label: "Schematic PDF", file: board.schematic?.pdf }, { label: "3D model", file: board.model3d?.model }]) {
    if (entry.file && !downloads.some(d => d.file === entry.file)) downloads.push({ label: entry.label, file: entry.file });
  }
  const sections = [["schematic", "Schematic"], ["layout", "PCB layout"], ["model", "3D model"], ["photos", "Physical board"], ["specifications", "Specifications"], ["downloads", "Downloads"]];
  return <>
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/boards">Boards</Link><span aria-hidden="true">/</span><Link href={`/boards?category=${encodeURIComponent(board.category)}`}>{category?.label}</Link><span aria-hidden="true">/</span><span>{board.id}</span></nav>
    <header className="detail-header"><div className="inline-meta"><p className="identifier">{board.id}</p>{board.demo && <span className="badge">Demo / example</span>}{board.status && <span className="badge">{board.status}</span>}</div><h1>{board.title}</h1><p className="lead">{board.description}</p><dl className="overview-meta"><div><dt>Category</dt><dd><Link href={`/boards?category=${encodeURIComponent(board.category)}`}>{category?.label}</Link></dd></div><div><dt>Year</dt><dd><Link href={`/boards?year=${board.year}`}>{board.year}</Link></dd></div><div><dt>Designer</dt><dd>{board.designer?.join(", ") || "Not recorded"}</dd></div>{board.revision && <div><dt>Revision</dt><dd>{board.revision}</dd></div>}</dl>{Boolean(board.tags?.length) && <div className="tag-list">{board.tags?.map(tag => <Link className="tag" key={tag} href={`/boards?q=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>}</header>
    {board.demo && <p className="notice"><strong>Demonstration content only.</strong> Illustrations and files are placeholders, not engineering drawings, physical-board photographs, or manufacturing instructions.</p>}
    <div className="detail-layout"><aside className="section-nav"><p className="eyebrow">On this page</p><nav aria-label="Board sections">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><Link className="back-link" href="/boards">← All boards</Link></aside><div className="detail-content">
      <section className="detail-section" id="schematic"><div className="section-heading"><h2>Schematic</h2>{board.schematic?.pdf && <a className="button" href={assetUrl(board.schematic.pdf)} target="_blank" rel="noreferrer">Open PDF ↗</a>}</div><ImageGallery label="Schematic" images={(board.schematic?.images || []).map((src, i) => ({ src, caption: `Schematic — page ${i + 1}` }))} /></section>
      <section className="detail-section" id="layout"><h2>PCB layout</h2><ImageGallery label="PCB layout" images={board.layout || []} /></section>
      <section className="detail-section" id="model"><h2>3D model</h2><ModelViewer data={board.model3d} title={board.title} /></section>
      <section className="detail-section" id="photos"><h2>Physical board</h2><ImageGallery label="Physical board" images={board.photos || []} /></section>
      <section className="detail-section" id="specifications"><h2>Technical specifications</h2><TechnicalSpecs specifications={board.specifications} />{board.notes && <div className="board-notes"><h3>Notes</h3><p>{board.notes}</p></div>}</section>
      <section className="detail-section" id="downloads"><h2>Downloads</h2><DownloadList downloads={downloads} /></section>
      {(board.createdAt || board.updatedAt) && <p className="record-dates muted">{board.createdAt && `Added ${board.createdAt}`}{board.createdAt && board.updatedAt && " · "}{board.updatedAt && `Updated ${board.updatedAt}`}</p>}
    </div></div>
  </>;
}
