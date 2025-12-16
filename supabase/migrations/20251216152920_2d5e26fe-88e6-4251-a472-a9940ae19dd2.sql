-- Update has_role function to restrict who can check roles
-- Only allow users to check their own roles, or admins to check any user's roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    -- Users can only check their own roles
    WHEN auth.uid() = _user_id THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = _role
    )
    -- Admins can check any user's roles
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = _role
    )
    -- Otherwise return false
    ELSE false
  END
$$;