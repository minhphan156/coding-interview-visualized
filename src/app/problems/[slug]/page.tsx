import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Visualizer } from "@/components/visualizer";
import { getProblem, problems } from "@/problems";

type Params = PageProps<"/problems/[slug]">["params"];

export function generateStaticParams() {
  return problems.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/problems/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const problem = getProblem(slug);
  return { title: problem ? `${problem.number}. ${problem.title} · LeetCode Visualization` : "Not found" };
}

async function ProblemContent({ params }: { params: Params }) {
  const { slug } = await params;
  if (!getProblem(slug)) notFound();
  return <Visualizer slug={slug} />;
}

function ProblemSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6" aria-busy="true">
      <div className="h-8 w-72 animate-pulse rounded-lg bg-muted/60" />
      <div className="h-5 w-56 animate-pulse rounded-lg bg-muted/40" />
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-h-[420px] animate-pulse rounded-xl border border-border bg-card/40" />
        <div className="hidden animate-pulse rounded-xl border border-border bg-card/40 lg:block" />
      </div>
      <span className="sr-only">Loading problem…</span>
    </div>
  );
}

export default function ProblemPage({ params }: PageProps<"/problems/[slug]">) {
  return (
    <Suspense fallback={<ProblemSkeleton />}>
      <ProblemContent params={params} />
    </Suspense>
  );
}
