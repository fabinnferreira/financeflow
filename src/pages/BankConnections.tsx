import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, Building2, CreditCard, Wallet, Loader2, Clock, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DynamicBackground from '@/components/DynamicBackground';
import { PluggyConnectWidget } from '@/components/PluggyConnectWidget';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PluggyAccount {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance_cents: number;
  last_sync_at: string | null;
}

interface BankConnection {
  id: string;
  connector_name: string;
  connector_logo: string | null;
  status: string;
  last_sync_at: string | null;
  created_at: string;
  pluggy_accounts: PluggyAccount[];
}

export default function BankConnections() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  const fetchConnections = useCallback(async () => {
    try {
      const [connectionsRes, reviewCountRes] = await Promise.all([
        supabase.functions.invoke('pluggy', {
          body: { action: 'get_connections' },
        }),
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('needs_review', true),
      ]);

      if (connectionsRes.error) throw connectionsRes.error;
      setConnections(connectionsRes.data.connections || []);
      setPendingReviewCount(reviewCountRes.count || 0);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Erro ao carregar conexões bancárias');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnectionSuccess = async (itemId: string) => {
    try {
      toast.loading('Salvando conexão e importando contas...');
      
      const response = await supabase.functions.invoke('pluggy', {
        body: { action: 'save_connection', itemId },
      });

      if (response.error) throw response.error;

      toast.dismiss();
      toast.success(`Conexão salva! ${response.data.accountsCount} conta(s) importada(s).`);
      fetchConnections();
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.dismiss();
      toast.error('Erro ao salvar conexão');
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      // Get last 90 days of transactions
      const from = new Date();
      from.setDate(from.getDate() - 90);
      
      const response = await supabase.functions.invoke('pluggy', {
        body: { 
          action: 'sync_transactions', 
          connectionId,
          from: from.toISOString().split('T')[0],
        },
      });

      if (response.error) throw response.error;

      toast.success(response.data.message);
      fetchConnections();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro ao sincronizar transações');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('pluggy', {
        body: { action: 'delete_connection', connectionId: deleteId },
      });

      if (response.error) throw response.error;

      toast.success('Conexão removida com sucesso');
      setConnections(prev => prev.filter(c => c.id !== deleteId));
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Erro ao remover conexão');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return <CreditCard className="h-4 w-4" />;
      case 'CHECKING':
      case 'SAVINGS':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'UPDATING':
        return <Badge variant="secondary">Atualizando</Badge>;
      case 'LOGIN_ERROR':
        return <Badge variant="destructive">Erro de Login</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen relative">
      <DynamicBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Conexões Bancárias</h1>
            <p className="text-muted-foreground">
              Conecte suas contas bancárias via Open Banking
            </p>
          </div>
        </div>

        <Card className="mb-6 bg-card/60 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Conectar Nova Conta</CardTitle>
            <CardDescription>
              Conecte sua conta bancária para importar transações automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <PluggyConnectWidget onSuccess={handleConnectionSuccess} />
            {pendingReviewCount > 0 && (
              <Button variant="outline" onClick={() => navigate('/review-transactions')} className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Revisar Transações ({pendingReviewCount})
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Contas Conectadas</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i} className="bg-card/60 backdrop-blur-md border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : connections.length === 0 ? (
            <Card className="bg-card/60 backdrop-blur-md border-border/50">
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhuma conta conectada</h3>
                <p className="text-muted-foreground">
                  Conecte sua primeira conta bancária para começar a importar transações automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            connections.map(connection => (
              <Card key={connection.id} className="bg-card/60 backdrop-blur-md border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {connection.connector_logo ? (
                        <img 
                          src={connection.connector_logo} 
                          alt={connection.connector_name}
                          className="h-12 w-12 rounded-full object-contain bg-white p-1"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{connection.connector_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Última sync: {formatDate(connection.last_sync_at)}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(connection.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(connection.id)}
                        disabled={syncingId === connection.id}
                      >
                        {syncingId === connection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Sincronizar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(connection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {connection.pluggy_accounts?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <h4 className="text-sm font-medium mb-3">Contas vinculadas</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {connection.pluggy_accounts.map(account => (
                          <div 
                            key={account.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                          >
                            <div className="flex items-center gap-2">
                              {getAccountIcon(account.type)}
                              <span className="text-sm">{account.name}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(account.balance_cents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Conexão Bancária</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta conexão? As transações já importadas serão mantidas,
              mas você não poderá mais sincronizar novas transações desta conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
