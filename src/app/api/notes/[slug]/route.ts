import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { getProblem } from "@/problems";

const NOTES_DIR = path.join(process.cwd(), "notes");
const MAX_BYTES = 100_000;

function notePath(slug: string): string | null {
  // Only known problem slugs map to a file, so a request can never address a path outside notes/.
  return getProblem(slug) ? path.join(NOTES_DIR, `${slug}.md`) : null;
}

export async function GET(_req: Request, { params }: RouteContext<"/api/notes/[slug]">) {
  await connection();
  const file = notePath((await params).slug);
  if (!file) return Response.json({ error: "Unknown problem." }, { status: 404 });
  try {
    return Response.json({ content: await readFile(file, "utf8") });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return Response.json({ content: "" });
    return Response.json({ error: "Couldn't read the note file." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext<"/api/notes/[slug]">) {
  const file = notePath((await params).slug);
  if (!file) return Response.json({ error: "Unknown problem." }, { status: 404 });
  const content = await req.text();
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    return Response.json({ error: "Notes are limited to 100 KB per problem." }, { status: 413 });
  }
  try {
    if (content.trim() === "") {
      await rm(file, { force: true });
    } else {
      await mkdir(NOTES_DIR, { recursive: true });
      const tmp = `${file}.tmp`;
      await writeFile(tmp, content, "utf8");
      await rename(tmp, file);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't write the note file." }, { status: 500 });
  }
}
