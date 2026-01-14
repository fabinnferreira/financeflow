import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS, PlanType } from "@/lib/planLimits";
import { format } from "date-fns";

interface Usage {
  transactionsCount: number;
  accountsCount: number;
  cardsCount: number;
  goalsCount: number;
}

interface PlanData {
  plan: PlanType;
  isLoading: boolean;
  usage: Usage;
  limits: typeof PLAN_LIMITS[PlanType];
  canAddTransaction: boolean;
  canAddAccount: boolean;
  canAddCreditCard: boolean;
  canAddGoal: boolean;
  canAddCategory: (currentCount: number) => boolean;
  hasExport: boolean;
  hasNotifications: boolean;
  hasOpenBanking: boolean;
  hasAdvancedReports: boolean;
  subscriptionEnd: string | null;
  refreshPlan: () => Promise<void>;
  incrementUsage: (type: 'transactions' | 'accounts' | 'cards' | 'goals') => Promise<void>;
}

const getCurrentMonthYear = () => format(new Date(), "yyyy-MM");

export function usePlan(): PlanData {
  const [plan, setPlan] = useState<PlanType>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage>({
    transactionsCount: 0,
    accountsCount: 0,
    cardsCount: 0,
    goalsCount: 0,
  });

  const fetchPlanAndUsage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch profile for plan info
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, stripe_subscription_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setPlan((profile.plan as PlanType) || "free");
      }

      // Fetch or create usage for current month
      const monthYear = getCurrentMonthYear();
      let { data: usageData } = await supabase
        .from("user_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      if (!usageData) {
        // Create usage record for current month
        const { data: newUsage } = await supabase
          .from("user_usage")
          .insert({
            user_id: user.id,
            month_year: monthYear,
            transactions_count: 0,
            accounts_count: 0,
            cards_count: 0,
            goals_count: 0,
          })
          .select()
          .single();
        usageData = newUsage;
      }

      if (usageData) {
        setUsage({
          transactionsCount: usageData.transactions_count || 0,
          accountsCount: usageData.accounts_count || 0,
          cardsCount: usageData.cards_count || 0,
          goalsCount: usageData.goals_count || 0,
        });
      }

      // Check subscription status from Stripe if premium
      if (profile?.plan === "premium" && profile?.stripe_subscription_id) {
        try {
          const { data } = await supabase.functions.invoke("check-subscription");
          if (data?.subscription_end) {
            setSubscriptionEnd(data.subscription_end);
          }
          if (!data?.subscribed) {
            // Subscription expired, update to free
            await supabase
              .from("profiles")
              .update({ plan: "free" })
              .eq("id", user.id);
            setPlan("free");
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const incrementUsage = useCallback(async (type: 'transactions' | 'accounts' | 'cards' | 'goals') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const monthYear = getCurrentMonthYear();
    const columnMap = {
      transactions: 'transactions_count',
      accounts: 'accounts_count',
      cards: 'cards_count',
      goals: 'goals_count',
    };

    const column = columnMap[type];
    const currentValue = usage[`${type}Count` as keyof Usage];

    await supabase
      .from("user_usage")
      .upsert({
        user_id: user.id,
        month_year: monthYear,
        [column]: currentValue + 1,
      }, {
        onConflict: 'user_id,month_year',
      });

    setUsage(prev => ({
      ...prev,
      [`${type}Count`]: prev[`${type}Count` as keyof Usage] + 1,
    }));
  }, [usage]);

  useEffect(() => {
    fetchPlanAndUsage();
  }, [fetchPlanAndUsage]);

  const limits = PLAN_LIMITS[plan];

  return {
    plan,
    isLoading,
    usage,
    limits,
    canAddTransaction: usage.transactionsCount < limits.transactionsPerMonth,
    canAddAccount: usage.accountsCount < limits.accounts,
    canAddCreditCard: usage.cardsCount < limits.creditCards,
    canAddGoal: usage.goalsCount < limits.goals,
    canAddCategory: (currentCount: number) => currentCount < limits.categories,
    hasExport: limits.hasExport,
    hasNotifications: limits.hasNotifications,
    hasOpenBanking: limits.hasOpenBanking,
    hasAdvancedReports: limits.hasAdvancedReports,
    subscriptionEnd,
    refreshPlan: fetchPlanAndUsage,
    incrementUsage,
  };
}
