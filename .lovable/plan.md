
# Plano de Auditoria Completa e Refatoracao - FinanceFlow

## 1. Resumo Executivo

Apos uma varredura profunda no sistema, identifiquei diversas areas que precisam de atencao, categorizadas em: bugs, inconsistencias, pontas soltas, oportunidades de refatoracao, e melhorias de seguranca.

---

## 2. Problemas Identificados

### 2.1 Seguranca (Prioridade Alta)

| ID | Problema | Localizacao | Impacto |
|----|----------|-------------|---------|
| SEC-1 | Leaked Password Protection desabilitado | Supabase Dashboard | Usuarios podem usar senhas comprometidas |
| SEC-2 | delete-user-account nao deleta user_usage | supabase/functions/delete-user-account/index.ts | Dados orfaos no banco |

**Acoes:**
- SEC-1: Configuracao manual no Supabase Dashboard (Auth > Settings > Security)
- SEC-2: Adicionar exclusao da tabela user_usage na edge function

### 2.2 Bugs e Inconsistencias

| ID | Problema | Localizacao | Descricao |
|----|----------|-------------|-----------|
| BUG-1 | EditTransactionDialog carrega dados diretamente | src/components/EditTransactionDialog.tsx | Nao usa hooks React Query como TransactionDialog, causando inconsistencia de cache |
| BUG-2 | usePlan incrementUsage usa upsert incorreto | src/hooks/usePlan.ts:175-183 | O upsert pode falhar se o registro nao existir com a constraint correta |
| BUG-3 | Categories.tsx nao valida limite antes de criar | src/pages/Categories.tsx:459 | Botao "Criar primeira categoria" nao verifica limites do plano |
| BUG-4 | Transactions.tsx minDate nao e aplicado no filter | src/pages/Transactions.tsx:74,111 | A variavel minDate e definida mas nao usada na filtragem |

### 2.3 Pontas Soltas (Features Incompletas)

| ID | Problema | Localizacao | Status |
|----|----------|-------------|--------|
| LOOSE-1 | Plans.tsx usa handleCheckout que pode falhar | src/pages/Plans.tsx | Precisa tratar erros de forma mais robusta |
| LOOSE-2 | Webhook Stripe nao existe | supabase/functions/ | Assinaturas dependem de check-subscription manual |
| LOOSE-3 | check-credit-card-due edge function sem cron schedule definido | supabase/config.toml | Funcao existe mas nao e executada automaticamente |
| LOOSE-4 | sync-bank-transactions sem validacao de cron no config | supabase/config.toml | verify_jwt=false mas cron nao configurado |

### 2.4 Inconsistencias de Codigo

| ID | Problema | Localizacao | Descricao |
|----|----------|-------------|-----------|
| INC-1 | Duplicacao de fetch em EditTransactionDialog vs TransactionDialog | src/components/ | TransactionDialog usa hooks, EditTransactionDialog usa fetch direto |
| INC-2 | CATEGORY_KEYWORDS duplicado | pluggy/index.ts e sync-bank-transactions/index.ts | Mesma lista duplicada em 2 edge functions |
| INC-3 | formatCurrency vs formatCurrencyValue uso inconsistente | Multiplos arquivos | Alguns usam formatCurrency(cents), outros formatCurrencyValue(value) |
| INC-4 | Invalidacao de queries manual vs centralizada | Multiplos arquivos | Alguns usam invalidateAfterTransaction, outros invalidam manualmente |

### 2.5 Otimizacoes Necessarias

| ID | Problema | Localizacao | Impacto |
|----|----------|-------------|---------|
| OPT-1 | Admin.tsx faz queries em cascata | src/pages/Admin.tsx:92-143 | 7 queries separadas ao inves de uma agregada |
| OPT-2 | Reports.tsx faz loop de queries por mes | src/pages/Reports.tsx:68-95 | N queries ao inves de uma unica |
| OPT-3 | Goals.tsx nao usa React Query | src/pages/Goals.tsx | Gerencia estado manualmente, nao se beneficia do cache |

---

## 3. Plano de Implementacao

### Fase 1: Correcoes Criticas de Seguranca (Imediato)

```text
+------------------------------------------+
|  1.1 Adicionar user_usage no delete     |
|  1.2 Documentar passo manual SEC-1      |
+------------------------------------------+
```

