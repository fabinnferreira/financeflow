import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PremiumLockProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

export function PremiumLock({ title, description, onUpgrade }: PremiumLockProps) {
  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={onUpgrade} className="gap-2">
          <Crown className="w-4 h-4" />
          Fazer Upgrade para Premium
        </Button>
      </CardContent>
    </Card>
  );
}

interface PremiumOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  message?: string;
  onUpgrade: () => void;
}

export function PremiumOverlay({ children, isLocked, message = "Recurso Premium", onUpgrade }: PremiumOverlayProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6">
          <Lock className="w-8 h-8 mx-auto mb-3 text-primary" />
          <p className="font-medium mb-3">{message}</p>
          <Button size="sm" onClick={onUpgrade} className="gap-2">
            <Crown className="w-4 h-4" />
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}
