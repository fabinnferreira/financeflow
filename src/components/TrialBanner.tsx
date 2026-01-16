import { Button } from "@/components/ui/button";
import { Crown, Clock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { UpgradeModal } from "./UpgradeModal";
import { differenceInSeconds, parseISO } from "date-fns";

interface TrialBannerProps {
  trialEndsAt: string;
  daysRemaining: number;
  className?: string;
}

export function TrialBanner({ trialEndsAt, daysRemaining, className }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const end = parseISO(trialEndsAt);
      const totalSeconds = Math.max(0, differenceInSeconds(end, now));
      
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;
      
      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  if (!isVisible) return null;

  const isUrgent = daysRemaining <= 2;

  return (
    <>
      <div className={`relative bg-gradient-to-r ${isUrgent ? 'from-destructive/20 to-warning/20 border-destructive/30' : 'from-primary/20 to-success/20 border-primary/30'} border rounded-lg p-4 ${className}`}>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isUrgent ? 'bg-destructive/20' : 'bg-primary/20'}`}>
              <Crown className={`h-5 w-5 ${isUrgent ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Período de Teste Premium
              </h3>
              <p className="text-sm text-muted-foreground">
                {isUrgent 
                  ? "Seu trial está acabando! Assine agora para não perder acesso"
                  : "Aproveite todos os recursos Premium gratuitamente"
                }
              </p>
            </div>
          </div>
          
          {/* Countdown Timer */}
          <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{countdown.days}</div>
              <div className="text-xs text-muted-foreground">dias</div>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{countdown.hours.toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">horas</div>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{countdown.minutes.toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">min</div>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{countdown.seconds.toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">seg</div>
            </div>
          </div>
          
          <Button 
            variant={isUrgent ? "destructive" : "success"} 
            size="sm"
            onClick={() => setShowModal(true)}
            className="lg:ml-auto whitespace-nowrap"
          >
            <Crown className="mr-2 h-4 w-4" />
            Assinar por R$ 9,90/mês
          </Button>
        </div>
      </div>

      <UpgradeModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
