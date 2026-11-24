# LeetCode Visualization

Animated, line-by-line walkthroughs of LeetCode solutions, built for learning and memorization.

Each problem page shows:

- **The animation**: arrays with moving pointers, bar charts, hash maps, stacks, grids and variables, updated at every step of the solution.
- **The code**, with the line that is currently executing highlighted.
- **A plain-English message** for every step that explains what just happened and why.
- **Playback controls**: play/pause, step forward and back, a scrubber, and speeds from 0.5× to 4×. Keyboard: `space` plays or pauses, `←` and `→` step, and `r` toggles recall mode.
- **Recall mode**: code lines stay blurred until the walkthrough reaches them, so you can practise saying the next line from memory.
- **A study guide** for each problem: WHY it exists, WHAT it asks, HOW to solve it (with the code), its COMPLEXITY, and the PITFALL to avoid.
- **Custom input**: try your own test cases or one of the presets.
- **Notes**: a Notes tab per problem for your own notes. They save as you type to `notes/<problem>.md` in the project folder, so you can commit them with the rest of the repo.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:4317.

Other scripts: `npm run build`, `npm start` (serves the production build on port 4317) and `npm run lint`.

## Adding a problem

Each problem is one file in `src/problems/`, registered in `src/problems/index.ts`.

A problem (the `Problem` type in `src/lib/viz/types.ts`) contains:

- metadata: `number`, `title`, `difficulty`, `pattern`, `tags`, `url` (the LeetCode link), `description`, and optionally `examples` and `constraints` (the full statement as pasted)
- `keyIdeas` (the general idea, step by step), `guide` (why, what, how and pitfalls) and `complexity`, all shown on the Guide tab
- `code`, the solution exactly as you want to learn it (Python or TypeScript)
- `inputs` and `presets`, the editable test cases
- `trace(input)`, which re-implements the solution and records a `Frame` at each step. A frame holds the 1-based code line, a message, and a snapshot of the data structures to draw (`array`, `map`, `stack`, `grid` or `vars`).

`src/problems/merge-strings-alternately.ts` is a short example to copy from.

## Tech

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and Motion for the animations.
