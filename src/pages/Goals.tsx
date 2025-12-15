import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Target, Plus, ArrowLeft, Trash2, Edit2, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { goalSchema, GoalFormData } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import DynamicBackground from "@/components/DynamicBackground";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Goal {
  id: number;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  deadline: string | null;
  emoji: string;
  color: string;
}

const EMOJI_OPTIONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "👗", "🎓", "💍", "🎁", "💰", "🏦"];
const COLOR_OPTIONS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      target_amount: "",
      current_amount: "0",
      deadline: "",
      emoji: "🎯",
      color: "#3b82f6",
    },
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar metas", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: GoalFormData) => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const goalData = {
        name: data.name,
        target_amount_cents: Math.round(parseFloat(data.target_amount) * 100),
        current_amount_cents: Math.round(parseFloat(data.current_amount) * 100),
        deadline: data.deadline || null,
        emoji: data.emoji,
        color: data.color,
        user_id: user.id,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("financial_goals")
          .update(goalData)
          .eq("id", editingGoal.id);
        if (error) throw error;
        toast.success("Meta atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("financial_goals")
          .insert([goalData]);
        if (error) throw error;
        toast.success("Meta criada com sucesso!");
      }

      setDialogOpen(false);
      setEditingGoal(null);
      form.reset();
      loadGoals();
    } catch (error: any) {
      toast.error("Erro ao salvar meta", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    form.reset({
      name: goal.name,
      target_amount: (goal.target_amount_cents / 100).toString(),
      current_amount: (goal.current_amount_cents / 100).toString(),
      deadline: goal.deadline || "",
      emoji: goal.emoji,
      color: goal.color,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("financial_goals").delete().eq("id", id);
      if (error) throw error;
      toast.success("Meta excluída com sucesso!");
      loadGoals();
    } catch (error: any) {
      toast.error("Erro ao excluir meta", { description: error.message });
    }
  };

  const handleAddDeposit = async (goal: Goal, amount: number) => {
    try {
      const newAmount = goal.current_amount_cents + Math.round(amount * 100);
      const { error } = await supabase
        .from("financial_goals")
        .update({ current_amount_cents: newAmount })
        .eq("id", goal.id);
      if (error) throw error;
      toast.success(`R$ ${amount.toFixed(2)} adicionado à meta!`);
      loadGoals();
    } catch (error: any) {
      toast.error("Erro ao adicionar depósito", { description: error.message });
    }
  };

  const getProgress = (goal: Goal) => {
    if (goal.target_amount_cents === 0) return 0;
    return Math.min(100, (goal.current_amount_cents / goal.target_amount_cents) * 100);
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/20 p-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground />
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Target className="w-8 h-8 text-primary" />
                Metas Financeiras
              </h1>
              <p className="text-muted-foreground">Defina e acompanhe suas metas de economia</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingGoal(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
                <DialogDescription>
                  {editingGoal ? "Atualize as informações da sua meta" : "Crie uma nova meta financeira para acompanhar seu progresso"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Meta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Viagem de férias" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da Meta (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="5000.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="current_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Atual (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo (opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emoji"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emoji</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => field.onChange(emoji)}
                                className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                                  field.value === emoji ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  field.value === color ? "border-foreground scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingGoal ? "Salvar Alterações" : "Criar Meta"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma meta criada</h3>
              <p className="text-muted-foreground mb-4">
                Comece a definir suas metas financeiras para acompanhar seu progresso
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = getProgress(goal);
              const daysRemaining = getDaysRemaining(goal.deadline);
              const isCompleted = progress >= 100;

              return (
                <Card key={goal.id} className="relative overflow-hidden animate-fade-in">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: goal.color }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{goal.emoji}</span>
                        <div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                          {goal.deadline && (
                            <CardDescription className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {daysRemaining !== null && daysRemaining >= 0 ? (
                                <span>{daysRemaining} dias restantes</span>
                              ) : daysRemaining !== null ? (
                                <span className="text-destructive">Prazo expirado</span>
                              ) : null}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A meta "{goal.name}" será permanentemente excluída.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(goal.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium" style={{ color: goal.color }}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={progress}
                        className="h-3"
                        style={{ "--progress-color": goal.color } as React.CSSProperties}
                      />
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-bold" style={{ color: goal.color }}>
                          R$ {(goal.current_amount_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          de R$ {(goal.target_amount_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {!isCompleted && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Plus className="w-4 h-4 mr-1" />
                              Depositar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Depósito</DialogTitle>
                              <DialogDescription>
                                Adicione um valor à meta "{goal.name}"
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const amount = parseFloat(formData.get("amount") as string);
                                if (amount > 0) {
                                  handleAddDeposit(goal, amount);
                                }
                              }}
                              className="space-y-4"
                            >
                              <div>
                                <Label htmlFor="amount">Valor (R$)</Label>
                                <Input
                                  id="amount"
                                  name="amount"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  placeholder="100.00"
                                  required
                                />
                              </div>
                              <DialogFooter>
                                <Button type="submit">Adicionar</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {isCompleted && (
                        <span className="text-success font-semibold text-sm">✓ Concluída!</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Goals;