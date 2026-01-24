import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  FolderKanban,
  Wallet,
  Target,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  onNewTransaction: () => void;
  onSignOut: () => void;
}

const mainNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Transações", icon: CreditCard, path: "/transactions" },
  { label: "Categorias", icon: FolderKanban, path: "/categories" },
  { label: "Contas", icon: Wallet, path: "/accounts" },
  { label: "Cartões", icon: CreditCard, path: "/credit-cards" },
];

const advancedNavItems = [
  { label: "Metas", icon: Target, path: "/goals" },
  { label: "Relatórios", icon: BarChart3, path: "/reports" },
  { label: "Open Banking", icon: Building2, path: "/bank-connections" },
];

export function AppSidebar({ onNewTransaction, onSignOut }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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
    
    checkAdminRole();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      {/* Header with Logo */}
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-sidebar-foreground">FinanceFlow</span>
              <span className="text-xs text-muted-foreground">Gestão Financeira</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Quick Action */}
      <div className="px-3 py-4">
        <Button
          onClick={onNewTransaction}
          className={cn(
            "w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-primary-foreground shadow-md transition-all duration-300",
            isCollapsed && "px-0"
          )}
          size={isCollapsed ? "icon" : "default"}
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Nova Transação</span>}
        </Button>
      </div>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                    className={cn(
                      "transition-all duration-200",
                      isActive(item.path) 
                        ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                        : "hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Advanced Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Avançado
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {advancedNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                    className={cn(
                      "transition-all duration-200",
                      isActive(item.path) 
                        ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                        : "hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <SidebarSeparator />
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/admin")}
                isActive={isActive("/admin")}
                tooltip="Admin"
                className={cn(
                  "transition-all duration-200",
                  isActive("/admin") 
                    ? "bg-warning/20 text-warning font-medium" 
                    : "text-warning hover:bg-warning/10"
                )}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/settings")}
              isActive={isActive("/settings")}
              tooltip="Configurações"
              className="hover:bg-sidebar-accent/50"
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onSignOut}
              tooltip="Sair"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Collapse Toggle */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center hover:bg-sidebar-accent/50"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">Recolher</span>
              </>
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
