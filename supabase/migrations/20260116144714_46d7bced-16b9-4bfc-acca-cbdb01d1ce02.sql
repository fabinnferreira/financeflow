-- Atualizar a função de criação de perfil para incluir trial de 7 dias
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil com trial de 7 dias
  INSERT INTO public.profiles (id, name, plan, trial_ends_at)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'name',
    'premium',
    NOW() + INTERVAL '7 days'
  );
  
  -- Atribuir role padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Criar categorias padrão de despesas
  INSERT INTO public.categories (user_id, name, type, emoji, color) VALUES
    (NEW.id, 'Alimentação', 'expense', '🍔', '#ef4444'),
    (NEW.id, 'Transporte', 'expense', '🚗', '#f97316'),
    (NEW.id, 'Saúde', 'expense', '🏥', '#ec4899'),
    (NEW.id, 'Educação', 'expense', '📚', '#8b5cf6'),
    (NEW.id, 'Lazer', 'expense', '🎮', '#3b82f6'),
    (NEW.id, 'Utilidades', 'expense', '💡', '#eab308'),
    (NEW.id, 'Outros', 'expense', '📦', '#6b7280');
  
  -- Criar categorias padrão de receitas
  INSERT INTO public.categories (user_id, name, type, emoji, color) VALUES
    (NEW.id, 'Salário', 'income', '💼', '#10b981'),
    (NEW.id, 'Freelance', 'income', '💻', '#14b8a6'),
    (NEW.id, 'Investimentos', 'income', '📈', '#06b6d4'),
    (NEW.id, 'Outros', 'income', '💰', '#22c55e');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;