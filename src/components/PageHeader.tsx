import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  showNotifications?: boolean;
  showThemeToggle?: boolean;
  showSettings?: boolean;
  showLogout?: boolean;
  showBreadcrumb?: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  backTo = "/dashboard",
  showNotifications = true,
  showThemeToggle = true,
  showSettings = false,
  showLogout = false,
  showBreadcrumb = true,
  breadcrumbItems,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="mb-8">
      {showBreadcrumb && <AppBreadcrumb items={breadcrumbItems} />}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backTo)}
              className="text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {showNotifications && <NotificationCenter />}
          {showSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-foreground hover:bg-muted"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          {showThemeToggle && <ThemeToggle />}
          {showLogout && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-foreground hover:bg-muted"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
