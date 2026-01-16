import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Crown, 
  Zap, 
  Shield, 
  TrendingUp, 
  CreditCard, 
  Target, 
  PieChart, 
  Bell, 
  Download, 
  Building2,
  Infinity,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeModal } from "@/components/UpgradeModal";
import DynamicBackground from "@/components/DynamicBackground";

const Plans = () => {
  const navigate = useNavigate();
  const { plan, isOnTrial, trialDaysRemaining } = usePlan();
  const [showModal, setShowModal] = useState(false);

  const features = [
    {
      icon: CreditCard,
      name: "Transações por mês",
      free: "3 transações",
      premium: "Ilimitadas",
      description: "Registre todas as suas movimentações financeiras"
    },
    {
      icon: Building2,
      name: "Contas bancárias",
      free: "1 conta",
      premium: "Ilimitadas",
      description: "Gerencie múltiplas contas e carteiras"
    },
    {
      icon: CreditCard,
      name: "Cartões de crédito",
      free: "1 cartão",
      premium: "Ilimitados",
      description: "Acompanhe faturas e limites de todos seus cartões"
    },
    {
      icon: Target,
      name: "Metas financeiras",
      free: "1 meta",
      premium: "Ilimitadas",
      description: "Defina e acompanhe objetivos de economia"
    },
    {
      icon: PieChart,
      name: "Categorias",
      free: "5 categorias",
      premium: "Ilimitadas",
      description: "Organize suas despesas em categorias personalizadas"
    },
    {
      icon: TrendingUp,
      name: "Histórico de dados",
      free: "3 meses",
      premium: "Ilimitado",
      description: "Acesse todo seu histórico financeiro"
    },
    {
      icon: Download,
      name: "Exportar relatórios",
      free: false,
      premium: true,
      description: "Exporte para PDF e Excel"
    },
    {
      icon: Bell,
      name: "Notificações inteligentes",
      free: false,
      premium: true,
      description: "Alertas de vencimento e lembretes"
    },
    {
      icon: Shield,
      name: "Open Banking",
      free: false,
      premium: true,
      description: "Sincronização automática com bancos"
    },
    {
      icon: PieChart,
      name: "Relatórios avançados",
      free: false,
      premium: true,
      description: "Análises detalhadas e insights financeiros"
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-lg py-4 md:py-6 shadow-lg bg-card/80 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Planos e Preços</h1>
                <p className="text-sm text-muted-foreground">Compare e escolha o melhor plano para você</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Trial Banner */}
          {isOnTrial && trialDaysRemaining !== null && (
            <div className="mb-8 p-4 bg-gradient-to-r from-primary/20 to-success/20 border border-primary/30 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-semibold">Você está no período de teste Premium!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Restam {trialDaysRemaining} dias para aproveitar todos os recursos. 
                Assine agora e não perca o acesso!
              </p>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {/* Free Plan */}
            <Card className={`relative overflow-hidden ${plan === 'free' && !isOnTrial ? 'ring-2 ring-primary' : ''}`}>
              {plan === 'free' && !isOnTrial && (
                <Badge className="absolute top-4 right-4 bg-primary">Seu Plano</Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>Para começar a organizar suas finanças</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">R$ 0</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mb-6"
                  disabled={plan === 'free' && !isOnTrial}
                >
                  {plan === 'free' && !isOnTrial ? 'Plano Atual' : 'Plano Gratuito'}
                </Button>

                <ul className="space-y-3 text-left">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      {feature.free === false ? (
                        <X className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      ) : (
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      )}
                      <span className={feature.free === false ? 'text-muted-foreground line-through' : ''}>
                        {typeof feature.free === 'string' ? feature.free : feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className={`relative overflow-hidden border-primary/50 bg-gradient-to-b from-primary/5 to-transparent ${plan === 'premium' ? 'ring-2 ring-success' : ''}`}>
              {plan === 'premium' && (
                <Badge className="absolute top-4 right-4 bg-success">
                  {isOnTrial ? 'Período de Teste' : 'Seu Plano'}
                </Badge>
              )}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
              
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-4 flex items-center justify-center">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  Premium
                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                </CardTitle>
                <CardDescription>Controle total das suas finanças</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-primary">R$ 9,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                
                <Button 
                  variant="success" 
                  className="w-full mb-6"
                  onClick={() => setShowModal(true)}
                  disabled={plan === 'premium' && !isOnTrial}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  {plan === 'premium' && !isOnTrial ? 'Plano Atual' : isOnTrial ? 'Assinar Agora' : 'Fazer Upgrade'}
                </Button>

                <ul className="space-y-3 text-left">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="font-medium">
                        {typeof feature.premium === 'string' ? feature.premium : feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Feature Comparison Table */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Comparação Detalhada</CardTitle>
              <CardDescription className="text-center">
                Veja todas as diferenças entre os planos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-2">Recurso</th>
                      <th className="text-center py-4 px-2 w-32">Free</th>
                      <th className="text-center py-4 px-2 w-32 bg-primary/5">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <feature.icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-sm text-muted-foreground">{feature.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-4 px-2">
                          {feature.free === false ? (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          ) : feature.free === true ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <span className="text-sm">{feature.free}</span>
                          )}
                        </td>
                        <td className="text-center py-4 px-2 bg-primary/5">
                          {feature.premium === true ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Infinity className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-primary">{feature.premium}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Pronto para ter controle total das suas finanças?
            </h2>
            <p className="text-muted-foreground mb-6">
              Junte-se a milhares de usuários que já transformaram sua vida financeira com o FinanceFlow Premium.
            </p>
            <Button 
              variant="success" 
              size="lg"
              onClick={() => setShowModal(true)}
              className="px-8"
            >
              <Crown className="mr-2 h-5 w-5" />
              Começar Agora - R$ 9,90/mês
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Cancele a qualquer momento. Sem compromisso.
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
};

export default Plans;
