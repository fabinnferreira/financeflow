# Roadmap Completo - FinanceFlow

## Visao Geral do Sistema

O FinanceFlow e uma aplicacao de gestao financeira pessoal com:
- Autenticacao via Supabase
- Dashboard com graficos e metricas
- Gestao de contas, categorias, transacoes e metas
- Integracao Open Banking via Pluggy
- Painel administrativo
- Sincronizacao automatica via cron job

---

## FASE 1: CORRECOES CRITICAS (Prioridade Alta)

### 1.1 Habilitar Protecao de Senhas Vazadas
**Status**: Pendente (detectado pelo linter)
**Arquivos**: Configuracao no Dashboard Supabase
**Descricao**: A protecao contra senhas vazadas esta desabilitada. Isso permite que usuarios utilizem senhas comprometidas.
**Acao**: Acessar Dashboard Supabase > Authentication > Password Strength e habilitar "Check passwords against Have I Been Pwned database"

### 1.2 Tratamento de Erros na Exclusao de Categoria com Transacoes
**Status**: Bug potencial
**Arquivo**: `src/pages/Categories.tsx` (linhas 177-192)
**Descricao**: A exclusao de categoria nao verifica se existem transacoes associadas, o que pode causar erro de foreign key ou transacoes orfas.
**Acao**: Adicionar verificacao antes de deletar:
```typescript
const handleDelete = async (id: number) => {
  // Verificar se ha transacoes
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    toast.error('Nao e possivel excluir uma categoria com transacoes associadas');
    return;
  }
  // ... resto do codigo
};
```

### 1.3 Filtro de Notificacoes por User na Subscription Realtime
**Status**: Bug potencial
**Arquivo**: `src/components/NotificationCenter.tsx` (linhas 28-34)
**Descricao**: A subscription realtime recebe TODAS as notificacoes inseridas, nao apenas do usuario atual.
**Acao**: Adicionar filtro na subscription:
```typescript
const channel = supabase.channel('notifications-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user?.id}` // Adicionar filtro
  }, payload => {
    setNotifications(prev => [payload.new as Notification, ...prev]);
  })
  .subscribe();
