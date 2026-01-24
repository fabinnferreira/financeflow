import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

interface Category {
  id: number;
  name: string;
  emoji: string | null;
  type: string;
  color: string | null;
}

async function fetchCategories(type?: string): Promise<Category[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  let query = supabase
    .from("categories")
    .select("id, name, emoji, type, color")
    .eq("user_id", user.id)
    .order("name");

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export function useCategories(type?: string) {
  return useQuery({
    queryKey: type ? queryKeys.categories.byType(type) : queryKeys.categories.all,
    queryFn: () => fetchCategories(type),
    staleTime: 10 * 60 * 1000, // Categories rarely change - 10 min stale
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 min
  });
}
