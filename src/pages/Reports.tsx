import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3, Download, FileText, FileSpreadsheet, Lock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from "@/components/ui/chart";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DynamicBackground from "@/components/DynamicBackground";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrencyValue } from "@/lib/formatters";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PremiumOverlay } from "@/components/PremiumLock";

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
  const [monthsToShow, setMonthsToShow] = useState<string>("3");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [incomeCategoryTotals, setIncomeCategoryTotals] = useState<CategoryTotal[]>([]);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const navigate = useNavigate();
  const { plan, limits, hasExport, hasAdvancedReports } = usePlan();

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

  const getPeriodLabel = () => {
    switch (monthsToShow) {
      case "3": return "Últimos 3 meses";
      case "6": return "Últimos 6 meses";
      case "12": return "Último ano";
      default: return `Últimos ${monthsToShow} meses`;
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 35, 45);
    doc.text("FinanceFlow", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Relatório Financeiro", 14, 28);
    doc.text(`Período: ${getPeriodLabel()}`, 14, 35);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 42);

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(30, 35, 45);
    doc.text("Resumo Financeiro", 14, 55);
    
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total de Receitas: ${formatCurrencyValue(totalIncome)}`, 14, 65);
    
    doc.setTextColor(239, 68, 68);
    doc.text(`Total de Despesas: ${formatCurrencyValue(totalExpenses)}`, 14, 72);
    
    const balanceColor = totalBalance >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text(`Balanço: ${formatCurrencyValue(totalBalance)}`, 14, 79);

    doc.setTextColor(100);
    doc.text(`Taxa de Poupança: ${totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0}%`, 14, 86);

    // Monthly Data Table
    doc.setFontSize(14);
    doc.setTextColor(30, 35, 45);
    doc.text("Evolução Mensal", 14, 100);

    const monthlyTableData = monthlyData.map((m) => [
      m.month,
      formatCurrencyValue(m.income),
      formatCurrencyValue(m.expense),
      formatCurrencyValue(m.balance)
    ]);

    autoTable(doc, {
      startY: 105,
      head: [["Mês", "Receitas", "Despesas", "Balanço"]],
      body: monthlyTableData,
      theme: "striped",
      headStyles: {
        fillColor: [30, 35, 45],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
    });

    // Category Expenses Table
    if (categoryTotals.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      doc.setFontSize(14);
      doc.setTextColor(30, 35, 45);
      doc.text("Despesas por Categoria", 14, finalY + 15);

      const categoryTableData = categoryTotals.map((cat) => [
        `${cat.emoji} ${cat.name}`,
        formatCurrencyValue(cat.amount),
        `${((cat.amount / totalExpenses) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Categoria", "Valor", "% do Total"]],
        body: categoryTableData,
        theme: "striped",
        headStyles: {
          fillColor: [30, 35, 45],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - FinanceFlow`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save(`relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["FinanceFlow - Relatório Financeiro"],
      [""],
      ["Período", getPeriodLabel()],
      ["Gerado em", new Date().toLocaleDateString("pt-BR")],
      [""],
      ["Resumo Financeiro"],
      ["Total de Receitas", formatCurrencyValue(totalIncome)],
      ["Total de Despesas", formatCurrencyValue(totalExpenses)],
      ["Balanço", formatCurrencyValue(totalBalance)],
      ["Taxa de Poupança", `${totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0}%`],
      ["Média Mensal Receitas", formatCurrencyValue(avgMonthlyIncome)],
      ["Média Mensal Despesas", formatCurrencyValue(avgMonthlyExpense)],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

    // Monthly Data Sheet
    const monthlyHeaders = ["Mês", "Receitas", "Despesas", "Balanço"];
    const monthlyRows = monthlyData.map((m) => [
      m.month,
      m.income.toFixed(2),
      m.expense.toFixed(2),
      m.balance.toFixed(2)
    ]);

    const monthlySheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
    monthlySheet["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Evolução Mensal");

    // Expense Categories Sheet
    if (categoryTotals.length > 0) {
      const expenseHeaders = ["Categoria", "Valor (R$)", "% do Total"];
      const expenseRows = categoryTotals.map((cat) => [
        `${cat.emoji} ${cat.name}`,
        cat.amount.toFixed(2),
        `${((cat.amount / totalExpenses) * 100).toFixed(1)}%`
      ]);

      const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
      expenseSheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, expenseSheet, "Despesas por Categoria");
    }

    // Income Categories Sheet
    if (incomeCategoryTotals.length > 0) {
      const incomeHeaders = ["Categoria", "Valor (R$)", "% do Total"];
      const incomeRows = incomeCategoryTotals.map((cat) => [
        `${cat.emoji} ${cat.name}`,
        cat.amount.toFixed(2),
        `${((cat.amount / totalIncome) * 100).toFixed(1)}%`
      ]);

      const incomeSheet = XLSX.utils.aoa_to_sheet([incomeHeaders, ...incomeRows]);
      incomeSheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, incomeSheet, "Receitas por Categoria");
    }

    XLSX.writeFile(workbook, `relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Relatório Excel exportado com sucesso!");
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

  const handleExportClick = (type: 'pdf' | 'excel') => {
    if (!hasExport) {
      setUpgradeModalOpen(true);
      return;
    }
    if (type === 'pdf') {
      handleExportPDF();
    } else {
      handleExportExcel();
    }
  };

  const handlePeriodChange = (value: string) => {
    // Free users can only see 3 months
    if (plan === "free" && value !== "3") {
      setUpgradeModalOpen(true);
      return;
    }
    setMonthsToShow(value);
  };

  return (
    <div className="min-h-screen relative p-8">
      <DynamicBackground />
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <PageHeader 
          title="Relatórios" 
          showBack 
          backTo="/dashboard"
          actions={
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Período:</span>
              <Select value={monthsToShow} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6" disabled={plan === "free"}>
                    <div className="flex items-center gap-2">
                      Últimos 6 meses
                      {plan === "free" && <Lock className="h-3 w-3" />}
                    </div>
                  </SelectItem>
                  <SelectItem value="12" disabled={plan === "free"}>
                    <div className="flex items-center gap-2">
                      Último ano
                      {plan === "free" && <Lock className="h-3 w-3" />}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {!hasExport && <Lock className="h-4 w-4" />}
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportClick('pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF
                    {!hasExport && <Lock className="h-3 w-3 ml-2" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportClick('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                    {!hasExport && <Lock className="h-3 w-3 ml-2" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <UpgradeModal 
          open={upgradeModalOpen} 
          onOpenChange={setUpgradeModalOpen}
          feature="relatórios avançados e exportação"
        />

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrencyValue(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">Média: {formatCurrencyValue(avgMonthlyIncome)}/mês</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrencyValue(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Média: {formatCurrencyValue(avgMonthlyExpense)}/mês</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balanço Total</CardTitle>
              {totalBalance >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalBalance >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrencyValue(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}% gasto` : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Poupança</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">do total de receitas</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Bar Chart - Monthly Evolution */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Evolução Mensal
              </CardTitle>
              <CardDescription>Comparativo de receitas e despesas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrencyValue(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Area Chart - Balance Evolution */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.5s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução do Saldo
              </CardTitle>
              <CardDescription>Variação do balanço ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrencyValue(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      name="Balanço" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorBalance)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pie Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Expense Categories */}
          <PremiumOverlay 
            isLocked={!hasAdvancedReports} 
            message="Gráficos detalhados são um recurso Premium"
            onUpgrade={() => setUpgradeModalOpen(true)}
          >
            <Card className="animate-slide-up" style={{ animationDelay: "0.6s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-destructive" />
                  Despesas por Categoria
                </CardTitle>
                <CardDescription>Distribuição dos gastos</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryTotals.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryTotals}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {categoryTotals.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrencyValue(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa encontrada no período
                  </p>
                )}
              </CardContent>
            </Card>
          </PremiumOverlay>

          {/* Income Categories */}
          <PremiumOverlay 
            isLocked={!hasAdvancedReports} 
            message="Gráficos detalhados são um recurso Premium"
            onUpgrade={() => setUpgradeModalOpen(true)}
          >
            <Card className="animate-slide-up" style={{ animationDelay: "0.7s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-success" />
                  Receitas por Categoria
                </CardTitle>
                <CardDescription>Distribuição das receitas</CardDescription>
              </CardHeader>
              <CardContent>
                {incomeCategoryTotals.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeCategoryTotals}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {incomeCategoryTotals.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrencyValue(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma receita encontrada no período
                  </p>
                )}
              </CardContent>
            </Card>
          </PremiumOverlay>
        </div>

        {/* Category List */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.8s" }}>
          <CardHeader>
            <CardTitle>Detalhamento por Categoria</CardTitle>
            <CardDescription>Ranking de despesas do período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryTotals.map((cat) => (
                <div key={cat.category_id} className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: cat.color + '20', color: cat.color }}
                    >
                      {cat.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{cat.name}</p>
                      <div className="w-full bg-secondary rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(cat.amount / totalExpenses) * 100}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrencyValue(cat.amount)}</p>
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
