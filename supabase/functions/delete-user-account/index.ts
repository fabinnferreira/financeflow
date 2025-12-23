import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Invalid authorization token');
    }

    const userId = user.id;
    console.log(`[DeleteAccount] Starting account deletion for user: ${userId}`);

    // Delete all user data in order (respecting foreign key constraints)
    
    // 1. Delete transactions
    const { error: transError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('user_id', userId);
    if (transError) console.error('Error deleting transactions:', transError);
    else console.log('[DeleteAccount] Transactions deleted');

    // 2. Delete notifications
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (notifError) console.error('Error deleting notifications:', notifError);
    else console.log('[DeleteAccount] Notifications deleted');

    // 3. Delete financial goals
    const { error: goalsError } = await supabaseAdmin
      .from('financial_goals')
      .delete()
      .eq('user_id', userId);
    if (goalsError) console.error('Error deleting goals:', goalsError);
    else console.log('[DeleteAccount] Financial goals deleted');

    // 4. Delete credit card details
    const { error: creditError } = await supabaseAdmin
      .from('credit_cards_details')
      .delete()
      .eq('user_id', userId);
    if (creditError) console.error('Error deleting credit cards:', creditError);
    else console.log('[DeleteAccount] Credit card details deleted');

    // 5. Delete pluggy accounts
    const { error: pluggyAccError } = await supabaseAdmin
      .from('pluggy_accounts')
      .delete()
      .eq('user_id', userId);
    if (pluggyAccError) console.error('Error deleting pluggy accounts:', pluggyAccError);
    else console.log('[DeleteAccount] Pluggy accounts deleted');

    // 6. Delete bank connections
    const { error: bankConnError } = await supabaseAdmin
      .from('bank_connections')
      .delete()
      .eq('user_id', userId);
    if (bankConnError) console.error('Error deleting bank connections:', bankConnError);
    else console.log('[DeleteAccount] Bank connections deleted');

    // 7. Delete accounts
    const { error: accountsError } = await supabaseAdmin
      .from('accounts')
      .delete()
      .eq('user_id', userId);
    if (accountsError) console.error('Error deleting accounts:', accountsError);
    else console.log('[DeleteAccount] Accounts deleted');

    // 8. Delete categories
    const { error: catError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('user_id', userId);
    if (catError) console.error('Error deleting categories:', catError);
    else console.log('[DeleteAccount] Categories deleted');

    // 9. Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesError) console.error('Error deleting user roles:', rolesError);
    else console.log('[DeleteAccount] User roles deleted');

    // 10. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) console.error('Error deleting profile:', profileError);
    else console.log('[DeleteAccount] Profile deleted');

    // 11. Finally, delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw new Error('Failed to delete auth user');
    }
    console.log('[DeleteAccount] Auth user deleted');

    console.log(`[DeleteAccount] Account deletion completed for user: ${userId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Account deleted successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[DeleteAccount] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});