export const PLAN_LIMITS = {
  free: {
    transactionsPerMonth: 3,
    accounts: 1,
    creditCards: 1,
    goals: 1,
    categories: 5,
    historyMonths: 3,
    hasExport: false,
    hasNotifications: false,
    hasOpenBanking: false,
    hasAdvancedReports: false,
  },
  premium: {
    transactionsPerMonth: Infinity,
    accounts: Infinity,
    creditCards: Infinity,
    goals: Infinity,
    categories: Infinity,
    historyMonths: Infinity,
    hasExport: true,
    hasNotifications: true,
    hasOpenBanking: true,
    hasAdvancedReports: true,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export const STRIPE_CONFIG = {
  premium: {
    priceId: "price_1SpB5sKbdcqoAJRebCVwFhHJ",
    productId: "prod_TmkbxqoBQxGUGX",
  },
} as const;
