import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CreditCard, 
  TrendingUp,
  Plus,
  LogOut,
  FolderKanban
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { TransactionDialog } from "@/components/TransactionDialog";

interface Transaction {
  id: number;
  description: string;
  amount_cents: number;
  type: string;
  date: string;
  categories: {
    name: string;
    emoji: string;
  };
}

interface CategoryTotal {
  name: string;
  emoji: string;
  total: number;
  percentage: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(profile?.name || user.email?.split("@")[0] || "Usuário");

      // Get current month start and end dates
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get transactions for current month
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (
            name,
            emoji,
            color
          )
        `)
        .eq("user_id", user.id)
        .gte("date", monthStart.toISOString())
        .lte("date", monthEnd.toISOString())
        .order("date", { ascending: false });

      if (transError) throw transError;

      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;
      const categoryMap = new Map<string, { name: string; emoji: string; total: number }>();

      transactions?.forEach((transaction) => {
        const amount = transaction.amount_cents / 100;
        
        if (transaction.type === "income") {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
          
          // Aggregate by category for expenses only
          const catKey = transaction.categories.name;
          if (!categoryMap.has(catKey)) {
            categoryMap.set(catKey, {
              name: transaction.categories.name,
              emoji: transaction.categories.emoji,
              total: 0,
            });
          }
          categoryMap.get(catKey)!.total += amount;
        }
      });

      setIncome(totalIncome);
      setExpenses(totalExpenses);

      // Get account balances
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("balance_cents")
        .eq("user_id", user.id);

      if (accountsError) throw accountsError;

      const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance_cents, 0) || 0;
      setBalance(totalBalance / 100);

      // Format recent transactions
      setRecentTransactions(
        transactions?.slice(0, 5).map((t) => ({
          id: t.id,
          description: t.description,
          amount_cents: t.amount_cents,
          type: t.type,
          date: new Date(t.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          categories: {
            name: t.categories.name,
            emoji: t.categories.emoji,
          },
        })) || []
      );

      // Calculate category percentages
      const categoryArray = Array.from(categoryMap.values());
      const categoriesWithPercentage = categoryArray.map((cat) => ({
        ...cat,
        percentage: totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0,
      }));

      // Sort by total and take top 4
      categoriesWithPercentage.sort((a, b) => b.total - a.total);
      setCategoryTotals(categoriesWithPercentage.slice(0, 4));

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/20">
        <header className="bg-gradient-primary text-primary-foreground py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">FinanceFlow</h1>
              <p className="text-sm text-primary-foreground/80">Olá, {userName}! 👋</p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20"
                onClick={() => navigate("/categories")}
              >
                <FolderKanban className="w-5 h-5" />
                Categorias
              </Button>
              
              <Button 
                variant="success" 
                size="lg" 
                className="gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-5 h-5" />
                Nova Transação
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleSignOut}
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-2 border-primary/20 shadow-lg animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <Wallet className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Atualizado agora
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-2 border-success/20 shadow-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <ArrowUpRight className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-2 border-destructive/20 shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {income > 0 ? `${Math.round((expenses / income) * 100)}% da receita` : "Este mês"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <Card className="shadow-lg animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Transações Recentes
              </CardTitle>
              <CardDescription>Suas últimas movimentações financeiras</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Nenhuma transação ainda</p>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar primeira transação
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                        }`}>
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="w-5 h-5 text-success" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.categories.emoji} {transaction.categories.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          R$ {(Math.abs(transaction.amount_cents) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card className="shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Despesas por Categoria
              </CardTitle>
              <CardDescription>Distribuição dos seus gastos este mês</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryTotals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhuma despesa registrada este mês</p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {categoryTotals.map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium flex items-center gap-2">
                            <span>{category.emoji}</span>
                            {category.name}
                          </span>
                          <span className="text-muted-foreground">
                            R$ {category.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Total de Despesas</p>
                    <p className="text-2xl font-bold text-destructive">
                      R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};

export default Dashboard;
