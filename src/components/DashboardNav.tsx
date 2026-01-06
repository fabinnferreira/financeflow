import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, CreditCard, FolderKanban, Wallet, Target, BarChart3, Building2, Plus, Settings, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardNavProps {
  onNewTransaction: () => void;
  onSignOut: () => void;
}

export function DashboardNav({ onNewTransaction, onSignOut }: DashboardNavProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin role:", error);
    }
  };

  const navItems = [
    { label: "Transações", icon: CreditCard, path: "/transactions" },
    { label: "Categorias", icon: FolderKanban, path: "/categories" },
    { label: "Contas", icon: Wallet, path: "/accounts" },
    { label: "Cartões", icon: CreditCard, path: "/credit-cards" },
    { label: "Metas", icon: Target, path: "/goals" },
    { label: "Relatórios", icon: BarChart3, path: "/reports" },
    { label: "Open Banking", icon: Building2, path: "/bank-connections" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex gap-2 items-center">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="outline"
            size="sm"
            onClick={() => navigate(item.path)}
            className="gap-2 border-primary-foreground/30 hover:bg-primary-foreground/20 text-success"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Button>
        ))}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-2 border-warning/50 hover:bg-warning/20 text-warning"
          >
            <Shield className="w-4 h-4" />
            Admin
          </Button>
        )}
        <Button variant="success" size="sm" className="gap-2" onClick={onNewTransaction}>
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>

      {/* Tablet Navigation (Dropdown) */}
      <div className="hidden md:flex lg:hidden gap-2 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-primary-foreground/30 hover:bg-primary-foreground/20 text-success">
              <Menu className="w-4 h-4" />
              Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {navItems.map((item) => (
              <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </DropdownMenuItem>
            ))}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin")} className="text-warning">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="success" size="sm" className="gap-2" onClick={onNewTransaction}>
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </div>

      {/* Mobile Navigation (Sheet) */}
      <div className="flex md:hidden gap-2 items-center">
        <Button variant="success" size="icon" onClick={onNewTransaction}>
          <Plus className="w-5 h-5" />
        </Button>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border-primary-foreground/30 hover:bg-primary-foreground/20 text-success">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className="justify-start gap-3"
                  onClick={() => handleNavigate(item.path)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              ))}
              {isAdmin && (
                <Button
                  variant="ghost"
                  className="justify-start gap-3 text-warning hover:text-warning"
                  onClick={() => handleNavigate("/admin")}
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </Button>
              )}
              <hr className="my-2" />
              <Button
                variant="ghost"
                className="justify-start gap-3"
                onClick={() => handleNavigate("/settings")}
              >
                <Settings className="w-5 h-5" />
                Configurações
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-3 text-destructive hover:text-destructive"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignOut();
                }}
              >
                <LogOut className="w-5 h-5" />
                Sair
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}