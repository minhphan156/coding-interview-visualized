import { ProblemLibrary } from "@/components/problem-library";
import { problems } from "@/problems";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-widest text-violet-300 uppercase">Coding Interview Visualized</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Watch each solution run, one line at a time.
        </h1>
        <p className="mt-3 text-muted-foreground text-pretty">
          Step through animated walkthroughs that sync the data structures with the code. Then turn on recall
          mode and try to write the next line from memory.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {problems.length} problem{problems.length === 1 ? "" : "s"} visualized
        </p>
      </div>
      <div className="mt-10">
        <ProblemLibrary />
      </div>
    </main>
  );
}
