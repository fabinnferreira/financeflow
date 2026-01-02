import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  Database, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  CreditCard,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SyncStats {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  totalTransactions: number;
  pendingReviewTransactions: number;
  totalUsers: number;
  lastSyncAt: string | null;
}

interface BankConnection {
  id: string;
  user_id: string;
  connector_name: string;
  status: string;
  last_sync_at: string | null;
  created_at: string;
  pluggy_accounts: { id: string; name: string; balance_cents: number }[];
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  async function checkAdminAccess() {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (data) {
      setIsAdmin(true);
      loadStats();
      loadConnections();
    } else {
      toast.error("Acesso negado. Você não é administrador.");
      navigate("/dashboard");
    }
  }

  async function loadStats() {
    try {
      // Get total connections
      const { count: totalConnections } = await supabase
        .from("bank_connections")
        .select("*", { count: "exact", head: true });

      // Get active connections
      const { count: activeConnections } = await supabase
        .from("bank_connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "CONNECTED");

      // Get failed connections
      const { count: failedConnections } = await supabase
        .from("bank_connections")
        .select("*", { count: "exact", head: true })
        .neq("status", "CONNECTED");

      // Get total transactions
      const { count: totalTransactions } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true });

      // Get pending review transactions
      const { count: pendingReviewTransactions } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("needs_review", true);

      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get last sync time
      const { data: lastSync } = await supabase
        .from("bank_connections")
        .select("last_sync_at")
        .order("last_sync_at", { ascending: false })
        .limit(1)
        .single();

      setStats({
        totalConnections: totalConnections || 0,
        activeConnections: activeConnections || 0,
        failedConnections: failedConnections || 0,
        totalTransactions: totalTransactions || 0,
        pendingReviewTransactions: pendingReviewTransactions || 0,
        totalUsers: totalUsers || 0,
        lastSyncAt: lastSync?.last_sync_at || null,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadConnections() {
    try {
      const { data, error } = await supabase
        .from("bank_connections")
        .select(`
          *,
          pluggy_accounts (id, name, balance_cents)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    }
  }

  async function handleManualSync() {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-bank-transactions");
      
      if (error) throw error;
      
      toast.success(
        `Sincronização concluída! ${data.transactions_inserted} transações inseridas.`
      );
      
      loadStats();
      loadConnections();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erro na sincronização");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDeleteConnection(connectionId: string) {
    try {
      // Delete pluggy accounts first
      await supabase
        .from("pluggy_accounts")
        .delete()
        .eq("bank_connection_id", connectionId);

      // Delete the connection
      const { error } = await supabase
        .from("bank_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
      
      toast.success("Conexão removida com sucesso");
      loadStats();
      loadConnections();
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Erro ao remover conexão");
    }
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Painel de Administração</h1>
                <p className="text-muted-foreground">Gerencie conexões bancárias e visualize estatísticas</p>
              </div>
            </div>
            <Button onClick={handleManualSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Total de usuários cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conexões Bancárias</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeConnections || 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {stats?.totalConnections || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Conexões ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transações</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingReviewTransactions || 0} pendentes de revisão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.lastSyncAt
                  ? format(new Date(stats.lastSyncAt), "HH:mm", { locale: ptBR })
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.lastSyncAt
                  ? format(new Date(stats.lastSyncAt), "dd/MM/yyyy", { locale: ptBR })
                  : "Nenhuma sincronização"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Connections Table */}
        <Card>
          <CardHeader>
            <CardTitle>Conexões Bancárias</CardTitle>
            <CardDescription>
              Gerencie todas as conexões Open Banking dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Contas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Sinc.</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma conexão bancária encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  connections.map((conn) => (
                    <TableRow key={conn.id}>
                      <TableCell className="font-medium">
                        {conn.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{conn.connector_name}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {conn.pluggy_accounts?.length || 0} conta(s)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={conn.status === "CONNECTED" ? "default" : "destructive"}
                          className="gap-1"
                        >
                          {conn.status === "CONNECTED" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {conn.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {conn.last_sync_at
                          ? format(new Date(conn.last_sync_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(conn.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Conexão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover esta conexão bancária? As transações
                                importadas serão mantidas, mas a sincronização automática será
                                interrompida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteConnection(conn.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
