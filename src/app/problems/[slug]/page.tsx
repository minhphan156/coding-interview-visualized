import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Visualizer } from "@/components/visualizer";
import { getProblem, problems } from "@/problems";

export function generateStaticParams() {
  return problems.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/problems/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const problem = getProblem(slug);
  return { title: problem ? `${problem.number}. ${problem.title} · LeetCode Visualization` : "Not found" };
}

export default async function ProblemPage({ params }: PageProps<"/problems/[slug]">) {
  const { slug } = await params;
  if (!getProblem(slug)) notFound();
  return <Visualizer slug={slug} />;
}
