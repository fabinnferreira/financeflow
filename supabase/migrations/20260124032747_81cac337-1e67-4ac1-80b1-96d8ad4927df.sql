-- Atualizar perfil para premium vitalício (sem data de expiração do trial)
UPDATE public.profiles 
SET 
  plan = 'premium',
  trial_ends_at = NULL,
  plan_started_at = NOW()
WHERE id = 'a1d467d9-133c-44d4-8794-52a00b3b464c';

-- Adicionar role de admin (se ainda não tiver)
INSERT INTO public.user_roles (user_id, role)
VALUES ('a1d467d9-133c-44d4-8794-52a00b3b464c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;