import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className, size = "sm" }: PremiumBadgeProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/20 text-success font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        className
      )}
    >
      <Crown className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      Premium
    </span>
  );
}
