import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso.",
        });
        navigate('/dashboard', { replace: true });
      }
      if (event === 'PASSWORD_RECOVERY') {
        toast({
          title: "Verifique seu e-mail",
          description: "Enviamos um link para redefinição de senha.",
        });
      }
      if (event === 'USER_UPDATED') {
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram atualizadas.",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
      
      <Card className="w-full max-w-md shadow-elegant relative z-10 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-text bg-clip-text text-transparent">
            FinanceFlow
          </CardTitle>
          <CardDescription className="text-base">
            Acesse sua conta ou crie uma nova para começar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-light))',
                  },
                },
              },
              className: {
                button: 'transition-smooth',
                input: 'transition-smooth',
              },
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/dashboard`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'E-mail',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  link_text: 'Já tem uma conta? Entre',
                  social_provider_text: 'Entrar com {{provider}}',
                },
                sign_up: {
                  email_label: 'E-mail',
                  password_label: 'Crie uma senha',
                  button_label: 'Criar conta',
                  link_text: 'Não tem uma conta? Crie uma',
                  social_provider_text: 'Cadastrar com {{provider}}',
                },
                forgotten_password: {
                  email_label: 'E-mail',
                  button_label: 'Enviar instruções',
                  link_text: 'Esqueceu sua senha?',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
