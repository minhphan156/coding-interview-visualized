import "katex/dist/katex.min.css";
import Markdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

const CODE = /(```[\s\S]*?```|`[^`\n]*`)/;

/** remark-math only understands $…$ and $$…$$; notes pasted from chat often use \(…\) and \[…\]. */
function normalizeMath(text: string): string {
  return text
    .split(CODE)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/\\\[([\s\S]*?)\\\]/g, (_, tex: string) => `\n$$\n${tex.trim()}\n$$\n`)
            .replace(/\\\(([\s\S]*?)\\\)/g, (_, tex: string) => `$${tex.trim()}$`),
    )
    .join("");
}

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("markdown", className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {normalizeMath(children)}
      </Markdown>
    </div>
  );
}
