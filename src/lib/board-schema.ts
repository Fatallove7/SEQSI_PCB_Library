import { z } from "zod";
import { boardCategories } from "../data/categories";

const text = z.string().trim().min(1, "Must not be empty");
const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a valid calendar date in YYYY-MM-DD format");

const imageExtensions = ["png", "jpg", "jpeg", "webp", "svg", "avif", "gif"];
function assetPath(extensions?: string[]) {
  return z.string().refine((value) => {
    if (!value.startsWith("/pcb/")) return false;
    const segments = value.slice(5).split("/");
    if (!segments.every((segment) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment))) return false;
    if (!extensions) return true;
    const extension = value.split(".").pop()?.toLowerCase();
    return extension !== undefined && extensions.includes(extension);
  }, `Expected a local /pcb/ path without traversal, query, or fragment${extensions ? `; allowed formats: ${extensions.join(", ")}` : ""}`);
}

const imagePath = assetPath(imageExtensions);
const image = z.object({
  src: imagePath,
  caption: text.optional(),
  alt: text.optional(),
  photographer: text.optional(),
  date: date.optional(),
});

// Unknown extension fields are accepted; known fields are validated and returned.
export const boardSchema = z.object({
  id: text,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens"),
  title: text,
  year: z.number().int().min(1900).max(9999),
  category: text.refine((value) => boardCategories.some((category) => category.id === value), "Unknown category; check src/data/categories.ts"),
  description: text,
  designer: z.array(text).optional(),
  revision: text.optional(),
  status: z.enum(["design", "fabrication", "assembled", "tested", "deprecated"]).optional(),
  tags: z.array(text).optional(),
  thumbnail: imagePath.optional(),
  specifications: z.record(z.string(), z.union([text, z.number()])).optional(),
  schematic: z.object({ images: z.array(imagePath).optional(), pdf: assetPath(["pdf"]).optional() }).optional(),
  layout: z.array(image).optional(),
  model3d: z.object({
    model: assetPath(["glb", "gltf"]).optional(),
    preview: imagePath.optional(),
    renders: z.array(imagePath).optional(),
  }).optional(),
  photos: z.array(image).optional(),
  downloads: z.array(z.object({ label: text, file: assetPath() })).optional(),
  notes: z.string().optional(),
  createdAt: date.optional(),
  updatedAt: date.optional(),
  demo: z.boolean().optional(),
});

