-- Tabela para armazenar conexões bancárias via Open Banking (Pluggy)
CREATE TABLE public.bank_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    pluggy_item_id text NOT NULL UNIQUE,
    connector_name text NOT NULL,
    connector_logo text,
    status text NOT NULL DEFAULT 'CONNECTED',
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem gerenciar apenas suas próprias conexões
CREATE POLICY "Users can manage their own bank connections"
ON public.bank_connections FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bank_connections_updated_at
BEFORE UPDATE ON public.bank_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para armazenar contas importadas do Open Banking
CREATE TABLE public.pluggy_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    bank_connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    pluggy_account_id text NOT NULL UNIQUE,
    local_account_id integer REFERENCES public.accounts(id) ON DELETE SET NULL,
    name text NOT NULL,
    type text NOT NULL,
    subtype text,
    balance_cents integer NOT NULL DEFAULT 0,
    currency_code text DEFAULT 'BRL',
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pluggy_accounts ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem gerenciar apenas suas próprias contas importadas
CREATE POLICY "Users can manage their own pluggy accounts"
ON public.pluggy_accounts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pluggy_accounts_updated_at
BEFORE UPDATE ON public.pluggy_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_bank_connections_user_id ON public.bank_connections(user_id);
CREATE INDEX idx_pluggy_accounts_user_id ON public.pluggy_accounts(user_id);
CREATE INDEX idx_pluggy_accounts_bank_connection_id ON public.pluggy_accounts(bank_connection_id);