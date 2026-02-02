import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, invalidateAfterGoalChange } from "@/lib/queryClient";
import { toast } from "sonner";

export interface Goal {
  id: number;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  deadline: string | null;
  emoji: string;
  color: string;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface GoalInput {
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  deadline: string | null;
  emoji: string;
  color: string;
}

async function fetchGoals(): Promise<Goal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: fetchGoals,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goal: GoalInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("financial_goals")
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAfterGoalChange(queryClient);
      toast.success("Meta criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar meta", { description: error.message });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...goal }: Partial<GoalInput> & { id: number }) => {
      const { data, error } = await supabase
        .from("financial_goals")
        .update(goal)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAfterGoalChange(queryClient);
      toast.success("Meta atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar meta", { description: error.message });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("financial_goals")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAfterGoalChange(queryClient);
      toast.success("Meta excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir meta", { description: error.message });
    },
  });
}

export function useAddDeposit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ goalId, amountCents }: { goalId: number; amountCents: number }) => {
      // First get current amount
      const { data: goal, error: fetchError } = await supabase
        .from("financial_goals")
        .select("current_amount_cents")
        .eq("id", goalId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newAmount = (goal?.current_amount_cents || 0) + amountCents;
      
      const { error } = await supabase
        .from("financial_goals")
        .update({ current_amount_cents: newAmount })
        .eq("id", goalId);
      
      if (error) throw error;
      return { newAmount };
    },
    onSuccess: (_, variables) => {
      invalidateAfterGoalChange(queryClient);
      toast.success(`R$ ${(variables.amountCents / 100).toFixed(2)} adicionado à meta!`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar depósito", { description: error.message });
    },
  });
}
