import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrencyValue } from "@/lib/formatters";
import { useGoalsWidget } from "@/hooks/useGoalsWidget";

interface Goal {
  id: number;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  emoji: string;
  color: string;
}

export const GoalsWidget = () => {
  const { data: goals = [], isLoading } = useGoalsWidget();
  const navigate = useNavigate();

  const getProgress = (goal: Goal) => {
    if (goal.target_amount_cents === 0) return 0;
    return Math.min(100, (goal.current_amount_cents / goal.target_amount_cents) * 100);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Metas Financeiras
            </CardTitle>
            <CardDescription>Acompanhe seu progresso</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/goals")} className="gap-1">
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-6">
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Nenhuma meta criada ainda</p>
            <Button size="sm" onClick={() => navigate("/goals")}>
              Criar Meta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = getProgress(goal);
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{goal.emoji}</span>
                      <span className="font-medium truncate max-w-[120px]">{goal.name}</span>
                    </span>
                    <span className="font-medium" style={{ color: goal.color }}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2"
                    style={{ "--progress-color": goal.color } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrencyValue(goal.current_amount_cents / 100)}
                    </span>
                    <span>
                      {formatCurrencyValue(goal.target_amount_cents / 100)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};