```

### 1.4 Configurar Cron Job para check-credit-card-due
**Status**: Pendente
**Arquivo**: Supabase SQL Editor
**Descricao**: A edge function `check-credit-card-due` existe mas nao tem cron job configurado.
**Acao**: Executar SQL para configurar cron diario:
```sql
SELECT cron.schedule(
  'check-credit-card-due-daily',
  '0 7 * * *', -- 7 AM UTC (4 AM Brasilia)
  $$
  SELECT net.http_post(
    url := 'https://xzzbnnivmbqtiprepxeo.supabase.co/functions/v1/check-credit-card-due',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer {SERVICE_ROLE_KEY}'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## FASE 2: MELHORIAS DE UX/UI

### 2.1 Adicionar Link para Revisao de Transacoes no Dashboard
**Status**: Melhoria
**Arquivo**: `src/components/DashboardNav.tsx`
**Descricao**: Usuarios precisam navegar ate Bank Connections para revisar transacoes. Adicionar atalho direto.
**Acao**: Adicionar item de menu quando houver transacoes pendentes de revisao.

### 2.2 Exibir Badge de Transacoes Pendentes no Dashboard
**Status**: Melhoria
**Arquivo**: `src/pages/Dashboard.tsx`
**Descricao**: Mostrar contador de transacoes que precisam de revisao no dashboard.
**Acao**: Adicionar query para contar `needs_review = true` e exibir badge.

### 2.3 Adicionar Confirmacao Visual de Sucesso no Delete Account
**Status**: Melhoria
**Arquivo**: `src/pages/Settings.tsx`
**Descricao**: Apos exclusao bem-sucedida, redirecionar com feedback visual.
**Acao**: Adicionar toast de confirmacao antes do redirect.

### 2.4 Melhorar Feedback de Erro no Pluggy Connect
**Status**: Melhoria
**Arquivo**: `src/components/PluggyConnectWidget.tsx`
**Descricao**: Quando o script falha ao carregar, o usuario pode nao entender o problema.
**Acao**: Melhorar mensagens de erro e adicionar instrucoes para o usuario.

### 2.5 Adicionar Loading State no Painel Admin
**Status**: Melhoria
**Arquivo**: `src/pages/Admin.tsx`
**Descricao**: A pagina fica em branco enquanto carrega stats.
**Acao**: Adicionar skeletons durante carregamento.

---

## FASE 3: FUNCIONALIDADES PENDENTES

### 3.1 Gerenciamento de Detalhes de Cartao de Credito
**Status**: Tabela existe mas sem UI
**Arquivos Necessarios**: Criar `src/pages/CreditCards.tsx`
**Descricao**: A tabela `credit_cards_details` existe mas nao ha interface para gerenciar fechamento e vencimento.
**Acao**: Criar pagina para vincular contas tipo credit_card com datas de fechamento/vencimento.

### 3.2 Integracao do Saldo do Pluggy com Contas Locais
**Status**: Parcialmente implementado
**Arquivos**: `supabase/functions/pluggy/index.ts`, `supabase/functions/sync-bank-transactions/index.ts`
**Descricao**: O campo `local_account_id` em `pluggy_accounts` nao esta sendo usado para sincronizar saldos.
**Acao**: Ao vincular conta Pluggy, permitir associar a conta local existente ou criar nova.

### 3.3 Recalculo Automatico de Saldo de Contas
**Status**: Nao implementado
**Arquivos**: `src/pages/Transactions.tsx`, edge functions
**Descricao**: Ao criar/editar/excluir transacao, o saldo da conta nao e atualizado.
**Acao**: Criar trigger no banco ou logica no cliente para recalcular saldo.

### 3.4 Exportar Relatorios da Pagina Reports
**Status**: Parcialmente implementado (so em Transactions)
**Arquivo**: `src/pages/Reports.tsx`
**Descricao**: A pagina de Reports nao tem opcao de exportar PDF/Excel.
**Acao**: Adicionar botoes de exportacao similares aos de Transactions.

---

## FASE 4: REFATORACOES E LIMPEZA

### 4.1 Centralizar Logica de Formatacao de Moeda
**Status**: Codigo duplicado
**Arquivos Afetados**: Multiplos (Dashboard, Transactions, Reports, Goals, Accounts, etc.)
**Descricao**: `formatCurrency()` esta definida em varios arquivos com implementacao identica.
**Acao**: Criar `src/lib/formatters.ts`:
```typescript
export const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};
```

### 4.2 Centralizar Icones de Tipo de Conta
**Status**: Codigo duplicado
**Arquivos Afetados**: `Accounts.tsx`, `BankConnections.tsx`
**Descricao**: `getAccountIcon()` esta duplicada.
**Acao**: Mover para `src/lib/accountHelpers.ts`.

### 4.3 Unificar Toast Imports
**Status**: Inconsistencia
**Arquivos Afetados**: Multiplos
**Descricao**: Alguns arquivos usam `toast` de `sonner`, outros `useToast` de `@/hooks/use-toast`.
**Acao**: Padronizar uso de `sonner` em toda aplicacao, remover `useToast` onde nao for necessario.

### 4.4 Remover Codigo Morto em Dashboard
**Status**: Limpeza
**Arquivo**: `src/pages/Dashboard.tsx`
**Descricao**: Verificar se ha imports nao utilizados.
**Acao**: Revisar e limpar imports.

### 4.5 Simplificar Queries Repetidas de User
**Status**: Refatoracao
**Arquivos Afetados**: Quase todas as paginas
**Descricao**: `supabase.auth.getUser()` e chamado multiplas vezes.
**Acao**: Usar `useAuth()` hook existente de forma consistente.

---

## FASE 5: OTIMIZACOES DE PERFORMANCE

### 5.1 Implementar React Query em Todas as Paginas
**Status**: Parcialmente implementado
**Arquivos Afetados**: Todas as paginas de dados
**Descricao**: Muitas paginas usam `useState` + `useEffect` manual em vez de React Query.
**Acao**: Migrar para `useQuery` e `useMutation` para cache e refetch automatico.

### 5.2 Adicionar Paginacao em Transactions
**Status**: Melhoria
**Arquivo**: `src/pages/Transactions.tsx`
**Descricao**: Carrega todas as transacoes de uma vez. Pode ser lento para usuarios com muitos dados.
**Acao**: Implementar paginacao ou scroll infinito.

### 5.3 Lazy Loading de Paginas
**Status**: Melhoria
**Arquivo**: `src/App.tsx`
**Descricao**: Todas as paginas sao carregadas no bundle inicial.
**Acao**: Implementar `React.lazy()` para code splitting.

### 5.4 Memoizacao de Componentes Pesados
**Status**: Otimizacao
**Arquivos**: Graficos em Dashboard e Reports
**Descricao**: Graficos podem re-renderizar desnecessariamente.
**Acao**: Usar `React.memo()` e `useMemo()` para dados de graficos.

---

## FASE 6: SEGURANCA

### 6.1 Validar Admin Role no Backend para Admin Page
**Status**: Melhoria de seguranca
**Arquivos**: `src/pages/Admin.tsx`, criar middleware de admin
**Descricao**: A verificacao de admin e feita apenas no frontend. Criar RLS policies mais restritas.
**Acao**: Embora as RLS policies existam, garantir que operacoes administrativas sejam validadas server-side.

### 6.2 Rate Limiting na Edge Function de Sync
**Status**: Seguranca
**Arquivos**: `supabase/functions/sync-bank-transactions/index.ts`
**Descricao**: Nao ha rate limiting para prevenir abuso.
**Acao**: Implementar verificacao de ultima sincronizacao.

### 6.3 Audit Log para Operacoes Administrativas
**Status**: Feature futura
**Arquivos**: Nova tabela e logica
**Descricao**: Registrar operacoes feitas por admins.
**Acao**: Criar tabela `admin_audit_log`.

---

## FASE 7: TESTES E DOCUMENTACAO

### 7.1 Testar Fluxo Completo de Exclusao de Conta
**Status**: Teste manual necessario
**Arquivos**: `supabase/functions/delete-user-account/index.ts`
**Descricao**: Criar usuario teste, adicionar dados, excluir e verificar que tudo foi removido.
**Acao**: Executar teste end-to-end.

### 7.2 Documentar API das Edge Functions
**Status**: Documentacao
**Arquivos**: README.md ou criar docs/
**Descricao**: Documentar endpoints, parametros e respostas.
**Acao**: Criar documentacao tecnica.

### 7.3 Adicionar Testes Unitarios
**Status**: Feature futura
**Arquivos**: Criar estrutura de testes
**Descricao**: Nao ha testes automatizados.
**Acao**: Configurar Vitest e escrever testes para funcoes criticas.

---

## RESUMO DE PRIORIDADES

### Prioridade CRITICA (Fazer primeiro)
1. Habilitar Protecao de Senhas Vazadas
2. Corrigir verificacao de transacoes antes de deletar categoria
3. Corrigir filtro de notificacoes realtime
4. Configurar cron para check-credit-card-due

### Prioridade ALTA
5. Recalculo automatico de saldos
6. UI para gerenciamento de cartoes de credito
7. Centralizar formatadores e helpers

### Prioridade MEDIA
8. Paginacao em transacoes
9. Lazy loading de paginas
10. Exportar relatorios em Reports

### Prioridade BAIXA
11. React Query em todas as paginas
12. Testes automatizados
13. Documentacao

---

## ARQUIVOS CRITICOS PARA IMPLEMENTACAO

1. `src/pages/Categories.tsx` - Adicionar verificacao de transacoes na exclusao
2. `src/components/NotificationCenter.tsx` - Corrigir filtro realtime
3. `src/lib/formatters.ts` - Criar arquivo para centralizar formatadores
4. `src/pages/CreditCards.tsx` - Criar pagina para gerenciar cartoes
5. `supabase/functions/sync-bank-transactions/index.ts` - Atualizar saldos de contas
