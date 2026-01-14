import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Edit, Trash, PlusCircle, Loader2, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DynamicBackground from "@/components/DynamicBackground";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { UsageIndicator } from "@/components/UsageIndicator";
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
}

interface CreditCardDetails {
  id: number;
  account_id: number;
  closing_day: number;
  due_day: number;
  account?: Account;
}

const CreditCards = () => {
  const navigate = useNavigate();
  const [creditCards, setCreditCards] = useState<CreditCardDetails[]>([]);
  const [creditCardAccounts, setCreditCardAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardDetails | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_id: "",
    closing_day: "1",
    due_day: "10",
  });

  const { plan, canAddCreditCard, usage, limits, incrementUsage } = usePlan();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch all credit card accounts
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "credit_card")
        .order("name");

      if (accountsError) throw accountsError;
      setCreditCardAccounts(accounts || []);

      // Fetch credit card details with account info
      const { data: cards, error: cardsError } = await supabase
        .from("credit_cards_details")
        .select(`
          *,
          accounts (id, name, type, balance_cents)
        `)
        .eq("user_id", user.id);

      if (cardsError) throw cardsError;
      
      const formattedCards = (cards || []).map((card: any) => ({
        ...card,
        account: card.accounts
      }));
      
      setCreditCards(formattedCards);
    } catch (error: any) {
      console.error("Error fetching credit cards:", error);
      toast.error("Erro ao carregar cartões de crédito");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      closing_day: "1",
      due_day: "10",
    });
  };

  const getAvailableAccounts = () => {
    const configuredAccountIds = creditCards.map(cc => cc.account_id);
    return creditCardAccounts.filter(acc => !configuredAccountIds.includes(acc.id));
  };

  const handleOpenDialog = () => {
    if (!canAddCreditCard) {
      setUpgradeModalOpen(true);
      return;
    }
    if (getAvailableAccounts().length === 0) {
      toast.error("Não há cartões disponíveis para configurar");
      return;
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canAddCreditCard) {
      setUpgradeModalOpen(true);
      return;
    }

    if (!formData.account_id) {
      toast.error("Selecione uma conta de cartão de crédito");
      return;
    }

    const closingDay = parseInt(formData.closing_day);
    const dueDay = parseInt(formData.due_day);

    if (closingDay < 1 || closingDay > 31) {
      toast.error("Dia de fechamento deve estar entre 1 e 31");
      return;
    }

    if (dueDay < 1 || dueDay > 31) {
      toast.error("Dia de vencimento deve estar entre 1 e 31");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("credit_cards_details")
        .insert({
          user_id: user.id,
          account_id: parseInt(formData.account_id),
          closing_day: closingDay,
          due_day: dueDay,
        });

      if (error) throw error;

      await incrementUsage('cards');
      toast.success("Configuração de cartão salva com sucesso!");
      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving credit card:", error);
      toast.error("Erro ao salvar configuração do cartão");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (card: CreditCardDetails) => {
    setEditingCard(card);
    setFormData({
      account_id: card.account_id.toString(),
      closing_day: card.closing_day.toString(),
      due_day: card.due_day.toString(),
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCard) return;

    const closingDay = parseInt(formData.closing_day);
    const dueDay = parseInt(formData.due_day);

    if (closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31) {
      toast.error("Dias devem estar entre 1 e 31");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from("credit_cards_details")
        .update({
          closing_day: closingDay,
          due_day: dueDay,
        })
        .eq("id", editingCard.id);

      if (error) throw error;

      toast.success("Configuração atualizada com sucesso!");
      resetForm();
      setEditDialogOpen(false);
      setEditingCard(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating credit card:", error);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from("credit_cards_details")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Configuração removida com sucesso!");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting credit card:", error);
      toast.error("Erro ao remover configuração");
    }
  };

  const getDaysUntilDue = (dueDay: number): number => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let dueDate = new Date(currentYear, currentMonth, dueDay);
    
    if (dueDate <= today) {
      dueDate = new Date(currentYear, currentMonth + 1, dueDay);
    }

    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const CardForm = ({ onSubmit, submitLabel, isEditing = false }: { 
    onSubmit: (e: React.FormEvent) => void; 
    submitLabel: string;
    isEditing?: boolean;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="account">Conta do Cartão</Label>
          <Select
            value={formData.account_id}
            onValueChange={(value) => setFormData({ ...formData, account_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cartão" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableAccounts().map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getAvailableAccounts().length === 0 && (
            <p className="text-sm text-muted-foreground">
              Não há cartões disponíveis. Crie uma conta do tipo "Cartão de Crédito" primeiro.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="closing_day">Dia de Fechamento</Label>
        <Input
          id="closing_day"
          type="number"
          min="1"
          max="31"
          value={formData.closing_day}
          onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
          placeholder="Ex: 15"
        />
        <p className="text-xs text-muted-foreground">
          Dia do mês em que a fatura fecha
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_day">Dia de Vencimento</Label>
        <Input
          id="due_day"
          type="number"
          min="1"
          max="31"
          value={formData.due_day}
          onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
          placeholder="Ex: 25"
        />
        <p className="text-xs text-muted-foreground">
          Dia do mês em que a fatura vence
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDialogOpen(false);
            setEditDialogOpen(false);
            resetForm();
            setEditingCard(null);
          }}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          variant="success" 
          className="flex-1" 
          disabled={isSubmitting || (!isEditing && getAvailableAccounts().length === 0)}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="min-h-screen p-8 relative">
        <DynamicBackground />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 relative">
      <DynamicBackground />
      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        <PageHeader
          title="Cartões de Crédito"
          subtitle="Configure datas de fechamento e vencimento"
          showBack
          backTo="/dashboard"
          actions={
            <div className="flex items-center gap-4">
              {plan === "free" && (
                <UsageIndicator
                  current={usage.cardsCount}
                  max={limits.creditCards}
                  label="cartões"
                />
              )}
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                if (open && !canAddCreditCard) {
                  setUpgradeModalOpen(true);
                  return;
                }
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenDialog} disabled={getAvailableAccounts().length === 0 && canAddCreditCard}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Configurar Cartão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Cartão de Crédito</DialogTitle>
                    <DialogDescription>
                      Defina as datas de fechamento e vencimento do cartão
                    </DialogDescription>
                  </DialogHeader>
                  <CardForm onSubmit={handleSubmit} submitLabel="Salvar" />
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingCard(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Configuração</DialogTitle>
              <DialogDescription>
                Atualize as datas do cartão {editingCard?.account?.name}
              </DialogDescription>
            </DialogHeader>
            <CardForm onSubmit={handleEditSubmit} submitLabel="Atualizar" isEditing />
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        {creditCardAccounts.length === 0 && (
          <Card className="mb-8 border-warning/50 bg-warning/10">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-8 w-8 text-warning" />
              <div>
                <p className="font-medium">Nenhum cartão cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Primeiro, crie uma conta do tipo "Cartão de Crédito" na página de{" "}
                  <Button variant="link" className="h-auto p-0" onClick={() => navigate("/accounts")}>
                    Contas
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credit Cards Grid */}
        {creditCards.length === 0 && creditCardAccounts.length > 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Nenhum cartão configurado ainda
              </p>
              <Button variant="outline" onClick={handleOpenDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Configurar primeiro cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {creditCards.map((card) => {
              const daysUntilDue = getDaysUntilDue(card.due_day);
              const isNearDue = daysUntilDue <= 3;
              
              return (
                <Card key={card.id} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">
                        {card.account?.name || "Cartão"}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(card)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover configuração?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso irá remover as configurações de fechamento e vencimento deste cartão.
                              A conta do cartão não será excluída.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(card.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">
                      {formatCurrency(card.account?.balance_cents || 0)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Fechamento</p>
                          <p className="font-medium">Dia {card.closing_day}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Vencimento</p>
                          <p className="font-medium">Dia {card.due_day}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Badge 
                        variant={isNearDue ? "destructive" : "secondary"}
                        className="w-full justify-center"
                      >
                        {isNearDue ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Vence em {daysUntilDue} dia{daysUntilDue !== 1 ? "s" : ""}
                          </>
                        ) : (
                          `${daysUntilDue} dias até o vencimento`
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Unconfigured Cards Section */}
        {getAvailableAccounts().length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
              Cartões sem configuração
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getAvailableAccounts().map((account) => (
                <Card key={account.id} className="border-dashed">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg text-muted-foreground">
                        {account.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-muted-foreground mb-4">
                      {formatCurrency(account.balance_cents)}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        if (!canAddCreditCard) {
                          setUpgradeModalOpen(true);
                          return;
                        }
                        setFormData({ ...formData, account_id: account.id.toString() });
                        setDialogOpen(true);
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <UpgradeModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen}
        feature="configuração de mais cartões"
      />
    </div>
  );
};

export default CreditCards;
