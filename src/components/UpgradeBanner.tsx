import { Button } from "@/components/ui/button";
import { Crown, X } from "lucide-react";
import { useState } from "react";
import { UpgradeModal } from "./UpgradeModal";

interface UpgradeBannerProps {
  className?: string;
}

export function UpgradeBanner({ className }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!isVisible) return null;

  return (
    <>
      <div className={`relative bg-gradient-to-r from-success/20 to-primary/20 border border-success/30 rounded-lg p-4 ${className}`}>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
              <Crown className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Aproveite todos os recursos!</h3>
              <p className="text-sm text-muted-foreground">
                Assine o Premium por apenas R$ 9,90/mês
              </p>
            </div>
          </div>
          
          <Button 
            variant="success" 
            size="sm"
            onClick={() => setShowModal(true)}
            className="sm:ml-auto"
          >
            <Crown className="mr-2 h-4 w-4" />
            Fazer Upgrade
          </Button>
        </div>
      </div>

      <UpgradeModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
