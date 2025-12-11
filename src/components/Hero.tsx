import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import heroDashboard from "@/assets/hero-dashboard.jpg";
const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-accent/20 to-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl animate-float" style={{
        animationDelay: '2s'
      }}></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 animate-scale-in">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Controle Total das Suas Finanças</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">Gerencie Suas
Finanças Pessoais
Com Inteligência<span className="block bg-gradient-hero bg-clip-text animate-glow text-blue-600">Finanças Pessoais</span>
              com inteligência
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Transforme sua relação com o dinheiro. Organize receitas, despesas e investimentos em um só lugar. 
              Decisões financeiras mais inteligentes começam aqui.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" className="group" asChild>
                <Link to="/auth">COMEÇAR GRATUITAMENTE<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button variant="outline" size="xl" asChild>
                <a href="#recursos">VER RECURSOS</a>
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Gratuito</div>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">R$ 9,90</div>
                <div className="text-sm text-muted-foreground">Premium/mês</div>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Ilimitado</div>
                <div className="text-sm text-muted-foreground">Transações</div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative animate-slide-up" style={{
          animationDelay: '0.2s'
        }}>
            <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-20 animate-glow"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-primary/10 transform hover:scale-105 transition-transform duration-500">
              <img src={heroDashboard} alt="Dashboard de Finanças Pessoais" className="w-full h-auto" />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-background" />
        </svg>
      </div>
    </section>;
};
export default Hero;