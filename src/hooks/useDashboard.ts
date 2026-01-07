import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from "date-fns";

export type PeriodFilter = "week" | "month" | "quarter" | "year" | "custom";

interface CategoryTotal {
  category_id: number;
  name: string;
  emoji: string;
  color: string;
  total_amount_cents: number;
  amount: number;
}

interface DashboardData {
  userName: string;
  balance: number;
  income: number;
  expenses: number;
  categoryTotals: CategoryTotal[];
  dailyTotals: { date: string; income: number; expense: number }[];
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user;
}

export function getDateRange(periodFilter: PeriodFilter, customStartDate?: Date, customEndDate?: Date) {
  const now = new Date();
  switch (periodFilter) {
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter":
      return { start: subMonths(startOfMonth(now), 2), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return { start: customStartDate || startOfMonth(now), end: customEndDate || endOfMonth(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

async function fetchDashboardData(
  periodFilter: PeriodFilter,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<DashboardData> {
  const user = await getCurrentUser();
  
  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.name || user.email?.split("@")[0] || "Usuário";

  const { start, end } = getDateRange(periodFilter, customStartDate, customEndDate);
  const startDate = start.toISOString();
  const endDate = end.toISOString();

  // Fetch transactions
  const { data: transactions, error: transError } = await supabase
    .from("transactions")
    .select(`*, categories (name, emoji, color)`)
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (transError) throw transError;

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

  // Fetch category totals
  const { data: categoryData, error: categoryError } = (await supabase.rpc('get_category_totals' as any, {
    start_date: startDate,
    end_date: endDate
  })) as any;

  let categoryTotals: CategoryTotal[] = [];
  if (!categoryError && categoryData) {
    categoryTotals = categoryData.map((item: any) => ({
      ...item,
      amount: item.total_amount_cents / 100
    }));
  }

  // Fetch daily totals
  const { data: dailyData, error: dailyError } = (await supabase.rpc('get_daily_totals' as any, {
    start_date: startDate,
    end_date: endDate
  })) as any;

  let dailyTotals: { date: string; income: number; expense: number }[] = [];
  if (!dailyError && dailyData) {
    dailyTotals = dailyData.map((item: any) => ({
      ...item,
      income: item.income / 100,
      expense: item.expense / 100
    }));
  }

  // Fetch account balances
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("balance_cents")
    .eq("user_id", user.id);

  if (accountsError) throw accountsError;
  
  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance_cents || 0), 0) || 0;

  return {
    userName,
    balance: totalBalance / 100,
    income: totalIncome,
    expenses: totalExpenses,
    categoryTotals,
    dailyTotals,
  };
}

export function useDashboard(
  periodFilter: PeriodFilter,
  customStartDate?: Date,
  customEndDate?: Date
) {
  return useQuery({
    queryKey: ["dashboard", periodFilter, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: () => fetchDashboardData(periodFilter, customStartDate, customEndDate),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
