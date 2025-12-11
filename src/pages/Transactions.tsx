import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, FileDown, MoreHorizontal, ArrowLeft, Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import DynamicBackground from "@/components/DynamicBackground";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/DateRangePicker";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
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

interface Transaction {
  id: number;
  type: string;
  description: string;
  amount_cents: number;
  date: string;
  categories: {
    id: number;
    name: string;
    emoji: string;
  };
}

interface Category {
  id: number;
  name: string;
  emoji: string;
}

export default function Transactions() {
  const navigate = useNavigate();
  const { toast: legacyToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*, categories(id, name, emoji)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar transações");
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("categories")
      .select("id, name, emoji")
      .eq("user_id", user.id)
      .order("name");

    if (data) {
      setCategories(data);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Transação excluída com sucesso!");
      fetchTransactions();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast.error("Erro ao excluir transação");
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categories.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === "all" || 
        t.categories.id.toString() === selectedCategory;

      // Date filter
      const transactionDate = parseISO(t.date);
      const matchesDate = isWithinInterval(transactionDate, { start: startDate, end: endDate });

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [transactions, searchTerm, selectedCategory, startDate, endDate]);

  const filterByType = (type?: string) => {
    if (!type) return filteredTransactions;
    return filteredTransactions.filter((t) => t.type === type);
  };

  const hasActiveFilters = searchTerm !== "" || selectedCategory !== "all";

  const renderTable = (filteredByType: Transaction[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            </TableRow>
          ))
        ) : filteredByType.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              {hasActiveFilters ? "Nenhuma transação encontrada com os filtros aplicados" : "Nenhuma transação encontrada"}
            </TableCell>
          </TableRow>
        ) : (
          filteredByType.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {transaction.type === "income" ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
              </TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell className={transaction.type === "income" ? "text-success" : "text-destructive"}>
                {formatCurrency(transaction.amount_cents)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {transaction.categories.emoji} {transaction.categories.name}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(transaction.date)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente esta transação.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(transaction.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen relative p-8">
      <DynamicBackground />
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold">Minhas Transações</h1>
          </div>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">
                      {(searchTerm !== "" ? 1 : 0) + (selectedCategory !== "all" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Categoria:</span>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.emoji} {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Período:</span>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredTransactions.length} de {transactions.length} transações
          </div>
        )}

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">Todas ({filterByType().length})</TabsTrigger>
                <TabsTrigger value="income">Receitas ({filterByType("income").length})</TabsTrigger>
                <TabsTrigger value="expense">Despesas ({filterByType("expense").length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-6">
                {renderTable(filterByType())}
              </TabsContent>
              <TabsContent value="income" className="mt-6">
                {renderTable(filterByType("income"))}
              </TabsContent>
              <TabsContent value="expense" className="mt-6">
                {renderTable(filterByType("expense"))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
