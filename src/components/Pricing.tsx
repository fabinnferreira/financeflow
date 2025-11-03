import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    description: "Perfeito para começar a organizar suas finanças",
    features: [
      "Até 3 contas bancárias",
      "Até 2 cartões de crédito",
      "Categorias básicas",
      "Histórico de 6 meses",
      "Relatórios mensais",
      "Suporte por email",
    ],
    cta: "Começar Grátis",
    highlighted: false,
    variant: "outline" as const,
  },
  {
    name: "Premium",
    price: "R$ 9,90",
    period: "/mês",
    description: "Para quem quer controle total e insights avançados",
    features: [
      "Contas ilimitadas",
      "Cartões ilimitados",
      "Categorias personalizadas",
      "Histórico ilimitado",
      "Relatórios avançados com gráficos",
      "Exportação de dados (PDF/Excel)",
      "Metas financeiras",
      "Alertas e notificações",
      "Suporte prioritário",
      "Novos recursos primeiro",
    ],
    cta: "Assinar Premium",
    highlighted: true,
    variant: "success" as const,
  },
];

const Pricing = () => {
  return (
    <section id="precos" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-4">
            <Sparkles className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">Preços Transparentes</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha o plano ideal
            <span className="block text-success">para suas necessidades</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden transition-all duration-300 animate-scale-in ${
                plan.highlighted 
                  ? 'border-2 border-success shadow-success scale-105 bg-gradient-card' 
                  : 'border-2 hover:border-primary/30 hover:shadow-lg'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-gradient-success text-success-foreground px-6 py-1 text-sm font-semibold rounded-bl-lg">
                  Mais Popular
                </div>
              )}
              
              <CardHeader className="text-center pb-8 pt-10">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                
                <div className="mt-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-5xl font-bold ${plan.highlighted ? 'text-success' : 'text-primary'}`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pb-8">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-success' : 'text-primary'}`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  variant={plan.variant} 
                  size="lg" 
                  className="w-full"
                  asChild
                >
                  <Link to="/dashboard">
                    {plan.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Cancele a qualquer momento. Sem taxas ocultas. Sem compromisso de longo prazo.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
