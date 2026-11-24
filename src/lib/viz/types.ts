export type Primitive = number | string | boolean | null;

export type Tone = "active" | "compare" | "found" | "muted" | "error" | "visited";

export type Pointer = {
  name: string;
  index: number;
  tone?: Tone;
};

export type ArrayViz = {
  kind: "array";
  id: string;
  label: string;
  values: Primitive[];
  pointers?: Pointer[];
  tones?: Record<number, Tone>;
  display?: "boxes" | "bars";
  /** Extra shading between two indices, e.g. the area of a container. */
  span?: { from: number; to: number; height?: number; tone?: Tone };
};

export type MapViz = {
  kind: "map";
  id: string;
  label: string;
  entries: [Primitive, Primitive][];
  tones?: Record<string, Tone>;
};

export type StackViz = {
  kind: "stack";
  id: string;
  label: string;
  items: Primitive[];
  topTone?: Tone;
};

export type GridViz = {
  kind: "grid";
  id: string;
  label: string;
  cells: Primitive[][];
  tones?: Record<string, Tone>;
  cursor?: { r: number; c: number };
};

export type VarsViz = {
  kind: "vars";
  id: string;
  label: string;
  vars: Record<string, Primitive>;
  changed?: string[];
};

export type Viz = ArrayViz | MapViz | StackViz | GridViz | VarsViz;

export type Frame = {
  /** 1-based line in the problem's solution code. */
  line: number;
  message: string;
  structures: Viz[];
  done?: boolean;
};

export type InputField = {
  name: string;
  label: string;
  /** "json" values are parsed with JSON.parse; "string" values are used as-is. */
  type: "json" | "string";
  placeholder?: string;
};

export type InputValues = Record<string, string>;

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Problem = {
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  url: string;
  pattern: string;
  tags: string[];
  description: string[];
  /** `explanation` is shown preformatted, so aligned diagrams keep their spacing. */
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
  keyIdeas: string[];
  complexity: { time: string; space: string };
  language: string;
  code: string;
  inputs: InputField[];
  presets: { label: string; values: InputValues }[];
  /** Throws an Error with a readable message when the input is invalid. */
  trace: (input: Record<string, unknown>) => Frame[];
};
