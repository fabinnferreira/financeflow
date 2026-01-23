-- Fix profiles table security: Ensure no public/anonymous access to sensitive data
-- The profiles table contains Stripe customer IDs and subscription IDs which must be protected

-- First, drop the existing restrictive policies and recreate them as permissive policies
-- This ensures proper security model where authenticated users can ONLY access their own data
-- and unauthenticated users have NO access

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.profiles;

-- Create properly configured permissive policies for authenticated users only
-- SELECT: Users can only see their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Users can only insert their own profile (used by handle_new_user trigger)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- IMPORTANT: The trigger handle_new_user runs as SECURITY DEFINER and can insert profiles
-- No explicit anonymous policy means anonymous users have NO access (default deny)