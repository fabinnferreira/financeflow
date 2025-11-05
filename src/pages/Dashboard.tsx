import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, TrendingUp, Plus, LogOut, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { TransactionDialog } from "@/components/TransactionDialog";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from "@/components/ui/chart";
import { startOfMonth, endOfMonth } from "date-fns";
import DynamicBackground from "@/components/DynamicBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
interface CategoryTotal {
  category_id: number;
  name: string;
  emoji: string;
  color: string;
  total_amount_cents: number;
  amount: number;
}
const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [dailyTotals, setDailyTotals] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    loadDashboardData();
  }, []);
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get user info
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user profile
      const {
        data: profile
      } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      setUserName(profile?.name || user.email?.split("@")[0] || "Usuário");

      // Get current month start and end dates
      const now = new Date();
      const startDate = startOfMonth(now).toISOString();
      const endDate = endOfMonth(now).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get transactions for current month
      const {
        data: transactions,
        error: transError
      } = await supabase.from("transactions").select(`
          *,
          categories (
            name,
            emoji,
            color
          )
        `).eq("user_id", user.id).gte("date", monthStart.toISOString()).lte("date", monthEnd.toISOString()).order("date", {
        ascending: false
      });
      if (transError) throw transError;

      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;
      transactions?.forEach(transaction => {
        const amount = transaction.amount_cents / 100;
        if (transaction.type === "income") {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
      });
      setIncome(totalIncome);
      setExpenses(totalExpenses);

      // Get category totals from RPC
      const {
        data: categoryData,
        error: categoryError
      } = (await supabase.rpc('get_category_totals' as any, {
        start_date: startDate,
        end_date: endDate
      })) as any;
      if (categoryError) {
        console.error("Error fetching category totals:", categoryError);
      } else if (categoryData) {
        const chartData = categoryData.map((item: any) => ({
          ...item,
          amount: item.total_amount_cents / 100
        }));
        setCategoryTotals(chartData);
      }

      // Get daily totals from RPC
      const {
        data: dailyData,
        error: dailyError
      } = (await supabase.rpc('get_daily_totals' as any, {
        start_date: startDate,
        end_date: endDate
      })) as any;
      if (dailyError) {
        console.error("Error fetching daily totals:", dailyError);
      } else if (dailyData) {
        const dailyChartData = dailyData.map((item: any) => ({
          ...item,
          income: item.income / 100,
          expense: item.expense / 100
        }));
        setDailyTotals(dailyChartData);
      }

      // Get account balances
      const {
        data: accounts,
        error: accountsError
      } = await supabase.from("accounts").select("balance_cents").eq("user_id", user.id);
      if (accountsError) throw accountsError;
      const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance_cents, 0) || 0;
      setBalance(totalBalance / 100);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  if (loading) {
    return <div className="min-h-screen bg-secondary/20">
        <header className="bg-gradient-primary text-primary-foreground py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-lg text-primary-foreground py-6 shadow-lg rounded-xl bg-[#0000ff]/[0.78]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">FinanceFlow</h1>
              <p className="text-sm text-primary-foreground/80">Olá, {userName}! 👋</p>
            </div>
            
            <div className="flex gap-3 bg-transparent rounded-lg">
              <Button variant="outline" size="lg" onClick={() => navigate("/transactions")} className="gap-2 border-primary-foreground/30 hover:bg-primary-foreground/20 text-[#17ab4e] font-extralight">
                <CreditCard className="w-5 h-5" />
                Transações
              </Button>
              
              <Button variant="outline" size="lg" onClick={() => navigate("/categories")} className="gap-2 border-primary-foreground/30 hover:bg-primary-foreground/20 text-[#17ab4e] font-extralight">
                <FolderKanban className="w-5 h-5" />
                Categorias
              </Button>
              
              <Button variant="outline" size="lg" onClick={() => navigate("/accounts")} className="gap-2 border-primary-foreground/30 hover:bg-primary-foreground/20 text-base text-[#18af50]">
                <Wallet className="w-5 h-5" />
                Contas
              </Button>
              
              <Button variant="success" size="lg" className="gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="w-5 h-5" />
                Nova Transação
              </Button>
              
              <ThemeToggle />
              
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={handleSignOut} title="Sair">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-2 border-primary/20 shadow-lg animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <Wallet className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                R$ {balance.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Atualizado agora
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-2 border-success/20 shadow-lg animate-slide-up" style={{
            animationDelay: '0.1s'
          }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <ArrowUpRight className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {income.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
              </div>
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-2 border-destructive/20 shadow-lg animate-slide-up" style={{
            animationDelay: '0.2s'
          }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {expenses.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {income > 0 ? `${Math.round(expenses / income * 100)}% da receita` : "Este mês"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Daily Movements */}
          <Card className="shadow-lg animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Movimentações Diárias
              </CardTitle>
              <CardDescription>Receitas e despesas nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyTotals.length === 0 ? <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhuma movimentação este mês</p>
                </div> : <ChartContainer config={{
                income: {
                  label: "Receitas",
                  color: "hsl(var(--success))"
                },
                expense: {
                  label: "Despesas",
                  color: "hsl(var(--destructive))"
                }
              } as ChartConfig} className="h-[300px]">
                  <BarChart data={dailyTotals}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                  </BarChart>
                </ChartContainer>}
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card className="shadow-lg animate-slide-up" style={{
            animationDelay: '0.1s'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Despesas por Categoria
              </CardTitle>
              <CardDescription>Distribuição dos seus gastos este mês</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryTotals.length === 0 ? <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhuma despesa registrada este mês</p>
                </div> : <>
                  <ChartContainer config={categoryTotals.reduce((acc, item) => {
                  acc[item.name] = {
                    label: `${item.emoji} ${item.name}`,
                    color: item.color
                  };
                  return acc;
                }, {} as ChartConfig)} className="h-[300px]">
                    <PieChart>
                      <Pie data={categoryTotals} dataKey="amount" nameKey="name" innerRadius={60}>
                        {categoryTotals.map((item, index) => <Cell key={`cell-${index}`} fill={item.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent hideLabel />} />
                      <Legend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>

                  <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Total de Despesas</p>
                    <p className="text-2xl font-bold text-destructive">
                      R$ {expenses.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                    </p>
                  </div>
                </>}
            </CardContent>
          </Card>
        </div>
      </div>

        <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={loadDashboardData} />
      </div>
    </div>;
};
export default Dashboard;