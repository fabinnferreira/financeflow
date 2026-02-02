import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transactionSchema } from "@/lib/validations";
import { recalculateAccountBalance } from "@/lib/accountBalance";
import { useQueryClient } from "@tanstack/react-query";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAfterTransaction } from "@/lib/queryClient";

interface Transaction {
  id: number;
  type: string;
  description: string;
  amount_cents: number;
  date: string;
  account_id: number;
  category_id: number;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  transaction: Transaction | null;
}

export function EditTransactionDialog({ open, onOpenChange, onSuccess, transaction }: EditTransactionDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense",
    description: "",
    amount: "",
    account_id: "",
    category_id: "",
    date: new Date().toISOString().split('T')[0],
  });

  // Use React Query hooks for consistent cache
  const { data: accountsData = [] } = useAccounts();
  const { data: categoriesData = [] } = useCategories(formData.type);

  // Filter categories based on form type
  const filteredCategories = useMemo(() => {
    return categoriesData.filter(c => c.type === formData.type);
  }, [categoriesData, formData.type]);

  useEffect(() => {
    if (open && transaction) {
      setFormData({
        type: transaction.type,
        description: transaction.description,
        amount: (transaction.amount_cents / 100).toString(),
        account_id: transaction.account_id.toString(),
        category_id: transaction.category_id.toString(),
        date: new Date(transaction.date).toISOString().split('T')[0],
      });
    }
  }, [open, transaction]);

  // Reset category when type changes
  useEffect(() => {
    if (open && formData.type !== transaction?.type) {
      setFormData(prev => ({ ...prev, category_id: "" }));
    }
  }, [formData.type, open, transaction?.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transaction) return;

    const validation = transactionSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);

    try {
      const amountCents = Math.round(parseFloat(formData.amount) * 100);
      const newAccountId = parseInt(formData.account_id);
      const oldAccountId = transaction.account_id;

      const { error } = await supabase
        .from("transactions")
        .update({
          type: formData.type,
          description: formData.description,
          amount_cents: amountCents,
          account_id: newAccountId,
          category_id: parseInt(formData.category_id),
          date: new Date(formData.date).toISOString(),
          needs_review: false, // Clear needs_review flag when editing
        })
        .eq("id", transaction.id);

      if (error) throw error;

      // Recalculate both old and new account balances if account changed
      await recalculateAccountBalance(newAccountId);
      if (oldAccountId !== newAccountId) {
        await recalculateAccountBalance(oldAccountId);
      }

      // Use centralized invalidation helper
      invalidateAfterTransaction(queryClient);
      queryClient.invalidateQueries({ queryKey: ["pending-review-count"] });

      toast.success("Transação atualizada com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast.error("Erro ao atualizar transação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
          <DialogDescription>
            Atualize os dados da transação
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
                {accountsData.map((account) => (
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
                {filteredCategories.map((category) => (
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
  );
}
