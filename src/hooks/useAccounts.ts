import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

interface Account {
  id: number;
  name: string;
  type: string;
  balance_cents: number | null;
}

async function fetchAccounts(): Promise<Account[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, balance_cents")
    .eq("user_id", user.id)
    .order("name");

  if (error) throw error;
  return data || [];
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: fetchAccounts,
    staleTime: 3 * 60 * 1000, // 3 min stale time
  });
}
