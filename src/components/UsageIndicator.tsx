import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UsageIndicatorProps {
  current: number;
  max: number;
  label: string;
  className?: string;
}

export function UsageIndicator({ current, max, label, className }: UsageIndicatorProps) {
  const percentage = max === Infinity ? 0 : Math.min((current / max) * 100, 100);
  const isAtLimit = current >= max && max !== Infinity;
  const isNearLimit = percentage >= 66 && !isAtLimit;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isAtLimit && "text-destructive",
          isNearLimit && "text-warning",
        )}>
          {current}/{max === Infinity ? "∞" : max}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isAtLimit && "[&>div]:bg-destructive",
          isNearLimit && "[&>div]:bg-warning",
        )}
      />
    </div>
  );
}
