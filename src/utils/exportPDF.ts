import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export const exportTransactionsToPDF = (
  transactions: Transaction[],
  summary: ExportSummary,
  fileName: string = "transacoes"
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 35, 45);
  doc.text("FinanceFlow", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Relatório de Transações", 14, 28);
  doc.text(`Período: ${summary.period}`, 14, 35);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 42);

  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(30, 35, 45);
  doc.text("Resumo Financeiro", 14, 55);
  
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`Receitas: R$ ${formatCurrency(summary.totalIncome)}`, 14, 65);
  
  doc.setTextColor(239, 68, 68); // Red
  doc.text(`Despesas: R$ ${formatCurrency(summary.totalExpenses)}`, 14, 72);
  
  const balanceColor = summary.balance >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.text(`Saldo: R$ ${formatCurrency(summary.balance)}`, 14, 79);

  // Transactions Table
  doc.setFontSize(14);
  doc.setTextColor(30, 35, 45);
  doc.text("Transações", 14, 95);

  const tableData = transactions.map((t) => [
    t.type === "income" ? "↑ Receita" : "↓ Despesa",
    t.description,
    `${t.categories.emoji} ${t.categories.name}`,
    `R$ ${formatCurrency(t.amount_cents / 100)}`,
    new Date(t.date).toLocaleDateString("pt-BR"),
  ]);

  autoTable(doc, {
    startY: 100,
    head: [["Tipo", "Descrição", "Categoria", "Valor", "Data"]],
    body: tableData,
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
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 25 },
    },
  });

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

  doc.save(`${fileName}.pdf`);
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
