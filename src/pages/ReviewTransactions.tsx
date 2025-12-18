import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DynamicBackground from '@/components/DynamicBackground';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: number;
  description: string;
  amount_cents: number;
  type: string;
  date: string;
  category_id: number;
  account_id: number;
  accounts?: { name: string } | null;
  categories?: { name: string; emoji: string } | null;
}

interface Category {
  id: number;
  name: string;
  emoji: string | null;
  type: string;
}

export default function ReviewTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Record<number, number>>({});

  const fetchData = useCallback(async () => {
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            id, description, amount_cents, type, date, category_id, account_id,
            accounts (name),
            categories (name, emoji)
          `)
          .eq('needs_review', true)
          .order('date', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name, emoji, type')
          .order('name'),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);

      // Initialize selected categories with current values
      const initialSelections: Record<number, number> = {};
      for (const t of (transactionsRes.data || [])) {
        initialSelections[t.id] = t.category_id;
      }
      setSelectedCategories(initialSelections);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCategoryChange = (transactionId: number, categoryId: number) => {
    setSelectedCategories(prev => ({
      ...prev,
      [transactionId]: categoryId,
    }));
  };

  const handleSaveTransaction = async (transactionId: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          category_id: selectedCategories[transactionId],
          needs_review: false,
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Transação categorizada!');
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      // Adjust index if needed
      if (currentIndex >= transactions.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Erro ao salvar transação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = transactions.map(t => ({
        id: t.id,
        category_id: selectedCategories[t.id],
        needs_review: false,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('transactions')
          .update({
            category_id: update.category_id,
            needs_review: false,
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success(`${updates.length} transações categorizadas!`);
      setTransactions([]);
    } catch (error) {
      console.error('Error saving all transactions:', error);
      toast.error('Erro ao salvar transações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipTransaction = async (transactionId: number) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ needs_review: false })
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      if (currentIndex >= transactions.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error('Error skipping transaction:', error);
      toast.error('Erro ao pular transação');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const currentTransaction = transactions[currentIndex];

  return (
    <div className="min-h-screen relative">
      <DynamicBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bank-connections')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Revisar Transações</h1>
            <p className="text-muted-foreground">
              Categorize as transações importadas do Open Banking
            </p>
          </div>
          {transactions.length > 0 && (
            <Button onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Todas ({transactions.length})
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="bg-card/60 backdrop-blur-md border-border/50">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="bg-card/60 backdrop-blur-md border-border/50">
            <CardContent className="p-12 text-center">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">Tudo categorizado!</h3>
              <p className="text-muted-foreground mb-4">
                Não há transações pendentes de revisão.
              </p>
              <Button onClick={() => navigate('/bank-connections')}>
                Voltar para Conexões
              </Button>
            </CardContent>
          </Card>
        ) : currentTransaction ? (
          <div className="space-y-4">
            <Card className="bg-card/60 backdrop-blur-md border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{currentTransaction.description}</CardTitle>
                    <CardDescription>
                      {currentTransaction.accounts?.name} • {format(new Date(currentTransaction.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${currentTransaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {currentTransaction.type === 'income' ? '+' : '-'}{formatCurrency(currentTransaction.amount_cents)}
                    </div>
                    <Badge variant={currentTransaction.type === 'income' ? 'default' : 'secondary'}>
                      {currentTransaction.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select
                    value={String(selectedCategories[currentTransaction.id] || currentTransaction.category_id)}
                    onValueChange={(value) => handleCategoryChange(currentTransaction.id, Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(c => c.type === currentTransaction.type)
                        .map(category => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.emoji} {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleSaveTransaction(currentTransaction.id)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSkipTransaction(currentTransaction.id)}
                    disabled={isSaving}
                  >
                    Pular
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} de {transactions.length}
              </span>
              
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.min(transactions.length - 1, currentIndex + 1))}
                disabled={currentIndex === transactions.length - 1}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Quick overview */}
            <Card className="bg-card/60 backdrop-blur-md border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Visão Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{transactions.length}</div>
                    <div className="text-xs text-muted-foreground">Para revisar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {formatCurrency(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount_cents, 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Despesas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {formatCurrency(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount_cents, 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Receitas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {new Set(transactions.map(t => t.account_id)).size}
                    </div>
                    <div className="text-xs text-muted-foreground">Contas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
