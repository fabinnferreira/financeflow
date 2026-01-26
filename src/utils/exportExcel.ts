import * as XLSX from "xlsx";
import { formatCurrencyValue } from "@/lib/formatters";

// Basic mitigation for Excel/Sheet formula injection (e.g., values starting with =, +, -, @).
// We only *export* user-controlled strings; we never parse spreadsheets in-app.
const sanitizeForExcelCell = (value: unknown, maxLen = 2000): string => {
  const str = String(value ?? "");

  // Remove ASCII control chars (except common whitespace)
  const cleaned = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  const trimmed = cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;

  // Prevent formula execution when opening exported files in Excel-like apps
  if (/^[=+\-@]/.test(trimmed)) return `'${trimmed}`;

  return trimmed;
};

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
    ["Período", sanitizeForExcelCell(summary.period)],
    ["Gerado em", new Date().toLocaleDateString("pt-BR")],
    [""],
    ["Resumo Financeiro"],
    ["Receitas", formatCurrencyValue(summary.totalIncome)],
    ["Despesas", formatCurrencyValue(summary.totalExpenses)],
    ["Saldo", formatCurrencyValue(summary.balance)],
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
    sanitizeForExcelCell(t.description),
    sanitizeForExcelCell(`${t.categories.emoji} ${t.categories.name}`),
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
      sanitizeForExcelCell(t.description),
      sanitizeForExcelCell(`${t.categories.emoji} ${t.categories.name}`),
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
      sanitizeForExcelCell(t.description),
      sanitizeForExcelCell(`${t.categories.emoji} ${t.categories.name}`),
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
  XLSX.writeFile(workbook, `${sanitizeForExcelCell(fileName, 120)}.xlsx`);
};
