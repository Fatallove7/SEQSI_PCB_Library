import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBoards as getBoards } from "@/lib/admin/public-boards";

import { BoardMedia } from "@/components/BoardMedia";
import { PdfPreview } from "@/components/PdfPreview";
import { boardCover, renderAssets } from "@/lib/board-cover";
import { TechnicalSpecs } from "@/components/TechnicalSpecs";
import { DownloadList } from "@/components/DownloadList";
import { assetUrl } from "@/lib/assets";
import { site } from "@/config/site";
import { getUser, can } from "@/lib/admin/auth";
import { repository } from "@/lib/admin/repository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const board = getBoards().find(b => b.slug === slug);
  if (!board) return { title: "Board not found" };
  const title = `${board.id} ${board.title}`;
  const cover=boardCover(board);
  return { title, description: board.description, openGraph: { title: `${title} | ${site.title}`, description: board.description, ...(cover && !/\.pdf$/i.test(cover) && site.url ? { images: [{ url: new URL(assetUrl(cover!), site.url).href, alt: board.title }] } : {}) } };
}

export default async function BoardDetail({ params }: Props) {
  const { slug } = await params;
  const board = getBoards().find(b => b.slug === slug);
  if (!board) notFound();
  const user = await getUser();
  const managed = user ? repository().list().find(r=>r.board.slug===slug) : undefined;
  const category = repository().categories().find(c => c.id === board.category);
  const downloads = [...(board.downloads || [])];
  if (board.schematic?.pdf && !downloads.some(d=>d.file===board.schematic!.pdf)) downloads.push({label:"Schematic PDF",file:board.schematic.pdf});
  const sections = [["schematic", "Schematic"], ["model", "3D Render"], ["photos", "Physical board"], ["specifications", "Specifications"], ["downloads", "Downloads"]];
  return <>
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/boards">Boards</Link><span aria-hidden="true">/</span><Link href={`/boards?category=${encodeURIComponent(board.category)}`}>{category?.name || board.category}</Link><span aria-hidden="true">/</span><span>{board.id}</span></nav>
    <header className="detail-header"><div className="inline-meta"><p className="identifier">{board.id}</p>{board.demo && <span className="badge">Demo / example</span>}{board.status && <span className="badge">{board.status}</span>}</div><h1>{board.title}</h1><p className="lead">{board.description}</p><dl className="overview-meta"><div><dt>Category</dt><dd><Link href={`/boards?category=${encodeURIComponent(board.category)}`}>{category?.name || board.category}</Link></dd></div><div><dt>Year</dt><dd><Link href={`/boards?year=${board.year}`}>{board.year}</Link></dd></div><div><dt>Designer</dt><dd>{board.designer?.join(", ") || "Not recorded"}</dd></div>{board.revision && <div><dt>Revision</dt><dd>{board.revision}</dd></div>}</dl>{Boolean(board.tags?.length) && <div className="tag-list">{board.tags?.map(tag => <Link className="tag" key={tag} href={`/boards?q=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>}</header>
    {board.demo && <p className="notice"><strong>Demonstration content only.</strong> Illustrations and files are placeholders, not engineering drawings, physical-board photographs, or manufacturing instructions.</p>}
    {user && managed && can(user.role,"edit") && <Link className="button" href={`/admin/boards/${managed.key}/edit`}>Edit PCB</Link>}
    <div className="detail-layout"><aside className="section-nav"><p className="eyebrow">On this page</p><nav aria-label="Board sections">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><Link className="back-link" href="/boards">← All boards</Link></aside><div className="detail-content">
      <section className="detail-section" id="schematic"><h2>Schematic</h2>{board.schematic?.pdf ? <PdfPreview src={board.schematic.pdf} label="Schematic PDF" /> : <p className="missing">Preview not available</p>}</section>
      <section className="detail-section" id="model"><h2>3D Render</h2><BoardMedia label="3D Render" assets={renderAssets(board).map(src=>({src}))} /></section>
      <section className="detail-section" id="photos"><h2>Physical Board</h2><BoardMedia label="Physical Board" assets={board.photos || []} /></section>
      <section className="detail-section" id="specifications"><h2>Technical specifications</h2><TechnicalSpecs specifications={board.specifications} />{board.notes && <div className="board-notes"><h3>Notes</h3><p>{board.notes}</p></div>}</section>
      <section className="detail-section" id="downloads"><h2>Downloads</h2><DownloadList downloads={downloads} /></section>
      {(board.createdAt || board.updatedAt) && <p className="record-dates muted">{board.createdAt && `Added ${board.createdAt}`}{board.createdAt && board.updatedAt && " · "}{board.updatedAt && `Updated ${board.updatedAt}`}</p>}
    </div></div>
  </>;
}
