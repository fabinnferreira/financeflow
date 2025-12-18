-- Add needs_review column to transactions table for Open Banking imports
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- Create index for efficient querying of transactions needing review
CREATE INDEX IF NOT EXISTS idx_transactions_needs_review 
ON public.transactions (user_id, needs_review) 
WHERE needs_review = true;