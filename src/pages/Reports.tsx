import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, ArrowLeft, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from "@/components/ui/chart";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DynamicBackground from "@/components/DynamicBackground";
import { toast } from "sonner";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface CategoryTotal {
  category_id: number;
  name: string;
  emoji: string;
  color: string;
  total_amount_cents: number;
  amount: number;
}

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [monthsToShow, setMonthsToShow] = useState<string>("6");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [incomeCategoryTotals, setIncomeCategoryTotals] = useState<CategoryTotal[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadReportData();
  }, [monthsToShow]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const months = parseInt(monthsToShow);
      const monthlyResults: MonthlyData[] = [];

      // Fetch data for each month
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const startDate = startOfMonth(monthDate).toISOString();
        const endDate = endOfMonth(monthDate).toISOString();

        const { data: transactions } = await supabase
          .from("transactions")
          .select("type, amount_cents")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate);

        let income = 0;
        let expense = 0;
        transactions?.forEach(t => {
          if (t.type === "income") income += t.amount_cents / 100;
          else expense += t.amount_cents / 100;
        });

        monthlyResults.push({
          month: format(monthDate, "MMM/yy", { locale: ptBR }),
          income,
          expense,
          balance: income - expense
        });
      }

      setMonthlyData(monthlyResults);

      // Fetch category totals for the entire period
      const periodStart = startOfMonth(subMonths(new Date(), parseInt(monthsToShow) - 1)).toISOString();
      const periodEnd = endOfMonth(new Date()).toISOString();

      // Expense categories
      const { data: expenseCategories } = await supabase.rpc('get_category_totals' as any, {
        start_date: periodStart,
        end_date: periodEnd
      }) as any;

      if (expenseCategories) {
        const chartData = expenseCategories.map((item: any) => ({
          ...item,
          amount: item.total_amount_cents / 100
        }));
        setCategoryTotals(chartData);
      }

      // Income categories - manual aggregation
      const { data: incomeTransactions } = await supabase
        .from("transactions")
        .select("amount_cents, categories(id, name, emoji, color)")
        .eq("user_id", user.id)
        .eq("type", "income")
        .gte("date", periodStart)
        .lte("date", periodEnd);

      if (incomeTransactions) {
        const incomeByCategory = incomeTransactions.reduce((acc: any, t: any) => {
          const catId = t.categories.id;
          if (!acc[catId]) {
            acc[catId] = {
              category_id: catId,
              name: t.categories.name,
              emoji: t.categories.emoji,
              color: t.categories.color || "#10b981",
              amount: 0
            };
          }
          acc[catId].amount += t.amount_cents / 100;
          return acc;
        }, {});
        setIncomeCategoryTotals(Object.values(incomeByCategory));
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading report:", error);
      toast.error("Erro ao carregar relatórios");
      setLoading(false);
    }
  };

  const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expense, 0);
  const totalBalance = totalIncome - totalExpenses;
  const avgMonthlyIncome = totalIncome / monthlyData.length || 0;
  const avgMonthlyExpense = totalExpenses / monthlyData.length || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 relative">
        <DynamicBackground />
        <div className="max-w-7xl mx-auto relative z-10 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative p-8">
      <DynamicBackground />
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold">Relatórios</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Período:</span>
            <Select value={monthsToShow} onValueChange={setMonthsToShow}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">Média: {formatCurrency(avgMonthlyIncome)}/mês</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Média: {formatCurrency(avgMonthlyExpense)}/mês</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balanço Total</CardTitle>
              {totalBalance >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalBalance >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}% gasto` : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Poupança</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalIncome > 0 ? `${Math.round((totalBalance / totalIncome) * 100)}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">do total de receitas</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Comparison Chart */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Comparativo Mensal</CardTitle>
            <CardDescription>Evolução de receitas e despesas ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                income: { label: "Receitas", color: "hsl(var(--success))" },
                expense: { label: "Despesas", color: "hsl(var(--destructive))" },
                balance: { label: "Balanço", color: "hsl(var(--primary))" }
              } as ChartConfig}
              className="h-[350px]"
            >
              <BarChart data={monthlyData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Balance Evolution */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Evolução do Balanço</CardTitle>
            <CardDescription>Diferença entre receitas e despesas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                balance: { label: "Balanço", color: "hsl(var(--primary))" }
              } as ChartConfig}
              className="h-[300px]"
            >
              <AreaChart data={monthlyData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  fill="var(--color-balance)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
              <CardDescription>Distribuição dos seus gastos no período</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryTotals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma despesa registrada
                </div>
              ) : (
                <ChartContainer
                  config={categoryTotals.reduce((acc, item) => {
                    acc[item.name] = { label: `${item.emoji} ${item.name}`, color: item.color };
                    return acc;
                  }, {} as ChartConfig)}
                  className="h-[300px]"
                >
                  <PieChart>
                    <Pie data={categoryTotals} dataKey="amount" nameKey="name" innerRadius={60}>
                      {categoryTotals.map((item, index) => (
                        <Cell key={`cell-${index}`} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Legend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Receitas por Categoria</CardTitle>
              <CardDescription>Distribuição das suas receitas no período</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeCategoryTotals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma receita registrada
                </div>
              ) : (
                <ChartContainer
                  config={incomeCategoryTotals.reduce((acc, item) => {
                    acc[item.name] = { label: `${item.emoji} ${item.name}`, color: item.color };
                    return acc;
                  }, {} as ChartConfig)}
                  className="h-[300px]"
                >
                  <PieChart>
                    <Pie data={incomeCategoryTotals} dataKey="amount" nameKey="name" innerRadius={60}>
                      {incomeCategoryTotals.map((item, index) => (
                        <Cell key={`cell-${index}`} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Legend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Expense Categories Table */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Top Categorias de Despesa</CardTitle>
            <CardDescription>Ranking das maiores categorias de gasto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryTotals.slice(0, 5).map((cat, index) => (
                <div key={cat.category_id} className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground w-8">{index + 1}</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{cat.emoji} {cat.name}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(cat.amount / totalExpenses) * 100}%`,
                          backgroundColor: cat.color
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(cat.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {((cat.amount / totalExpenses) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
              {categoryTotals.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma categoria encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
