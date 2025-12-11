import * as XLSX from "xlsx";

interface Transaction {
  id: number;
  type: string;
  description: string;
  amount_cents: number;
  date: string;
  categories: {
    name: string;
    emoji: string;
  };
}

interface ExportSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  period: string;
}

export const exportTransactionsToExcel = (
  transactions: Transaction[],
  summary: ExportSummary,
  fileName: string = "transacoes"
) => {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["FinanceFlow - Relatório de Transações"],
    [""],
    ["Período", summary.period],
    ["Gerado em", new Date().toLocaleDateString("pt-BR")],
    [""],
    ["Resumo Financeiro"],
    ["Receitas", formatCurrency(summary.totalIncome)],
    ["Despesas", formatCurrency(summary.totalExpenses)],
    ["Saldo", formatCurrency(summary.balance)],
    [""],
    ["Total de Transações", transactions.length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 25 }];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  // Transactions Sheet
  const transactionHeaders = ["Tipo", "Descrição", "Categoria", "Valor (R$)", "Data"];
  
  const transactionData = transactions.map((t) => [
    t.type === "income" ? "Receita" : "Despesa",
    t.description,
    `${t.categories.emoji} ${t.categories.name}`,
    (t.amount_cents / 100).toFixed(2),
    new Date(t.date).toLocaleDateString("pt-BR"),
  ]);

  const transactionsSheet = XLSX.utils.aoa_to_sheet([
    transactionHeaders,
    ...transactionData,
  ]);

  // Set column widths
  transactionsSheet["!cols"] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Transações");

  // Income Sheet
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  if (incomeTransactions.length > 0) {
    const incomeData = incomeTransactions.map((t) => [
      t.description,
      `${t.categories.emoji} ${t.categories.name}`,
      (t.amount_cents / 100).toFixed(2),
      new Date(t.date).toLocaleDateString("pt-BR"),
    ]);

    const incomeSheet = XLSX.utils.aoa_to_sheet([
      ["Descrição", "Categoria", "Valor (R$)", "Data"],
      ...incomeData,
    ]);

    incomeSheet["!cols"] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, incomeSheet, "Receitas");
  }

  // Expenses Sheet
  const expenseTransactions = transactions.filter((t) => t.type === "expense");
  if (expenseTransactions.length > 0) {
    const expenseData = expenseTransactions.map((t) => [
      t.description,
      `${t.categories.emoji} ${t.categories.name}`,
      (t.amount_cents / 100).toFixed(2),
      new Date(t.date).toLocaleDateString("pt-BR"),
    ]);

    const expenseSheet = XLSX.utils.aoa_to_sheet([
      ["Descrição", "Categoria", "Valor (R$)", "Data"],
      ...expenseData,
    ]);

    expenseSheet["!cols"] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Despesas");
  }

  // Save file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
