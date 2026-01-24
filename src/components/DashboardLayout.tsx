import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import DynamicBackground from "@/components/DynamicBackground";

interface DashboardLayoutProps {
  children: ReactNode;
  onNewTransaction: () => void;
  onSignOut: () => void;
}

export function DashboardLayout({
  children,
  onNewTransaction,
  onSignOut,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full relative">
        <DynamicBackground />
        
        <AppSidebar
          onNewTransaction={onNewTransaction}
          onSignOut={onSignOut}
        />
        
        <SidebarInset className="flex-1 relative z-10">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
