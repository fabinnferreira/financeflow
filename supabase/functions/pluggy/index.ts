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

interface PluggyAuthResponse {
  apiKey: string;
}

interface PluggyConnectToken {
  accessToken: string;
}

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
  console.log('Authenticating with Pluggy API...');
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
    console.error('Pluggy auth error:', error);
    throw new Error(`Pluggy auth failed: ${error}`);
  }

  const data: PluggyAuthResponse = await response.json();
  console.log('Pluggy authentication successful');
  return data.apiKey;
}

async function createConnectToken(apiKey: string): Promise<string> {
  console.log('Creating Pluggy connect token...');
  const response = await fetch(`${PLUGGY_API_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Connect token error:', error);
    throw new Error(`Connect token failed: ${error}`);
  }

  const data: PluggyConnectToken = await response.json();
  console.log('Connect token created successfully');
  return data.accessToken;
}

async function getItem(apiKey: string, itemId: string) {
  console.log(`Fetching item ${itemId}...`);
  const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Get item error:', error);
    throw new Error(`Get item failed: ${error}`);
  }

  return response.json();
}

async function getAccounts(apiKey: string, itemId: string) {
  console.log(`Fetching accounts for item ${itemId}...`);
  const response = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Get accounts error:', error);
    throw new Error(`Get accounts failed: ${error}`);
  }

  return response.json();
}

async function getTransactions(apiKey: string, accountId: string, from?: string, to?: string) {
  console.log(`Fetching transactions for account ${accountId}...`);
  let url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}&pageSize=500`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;

  const response = await fetch(url, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Get transactions error:', error);
    throw new Error(`Get transactions failed: ${error}`);
  }

  return response.json();
}

async function deleteItem(apiKey: string, itemId: string) {
  console.log(`Deleting item ${itemId}...`);
  const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Delete item error:', error);
    throw new Error(`Delete item failed: ${error}`);
  }

  return { success: true };
}

