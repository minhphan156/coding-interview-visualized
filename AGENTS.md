<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Workflow

1. Update the code locally.
2. Check the change in the browser at http://localhost:4317. The dev server (`npm run dev`) reloads on save; make sure the page shows the latest version.
3. Run `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` and `npx eslint`. Both must pass.
4. Commit and push to `main` on GitHub (`git push origin main`).

A problem that copies a solution from elsewhere (for example `src/problems/rate-limiter.ts`, which embeds `~/code.ts`) must keep the copy identical to the source.
