import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, TrendingUp, LogOut, Calendar, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TransactionDialog } from "@/components/TransactionDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { GoalsWidget } from "@/components/GoalsWidget";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from "@/components/ui/chart";
import { startOfMonth, endOfMonth } from "date-fns";
import DynamicBackground from "@/components/DynamicBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { DashboardNav } from "@/components/DashboardNav";
import { PendingReviewBadge } from "@/components/PendingReviewBadge";
import { useDashboard, PeriodFilter } from "@/hooks/useDashboard";
import { useQueryClient } from "@tanstack/react-query";

const Dashboard = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfMonth(new Date()));
  const [customEndDate, setCustomEndDate] = useState<Date>(endOfMonth(new Date()));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useDashboard(
    periodFilter,
    periodFilter === "custom" ? customStartDate : undefined,
    periodFilter === "custom" ? customEndDate : undefined
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case "week": return "Esta Semana";
      case "month": return "Este Mês";
      case "quarter": return "Último Trimestre";
      case "year": return "Este Ano";
      case "custom": return "Período Personalizado";
      default: return "Este Mês";
    }
  };

  const handleTransactionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-infinite"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/20">
        <header className="bg-gradient-primary text-primary-foreground py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32 bg-transparent" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    navigate("/auth");
    return null;
  }

  const { userName, balance, income, expenses, categoryTotals, dailyTotals } = data!;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground />

      <div className="relative z-10">
        <header className="backdrop-blur-lg text-primary-foreground py-4 md:py-6 shadow-lg bg-[#1e232d]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-50 truncate">FinanceFlow</h1>
                <p className="text-sm text-[#1cbb56] truncate">Olá, {userName}! 👋</p>
              </div>
              
              <div className="flex items-center gap-2">
                <PendingReviewBadge />
                
                <DashboardNav 
                  onNewTransaction={() => setDialogOpen(true)} 
                  onSignOut={handleSignOut} 
                />
                
                <NotificationCenter />
                <ThemeToggle />
                
                {/* Desktop only settings/logout */}
                <div className="hidden lg:flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={() => navigate("/settings")} title="Configurações">
                    <Settings className="w-5 h-5" />
                  </Button>
                  
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={handleSignOut} title="Sair">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Date Filter */}
          <Card className="mb-6 animate-fade-in">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">Filtrar por período:</span>
                </div>
                <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="quarter">Último Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {periodFilter === "custom" && (
                  <DateRangePicker
                    startDate={customStartDate}
                    endDate={customEndDate}
                    onStartDateChange={setCustomStartDate}
                    onEndDateChange={setCustomEndDate}
                  />
                )}
              </div>
            </CardContent>
          </Card>

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
                  R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Atualizado agora
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-2 border-success/20 shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receitas - {getPeriodLabel()}
                </CardTitle>
                <ArrowUpRight className="w-5 h-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {getPeriodLabel()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-2 border-destructive/20 shadow-lg animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas - {getPeriodLabel()}
                </CardTitle>
                <ArrowDownRight className="w-5 h-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {income > 0 ? `${Math.round(expenses / income * 100)}% da receita` : getPeriodLabel()}
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
                <CardDescription>Receitas e despesas - {getPeriodLabel()}</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyTotals.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma movimentação neste período</p>
                  </div>
                ) : (
                  <ChartContainer config={{
                    income: { label: "Receitas", color: "hsl(var(--success))" },
                    expense: { label: "Despesas", color: "hsl(var(--destructive))" }
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
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card className="shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Despesas por Categoria
                </CardTitle>
                <CardDescription>Distribuição dos seus gastos - {getPeriodLabel()}</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryTotals.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma despesa registrada neste período</p>
                  </div>
                ) : (
                  <>
                    <ChartContainer config={categoryTotals.reduce((acc, item) => {
                      acc[item.name] = { label: `${item.emoji} ${item.name}`, color: item.color };
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
                        R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Goals Widget */}
          <div className="mt-8">
            <GoalsWidget />
          </div>
        </div>

        <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleTransactionSuccess} />
      </div>
    </div>
  );
};

export default Dashboard;
