import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

interface Goal {
  id: number;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  emoji: string;
  color: string;
}

async function fetchGoalsWidget(): Promise<Goal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("financial_goals")
    .select("id, name, target_amount_cents, current_amount_cents, emoji, color")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw error;
  return data || [];
}

export function useGoalsWidget() {
  return useQuery({
    queryKey: queryKeys.goals.widget,
    queryFn: fetchGoalsWidget,
    staleTime: 5 * 60 * 1000, // Goals don't change often - 5 min stale
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 min
  });
}
