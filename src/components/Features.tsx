import { Wallet, TrendingUp, Shield, PieChart, CreditCard, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Wallet,
    title: "Gestão Completa",
    description: "Organize todas suas contas bancárias, cartões de crédito e dinheiro em espécie em um único lugar.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: TrendingUp,
    title: "Acompanhamento em Tempo Real",
    description: "Monitore seu saldo atualizado automaticamente e acompanhe a evolução do seu patrimônio.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: PieChart,
    title: "Categorias Personalizadas",
    description: "Crie e customize categorias de despesas e receitas que fazem sentido para sua vida financeira.",
    color: "text-primary-light",
    bgColor: "bg-primary-light/10",
  },
  {
    icon: BarChart3,
    title: "Relatórios Inteligentes",
    description: "Visualize gráficos detalhados e identifique padrões de gastos para tomar melhores decisões.",
    color: "text-success-light",
    bgColor: "bg-success-light/10",
  },
  {
    icon: CreditCard,
    title: "Controle de Cartões",
    description: "Gerencie faturas, vencimentos e parcelamentos de todos os seus cartões de crédito.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Seus dados são criptografados e protegidos com os mais altos padrões de segurança.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

const Features = () => {
  return (
    <section id="recursos" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <span className="text-sm font-medium text-primary">Recursos Principais</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa para
            <span className="block text-primary">organizar suas finanças</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ferramentas profissionais para você ter controle total do seu dinheiro
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 animate-slide-up bg-gradient-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className={`${feature.bgColor} w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
