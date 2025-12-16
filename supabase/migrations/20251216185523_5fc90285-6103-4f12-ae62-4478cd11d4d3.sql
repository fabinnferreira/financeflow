-- Add restrictive policies to prevent direct manipulation of user_roles
-- Roles should only be assigned via the handle_new_user() trigger using SECURITY DEFINER

-- Prevent all users from inserting roles directly
CREATE POLICY "Prevent direct role insertion"
ON public.user_roles FOR INSERT
WITH CHECK (false);

-- Prevent all users from updating roles
CREATE POLICY "Prevent role updates"
ON public.user_roles FOR UPDATE
USING (false);

-- Prevent all users from deleting roles
CREATE POLICY "Prevent role deletion"
ON public.user_roles FOR DELETE
USING (false);