import type { Frame, Viz } from "./types";

export const MAX_FRAMES = 2000;

export class Tracer {
  frames: Frame[] = [];

  step(line: number, message: string, structures: Viz[], done = false) {
    if (this.frames.length >= MAX_FRAMES) {
      throw new Error(
        `This input produces more than ${MAX_FRAMES} steps. Try a smaller input.`,
      );
    }
    this.frames.push({ line, message, structures: structuredClone(structures), done });
  }
}

export function expectIntArray(value: unknown, name: string, max = 40): number[] {
  if (!Array.isArray(value) || !value.every((v) => Number.isInteger(v))) {
    throw new Error(`${name} must be an array of integers, e.g. [2,7,11,15].`);
  }
  if (value.length === 0) throw new Error(`${name} must not be empty.`);
  if (value.length > max) throw new Error(`${name} can have at most ${max} items here.`);
  return value as number[];
}

export function expectInt(value: unknown, name: string): number {
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  return value as number;
}

export function expectString(value: unknown, name: string, max = 60): string {
  if (typeof value !== "string") throw new Error(`${name} must be text.`);
  if (value.length > max) throw new Error(`${name} can have at most ${max} characters here.`);
  return value;
}

export function expectCharGrid(value: unknown, name: string, max = 12): string[][] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((row) => Array.isArray(row) && row.every((c) => typeof c === "string"))
  ) {
    throw new Error(`${name} must be a 2D array of strings, e.g. [["1","0"],["0","1"]].`);
  }
  const rows = value as string[][];
  const width = rows[0].length;
  if (width === 0 || !rows.every((r) => r.length === width)) {
    throw new Error(`Every row of ${name} must have the same, non-zero length.`);
  }
  if (rows.length > max || width > max) {
    throw new Error(`${name} can be at most ${max}×${max} here.`);
  }
  return rows;
}
