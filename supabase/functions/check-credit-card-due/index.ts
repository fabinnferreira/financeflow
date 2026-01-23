import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreditCardDetails {
  id: number
  account_id: number
  due_day: number
  closing_day: number
  user_id: string
  accounts: {
    name: string
    balance_cents: number
  } | null
}

// Timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Validate internal cron request using HMAC
async function validateCronRequest(req: Request): Promise<boolean> {
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  // If no CRON_SECRET is set, fall back to checking for internal request pattern
  // This allows the function to work with pg_cron without a separate secret
  if (!cronSecret) {
    // Check if request comes from Supabase internal (no external origin)
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    
    // Internal cron calls typically have no origin/referer
    // and come through Supabase's internal network
    if (!origin && !referer) {
      console.log('[CronCheck] Internal request detected (no origin/referer)');
      return true;
    }
    
    console.error('[CronCheck] External request blocked - CRON_SECRET not configured');
    return false;
  }
  
  // If CRON_SECRET is set, validate HMAC signature
  const signature = req.headers.get('x-cron-signature');
  const timestamp = req.headers.get('x-cron-timestamp');
  
  if (!signature || !timestamp) {
    console.error('[CronCheck] Missing signature or timestamp headers');
    return false;
  }
  
  // Verify timestamp to prevent replay attacks (within 5 minutes)
  const requestTime = parseInt(timestamp);
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > 300000) {
    console.error('[CronCheck] Request timestamp expired or invalid');
    return false;
  }
  
  // Verify HMAC signature
  try {
    const payload = `${timestamp}.credit-card-due`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(cronSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSigBytes = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    );
    
    // Decode the provided signature (base64)
    let providedSigBytes: Uint8Array;
    try {
      providedSigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    } catch {
      console.error('[CronCheck] Invalid signature format');
      return false;
    }
    
    if (!timingSafeEqual(expectedSigBytes, providedSigBytes)) {
      console.error('[CronCheck] Invalid HMAC signature');
      return false;
    }
    
    console.log('[CronCheck] Valid HMAC signature verified');
    return true;
  } catch (error) {
    console.error('[CronCheck] Error verifying signature:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate the request is from internal cron or has valid HMAC
    const isValidCron = await validateCronRequest(req);
    
    if (!isValidCron) {
      console.error('[CronCheck] Unauthorized access attempt to check-credit-card-due')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('[CronCheck] Starting credit card due date check...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date()
    const currentDay = today.getDate()
    
    // Get all credit card details with their accounts
    const { data: creditCards, error: fetchError } = await supabase
      .from('credit_cards_details')
      .select(`
        id,
        account_id,
        due_day,
        closing_day,
        user_id,
        accounts (
          name,
          balance_cents
        )
      `)

    if (fetchError) {
      console.error('[CronCheck] Error fetching credit cards:', fetchError)
      throw fetchError
    }

    console.log(`[CronCheck] Found ${creditCards?.length || 0} credit cards to check`)

    const notificationsToCreate: any[] = []

    for (const card of (creditCards as unknown as CreditCardDetails[]) || []) {
      const daysUntilDue = card.due_day - currentDay
      const accountName = card.accounts?.name || 'Cartão de Crédito'
      const balance = (card.accounts?.balance_cents || 0) / 100

      // Notify 3 days before due date
      if (daysUntilDue === 3) {
        notificationsToCreate.push({
          user_id: card.user_id,
          title: '⚠️ Fatura próxima do vencimento',
          message: `A fatura do ${accountName} vence em 3 dias (dia ${card.due_day}). Valor: R$ ${balance.toFixed(2)}`,
          type: 'credit_card',
          related_id: card.account_id,
        })
      }

      // Notify 1 day before due date
      if (daysUntilDue === 1) {
        notificationsToCreate.push({
          user_id: card.user_id,
          title: '🔔 Fatura vence amanhã!',
          message: `A fatura do ${accountName} vence amanhã (dia ${card.due_day}). Valor: R$ ${balance.toFixed(2)}`,
          type: 'credit_card',
          related_id: card.account_id,
        })
      }

      // Notify on due date
      if (daysUntilDue === 0) {
        notificationsToCreate.push({
          user_id: card.user_id,
          title: '🚨 Fatura vence hoje!',
          message: `A fatura do ${accountName} vence HOJE. Valor: R$ ${balance.toFixed(2)}. Não esqueça de pagar!`,
          type: 'warning',
          related_id: card.account_id,
        })
      }

      // Notify about closing date (2 days before)
      const daysUntilClosing = card.closing_day - currentDay
      if (daysUntilClosing === 2) {
        notificationsToCreate.push({
          user_id: card.user_id,
          title: '📅 Fechamento de fatura em breve',
          message: `A fatura do ${accountName} fecha em 2 dias (dia ${card.closing_day}). Gastos atuais: R$ ${Math.abs(balance).toFixed(2)}`,
          type: 'info',
          related_id: card.account_id,
        })
      }
    }

    // Insert notifications
    if (notificationsToCreate.length > 0) {
      console.log(`[CronCheck] Creating ${notificationsToCreate.length} notifications`)
      
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate)

      if (insertError) {
        console.error('[CronCheck] Error creating notifications:', insertError)
        throw insertError
      }

      console.log('[CronCheck] Notifications created successfully')
    } else {
      console.log('[CronCheck] No notifications to create today')
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notificationsToCreate.length,
        checkedCards: creditCards?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('[CronCheck] Error in check-credit-card-due:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
