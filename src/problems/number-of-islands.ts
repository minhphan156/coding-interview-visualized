import { Tracer, expectCharGrid } from "@/lib/viz/tracer";
import type { Problem, Tone, Viz } from "@/lib/viz/types";

const code = `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0

        def dfs(r, c):
            if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != "1":
                return
            grid[r][c] = "#"
            dfs(r + 1, c)
            dfs(r - 1, c)
            dfs(r, c + 1)
            dfs(r, c - 1)

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    count += 1
                    dfs(r, c)
        return count`;

const directions: { dr: number; dc: number; line: number; name: string }[] = [
  { dr: 1, dc: 0, line: 10, name: "down" },
  { dr: -1, dc: 0, line: 11, name: "up" },
  { dr: 0, dc: 1, line: 12, name: "right" },
  { dr: 0, dc: -1, line: 13, name: "left" },
];

export const numberOfIslands: Problem = {
  slug: "number-of-islands",
  number: 200,
  title: "Number of Islands",
  difficulty: "Medium",
  pattern: "Grid DFS flood fill",
  tags: ["Matrix", "Depth-First Search", "Union Find"],
  description: [
    'Given an m × n grid of "1" (land) and "0" (water), return the number of islands.',
    "An island is land connected horizontally or vertically and surrounded by water. Everything outside the grid counts as water.",
  ],
  keyIdeas: [
    "Scan every cell. Each time you hit unvisited land, you've found a new island, so count it.",
    "Immediately flood-fill (DFS) that island, marking every connected land cell as visited ('#').",
    "Marked cells are never counted again, so each island is counted exactly once.",
    "The DFS stops at edges, water, and already-visited cells.",
  ],
  complexity: { time: "O(m · n)", space: "O(m · n) recursion in the worst case" },
  language: "python",
  code,
  inputs: [
    {
      name: "grid",
      label: "grid",
      type: "json",
      placeholder: '[["1","1","0"],["0","1","0"],["0","0","1"]]',
    },
  ],
  presets: [
    {
      label: "Three islands",
      values: {
        grid: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
      },
    },
    {
      label: "Snake",
      values: { grid: '[["1","1","1","0"],["0","0","1","0"],["1","1","1","0"],["1","0","0","1"]]' },
    },
    { label: "All water", values: { grid: '[["0","0"],["0","0"]]' } },
  ],
  trace(input) {
    const original = expectCharGrid(input.grid, "grid", 8);
    if (original.flat().some((c) => c !== "0" && c !== "1")) {
      throw new Error('grid may only contain "0" and "1".');
    }
    const grid: string[][] = original.map((r) => [...r]);
    const rows = grid.length;
    const cols = grid[0].length;
    const t = new Tracer();
    let count = 0;
    const calls: string[] = [];

    const snapshot = (cursor: { r: number; c: number } | undefined, cursorTone: Tone, vars: Record<string, number> = {}, changed: string[] = []): Viz[] => {
      const tones: Record<string, Tone> = {};
      grid.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell === "#") tones[`${r},${c}`] = "visited";
          else if (cell === "0") tones[`${r},${c}`] = "muted";
        }),
      );
      if (cursor) tones[`${cursor.r},${cursor.c}`] = cursorTone;
      return [
        { kind: "grid", id: "grid", label: "grid", cells: grid.map((r) => [...r]), tones, cursor },
        { kind: "stack", id: "calls", label: "call stack", items: [...calls], topTone: calls.length ? "active" : undefined },
        { kind: "vars", id: "vars", label: "variables", vars: { rows, cols, count, ...vars }, changed },
      ];
    };

    const dfs = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return;
      calls.push(`dfs(${r}, ${c})`);
      if (grid[r][c] !== "1") {
        const what = grid[r][c] === "#" ? "already visited" : "water";
        t.step(7, `(${r}, ${c}) is ${what}. Stop here.`, snapshot({ r, c }, "error", { r, c }));
        calls.pop();
        return;
      }
      grid[r][c] = "#";
      t.step(9, `(${r}, ${c}) is land. Mark it '#' so it's never counted again.`, snapshot({ r, c }, "active", { r, c }));
      for (const d of directions) {
        const nr = r + d.dr;
        const nc = c + d.dc;
        const inside = nr >= 0 && nc >= 0 && nr < rows && nc < cols;
        t.step(
          d.line,
          inside ? `From (${r}, ${c}), explore ${d.name} → (${nr}, ${nc}).` : `From (${r}, ${c}), ${d.name} is off the grid, so it returns immediately.`,
          snapshot({ r, c }, "active", { r, c }),
        );
        dfs(nr, nc);
      }
      calls.pop();
    };

    t.step(3, `The grid is ${rows} × ${cols}.`, snapshot(undefined, "active", {}, ["rows", "cols"]));
    t.step(4, "No islands found yet.", snapshot(undefined, "active", {}, ["count"]));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const msg =
          cell === "1" ? `(${r}, ${c}) is unvisited land!` : cell === "#" ? `(${r}, ${c}) already belongs to a counted island.` : `(${r}, ${c}) is water.`;
        t.step(17, msg, snapshot({ r, c }, cell === "1" ? "found" : "compare", { r, c }));
        if (cell === "1") {
          count += 1;
          t.step(18, `That's a new island. count = ${count}.`, snapshot({ r, c }, "found", { r, c }, ["count"]));
          t.step(19, "Flood-fill the whole island from here.", snapshot({ r, c }, "found", { r, c }));
          dfs(r, c);
        }
      }
    }
    t.step(20, `Every cell has been scanned. There ${count === 1 ? "is 1 island" : `are ${count} islands`}.`, snapshot(undefined, "active", {}, ["count"]), true);
    return t.frames;
  },
};
