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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate using service role key or custom secret
    const authHeader = req.headers.get('authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const expectedAuth = `Bearer ${serviceKey}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.error('Unauthorized access attempt to check-credit-card-due')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('Starting credit card due date check...')

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
      console.error('Error fetching credit cards:', fetchError)
      throw fetchError
    }

    console.log(`Found ${creditCards?.length || 0} credit cards to check`)

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
      console.log(`Creating ${notificationsToCreate.length} notifications`)
      
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate)

      if (insertError) {
        console.error('Error creating notifications:', insertError)
        throw insertError
      }

      console.log('Notifications created successfully')
    } else {
      console.log('No notifications to create today')
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
    console.error('Error in check-credit-card-due:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
