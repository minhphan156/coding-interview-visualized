import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { getProblem } from "@/problems";

// Gitignored: progress stays on this machine and is never pushed.
const PROGRESS_FILE = path.join(process.cwd(), "progress.json");

/** Problem slug → when it was marked done, in ms since the epoch. Unknown slugs and bad dates are dropped. */
function sanitize(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const done: Record<string, number> = {};
  for (const [slug, at] of Object.entries(value)) {
    const ms = typeof at === "number" ? at : typeof at === "string" ? Date.parse(at) : NaN;
    if (getProblem(slug) && Number.isFinite(ms)) done[slug] = ms;
  }
  return done;
}

export async function GET() {
  await connection();
  try {
    return Response.json({ done: sanitize(JSON.parse(await readFile(PROGRESS_FILE, "utf8"))) });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return Response.json({ done: {} });
    return Response.json({ error: "Couldn't read progress.json." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  let done: Record<string, number>;
  try {
    done = sanitize(await req.json());
  } catch {
    return Response.json({ error: "Expected a JSON object of problem slugs to timestamps." }, { status: 400 });
  }
  const readable = Object.fromEntries(
    Object.entries(done)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slug, ms]) => [slug, new Date(ms).toISOString()]),
  );
  try {
    const tmp = `${PROGRESS_FILE}.tmp`;
    await writeFile(tmp, `${JSON.stringify(readable, null, 2)}\n`, "utf8");
    await rename(tmp, PROGRESS_FILE);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't write progress.json." }, { status: 500 });
  }
}
