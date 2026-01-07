import { supabase } from "@/integrations/supabase/client";

/**
 * Recalculates the balance for a specific account based on all its transactions
 */
export async function recalculateAccountBalance(accountId: number): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  
  // Get all transactions for this account
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("type, amount_cents")
    .eq("account_id", accountId)
    .eq("user_id", user.id);

  if (error) throw error;

  // Calculate balance (income adds, expense subtracts)
  let balanceCents = 0;
  transactions?.forEach(t => {
    if (t.type === "income") {
      balanceCents += t.amount_cents;
    } else {
      balanceCents -= t.amount_cents;
    }
  });

  // Update account balance
  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance_cents: balanceCents })
    .eq("id", accountId);

  if (updateError) throw updateError;
  
  return balanceCents;
}

/**
 * Recalculates balances for all user accounts
 */
export async function recalculateAllAccountBalances(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  if (error) throw error;

  // Recalculate each account
  await Promise.all(
    (accounts || []).map(account => recalculateAccountBalance(account.id))
  );
}
