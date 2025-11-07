import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Sparkles, TrendingUp } from "lucide-react";

const roadmapItems = [
  {
    phase: "Fase 1 - Concluída",
    status: "completed",
    items: [
      "Sistema de autenticação com Supabase",
      "Dashboard com visão geral financeira",
      "Gestão de contas bancárias e cartões",
      "Categorização de transações",
      "Gráficos de despesas por categoria",
      "Gráficos de movimentação diária",
      "Tema claro/escuro",
      "Design responsivo com glassmorphism"
    ]
  },
  {
    phase: "Fase 2 - Em Desenvolvimento",
    status: "in-progress",
    items: [
      "Exportação de relatórios (PDF/Excel)",
      "Filtros avançados de data nos gráficos",
      "Notificações de vencimento de faturas",
      "Gestão de metas financeiras",
      "Sistema de busca nas transações",
      "Configurações de perfil do usuário"
    ]
  },
  {
    phase: "Fase 3 - Próximos Passos",
    status: "planned",
    items: [
      "Importação de extratos bancários (OFX/CSV)",
      "Conexão automática com bancos (Open Banking)",
      "Orçamento mensal por categoria",
      "Alertas de gastos excessivos",
      "Previsão de fluxo de caixa",
      "Comparação de períodos (mês a mês)",
      "Tags personalizadas para transações"
    ]
  },
  {
    phase: "Fase 4 - Futuro",
    status: "future",
    items: [
      "App mobile (iOS e Android)",
      "Compartilhamento de contas (família)",
      "Investimentos e carteira de ações",
      "Integração com planilhas (Google Sheets)",
      "Assistente financeiro com IA",
      "Análise preditiva de gastos",
      "Marketplace de integrações"
    ]
  }
];

const statusConfig = {
  completed: {
    icon: Check,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    badgeVariant: "default" as const,
    badgeText: "Concluído"
  },
  "in-progress": {
    icon: TrendingUp,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    badgeVariant: "secondary" as const,
    badgeText: "Em Progresso"
  },
  planned: {
    icon: Clock,
    color: "text-primary-light",
    bgColor: "bg-primary-light/10",
    borderColor: "border-primary-light/30",
    badgeVariant: "outline" as const,
    badgeText: "Planejado"
  },
  future: {
    icon: Sparkles,
    color: "text-muted-foreground",
    bgColor: "bg-muted/10",
    borderColor: "border-muted/30",
    badgeVariant: "outline" as const,
    badgeText: "Futuro"
  }
};

const Roadmap = () => {
  return (
    <section id="roadmap" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Roadmap de Desenvolvimento</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            O que está por vir
            <span className="block text-primary">no FinanceFlow</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acompanhe as funcionalidades já implementadas e as novidades que estão chegando
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {roadmapItems.map((roadmap, index) => {
            const config = statusConfig[roadmap.status as keyof typeof statusConfig];
            const Icon = config.icon;
            
            return (
              <Card
                key={index}
                className={`border-2 ${config.borderColor} hover:shadow-lg transition-all duration-300 animate-slide-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className={`${config.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <Badge variant={config.badgeVariant} className={config.color}>
                      {config.badgeText}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{roadmap.phase}</CardTitle>
                  <CardDescription>
                    {roadmap.items.length} funcionalidades
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2">
                    {roadmap.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto border-2 border-success/30 bg-success/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tem alguma sugestão?</strong> Estamos sempre ouvindo nossa comunidade. 
                Entre em contato e ajude a moldar o futuro do FinanceFlow!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Roadmap;
