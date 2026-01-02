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
  let { data: userCategories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);

  // Ensure default categories exist
  const hasOutrosExpense = userCategories?.some((c: any) => c.name === 'Outros' && c.type === 'expense');
  const hasOutrosIncome = userCategories?.some((c: any) => c.name === 'Outros' && c.type === 'income');

  if (!hasOutrosExpense) {
    console.log('Creating default expense category "Outros"...');
    const { data: newCat } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: 'Outros',
        type: 'expense',
        emoji: '📦',
        color: '#6b7280'
      })
      .select()
      .single();
    if (newCat) userCategories = [...(userCategories || []), newCat];
  }

  if (!hasOutrosIncome) {
    console.log('Creating default income category "Outros"...');
    const { data: newCat } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: 'Outros',
        type: 'income',
        emoji: '💰',
        color: '#22c55e'
      })
      .select()
      .single();
    if (newCat) userCategories = [...(userCategories || []), newCat];
  }

  const categoryMap = new Map<string, { id: number; type: string }>();
  for (const cat of (userCategories || [])) {
    categoryMap.set(`${cat.name}_${cat.type}`, { id: cat.id, type: cat.type });
  }

  // Get default categories by type
  const defaultExpenseCategory = userCategories?.find((c: any) => c.name === 'Outros' && c.type === 'expense');
  const defaultIncomeCategory = userCategories?.find((c: any) => c.name === 'Outros' && c.type === 'income');

  if (!defaultExpenseCategory || !defaultIncomeCategory) {
    console.error('No default categories found for user');
    throw new Error('Default categories not found');
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
