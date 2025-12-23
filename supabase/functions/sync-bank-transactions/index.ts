import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_URL = 'https://api.pluggy.ai';
const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID');
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Category mapping based on transaction description keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': [
    'ifood', 'uber eats', 'rappi', 'restaurante', 'lanchonete', 'pizzaria',
    'padaria', 'açougue', 'mercado', 'supermercado', 'carrefour', 'extra',
    'pão de açúcar', 'assai', 'atacadão', 'hortifruti', 'café', 'coffee',
    'mcdonalds', 'burger king', 'subway', 'starbucks', 'habib', 'sushi'
  ],
  'Transporte': [
    'uber', '99', 'taxi', 'cabify', 'combustivel', 'combustível', 'gasolina',
    'posto', 'ipiranga', 'shell', 'petrobras', 'br distribuidora', 'estacionamento',
    'parking', 'sem parar', 'conectcar', 'veloe', 'pedagio', 'pedágio', 'metro',
    'metrô', 'ônibus', 'onibus', 'trem', 'passagem'
  ],
  'Moradia': [
    'aluguel', 'condominio', 'condomínio', 'iptu', 'luz', 'energia', 'enel',
    'cemig', 'copel', 'celesc', 'agua', 'água', 'sabesp', 'copasa', 'sanepar',
    'gás', 'gas', 'comgas', 'internet', 'fibra', 'net', 'vivo fibra', 'claro net'
  ],
  'Telefone': [
    'vivo', 'tim', 'claro', 'oi', 'nextel', 'telefone', 'celular', 'recarga'
  ],
  'Lazer': [
    'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'deezer',
    'youtube', 'cinema', 'ingresso', 'teatro', 'show', 'evento', 'parque',
    'xbox', 'playstation', 'steam', 'games', 'jogos'
  ],
  'Saúde': [
    'farmacia', 'farmácia', 'drogaria', 'droga', 'hospital', 'clinica', 'clínica',
    'medico', 'médico', 'dentista', 'laboratorio', 'laboratório', 'exame',
    'consulta', 'plano de saude', 'plano de saúde', 'unimed', 'bradesco saude',
    'amil', 'sulamerica'
  ],
  'Educação': [
    'escola', 'faculdade', 'universidade', 'curso', 'udemy', 'alura', 'coursera',
    'udacity', 'duolingo', 'livro', 'livraria', 'saraiva', 'cultura', 'apostila',
    'mensalidade', 'matricula', 'matrícula'
  ],
  'Compras': [
    'amazon', 'mercado livre', 'magalu', 'magazine luiza', 'americanas', 'shopee',
    'aliexpress', 'shein', 'renner', 'riachuelo', 'c&a', 'zara', 'centauro',
    'netshoes', 'casas bahia', 'ponto frio'
  ],
  'Salário': [
    'salario', 'salário', 'folha', 'pgto', 'pagamento', 'deposito', 'depósito',
    'transferencia recebida', 'pix recebido', 'ted recebido', 'doc recebido'
  ],
  'Investimentos': [
    'rendimento', 'dividendo', 'jcp', 'juros sobre capital', 'fii', 'cdb',
    'tesouro', 'lci', 'lca', 'fundo', 'ação', 'acao', 'etf', 'cripto', 'bitcoin'
  ],
};

function detectCategory(description: string): string | null {
  const normalizedDescription = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedDescription.includes(normalizedKeyword)) {
        return category;
      }
    }
  }
  
  return null;
}

async function getPluggyApiKey(): Promise<string> {
  console.log('[CronSync] Authenticating with Pluggy API...');
  const response = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[CronSync] Pluggy auth error:', error);
    throw new Error(`Pluggy auth failed: ${error}`);
  }

  const data = await response.json();
  console.log('[CronSync] Pluggy authentication successful');
  return data.apiKey;
}

