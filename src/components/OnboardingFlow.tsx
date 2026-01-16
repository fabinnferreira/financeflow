import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Wallet, 
  Target, 
  PieChart, 
  Bell, 
  Download, 
  Building2,
  CreditCard,
  ArrowRight,
  Check,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingFlowProps {
  isOnTrial: boolean;
  trialDaysRemaining: number | null;
}

const onboardingSteps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Bem-vindo ao FinanceFlow! 🎉',
    subtitle: 'Sua jornada para o controle financeiro começa agora',
    description: 'Vamos te mostrar os principais recursos disponíveis no seu período de teste Premium de 7 dias.',
    isPremium: false,
  },
  {
    id: 'transactions',
    icon: Wallet,
    title: 'Transações Ilimitadas',
    subtitle: 'Registre todas as suas movimentações',
    description: 'No plano Premium, você pode adicionar quantas transações quiser. Receitas, despesas, transferências - tudo organizado em um só lugar.',
    isPremium: true,
    tip: 'Clique em "Nova Transação" no Dashboard para começar!',
  },
  {
    id: 'accounts',
    icon: Building2,
    title: 'Múltiplas Contas',
    subtitle: 'Gerencie todas as suas contas bancárias',
    description: 'Conta corrente, poupança, carteira digital... Adicione todas as suas contas e tenha uma visão completa do seu patrimônio.',
    isPremium: true,
    tip: 'Acesse "Contas" no menu para adicionar suas contas.',
  },
  {
    id: 'goals',
    icon: Target,
    title: 'Metas Financeiras',
    subtitle: 'Defina objetivos e acompanhe seu progresso',
    description: 'Crie metas de economia para viagens, emergências, investimentos ou qualquer objetivo. Visualize seu progresso em tempo real.',
    isPremium: true,
    tip: 'Crie sua primeira meta em "Metas" no menu.',
  },
  {
    id: 'reports',
    icon: PieChart,
    title: 'Relatórios Avançados',
    subtitle: 'Insights detalhados sobre seus gastos',
    description: 'Gráficos interativos, análise por categoria, comparação mensal e muito mais. Entenda para onde seu dinheiro está indo.',
    isPremium: true,
    tip: 'Explore os relatórios em "Relatórios" no menu.',
  },
  {
    id: 'export',
    icon: Download,
    title: 'Exportar Dados',
    subtitle: 'PDF e Excel sempre que precisar',
    description: 'Exporte seus relatórios e transações para PDF ou Excel. Ótimo para controle pessoal ou para seu contador.',
    isPremium: true,
    tip: 'Botões de exportação disponíveis em Transações e Relatórios.',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notificações Inteligentes',
    subtitle: 'Nunca perca um vencimento',
    description: 'Receba alertas sobre vencimentos de cartão de crédito, metas próximas do prazo e outras informações importantes.',
    isPremium: true,
    tip: 'O sino de notificações fica no canto superior direito.',
  },
  {
    id: 'openbanking',
    icon: CreditCard,
    title: 'Open Banking',
    subtitle: 'Sincronização automática com bancos',
    description: 'Conecte suas contas bancárias e tenha suas transações importadas automaticamente. Menos trabalho manual, mais precisão.',
    isPremium: true,
    tip: 'Configure em "Conexões Bancárias" no menu.',
  },
  {
    id: 'finish',
    icon: Crown,
    title: 'Aproveite seu Trial!',
    subtitle: 'Você tem acesso Premium por 7 dias',
    description: 'Explore todos os recursos e veja como o FinanceFlow pode transformar sua vida financeira. Após o trial, assine por apenas R$ 9,90/mês.',
    isPremium: false,
    cta: true,
  },
];

export function OnboardingFlow({ isOnTrial, trialDaysRemaining }: OnboardingFlowProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has seen onboarding
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const onboardingKey = `onboarding_seen_${user.id}`;
      const hasSeenOnboarding = localStorage.getItem(onboardingKey);
      
      // Show onboarding only for trial users who haven't seen it
      if (isOnTrial && !hasSeenOnboarding) {
        setOpen(true);
      }
    };

    checkOnboarding();
  }, [isOnTrial]);

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const onboardingKey = `onboarding_seen_${user.id}`;
      localStorage.setItem(onboardingKey, 'true');
    }
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleViewPlans = () => {
    handleComplete();
    navigate('/plans');
  };

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-primary to-success transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} de {onboardingSteps.length}
            </span>
            {step.isPremium && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              step.isPremium 
                ? 'bg-gradient-to-br from-primary/20 to-success/20' 
                : 'bg-gradient-to-br from-primary to-success'
            }`}>
              <StepIcon className={`h-10 w-10 ${step.isPremium ? 'text-primary' : 'text-white'}`} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
            <p className="text-primary font-medium mb-4">{step.subtitle}</p>
            <p className="text-muted-foreground">{step.description}</p>
            
            {step.tip && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm flex items-start gap-2">
                <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>{step.tip}</span>
              </div>
            )}
          </div>

          {/* Trial Badge */}
          {step.id === 'finish' && trialDaysRemaining !== null && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-success/10 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {trialDaysRemaining} dias
              </div>
              <p className="text-sm text-muted-foreground">
                restantes no seu trial Premium
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={handlePrev}>
                Voltar
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip}>
                Pular
              </Button>
            )}

            <div className="flex gap-2">
              {step.cta && (
                <Button variant="outline" onClick={handleViewPlans}>
                  Ver Planos
                </Button>
              )}
              <Button onClick={handleNext} className="gap-2">
                {currentStep === onboardingSteps.length - 1 ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Começar a usar
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step Dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-6 bg-primary' 
                    : index < currentStep 
                      ? 'bg-success' 
                      : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
