-- Adicionar campos de plano na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Criar tabela de uso mensal do usuário
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- formato: "2025-01"
  transactions_count INTEGER DEFAULT 0,
  accounts_count INTEGER DEFAULT 0,
  cards_count INTEGER DEFAULT 0,
  goals_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Habilitar RLS na tabela user_usage
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para user_usage
CREATE POLICY "Users can manage their own usage"
ON public.user_usage FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON public.user_usage(user_id, month_year);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_user_usage_updated_at
BEFORE UPDATE ON public.user_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();