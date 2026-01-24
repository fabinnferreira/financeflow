import { QueryClient } from "@tanstack/react-query";

// Global cache configuration with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 2 minutes
      staleTime: 2 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: "always",
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query keys factory for type-safe and consistent cache keys
export const queryKeys = {
  // Dashboard
  dashboard: (period: string, startDate?: string, endDate?: string) => 
    ["dashboard", period, startDate, endDate] as const,
  
  // Transactions
  transactions: {
    all: ["transactions"] as const,
    infinite: (filters?: Record<string, unknown>) => 
      ["transactions-infinite", filters] as const,
    detail: (id: number) => ["transactions", "detail", id] as const,
  },
  
  // Accounts
  accounts: {
    all: ["accounts"] as const,
    detail: (id: number) => ["accounts", "detail", id] as const,
  },
  
  // Categories
  categories: {
    all: ["categories"] as const,
    byType: (type: string) => ["categories", type] as const,
  },
  
  // Goals
  goals: {
    all: ["goals"] as const,
    widget: ["goals", "widget"] as const,
    detail: (id: number) => ["goals", "detail", id] as const,
  },
  
  // User
  user: {
    profile: ["user", "profile"] as const,
    plan: ["user", "plan"] as const,
    usage: ["user", "usage"] as const,
  },
  
  // Notifications
  notifications: ["notifications"] as const,
  
  // Bank connections
  bankConnections: ["bank-connections"] as const,
  
  // Credit cards
  creditCards: ["credit-cards"] as const,
} as const;

// Invalidation helpers for common patterns
export const invalidateAfterTransaction = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: queryKeys.dashboard("month") });
  qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
};

export const invalidateAfterAccountChange = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard("month") });
};

export const invalidateAfterGoalChange = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: queryKeys.goals.all });
};
