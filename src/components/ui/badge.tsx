import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-stone-200 text-stone-800",
        tone === "accent" && "bg-amber-200 text-amber-900",
        tone === "success" && "bg-emerald-200 text-emerald-900",
        tone === "warning" && "bg-rose-200 text-rose-900",
      )}
    >
      {children}
    </span>
  );
}
