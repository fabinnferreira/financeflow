import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-bold text-primary">404</h1>
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-foreground">Página não encontrada</p>
          <p className="text-muted-foreground">A página que você está procurando não existe.</p>
        </div>
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="w-4 h-4" />
            Voltar para o início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;