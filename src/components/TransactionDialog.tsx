import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transactionSchema } from "@/lib/validations";
import { recalculateAccountBalance } from "@/lib/accountBalance";
import { useQueryClient } from "@tanstack/react-query";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeModal } from "./UpgradeModal";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { invalidateAfterTransaction } from "@/lib/queryClient";

interface Account {
  id: number;
  name: string;
  type: string;
}

interface Category {
  id: number;
  name: string;
  emoji: string;
  type: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TransactionDialog({ open, onOpenChange, onSuccess }: TransactionDialogProps) {
  const queryClient = useQueryClient();
  const { canAddTransaction, incrementUsage, usage, limits } = usePlan();
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense",
    description: "",
    amount: "",
    account_id: "",
    category_id: "",
    date: new Date().toISOString().split('T')[0],
  });

  // Use cached data from React Query hooks
  const { data: accountsData = [] } = useAccounts();
  const { data: categoriesData = [] } = useCategories(formData.type);
  
  // Map to expected format
  const accounts: Account[] = accountsData.map(a => ({ id: a.id, name: a.name, type: a.type }));
  const categories: Category[] = categoriesData.map(c => ({ 
    id: c.id, 
    name: c.name, 
    emoji: c.emoji || "", 
    type: c.type 
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check plan limit before allowing transaction
    if (!canAddTransaction) {
      setShowUpgradeModal(true);
      return;
    }
    
    const validation = transactionSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const amountCents = Math.round(parseFloat(formData.amount) * 100);

      const accountId = parseInt(formData.account_id);
      
      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: formData.type,
          description: formData.description,
          amount_cents: amountCents,
          account_id: accountId,
          category_id: parseInt(formData.category_id),
          date: new Date(formData.date).toISOString(),
        });

      if (error) throw error;

      // Recalculate account balance
      await recalculateAccountBalance(accountId);
      
      // Increment usage count
      await incrementUsage('transactions');

      // Invalidate related queries using centralized helper
      invalidateAfterTransaction(queryClient);

      toast.success("Transação criada com sucesso!");

      setFormData({
        type: "expense",
        description: "",
        amount: "",
        account_id: "",
        category_id: "",
        date: new Date().toISOString().split('T')[0],
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast.error("Erro ao criar transação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature="adicionar mais transações"
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
            <DialogDescription>
              Adicione uma nova receita ou despesa
              {limits.transactionsPerMonth !== Infinity && (
                <span className="block text-xs mt-1">
                  {usage.transactionsCount}/{limits.transactionsPerMonth} transações usadas este mês
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                setFormData({ ...formData, type: value, category_id: "" });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Supermercado"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Conta</Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.emoji} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="success"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
