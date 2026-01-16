import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const premiumFeatures = [
  "Transações ilimitadas",
  "Contas e cartões ilimitados",
  "Metas financeiras ilimitadas",
  "Histórico completo",
  "Relatórios avançados com gráficos",
  "Exportação de dados (PDF/Excel)",
  "Conexão bancária automática",
  "Alertas e notificações",
  "Suporte prioritário",
];

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-success">
            <Crown className="h-8 w-8 text-success-foreground" />
          </div>
          <DialogTitle className="text-2xl">Upgrade para Premium</DialogTitle>
          <DialogDescription>
            {feature 
              ? `Para ${feature}, você precisa do plano Premium.`
              : "Desbloqueie todas as funcionalidades do FinanceFlow."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 space-y-3">
          {premiumFeatures.map((feat, index) => (
            <div key={index} className="flex items-center gap-3">
              <Check className="h-5 w-5 text-success flex-shrink-0" />
              <span className="text-sm">{feat}</span>
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-success">R$ 9,90</div>
          <div className="text-sm text-muted-foreground">/mês</div>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            variant="success" 
            size="lg" 
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              "Carregando..."
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Assinar Premium
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => {
              onOpenChange(false);
              navigate('/plans');
            }}
          >
            Comparar planos
          </Button>
          <Button 
            variant="link" 
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Continuar com plano gratuito
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Cancele a qualquer momento. Sem compromisso.
        </p>
      </DialogContent>
    </Dialog>
  );
}
