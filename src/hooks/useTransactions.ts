import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { recalculateAccountBalance } from "@/lib/accountBalance";

const PAGE_SIZE = 20;

export interface Transaction {
  id: number;
  type: string;
  description: string;
  amount_cents: number;
  date: string;
  account_id: number;
  category_id: number;
  needs_review?: boolean;
  categories: {
    id: number;
    name: string;
    emoji: string;
  };
}

export interface Category {
  id: number;
  name: string;
  emoji: string;
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user;
}

// Fetch transactions with pagination
async function fetchTransactionsPage({ pageParam = 0 }: { pageParam?: number }) {
  const user = await getCurrentUser();
  
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  
  const { data, error, count } = await supabase
    .from("transactions")
    .select("*, categories(id, name, emoji)", { count: "exact" })
    .eq("user_id", user.id)
    .order("needs_review", { ascending: false, nullsFirst: false })
    .order("date", { ascending: false })
    .range(from, to);

  if (error) throw error;
  
  return {
    transactions: data as Transaction[],
    totalCount: count || 0,
    nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
    currentPage: pageParam,
  };
}

// Fetch categories
async function fetchCategories() {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, emoji")
    .eq("user_id", user.id)
    .order("name");

  if (error) throw error;
  return data as Category[];
}

// Delete transaction
async function deleteTransaction(id: number) {
  // First get the transaction to know account_id and amount
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("account_id, amount_cents, type")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
  
  // Recalculate account balance
  await recalculateAccountBalance(transaction.account_id);
  
  return { success: true };
}

// Count pending review transactions
async function fetchPendingReviewCount() {
  const user = await getCurrentUser();
  
  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("needs_review", true);

  if (error) throw error;
  return count || 0;
}

// Hooks
export function useTransactionsInfinite() {
  return useInfiniteQuery({
    queryKey: ["transactions-infinite"],
    queryFn: fetchTransactionsPage,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      toast.success("Transação excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["transactions-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => {
      console.error("Error deleting transaction:", error);
      toast.error("Erro ao excluir transação");
    },
  });
}

export function usePendingReviewCount() {
  return useQuery({
    queryKey: ["pending-review-count"],
    queryFn: fetchPendingReviewCount,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