async function getTransactions(apiKey: string, accountId: string, from: string, to: string) {
  console.log(`[CronSync] Fetching transactions for account ${accountId}...`);
  const url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}&pageSize=500&from=${from}&to=${to}`;

  const response = await fetch(url, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[CronSync] Get transactions error:', error);
    throw new Error(`Get transactions failed: ${error}`);
  }

  return response.json();
}

async function syncTransactionsForUser(
  supabase: any,
  apiKey: string,
  userId: string,
  pluggyAccount: any,
  from: string,
  to: string
) {
  console.log(`[CronSync] Syncing transactions for user ${userId}, account ${pluggyAccount.pluggy_account_id}`);

  // Get user categories
  let { data: userCategories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);

  // Ensure default categories exist
  const hasOutrosExpense = userCategories?.some((c: any) => c.name === 'Outros' && c.type === 'expense');
  const hasOutrosIncome = userCategories?.some((c: any) => c.name === 'Outros' && c.type === 'income');

  if (!hasOutrosExpense) {
    console.log(`[CronSync] Creating default expense category for user ${userId}`);
    const { data: newCat } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: 'Outros', type: 'expense', emoji: '📦', color: '#6b7280' })
      .select()
      .single();
    if (newCat) userCategories = [...(userCategories || []), newCat];
  }

  if (!hasOutrosIncome) {
    console.log(`[CronSync] Creating default income category for user ${userId}`);
    const { data: newCat } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: 'Outros', type: 'income', emoji: '💰', color: '#22c55e' })
      .select()
      .single();
    if (newCat) userCategories = [...(userCategories || []), newCat];
  }

  const categoryMap = new Map<string, { id: number; type: string }>();
  for (const cat of (userCategories || [])) {
    categoryMap.set(`${cat.name}_${cat.type}`, { id: cat.id, type: cat.type });
  }

  const defaultExpenseCategory = userCategories?.find((c: any) => c.name === 'Outros' && c.type === 'expense');
  const defaultIncomeCategory = userCategories?.find((c: any) => c.name === 'Outros' && c.type === 'income');

  if (!defaultExpenseCategory || !defaultIncomeCategory) {
    console.log(`[CronSync] No default categories for user ${userId}, skipping`);
    return { inserted: 0, total: 0 };
  }

  // Fetch transactions from Pluggy
  const transactionsResponse = await getTransactions(apiKey, pluggyAccount.pluggy_account_id, from, to);
  const transactions = transactionsResponse.results || [];

  // Get existing transactions to avoid duplicates
  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('description, date, amount_cents')
    .eq('user_id', userId)
    .eq('account_id', pluggyAccount.local_account_id);

  const existingSet = new Set(
    (existingTransactions || []).map((t: any) => `${t.description}_${t.date}_${t.amount_cents}`)
  );

  const newTransactions = [];
  let autoDetectedCount = 0;

  for (const t of transactions) {
    const amountCents = Math.round(Math.abs(t.amount) * 100);
    const type = t.amount < 0 ? 'expense' : 'income';
    const key = `${t.description}_${t.date}_${amountCents}`;

    if (!existingSet.has(key)) {
      let categoryId: number;
      let needsReview = true;
      const detectedCategoryName = detectCategory(t.description || '');
      
      if (detectedCategoryName) {
        const detectedCategory = categoryMap.get(detectedCategoryName);
        if (detectedCategory && detectedCategory.type === type) {
          categoryId = detectedCategory.id;
          needsReview = false;
          autoDetectedCount++;
        } else {
          categoryId = type === 'income' 
            ? (defaultIncomeCategory?.id || defaultExpenseCategory.id)
            : defaultExpenseCategory.id;
        }
      } else {
        categoryId = type === 'income' 
          ? (defaultIncomeCategory?.id || defaultExpenseCategory.id)
          : defaultExpenseCategory.id;
      }

      newTransactions.push({
        user_id: userId,
        account_id: pluggyAccount.local_account_id,
        category_id: categoryId,
        description: t.description || 'Transação Open Banking',
        amount_cents: amountCents,
        type,
        date: t.date,
        needs_review: needsReview,
      });
    }
  }

  if (newTransactions.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .insert(newTransactions);

    if (error) {
      console.error(`[CronSync] Error inserting transactions for user ${userId}:`, error);
      throw error;
    }

    // Create notification for user about new transactions
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Novas transações sincronizadas',
        message: `${newTransactions.length} novas transações foram importadas automaticamente (${autoDetectedCount} categorizadas).`,
        type: 'info',
      });

    console.log(`[CronSync] Inserted ${newTransactions.length} transactions for user ${userId}`);
  }

  // Update balance
  if (transactions.length > 0) {
    const latestBalance = transactions[0].balance || pluggyAccount.balance_cents / 100;
    
    await supabase
      .from('pluggy_accounts')
      .update({
        balance_cents: Math.round((latestBalance || 0) * 100),
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', pluggyAccount.id);

    await supabase
      .from('accounts')
      .update({
        balance_cents: Math.round((latestBalance || 0) * 100),
      })
      .eq('id', pluggyAccount.local_account_id);
  }

  return { 
    inserted: newTransactions.length, 
    total: transactions.length,
    autoDetected: autoDetectedCount 
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[CronSync] Starting automatic bank transaction sync...');
  const startTime = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get all active bank connections
    const { data: connections, error: connError } = await supabase
      .from('bank_connections')
      .select(`
        id,
        user_id,
        pluggy_item_id,
        pluggy_accounts (*)
      `)
      .eq('status', 'CONNECTED');

    if (connError) {
      throw connError;
    }

    if (!connections || connections.length === 0) {
      console.log('[CronSync] No active connections found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active connections to sync',
        connections: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[CronSync] Found ${connections.length} active connections`);

    // Get Pluggy API key
    const apiKey = await getPluggyApiKey();

    // Calculate date range (last 7 days)
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().split('T')[0];

    let totalInserted = 0;
    let totalTransactions = 0;
    let totalAutoDetected = 0;
    let processedConnections = 0;
    let failedConnections = 0;

    for (const connection of connections) {
      try {
        for (const pluggyAccount of (connection.pluggy_accounts || [])) {
          if (!pluggyAccount.local_account_id) continue;

          const result = await syncTransactionsForUser(
            supabase,
            apiKey,
            connection.user_id,
            pluggyAccount,
            from,
            to
          );

          totalInserted += result.inserted;
          totalTransactions += result.total;
          totalAutoDetected += result.autoDetected || 0;
        }

        // Update connection last sync
        await supabase
          .from('bank_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        processedConnections++;
      } catch (error) {
        console.error(`[CronSync] Error syncing connection ${connection.id}:`, error);
        failedConnections++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CronSync] Sync completed in ${duration}ms. Inserted: ${totalInserted}, Total: ${totalTransactions}, Auto-detected: ${totalAutoDetected}`);

    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      connections_processed: processedConnections,
      connections_failed: failedConnections,
      transactions_inserted: totalInserted,
      transactions_total: totalTransactions,
      transactions_auto_detected: totalAutoDetected,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CronSync] Error in sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
