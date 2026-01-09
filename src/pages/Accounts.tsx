import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Edit, Trash, Landmark, CreditCard, Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import DynamicBackground from '@/components/DynamicBackground';
import { PageHeader } from '@/components/PageHeader';
import { accountSchema } from '@/lib/validations';
import { formatCurrency } from '@/lib/formatters';
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

interface Account {
  id: number;
  name: string;
  type: string;
  balance_cents: number;
  user_id: string;
}

const Accounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    balance: '0'
  });

  const fetchAccounts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      toast.error('Erro ao carregar contas');
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', type: 'bank', balance: '0' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = accountSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const balance_cents = Math.round(parseFloat(formData.balance) * 100);

      const { error } = await supabase
        .from('accounts')
        .insert([{
          name: formData.name,
          type: formData.type,
          balance_cents,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Conta criada com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error('Erro ao criar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: (account.balance_cents / 100).toString()
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAccount) return;

    const validation = accountSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    try {
      setIsSubmitting(true);
      const balance_cents = Math.round(parseFloat(formData.balance) * 100);

      const { error } = await supabase
        .from('accounts')
        .update({
          name: formData.name,
          type: formData.type,
          balance_cents
        })
        .eq('id', editingAccount.id);

      if (error) throw error;

      toast.success('Conta atualizada com sucesso!');
      setEditDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      console.error("Error updating account:", error);
      toast.error('Erro ao atualizar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Check if account has transactions
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id);

      if (count && count > 0) {
        toast.error('Não é possível excluir uma conta com transações associadas');
        return;
      }

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Conta excluída com sucesso!');
      fetchAccounts();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error('Erro ao excluir conta');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Landmark className="h-5 w-5" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      case 'cash':
        return <Wallet className="h-5 w-5" />;
      default:
        return <Landmark className="h-5 w-5" />;
    }
  };

  // Removed duplicate formatCurrency - using import from @/lib/formatters

  const AccountForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Conta</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="type">Tipo</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Conta Bancária</SelectItem>
            <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
            <SelectItem value="cash">Dinheiro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="balance">Saldo {editingAccount ? 'Atual' : 'Inicial'}</Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          value={formData.balance}
          onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
          required
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDialogOpen(false);
            setEditDialogOpen(false);
            resetForm();
            setEditingAccount(null);
          }}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="success" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  const renderAccountCards = (type: string) => {
    const filteredAccounts = accounts.filter(account => account.type === type);
    
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }

    if (filteredAccounts.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma conta encontrada
        </p>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                {getAccountIcon(account.type)}
                <CardTitle className="text-sm font-medium">
                  {account.name}
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(account)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso irá deletar permanentemente esta conta.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(account.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(account.balance_cents)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 relative">
      <DynamicBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        <PageHeader
          title="Minhas Contas"
          subtitle="Gerencie suas contas bancárias, cartões e dinheiro"
          actions={
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Conta</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova conta para organizar suas finanças
                  </DialogDescription>
                </DialogHeader>
                <AccountForm onSubmit={handleSubmit} submitLabel="Criar" />
              </DialogContent>
            </Dialog>
          }
        />

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingAccount(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Conta</DialogTitle>
              <DialogDescription>
                Atualize os dados da conta
              </DialogDescription>
            </DialogHeader>
            <AccountForm onSubmit={handleEditSubmit} submitLabel="Salvar" />
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="bank" className="w-full animate-fade-in">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bank">
              <Landmark className="mr-2 h-4 w-4" />
              Contas Bancárias
            </TabsTrigger>
            <TabsTrigger value="credit_card">
              <CreditCard className="mr-2 h-4 w-4" />
              Cartões de Crédito
            </TabsTrigger>
            <TabsTrigger value="cash">
              <Wallet className="mr-2 h-4 w-4" />
              Dinheiro
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bank" className="mt-6">
            {renderAccountCards('bank')}
          </TabsContent>
          <TabsContent value="credit_card" className="mt-6">
            {renderAccountCards('credit_card')}
          </TabsContent>
          <TabsContent value="cash" className="mt-6">
            {renderAccountCards('cash')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Accounts;