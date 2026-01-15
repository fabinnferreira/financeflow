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
import { formatCurrency } from "@/lib/formatters";
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

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
    doc.text(`Total de Receitas: ${formatCurrency(totalIncome)}`, 14, 65);
    
    doc.setTextColor(239, 68, 68);
    doc.text(`Total de Despesas: ${formatCurrency(totalExpenses)}`, 14, 72);
    
    const balanceColor = totalBalance >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text(`Balanço: ${formatCurrency(totalBalance)}`, 14, 79);

    doc.setTextColor(100);
    doc.text(`Taxa de Poupança: ${totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0}%`, 14, 86);

    // Monthly Data Table
    doc.setFontSize(14);
    doc.setTextColor(30, 35, 45);
    doc.text("Evolução Mensal", 14, 100);

    const monthlyTableData = monthlyData.map((m) => [
      m.month,
      formatCurrency(m.income),
      formatCurrency(m.expense),
      formatCurrency(m.balance)
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
        formatCurrency(cat.amount),
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
      ["Total de Receitas", formatCurrency(totalIncome)],
      ["Total de Despesas", formatCurrency(totalExpenses)],
      ["Balanço", formatCurrency(totalBalance)],
      ["Taxa de Poupança", `${totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0}%`],
      ["Média Mensal Receitas", formatCurrency(avgMonthlyIncome)],
      ["Média Mensal Despesas", formatCurrency(avgMonthlyExpense)],
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
