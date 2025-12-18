-- Fix: Service role bypass for notification insertion
-- Drop the vulnerable policy that uses JWT claims
DROP POLICY IF EXISTS "service_or_claim_insert_notifications" ON notifications;

-- Create a proper service_role only policy
-- The service_role key bypasses RLS entirely, so we only need user INSERT policy
-- Edge functions using service role key will bypass RLS as intended
CREATE POLICY "Users can insert their own notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Alternative: Allow service role via role claim (proper way)
-- Note: Service role key automatically bypasses RLS, so this policy
-- allows users to create their own notifications if needed in the future