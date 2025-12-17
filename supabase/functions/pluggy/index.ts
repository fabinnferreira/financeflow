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
  transactions: any[]
) {
  console.log(`Syncing ${transactions.length} transactions to database...`);
  
  // Get default category for the user (use "Outros" expense category)
  const { data: defaultCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Outros')
    .eq('type', 'expense')
    .single();

  const defaultCategoryId = defaultCategory?.id;

  if (!defaultCategoryId) {
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
  for (const t of transactions) {
    const amountCents = Math.round(Math.abs(t.amount) * 100);
    const type = t.amount < 0 ? 'expense' : 'income';
    const key = `${t.description}_${t.date}_${amountCents}`;

    if (!existingSet.has(key)) {
      newTransactions.push({
        user_id: userId,
        account_id: localAccountId,
        category_id: defaultCategoryId,
        description: t.description || 'Transação Open Banking',
        amount_cents: amountCents,
        type,
        date: t.date,
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
    console.log(`Inserted ${newTransactions.length} new transactions`);
  } else {
    console.log('No new transactions to insert');
  }

  return { inserted: newTransactions.length, total: transactions.length };
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
        const { connectionId, from, to } = params;
        
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
            transactions
          );

          totalInserted += syncResult.inserted;
          totalTransactions += syncResult.total;

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
          message: `Sincronizadas ${totalInserted} novas transações de ${totalTransactions} encontradas`
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
