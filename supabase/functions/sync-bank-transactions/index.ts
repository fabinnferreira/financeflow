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

// Category mapping based on transaction description keywords (expanded)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': [
    // Delivery apps
    'ifood', 'uber eats', 'rappi', 'zé delivery', 'ze delivery', 'aiqfome', 'james delivery',
    // Restaurants & fast food
    'restaurante', 'lanchonete', 'pizzaria', 'churrascaria', 'rodizio', 'buffet',
    'mcdonalds', 'burger king', 'subway', 'starbucks', 'habib', 'habibs', 'sushi',
    'bobs', 'kfc', 'popeyes', 'outback', 'madero', 'paris 6', 'coco bambu',
    'giraffas', 'spoleto', 'china in box', 'dominos', 'pizza hut',
    // Bakeries & cafes
    'padaria', 'panificadora', 'confeitaria', 'café', 'coffee', 'cafeteria', 'doceria',
    // Markets & supermarkets
    'mercado', 'supermercado', 'carrefour', 'extra', 'pão de açúcar', 'pao de acucar',
    'assai', 'atacadão', 'atacadao', 'hortifruti', 'hortifrutti', 'verdureiro',
    'açougue', 'acougue', 'peixaria', 'emporio', 'empório', 'quitanda',
    'dia supermercados', 'big', 'fort atacadista', 'sam\'s club', 'makro',
    'natural da terra', 'mundo verde', 'casa de carnes', 'minuto pao de acucar',
    // Others
    'alimentacao', 'alimentação', 'refeicao', 'refeição', 'lanche', 'almoço', 'almoco',
    'jantar', 'janta', 'snacks', 'doces', 'sorvete', 'sorveteria', 'gelateria'
  ],
  'Transporte': [
    // Ride apps
    'uber', '99', '99app', 'taxi', 'táxi', 'cabify', 'indriver', '99 pop', '99 comfort',
    'uber x', 'uber black', 'uber comfort', 'lyft', 'blablacar',
    // Fuel & gas stations
    'combustivel', 'combustível', 'gasolina', 'etanol', 'alcool', 'álcool', 'diesel',
    'posto', 'ipiranga', 'shell', 'petrobras', 'br distribuidora', 'ale', 'rede',
    'petrobrás', 'posto de gasolina', 'abastecimento',
    // Parking & tolls
    'estacionamento', 'parking', 'park', 'estapar', 'zona azul', 'rotativo',
    'sem parar', 'conectcar', 'veloe', 'move mais', 'c6 tag', 'tag',
    'pedagio', 'pedágio', 'autoban', 'ccr', 'ecorodovias', 'arteris',
    // Public transport
    'metro', 'metrô', 'ônibus', 'onibus', 'trem', 'brt', 'vlt', 'cptm', 'sptrans',
    'passagem', 'bilhete unico', 'bilhete único', 'riocard', 'bom',
    // Vehicle maintenance
    'oficina', 'mecânico', 'mecanico', 'borracharia', 'troca de oleo', 'troca de óleo',
    'lavagem', 'lava rapido', 'lava rápido', 'lava jato', 'funilaria', 'auto center',
    'auto peças', 'auto pecas', 'pneu', 'pneus', 'alignment', 'balanceamento'
  ],
  'Moradia': [
    // Rent & condo
    'aluguel', 'condominio', 'condomínio', 'taxa condominio', 'fundo reserva',
    'iptu', 'itbi', 'escritura', 'cartorio', 'cartório', 'imobiliaria', 'imobiliária',
    // Utilities - Electricity
    'luz', 'energia', 'eletricidade', 'enel', 'cemig', 'copel', 'celesc', 'cpfl',
    'light', 'eletropaulo', 'coelba', 'celpe', 'energisa', 'elektro', 'equatorial',
    // Utilities - Water
    'agua', 'água', 'sabesp', 'copasa', 'sanepar', 'cedae', 'embasa', 'compesa',
    'saneago', 'casan', 'corsan', 'dae', 'dmae', 'samae',
    // Utilities - Gas
    'gás', 'gas', 'comgas', 'gas natural', 'ultragaz', 'supergasbras', 'copagaz',
    'nacional gas', 'liquigas', 'ceg', 'sulgás',
    // Internet & TV
    'internet', 'fibra', 'net', 'vivo fibra', 'claro net', 'claro tv', 'oi fibra',
    'tim live', 'sky', 'directv', 'algar', 'brisanet', 'desktop', 'copel telecom',
    // Home services
    'seguro residencial', 'seguro casa', 'alarme', 'monitoramento', 'adt',
    'diarista', 'faxineira', 'empregada', 'jardineiro', 'porteiro'
  ],
  'Telefone': [
    'vivo', 'tim', 'claro', 'oi', 'nextel', 'telefone', 'celular', 'recarga',
    'credito celular', 'crédito celular', 'telefonia', 'plano celular',
    'pre pago', 'pré pago', 'pos pago', 'pós pago', 'algar telecom', 'sercomtel'
  ],
  'Lazer': [
    // Streaming services
    'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'disney+',
    'hbo', 'hbo max', 'max', 'globoplay', 'deezer', 'apple music', 'youtube premium',
    'youtube music', 'paramount+', 'paramount plus', 'star+', 'star plus', 'crunchyroll',
    'twitch', 'apple tv', 'tidal', 'amazon music',
    // Entertainment venues
    'cinema', 'ingresso', 'ingresso.com', 'sympla', 'eventim', 'teatro', 'show',
    'evento', 'parque', 'parque de diversões', 'zoologico', 'zoológico', 'aquario',
    'museu', 'exposição', 'exposicao', 'circo', 'festival', 'boate', 'balada',
    'bar', 'pub', 'happy hour', 'karaoke',
    // Games
    'xbox', 'playstation', 'psn', 'steam', 'games', 'jogos', 'nintendo', 'epic games',
    'riot games', 'blizzard', 'ea sports', 'ubisoft', 'game pass', 'ps plus',
    // Sports & fitness
    'academia', 'smart fit', 'smartfit', 'bodytech', 'bluefit', 'selfit',
    'crossfit', 'pilates', 'yoga', 'natação', 'natacao', 'esporte', 'futebol',
    'quadra', 'clube', 'sócio torcedor', 'socio torcedor',
    // Travel & leisure
    'hotel', 'pousada', 'airbnb', 'booking', 'trivago', 'decolar', 'submarino viagens',
    'cvc', 'hurb', 'hoteis.com', 'expedia'
  ],
  'Saúde': [
    // Pharmacies
    'farmacia', 'farmácia', 'drogaria', 'droga raia', 'drogaraia', 'drogasil',
    'pacheco', 'pague menos', 'sao paulo', 'são paulo', 'panvel', 'nissei',
    'venancio', 'araujo', 'araújo', 'extrafarma', 'onofre', 'ultrafarma',
    // Medical services
    'hospital', 'clinica', 'clínica', 'medico', 'médico', 'consulta',
    'dentista', 'odonto', 'odontologia', 'ortodontia', 'implante',
    'laboratorio', 'laboratório', 'exame', 'ultrassom', 'raio x', 'radiologia',
    'tomografia', 'ressonância', 'endoscopia', 'hemograma', 'checkup',
    // Health insurance
    'plano de saude', 'plano de saúde', 'unimed', 'bradesco saude', 'bradesco saúde',
    'amil', 'sulamerica', 'sul america', 'sul américa', 'hapvida', 'notre dame',
    'intermédica', 'intermedica', 'prevent senior', 'golden cross', 'assim saude',
    'camed', 'cassi', 'postal saude', 'geap',
    // Optical & others
    'otica', 'óptica', 'oticas carol', 'chilli beans', 'lentes de contato',
    'oculos', 'óculos', 'lente', 'audiologia', 'fonoaudiologia', 'psicologia',
    'psiquiatria', 'fisioterapia', 'nutricao', 'nutrição', 'nutricionista',
    'dermatologia', 'ortopedia', 'cardiologia', 'ginecologia', 'urologia'
  ],
  'Educação': [
    // Schools & universities
    'escola', 'colegio', 'colégio', 'faculdade', 'universidade', 'uni',
    'mensalidade escolar', 'matricula', 'matrícula', 'educação', 'educacao',
    'ensino', 'creche', 'maternal', 'infantil', 'fundamental', 'medio', 'médio',
    // Online courses
    'curso', 'cursos', 'udemy', 'alura', 'coursera', 'udacity', 'duolingo',
    'babbel', 'domestika', 'skillshare', 'linkedin learning', 'rocketseat',
    'origamid', 'platzi', 'hotmart', 'eduzz', 'kiwify',
    // Books & materials
    'livro', 'livros', 'livraria', 'saraiva', 'cultura', 'travessa', 'leitura',
    'apostila', 'material escolar', 'papelaria', 'kalunga', 'caderno', 'mochila',
    // Languages
    'ingles', 'inglês', 'espanhol', 'francês', 'frances', 'alemao', 'alemão',
    'italiano', 'wizard', 'ccaa', 'fisk', 'cultura inglesa', 'yazigi', 'uptime',
    'wise up', 'cel lep', 'cna', 'open english', 'cambridge', 'toefl', 'ielts',
    // Test prep
    'enem', 'vestibular', 'concurso', 'preparatório', 'preparatorio', 'cursinho',
    'objetivo', 'anglo', 'etapa', 'poliedro', 'bernoulli', 'descomplica',
    'estrategia concursos', 'estratégia concursos', 'gran cursos'
  ],
  'Compras': [
    // Marketplaces
    'amazon', 'mercado livre', 'mercadolivre', 'magalu', 'magazine luiza',
    'americanas', 'shopee', 'aliexpress', 'shein', 'wish', 'temu',
    // Fashion
    'renner', 'riachuelo', 'c&a', 'cea', 'zara', 'h&m', 'forever 21',
    'marisa', 'pernambucanas', 'hering', 'youcom', 'arezzo', 'schutz',
    'farm', 'animale', 'le lis blanc', 'shoulder', 'osklen', 'ellus',
    // Sports
    'centauro', 'netshoes', 'decathlon', 'nike', 'adidas', 'puma',
    'mizuno', 'under armour', 'loja esporte', 'artigos esportivos',
    // Electronics
    'casas bahia', 'ponto frio', 'fast shop', 'fnac', 'kabum', 'pichau',
    'terabyte', 'dell', 'apple store', 'samsung store', 'xiaomi store',
    'multilaser', 'positivo', 'eletronica', 'eletrônicos',
    // Department stores
    'tok stok', 'etna', 'mobly', 'mmartan', 'camicado', 'dpaschoal', 'polishop',
    'le biscuit', 'lojas mel', 'ri happy', 'pbkids', 'lego store',
    // Beauty
    'o boticario', 'boticário', 'natura', 'avon', 'eudora', 'sephora',
    'mac cosmetics', 'quem disse berenice', 'beleza na web', 'epocacosmeticos',
    'época cosméticos', 'the body shop', 'loccitane', 'mary kay'
  ],
  'Utilidades': [
    // Bank fees
    'tarifa', 'taxa bancaria', 'taxa bancária', 'anuidade', 'iof',
    'ted', 'doc', 'transferencia', 'transferência', 'saque', 'cpmf',
    // Subscriptions & services
    'assinatura', 'mensalidade', 'renovacao', 'renovação', 'plano mensal',
    'servico', 'serviço', 'manutencao', 'manutenção', 'reparo', 'conserto',
    // Insurance
    'seguro', 'porto seguro', 'bradesco seguros', 'itau seguros', 'azul seguros',
    'liberty', 'tokio marine', 'allianz', 'mapfre', 'suhai', 'hdi seguros',
    // Others
    'correios', 'sedex', 'pac', 'envio', 'frete', 'entrega', 'loggi',
    'jadlog', 'total express', 'lalamove', 'uber flash'
  ],
  'Salário': [
    'salario', 'salário', 'folha', 'folha de pagamento', 'pgto', 'pagamento',
    'vencimentos', 'remuneracao', 'remuneração', 'proventos', 'holerite',
    'adiantamento', 'ferias', 'férias', '13o salario', '13º salário', 'decimo terceiro',
    'plr', 'participacao lucros', 'participação lucros', 'bonus', 'bônus',
    'comissao', 'comissão', 'premio', 'prêmio', 'gratificacao', 'gratificação'
  ],
  'Freelance': [
    'freelance', 'freelancer', 'servico prestado', 'serviço prestado',
    'nota fiscal', 'nf', 'rpa', 'recibo', 'autonomo', 'autônomo',
    'mei', 'microempreendedor', 'pj', 'pessoa juridica', 'pessoa jurídica',
    'consultoria', 'projeto', 'trabalho', 'contrato', 'honorarios', 'honorários'
  ],
  'Investimentos': [
    // Fixed income
    'rendimento', 'rentabilidade', 'cdb', 'lci', 'lca', 'lc', 'debênture', 'debenture',
    'tesouro direto', 'tesouro selic', 'tesouro ipca', 'tesouro prefixado',
    'poupanca', 'poupança', 'rdb', 'cri', 'cra',
    // Variable income
    'dividendo', 'dividendos', 'jcp', 'jscp', 'juros sobre capital',
    'fii', 'fiis', 'fundo imobiliario', 'fundo imobiliário',
    'ação', 'acao', 'acoes', 'ações', 'etf', 'bdr', 'opcoes', 'opções',
    // Crypto
    'cripto', 'criptomoeda', 'bitcoin', 'btc', 'ethereum', 'eth', 'binance',
    'mercado bitcoin', 'foxbit', 'novadax', 'bitso',
    // Brokers & funds
    'corretora', 'xp', 'rico', 'clear', 'btg', 'inter invest', 'modal',
    'fundo de investimento', 'previdência', 'previdencia', 'pgbl', 'vgbl'
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
