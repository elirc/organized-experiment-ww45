import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-stone-950 text-stone-50 shadow-[0_10px_30px_-12px_rgba(12,10,9,0.7)] hover:bg-stone-800",
        variant === "secondary" &&
          "border border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50",
        variant === "ghost" && "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        className,
      )}
      {...props}
    />
  );
}