async function syncTransactionsToDatabase(
  supabase: any,
  userId: string,
  pluggyAccountId: string,
  localAccountId: number,
  transactions: any[],
  markForReview: boolean = true
) {
  console.log(`Syncing ${transactions.length} transactions to database...`);
  
  // Get all user categories for auto-detection
  const { data: userCategories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);

  const categoryMap = new Map<string, { id: number; type: string }>();
  for (const cat of (userCategories || [])) {
    categoryMap.set(cat.name, { id: cat.id, type: cat.type });
  }

  // Get default category for the user (use "Outros" expense category)
  const defaultExpenseCategory = categoryMap.get('Outros');
  const defaultIncomeCategory = userCategories?.find((c: any) => c.type === 'income');

  if (!defaultExpenseCategory) {
    console.error('No default category found for user');
    throw new Error('Default category not found');
  }

  // Get existing transactions to avoid duplicates (by description + date + amount)
  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('description, date, amount_cents')
    .eq('user_id', userId)
    .eq('account_id', localAccountId);

  const existingSet = new Set(
    (existingTransactions || []).map((t: { description: string; date: string; amount_cents: number }) =>
      `${t.description}_${t.date}_${t.amount_cents}`
    )
  );

  const newTransactions = [];
  let autoDetectedCount = 0;

  for (const t of transactions) {
    const amountCents = Math.round(Math.abs(t.amount) * 100);
    const type = t.amount < 0 ? 'expense' : 'income';
    const key = `${t.description}_${t.date}_${amountCents}`;

    if (!existingSet.has(key)) {
      // Try to auto-detect category
      let categoryId: number;
      let needsReview = markForReview;
      const detectedCategoryName = detectCategory(t.description || '');
      
      if (detectedCategoryName) {
        const detectedCategory = categoryMap.get(detectedCategoryName);
        if (detectedCategory && detectedCategory.type === type) {
          categoryId = detectedCategory.id;
          needsReview = false; // Auto-detected, no need for review
          autoDetectedCount++;
        } else {
          // Category exists but wrong type, use default
          categoryId = type === 'income' 
            ? (defaultIncomeCategory?.id || defaultExpenseCategory.id)
            : defaultExpenseCategory.id;
        }
      } else {
        // No category detected, use default
        categoryId = type === 'income' 
          ? (defaultIncomeCategory?.id || defaultExpenseCategory.id)
          : defaultExpenseCategory.id;
      }

      newTransactions.push({
        user_id: userId,
        account_id: localAccountId,
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
      console.error('Error inserting transactions:', error);
      throw error;
    }
    console.log(`Inserted ${newTransactions.length} new transactions (${autoDetectedCount} auto-categorized)`);
  } else {
    console.log('No new transactions to insert');
  }

  return { 
    inserted: newTransactions.length, 
    total: transactions.length,
    autoDetected: autoDetectedCount,
    needsReview: newTransactions.length - autoDetectedCount
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client for user operations
    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const userId = user.id;
    const { action, ...params } = await req.json();
    console.log(`Processing action: ${action} for user: ${userId}`);

    const apiKey = await getPluggyApiKey();

    let result;

    switch (action) {
      case 'create_connect_token': {
        const accessToken = await createConnectToken(apiKey);
        result = { accessToken };
        break;
      }

      case 'save_connection': {
        const { itemId } = params;
        const item = await getItem(apiKey, itemId);
        
        // Save bank connection
        const { data: connection, error: connError } = await supabaseClient
          .from('bank_connections')
          .insert({
            user_id: userId,
            pluggy_item_id: itemId,
            connector_name: item.connector?.name || 'Banco',
            connector_logo: item.connector?.imageUrl || null,
            status: item.status || 'CONNECTED',
            last_sync_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (connError) {
          console.error('Error saving connection:', connError);
          throw connError;
        }

        // Fetch and save accounts
        const accountsResponse = await getAccounts(apiKey, itemId);
        const accounts = accountsResponse.results || [];

        for (const acc of accounts) {
          // Create local account
          const accountType = acc.type === 'CREDIT' ? 'credit_card' : 
                             acc.type === 'CHECKING' ? 'bank' : 'bank';
          
          const { data: localAccount, error: accError } = await supabaseClient
            .from('accounts')
            .insert({
              user_id: userId,
              name: `${item.connector?.name || 'Banco'} - ${acc.name}`,
              type: accountType,
              balance_cents: Math.round((acc.balance || 0) * 100),
            })
            .select()
            .single();

          if (accError) {
            console.error('Error creating local account:', accError);
            continue;
          }

          // Save pluggy account reference
          await supabaseClient
            .from('pluggy_accounts')
            .insert({
              user_id: userId,
              bank_connection_id: connection.id,
              pluggy_account_id: acc.id,
              local_account_id: localAccount.id,
              name: acc.name,
              type: acc.type,
              subtype: acc.subtype || null,
              balance_cents: Math.round((acc.balance || 0) * 100),
              currency_code: acc.currencyCode || 'BRL',
              last_sync_at: new Date().toISOString(),
            });
        }

        result = { connection, accountsCount: accounts.length };
        break;
      }

      case 'sync_transactions': {
        const { connectionId, from, to, markForReview = true } = params;
        
        // Get the bank connection
        const { data: connection, error: connError } = await supabaseClient
          .from('bank_connections')
          .select('*')
          .eq('id', connectionId)
          .eq('user_id', userId)
          .single();

        if (connError || !connection) {
          throw new Error('Connection not found');
        }

        // Get pluggy accounts for this connection
        const { data: pluggyAccounts } = await supabaseClient
          .from('pluggy_accounts')
          .select('*')
          .eq('bank_connection_id', connectionId);

        let totalInserted = 0;
        let totalTransactions = 0;
        let totalAutoDetected = 0;
        let totalNeedsReview = 0;

        for (const pAccount of (pluggyAccounts || [])) {
          if (!pAccount.local_account_id) continue;

          const transactionsResponse = await getTransactions(
            apiKey, 
            pAccount.pluggy_account_id,
            from,
            to
          );
          const transactions = transactionsResponse.results || [];

          const syncResult = await syncTransactionsToDatabase(
            supabaseClient,
            userId,
            pAccount.pluggy_account_id,
            pAccount.local_account_id,
            transactions,
            markForReview
          );

          totalInserted += syncResult.inserted;
          totalTransactions += syncResult.total;
          totalAutoDetected += syncResult.autoDetected;
          totalNeedsReview += syncResult.needsReview;

          // Update account balance
          const latestBalance = transactions.length > 0 
            ? transactions[0].balance 
            : pAccount.balance_cents / 100;

          await supabaseClient
            .from('pluggy_accounts')
            .update({
              balance_cents: Math.round((latestBalance || 0) * 100),
              last_sync_at: new Date().toISOString(),
            })
            .eq('id', pAccount.id);

          await supabaseClient
            .from('accounts')
            .update({
              balance_cents: Math.round((latestBalance || 0) * 100),
            })
            .eq('id', pAccount.local_account_id);
        }

        // Update connection last sync
        await supabaseClient
          .from('bank_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connectionId);

        result = { 
          inserted: totalInserted, 
          total: totalTransactions,
          autoDetected: totalAutoDetected,
          needsReview: totalNeedsReview,
          message: `Sincronizadas ${totalInserted} novas transações (${totalAutoDetected} categorizadas automaticamente, ${totalNeedsReview} para revisão)`
        };
        break;
      }

      case 'delete_connection': {
        const { connectionId } = params;
        
        // Get connection to find itemId
        const { data: connection } = await supabaseClient
          .from('bank_connections')
          .select('pluggy_item_id')
          .eq('id', connectionId)
          .eq('user_id', userId)
          .single();

        if (connection?.pluggy_item_id) {
          try {
            await deleteItem(apiKey, connection.pluggy_item_id);
          } catch (e) {
            console.error('Error deleting Pluggy item:', e);
          }
        }

        // Delete from database (cascades will handle related records)
        await supabaseClient
          .from('pluggy_accounts')
          .delete()
          .eq('bank_connection_id', connectionId);

        await supabaseClient
          .from('bank_connections')
          .delete()
          .eq('id', connectionId)
          .eq('user_id', userId);

        result = { success: true };
        break;
      }

      case 'get_connections': {
        const { data: connections, error } = await supabaseClient
          .from('bank_connections')
          .select(`
            *,
            pluggy_accounts (*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        result = { connections };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pluggy function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