**Arquivos a modificar:**
- `supabase/functions/delete-user-account/index.ts` - adicionar delete de user_usage

### Fase 2: Correcao de Bugs (Alta Prioridade)

**2.1 Unificar EditTransactionDialog para usar React Query hooks**
- Modificar `src/components/EditTransactionDialog.tsx`
- Usar `useAccounts()` e `useCategories()` ao inves de fetch direto
- Garantir consistencia de cache

**2.2 Corrigir minDate nao aplicado**
- Modificar `src/pages/Transactions.tsx`
- Aplicar filtro de data minima para usuarios gratuitos

**2.3 Corrigir validacao de limite em Categories.tsx**
- Verificar canAddCategory antes de abrir dialog no botao "Criar primeira categoria"

### Fase 3: Refatoracao e Consolidacao

**3.1 Consolidar CATEGORY_KEYWORDS**
- Criar arquivo compartilhado ou mover para utils
- Edge functions importam de local centralizado

**3.2 Padronizar invalidacao de cache**
- Adicionar helpers no `queryClient.ts` para todos os cenarios
- Refatorar arquivos que invalidam manualmente

**3.3 Converter Goals.tsx para React Query**
- Criar hook `useGoals.ts`
- Remover gerenciamento de estado manual

### Fase 4: Completar Features Incompletas

**4.1 Criar webhook Stripe**
- Nova edge function `stripe-webhook`
- Atualizar plano automaticamente quando subscription muda

**4.2 Configurar cron jobs**
- Adicionar schedule para check-credit-card-due
- Documentar processo de sync-bank-transactions

### Fase 5: Otimizacoes de Performance

**5.1 Otimizar Admin.tsx**
- Consolidar queries em funcao RPC unica
- Reduzir de 7 queries para 1

**5.2 Otimizar Reports.tsx**
- Criar funcao SQL para agregacao mensal
- Eliminar loop de queries

---

## 4. Arquivos a Serem Modificados

| Arquivo | Tipo de Mudanca |
|---------|-----------------|
| supabase/functions/delete-user-account/index.ts | Correcao SEC-2 |
| src/components/EditTransactionDialog.tsx | Refatoracao BUG-1 |
| src/pages/Transactions.tsx | Correcao BUG-4 |
| src/pages/Categories.tsx | Correcao BUG-3 |
| src/hooks/usePlan.ts | Verificacao BUG-2 |
| src/hooks/useGoals.ts | Novo arquivo |
| src/pages/Goals.tsx | Refatoracao OPT-3 |
| src/lib/queryClient.ts | Adicionar mais helpers |
| supabase/functions/stripe-webhook/index.ts | Novo arquivo |
| supabase/config.toml | Adicionar configuracoes |

---

## 5. Estimativa de Esforco

| Fase | Descricao | Complexidade |
|------|-----------|--------------|
| Fase 1 | Seguranca | Baixa |
| Fase 2 | Bugs | Media |
| Fase 3 | Refatoracao | Media |
| Fase 4 | Features | Alta |
| Fase 5 | Otimizacoes | Media |

---

## 6. Secao Tecnica Detalhada

### Correcao delete-user-account

Adicionar entre linhas 103-104:

```typescript
// 10.1 Delete user usage
const { error: usageError } = await supabaseAdmin
  .from('user_usage')
  .delete()
  .eq('user_id', userId);
if (usageError) console.error('Error deleting user usage:', usageError);
else console.log('[DeleteAccount] User usage deleted');
```

### Correcao EditTransactionDialog

Substituir fetch direto por hooks:

```typescript
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";

// Dentro do componente:
const { data: accountsData = [] } = useAccounts();
const { data: categoriesData = [] } = useCategories(formData.type);
```

### Correcao minDate em Transactions.tsx

Adicionar na linha 111:

```typescript
// Verificar data minima para usuarios gratuitos
if (minDate && transactionDate < minDate) {
  return false;
}
```

### Novo hook useGoals.ts

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}
```

---

## 7. Proximos Passos

Apos aprovacao deste plano, implementarei as correcoes na seguinte ordem:

1. Correcoes de seguranca (delete-user-account)
2. Correcao de bugs criticos (BUG-1 a BUG-4)
3. Refatoracao de inconsistencias
4. Implementacao de features faltantes
5. Otimizacoes de performance

Deseja que eu prossiga com a implementacao?
