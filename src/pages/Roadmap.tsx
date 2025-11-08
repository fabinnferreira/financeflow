import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RoadmapComponent from "@/components/Roadmap";
import DynamicBackground from "@/components/DynamicBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

const Roadmap = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <DynamicBackground />
      
      <header className="sticky top-0 z-50 bg-primary/70 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-xl font-bold text-primary-foreground">Roadmap</h1>
          <ThemeToggle />
        </div>
      </header>

      <RoadmapComponent />
    </div>
  );
};

export default Roadmap;
