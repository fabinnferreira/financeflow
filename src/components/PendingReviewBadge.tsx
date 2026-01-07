import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePendingReviewCount } from "@/hooks/useTransactions";

export function PendingReviewBadge() {
  const navigate = useNavigate();
  const { data: pendingCount, isLoading } = usePendingReviewCount();

  if (isLoading || !pendingCount || pendingCount === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-warning bg-warning/10 hover:bg-warning/20 text-warning-foreground"
      onClick={() => navigate("/review-transactions")}
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="hidden sm:inline">Revisar</span>
      <Badge variant="destructive" className="ml-1">
        {pendingCount}
      </Badge>
    </Button>
  );
}
