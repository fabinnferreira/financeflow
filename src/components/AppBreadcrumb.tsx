import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
}

// Mapeamento de rotas para labels em português
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  transactions: "Transações",
  categories: "Categorias",
  accounts: "Contas",
  goals: "Metas",
  reports: "Relatórios",
  settings: "Configurações",
  "bank-connections": "Conexões Bancárias",
  "credit-cards": "Cartões de Crédito",
  "review-transactions": "Revisar Transações",
  admin: "Administração",
};

export function AppBreadcrumb({ items, showHome = true }: AppBreadcrumbProps) {
  const location = useLocation();

  // Se items não for fornecido, gera automaticamente baseado na rota
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    return pathSegments.map((segment, index) => {
      const href = "/" + pathSegments.slice(0, index + 1).join("/");
      const isLast = index === pathSegments.length - 1;
      return {
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : href,
      };
    });
  })();

  if (breadcrumbItems.length === 0 && !showHome) {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {showHome && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only">Início</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbItems.length > 0 && <BreadcrumbSeparator />}
          </>
        )}
        
        {breadcrumbItems.map((item, index) => (
          <BreadcrumbItem key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            {item.href ? (
              <BreadcrumbLink asChild>
                <Link to={item.href}>{item.label}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
