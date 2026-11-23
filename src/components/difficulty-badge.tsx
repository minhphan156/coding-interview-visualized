import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/viz/types";

const styles: Record<Difficulty, string> = {
  Easy: "bg-emerald-400/15 text-emerald-300",
  Medium: "bg-amber-400/15 text-amber-300",
  Hard: "bg-rose-400/15 text-rose-300",
};

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return <Badge className={cn(styles[difficulty], className)}>{difficulty}</Badge>;
}
