"use client";

import React, { useState } from "react";
import ShoppingList from "@/components/shared/ShoppingList";
import {
  BarChart3,
  ArrowLeftRight,
  CreditCard,
  Tag,
  Settings,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Search,
  Plus,
  Minus,
  Shield,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Check,
  X,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  ShoppingCart,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}

interface Entity {
  id: string;
  name: string;
  type: "personal" | "business";
}

interface Account {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit_card";
  balance_cents: number;
  limit_cents?: number;
  due_date?: number;
  closing_date?: number;
  entity_id?: string;
}

interface Transaction {
  id: string;
  amount_cents: number;
  description: string;
  date: string;
  cleared: boolean;
  category_id?: string;
  account_id: string;
  user_id?: string;
  entity_id?: string;
  recurrence_type?: "single" | "fixed" | "installment";
  installments_total?: number;
  installment_number?: number;
  interval?: "weekly" | "monthly" | "yearly";
  parent_transaction_id?: string;
}

interface Member {
  id: string;
  full_name: string;
  role: string;
}

interface Budget {
  id: string;
  category_id: string;
  limit_amount_cents: number;
  spent_amount_cents: number;
  entity_id?: string;
}

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  allAccounts?: Account[];
  budgets: Budget[];
  members: Member[];
  onAddTransactionClick: (type: "income" | "expense") => void;
  onRefresh: () => void;
  familyName: string;
  onPayCard: (accountId: string) => void;
  onAddCard: (cardData: {
    name: string;
    limit_cents: number;
    due_date: number;
    closing_date: number;
  }) => void;
  selectedEntityId: string;
  onEntityChange: (entityId: string) => void;
  entities: Entity[];
  onAddEntity?: (name: string, type: "personal" | "business") => void;
  onEditEntity?: (id: string, name: string, type: "personal" | "business") => void;
  onDeleteEntity?: (id: string) => void;
  onAddCategory?: (categoryData: { name: string; type: "income" | "expense"; color: string; icon: string }) => void;
  onEditCategory?: (id: string, categoryData: { name: string; type: "income" | "expense"; color: string; icon: string }) => void;
  onDeleteCategory?: (id: string) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onEditCard?: (id: string, cardData: {
    name: string;
    limit_cents: number;
    due_date: number;
    closing_date: number;
  }) => void;
  onDeleteCard?: (id: string) => void;
  onAddAccount?: (accountData: { name: string; type: "cash" | "bank"; balance_cents: number }) => void;
  onEditAccount?: (id: string, accountData: { name: string; type: "cash" | "bank"; balance_cents: number }) => void;
  onDeleteAccount?: (id: string) => void;
  onReset?: (target: "transactions" | "cards" | "categories" | "entities" | "all") => void;
  onClearTransaction?: (id: string) => void;
}

export default function Dashboard({
  transactions,
  categories,
  accounts,
  allAccounts,
  budgets,
  members,
  onAddTransactionClick,
  onRefresh,
  familyName,
  onPayCard,
  onAddCard,
  selectedEntityId,
  onEntityChange,
  entities,
  onAddEntity,
  onEditEntity,
  onDeleteEntity,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onEditTransaction,
  onDeleteTransaction,
  onEditCard,
  onDeleteCard,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onReset,
  onClearTransaction,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "totais" | "lancamentos" | "contas" | "cartoes" | "categorias" | "configuracoes" | "compras"
  >("totais");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [hideValues, setHideValues] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estados locais para criação de cartão
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardLimit, setNewCardLimit] = useState("");
  const [newCardClosing, setNewCardClosing] = useState("5");
  const [newCardDue, setNewCardDue] = useState("10");

  // Estados locais para edição e exclusão inline de cartão
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardName, setEditCardName] = useState("");
  const [editCardLimit, setEditCardLimit] = useState("");
  const [editCardClosing, setEditCardClosing] = useState("5");
  const [editCardDue, setEditCardDue] = useState("10");
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState<string | null>(null);

  // Estados locais para criação de conta
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"cash" | "bank">("bank");
  const [newAccountBalance, setNewAccountBalance] = useState("");

  // Estados locais para edição e exclusão inline de conta
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountType, setEditAccountType] = useState<"cash" | "bank">("bank");
  const [editAccountBalance, setEditAccountBalance] = useState("");
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);

  // Controle de sanfona para faturas de cartões
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Helper para formatação de inputs de moeda
  const getFormattedCurrency = (rawValue: string) => {
    const numericValue = parseInt(rawValue || "0", 10);
    const floatValue = numericValue / 100;
    return floatValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (rawVal.length <= 12) {
      setter(rawVal);
    }
  };

  // Danger Zone state
  type ResetTarget = "transactions" | "cards" | "categories" | "entities" | "all";
  const [dangerSelection, setDangerSelection] = useState<Set<ResetTarget>>(new Set());
  const [dangerConfirmStep, setDangerConfirmStep] = useState(false);
  const [dangerConfirmText, setDangerConfirmText] = useState("");

  const DANGER_OPTIONS: { id: ResetTarget; label: string; desc: string }[] = [
    { id: "transactions", label: "Lançamentos", desc: "Apaga todos os lançamentos / transações registradas" },
    { id: "cards", label: "Cartões de Crédito", desc: "Remove todos os cartões cadastrados" },
    { id: "categories", label: "Categorias", desc: "Remove todas as categorias e orçamentos vinculados" },
    { id: "entities", label: "Personas / Empresas", desc: "Remove todas as entidades (perfis) cadastradas" },
    { id: "all", label: "Reset Completo", desc: "Apaga absolutamente tudo e restaura os dados padrão" },
  ];

  const toggleDangerItem = (id: ResetTarget) => {
    setDangerSelection((prev) => {
      const next = new Set(prev);
      if (id === "all") {
        // toggle all-or-nothing
        if (next.has("all")) {
          next.clear();
        } else {
          next.clear();
          next.add("all");
        }
        return next;
      }
      next.delete("all"); // deselect reset completo if any partial is chosen
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDangerConfirmStep(false);
    setDangerConfirmText("");
  };

  const executeDangerReset = () => {
    dangerSelection.forEach((target) => onReset?.(target));
    setDangerSelection(new Set());
    setDangerConfirmStep(false);
    setDangerConfirmText("");
  };

  // Estados locais para seletor de mês
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // Ex: "2026-06"
  });
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);

  // Estados locais para controle de entidades (personas/empresas)
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState<"personal" | "business">("personal");
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingEntityName, setEditingEntityName] = useState("");
  const [editingEntityType, setEditingEntityType] = useState<"personal" | "business">("personal");

  const [isCatTypeDropdownOpen, setIsCatTypeDropdownOpen] = useState(false);
  const [isCatIconDropdownOpen, setIsCatIconDropdownOpen] = useState(false);
  const [isEntityTypeDropdownOpen, setIsEntityTypeDropdownOpen] = useState(false);

  const handleAddEntitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;
    onAddEntity?.(newEntityName.trim(), newEntityType);
    setNewEntityName("");
    setIsAddingEntity(false);
    setIsEntityTypeDropdownOpen(false);
  };

  const handleSaveEditEntity = (id: string) => {
    if (!editingEntityName.trim()) return;
    onEditEntity?.(id, editingEntityName.trim(), editingEntityType);
    setEditingEntityId(null);
  };

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName) return;
    onAddAccount?.({
      name: newAccountName,
      type: newAccountType,
      balance_cents: Number(newAccountBalance) || 0,
    });
    setNewAccountName("");
    setNewAccountBalance("");
    setIsAddAccountOpen(false);
  };

  const startEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditAccountName(acc.name);
    setEditAccountType(acc.type as "cash" | "bank");
    setEditAccountBalance(acc.balance_cents.toString());
  };

  const saveEditAccount = () => {
    if (editingAccountId) {
      onEditAccount?.(editingAccountId, {
        name: editAccountName,
        type: editAccountType,
        balance_cents: Number(editAccountBalance) || 0,
      });
      setEditingAccountId(null);
    }
  };

  // Estados locais para controle de categorias
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"income" | "expense">("expense");
  const [categoryColor, setCategoryColor] = useState("#ef4444");
  const [categoryIcon, setCategoryIcon] = useState("Tag");

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    const categoryData = {
      name: categoryName.trim(),
      type: categoryType,
      color: categoryColor,
      icon: categoryIcon,
    };

    if (editingCategoryId) {
      onEditCategory?.(editingCategoryId, categoryData);
      setEditingCategoryId(null);
    } else {
      onAddCategory?.(categoryData);
      setIsAddingCategory(false);
    }

    setCategoryName("");
    setCategoryType("expense");
    setCategoryColor("#ef4444");
    setCategoryIcon("Tag");
    setIsCatTypeDropdownOpen(false);
    setIsCatIconDropdownOpen(false);
  };

  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${prevYear}-${prevMonth}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(year, month, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextYear}-${nextMonth}`);
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName) return;

    onAddCard?.({
      name: newCardName,
      limit_cents: Number(newCardLimit) || 0,
      due_date: Number(newCardDue),
      closing_date: Number(newCardClosing),
    });

    setNewCardName("");
    setNewCardLimit("");
    setNewCardClosing("5");
    setNewCardDue("10");
    setIsAddCardOpen(false);
  };

  const startEditCard = (acc: Account) => {
    setEditingCardId(acc.id);
    setEditCardName(acc.name);
    setEditCardLimit(acc.limit_cents?.toString() || "");
    setEditCardClosing(acc.closing_date?.toString() || "5");
    setEditCardDue(acc.due_date?.toString() || "10");
  };

  const handleEditCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardId) return;
    if (!editCardName) return;
    onEditCard?.(editingCardId, {
      name: editCardName,
      limit_cents: Number(editCardLimit) || 0,
      due_date: Number(editCardDue),
      closing_date: Number(editCardClosing),
    });
    setEditingCardId(null);
  };

  // Formatar valor monetário
  const formatMoney = (cents: number) => {
    if (hideValues) return "R$ \u2022\u2022\u2022\u2022";
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Transações filtradas pelo mês selecionado
  const monthlyTransactions = transactions.filter(
    (t) => t.date && t.date.startsWith(selectedMonth)
  );

  // Lógica de métricas mensais
  const monthlyIncomeTransactions = monthlyTransactions.filter((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    return cat?.type === "income";
  });
  
  const monthlyIncome = monthlyIncomeTransactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const monthlyIncomeRealized = monthlyIncomeTransactions.filter(t => t.cleared).reduce((sum, t) => sum + t.amount_cents, 0);
  const monthlyIncomeExpected = monthlyIncomeTransactions.filter(t => !t.cleared).reduce((sum, t) => sum + t.amount_cents, 0);

  const monthlyExpenseTransactions = monthlyTransactions.filter((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    return cat?.type === "expense";
  });

  const monthlyExpense = monthlyExpenseTransactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const monthlyExpenseRealized = monthlyExpenseTransactions.filter(t => t.cleared).reduce((sum, t) => sum + t.amount_cents, 0);
  const monthlyExpenseExpected = monthlyExpenseTransactions.filter(t => !t.cleared).reduce((sum, t) => sum + t.amount_cents, 0);

  const monthlyBalance = monthlyIncome - monthlyExpense;
  const monthlyBalanceRealized = monthlyIncomeRealized - monthlyExpenseRealized;
  const monthlyBalanceExpected = monthlyIncomeExpected - monthlyExpenseExpected;

  // Lógica de métricas gerais acumuladas totais
  const totalIncome = transactions
    .filter((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      return cat?.type === "income";
    })
    .reduce((sum, t) => sum + t.amount_cents, 0);

  const totalExpense = transactions
    .filter((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      return cat?.type === "expense";
    })
    .reduce((sum, t) => sum + t.amount_cents, 0);

  const totalBalance = totalIncome - totalExpense;

  const balanceSum = accounts.reduce((sum, acc) => {
    if (acc.type === "credit_card") {
      return sum - acc.balance_cents;
    }
    return sum + acc.balance_cents;
  }, 0);

  // Filtrar transações para a aba de Lançamentos
  const filteredTransactions = transactions.filter((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    const matchesMonth = t.date && t.date.startsWith(selectedMonth);
    const matchesSearch = t.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (!matchesMonth) return false;
    if (filterType === "all") return matchesSearch;
    if (filterType === "income") return cat?.type === "income" && matchesSearch;
    if (filterType === "expense") return cat?.type === "expense" && matchesSearch;
    return matchesSearch;
  });

  // Separar transações avulsas das de cartão
  const regularTransactions = filteredTransactions.filter((t) => {
    const acc = accounts.find((a) => a.id === t.account_id);
    return acc?.type !== "credit_card";
  });

  const cardTransactions = filteredTransactions.filter((t) => {
    const acc = accounts.find((a) => a.id === t.account_id);
    return acc?.type === "credit_card";
  });

  // Agrupar as transações de cartão por conta (cartão)
  const creditCardAccountsWithTransactions = accounts.filter((acc) => {
    if (acc.type !== "credit_card") return false;
    return cardTransactions.some((t) => t.account_id === acc.id);
  });

  // Menu lateral (Sidebar items)
  const menuItems = [
    { id: "totais", label: "Totais", icon: BarChart3 },
    { id: "lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
    { id: "contas", label: "Contas", icon: Wallet },
    { id: "cartoes", label: "Cartões", icon: CreditCard },
    { id: "categorias", label: "Categorias", icon: Tag },
    { id: "configuracoes", label: "Configurações", icon: Settings },
    { id: "compras", label: "Lista de Compras", icon: ShoppingCart },
  ] as const;

  return (
    <div className="flex-1 flex flex-row h-full bg-black overflow-hidden min-h-0">
      <aside className="w-16 md:w-56 shrink-0 flex flex-col py-8 px-3.5 relative overflow-hidden my-4 ml-4 mr-2 rounded-[24px]"
        style={{
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(60px) saturate(220%)",
          WebkitBackdropFilter: "blur(60px) saturate(220%)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02), 0 24px 50px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Apple-glass inner shimmer */}
        <div className="pointer-events-none absolute inset-0 rounded-[24px]"
          style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 65%)" }}
        />

        {/* Seletor Global de Persona/Empresa no topo do Sidebar */}
        <div className="relative z-20 mb-6 w-full px-1">
          <button
            type="button"
            onClick={() => setIsEntityDropdownOpen(!isEntityDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.08] rounded-xl transition-all text-left cursor-pointer backdrop-blur-xl"
            style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                selectedEntityId === "all"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : selectedEntityId === "ent-1"
                  ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                  : selectedEntityId === "ent-2"
                  ? "bg-rose-600/10 text-rose-400 border border-rose-500/20"
                  : selectedEntityId === "ent-3"
                  ? "bg-amber-600/10 text-amber-400 border border-amber-500/20"
                  : "bg-zinc-850 text-zinc-400 border border-zinc-700"
              }`}>
                {selectedEntityId === "all" ? <Users className="w-3.5 h-3.5" />
                  : selectedEntityId === "ent-1" ? "J"
                  : selectedEntityId === "ent-2" ? "H"
                  : selectedEntityId === "ent-3" ? <Building2 className="w-3.5 h-3.5" />
                  : "E"}
              </div>
              <span className="hidden md:inline text-[10px] font-bold text-zinc-400 truncate">
                {selectedEntityId === "all" ? "Todos" : entities.find((e) => e.id === selectedEntityId)?.name || "Perfil"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0 hidden md:block" />
          </button>

          {isEntityDropdownOpen && (
            <>
              <div className="fixed inset-0 z-35" onClick={() => setIsEntityDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 bg-zinc-950/40 border border-white/5 rounded-2xl shadow-2xl z-40 p-1.5 backdrop-blur-3xl animate-fadeIn"
                style={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)" }}
              >
                <button type="button"
                  onClick={() => { onEntityChange("all"); setIsEntityDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2.5 ${selectedEntityId === "all" ? "bg-white/10 text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}`}
                >
                  <span className="w-5 h-5 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"><Users className="w-3.5 h-3.5" /></span>
                  Consolidado Geral
                </button>
                <div className="border-t border-white/5 my-1.5" />
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block px-3 py-1">Personas</span>
                {entities.filter((e) => e.type === "personal").map((e) => (
                  <button key={e.id} type="button"
                    onClick={() => { onEntityChange(e.id); setIsEntityDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2.5 ${selectedEntityId === e.id ? "bg-white/10 text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${e.id === "ent-1" ? "bg-purple-600/10 border border-purple-500/20 text-purple-400" : "bg-rose-600/10 border border-rose-500/20 text-rose-400"}`}>
                      {e.id === "ent-1" ? "J" : "H"}
                    </span>
                    {e.name}
                  </button>
                ))}
                <div className="border-t border-white/5 my-1.5" />
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block px-3 py-1">Empresas</span>
                {entities.filter((e) => e.type === "business").map((e) => (
                  <button key={e.id} type="button"
                    onClick={() => { onEntityChange(e.id); setIsEntityDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2.5 ${selectedEntityId === e.id ? "bg-white/10 text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}`}
                  >
                    <span className="w-5 h-5 rounded-md bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center"><Building2 className="w-3.5 h-3.5" /></span>
                    {e.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* NAVIGATION — vertically centered, Sequoia tile style */}
        <nav className="flex flex-col gap-2 relative z-10 my-auto w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex-none flex items-center gap-3.5 h-[44px] rounded-xl text-left transition-all duration-300 ease-out cursor-pointer relative ${
                  isActive
                    ? "button-apple-active pl-7 font-black"
                    : "button-apple-inactive pl-5 font-semibold"
                }`}
              >
                {isActive && (
                  <div className="absolute left-2 w-1.5 h-3.5 rounded-full bg-white animate-pulse" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 transition-transform ${isActive ? "scale-105" : ""}`} />
                <span className="hidden md:inline text-[10px] tracking-[0.18em] uppercase leading-none truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 min-h-0 bg-[#050507]">
        {/* Cabeçalho de Ações */}
        <div className="flex justify-end py-2">
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setHideValues(!hideValues)}
              className="w-9 h-9 border border-white/5 bg-white/3 text-zinc-400 hover:text-white hover:bg-white/8 rounded-full transition-all active:scale-90 flex items-center justify-center cursor-pointer"
              title={hideValues ? "Exibir Valores" : "Ocultar Valores"}
            >
              {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onAddTransactionClick("expense")}
              className="px-5 py-2.5 rounded-full border border-rose-500/20 hover:border-rose-500/40 bg-zinc-950/40 text-rose-400 font-bold uppercase text-[9px] tracking-widest flex items-center gap-2 hover:bg-rose-500/[0.03] transition-all active:scale-95 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" /> Saída
            </button>
            <button
              onClick={() => onAddTransactionClick("income")}
              className="px-5 py-2.5 rounded-full border border-emerald-500/20 hover:border-emerald-500/40 bg-zinc-950/40 text-emerald-400 font-bold uppercase text-[9px] tracking-widest flex items-center gap-2 hover:bg-emerald-500/[0.03] transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Entrada
            </button>
          </div>
        </div>

        {/* 2.1 CONTEÚDO DA ABA TOTAIS */}
        {activeTab === "totais" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Navegador de Mês OLED Centralizado */}
            <div className="flex justify-center items-center py-2">
              <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-white/5 rounded-full p-1 shadow-2xl min-w-[280px] justify-between backdrop-blur-xl">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90 cursor-pointer"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 select-none text-center flex-1 px-4">
                  {formatMonthYear(selectedMonth)}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90 cursor-pointer"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bloco 1: Cálculos Mensais */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-550 flex items-center gap-2 select-none">
                <span className="w-1.5 h-3 bg-zinc-800 rounded-full animate-pulse" />
                Cálculos Mensais ({formatMonthYear(selectedMonth)})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Receita Mensal */}
                <div className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between h-40 group cursor-default">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-300" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">
                        Entradas no Mês
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tight mt-3 text-gradient-emerald">
                        {formatMoney(monthlyIncome)}
                      </h3>
                    </div>
                    <span className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl text-emerald-400">
                      <TrendingUp className="w-4.5 h-4.5" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full z-10 border-t border-white/[0.03] pt-2 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Realizado</span>
                      <span className="text-[10px] font-bold text-emerald-400">{formatMoney(monthlyIncomeRealized)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Previsto</span>
                      <span className="text-[10px] font-bold text-emerald-500/50">{formatMoney(monthlyIncomeExpected)}</span>
                    </div>
                  </div>
                </div>

                {/* Despesas Mensais */}
                <div className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between h-40 group cursor-default">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-all duration-300" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">
                        Saídas no Mês
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tight mt-3 text-gradient-rose">
                        {formatMoney(monthlyExpense)}
                      </h3>
                    </div>
                    <span className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-2xl text-rose-400">
                      <TrendingDown className="w-4.5 h-4.5" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full z-10 border-t border-white/[0.03] pt-2 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Realizado</span>
                      <span className="text-[10px] font-bold text-rose-400">{formatMoney(monthlyExpenseRealized)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Previsto</span>
                      <span className="text-[10px] font-bold text-rose-500/50">{formatMoney(monthlyExpenseExpected)}</span>
                    </div>
                  </div>
                </div>

                {/* Balanço Mensal */}
                <div className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between h-40 group cursor-default">
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-all duration-300 ${monthlyBalance >= 0 ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-rose-500/5 group-hover:bg-rose-500/10"}`} />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">
                        Balanço no Mês
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tight mt-3 text-gradient-apple">
                        {formatMoney(monthlyBalance)}
                      </h3>
                    </div>
                    <span className={`p-3 border rounded-2xl transition-colors ${monthlyBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 border-rose-500/15 text-rose-400'}`}>
                      <BarChart3 className="w-4.5 h-4.5" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full z-10 border-t border-white/[0.03] pt-2 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Realizado</span>
                      <span className={`text-[10px] font-bold ${monthlyBalanceRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(monthlyBalanceRealized)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Previsto</span>
                      <span className={`text-[10px] font-bold ${monthlyBalanceExpected >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>{formatMoney(monthlyBalanceExpected)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Geral Acumulado */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-550 flex items-center gap-2 select-none">
                <span className="w-1.5 h-3 bg-zinc-800 rounded-full" />
                Cálculo Geral Acumulado
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Saldo Líquido Consolidado */}
                <div className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between h-40 group cursor-default">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-300" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">
                        Saldo Consolidado Real
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tight mt-3 text-gradient-apple">
                        {formatMoney(balanceSum)}
                      </h3>
                    </div>
                    <span className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-zinc-300">
                      <Wallet className="w-4.5 h-4.5" />
                    </span>
                  </div>
                  <span className="text-[8px] font-bold text-zinc-650 uppercase tracking-[0.15em] z-10">
                    Contas Líquidas
                  </span>
                </div>

                {/* Total Entradas Histórico */}
                <div className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between h-40 group cursor-default">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/3 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/7 transition-all duration-300" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">
                        Total de Entradas (Geral)
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tight mt-3 text-zinc-200">
                        {formatMoney(totalIncome)}
                      </h3>
                    </div>
                    <span className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-zinc-400">
                      <TrendingUp className="w-4.5 h-4.5" />
                    </span>
                  </div>
                  <span className="text-[8px] font-bold text-zinc-650 uppercase tracking-[0.15em] z-10">
                    Entradas Históricas
                  </span>
                </div>

                {/* Total Saídas Histórico */}
                <div className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between h-40 group cursor-default">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/3 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/7 transition-all duration-300" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">
                        Total de Saídas (Geral)
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tight mt-3 text-zinc-200">
                        {formatMoney(totalExpense)}
                      </h3>
                    </div>
                    <span className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-zinc-400">
                      <TrendingDown className="w-4.5 h-4.5" />
                    </span>
                  </div>
                  <span className="text-[8px] font-bold text-zinc-650 uppercase tracking-[0.15em] z-10">
                    Saídas Históricas
                  </span>
                </div>
              </div>
            </div>

            {/* Sumário de Estatísticas Extra */}
            <div className="glass p-6 rounded-[24px] space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/[0.03] pb-2.5 select-none">
                Resumo de Atividade & Métricas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-2">
                <div className="flex justify-between items-center text-xs border-b border-white/[0.03] pb-2">
                  <span className="text-zinc-500 font-bold tracking-wide uppercase text-[9px] select-none">Lançamentos no mês selecionado</span>
                  <span className="font-bold text-zinc-200">{monthlyTransactions.length} transações</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/[0.03] pb-2">
                  <span className="text-zinc-500 font-bold tracking-wide uppercase text-[9px] select-none">Total de lançamentos históricos</span>
                  <span className="font-bold text-zinc-200">{transactions.length} transações</span>
                </div>
                <div className="flex justify-between items-center text-xs md:border-b-0 pb-2">
                  <span className="text-zinc-550 font-bold tracking-wide uppercase text-[9px] select-none">Balanço do mês selecionado</span>
                  <span className={`font-black ${monthlyBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatMoney(monthlyBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2">
                  <span className="text-zinc-550 font-bold tracking-wide uppercase text-[9px] select-none">Balanço geral acumulado</span>
                  <span className={`font-black ${totalBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatMoney(totalBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2.2 CONTEÚDO DA ABA LANÇAMENTOS */}
        {activeTab === "lancamentos" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Navegador de Mês OLED Centralizado */}
            <div className="flex justify-center items-center py-2">
              <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-white/5 rounded-full p-1 shadow-2xl min-w-[280px] justify-between backdrop-blur-xl">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90 cursor-pointer"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 select-none text-center flex-1 px-4">
                  {formatMonthYear(selectedMonth)}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90 cursor-pointer"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Resumo Financeiro do Mês */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass p-4 rounded-[20px] relative overflow-hidden flex flex-col justify-between group h-28">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start justify-between z-10">
                  <div>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">Entradas no Mês</span>
                    <h3 className="text-xl font-extrabold tracking-tight mt-1 text-gradient-emerald">{formatMoney(monthlyIncome)}</h3>
                  </div>
                  <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex justify-between items-center w-full z-10 border-t border-white/[0.03] pt-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Real: {formatMoney(monthlyIncomeRealized)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Prev: {formatMoney(monthlyIncomeExpected)}</span>
                  </div>
                </div>
              </div>

              <div className="glass p-4 rounded-[20px] relative overflow-hidden flex flex-col justify-between group h-28">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start justify-between z-10">
                  <div>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">Saídas no Mês</span>
                    <h3 className="text-xl font-extrabold tracking-tight mt-1 text-gradient-rose">{formatMoney(monthlyExpense)}</h3>
                  </div>
                  <span className="p-2.5 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex justify-between items-center w-full z-10 border-t border-white/[0.03] pt-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Real: {formatMoney(monthlyExpenseRealized)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Prev: {formatMoney(monthlyExpenseExpected)}</span>
                  </div>
                </div>
              </div>

              <div className="glass p-4 rounded-[20px] relative overflow-hidden flex flex-col justify-between group h-28">
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl pointer-events-none ${monthlyBalance >= 0 ? "bg-emerald-500/5" : "bg-rose-500/5"}`} />
                <div className="flex items-start justify-between z-10">
                  <div>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block select-none">Balanço do Mês</span>
                    <h3 className="text-xl font-extrabold tracking-tight mt-1 text-gradient-apple">{formatMoney(monthlyBalance)}</h3>
                  </div>
                  <span className={`p-2.5 border rounded-xl ${monthlyBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 border-rose-500/15 text-rose-400'}`}>
                    <BarChart3 className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex justify-between items-center w-full z-10 border-t border-white/[0.03] pt-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${monthlyBalanceRealized >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Real: {formatMoney(monthlyBalanceRealized)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${monthlyBalanceExpected >= 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Prev: {formatMoney(monthlyBalanceExpected)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl backdrop-blur-xl">
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar lançamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.04] focus:border-white/[0.08] focus:bg-white/[0.04] rounded-lg py-2 pl-9.5 pr-4 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-650"
                />
              </div>

              <div className="flex bg-black/40 p-1 border border-white/5 rounded-full self-start sm:self-auto">
                {(["all", "income", "expense"] as const).map((type) => {
                  const isActive = filterType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all cursor-pointer ${
                        isActive
                          ? "bg-white/[0.08] border border-white/10 text-white shadow-md animate-fadeIn"
                          : "text-zinc-550 hover:text-zinc-350"
                      }`}
                    >
                      {type === "all" ? "Todos" : type === "income" ? "Entradas" : "Saídas"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Listagem Única */}
            <div className="bg-white/[0.005] border border-white/[0.04] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.03] bg-white/[0.01] text-[9px] font-black uppercase tracking-[0.2em] text-zinc-550">
                      <th className="py-4.5 px-6">Data</th>
                      <th className="py-4.5 px-6">Descrição</th>
                      <th className="py-4.5 px-6">Pertence a</th>
                      <th className="py-4.5 px-6">Categoria</th>
                      <th className="py-4.5 px-6">Conta</th>
                      <th className="py-4.5 px-6 text-right">Valor</th>
                      <th className="py-4.5 px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs font-semibold">
                    {(() => {
                      const displayAccounts = allAccounts || accounts;

                      // 1. Separar transações em avulsas (regular) e de cartão de crédito
                      const regularTxs = filteredTransactions.filter((t) => {
                        const acc = displayAccounts.find((a) => a.id === t.account_id);
                        return acc?.type !== "credit_card";
                      });

                      const sortedRegularTxs = [...regularTxs].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                      );

                      // 2. Agrupar transações de cartões de crédito
                      const cardAccounts = displayAccounts.filter((acc) => acc.type === "credit_card");
                      const cardGroups = cardAccounts
                        .map((card) => {
                          const txs = filteredTransactions.filter((t) => t.account_id === card.id);
                          const sortedTxs = [...txs].sort(
                            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                          );
                          const pendingCents = txs
                            .filter((t) => !t.cleared)
                            .reduce((sum, t) => sum + t.amount_cents, 0);

                          return {
                            card,
                            transactions: sortedTxs,
                            pendingCents,
                          };
                        })
                        .filter((g) => g.transactions.length > 0);

                      const hasAnyRows = sortedRegularTxs.length > 0 || cardGroups.length > 0;

                      if (!hasAnyRows) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-zinc-500 italic text-xs">
                              Nenhuma transação encontrada correspondente aos filtros.
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <>
                          {/* Transações Avulsas / Regulares */}
                          {sortedRegularTxs.map((t) => {
                            const cat = categories.find((c) => c.id === t.category_id);
                            const acc = displayAccounts.find((a) => a.id === t.account_id);
                            const isIncome = cat?.type === "income";

                            return (
                              <tr key={t.id} className="row-apple border-b border-white/[0.02] transition-all duration-200">
                                <td className="py-4 px-6 text-zinc-550 font-semibold select-none">
                                  {new Date(t.date).toLocaleDateString("pt-BR")}
                                </td>
                                <td className="py-4 px-6 text-zinc-200 font-bold">
                                  <div className="flex flex-col gap-1">
                                    <span>{t.description}</span>
                                    {t.recurrence_type && t.recurrence_type !== "single" && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        {t.recurrence_type === "fixed" && (
                                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                            Fixo ({t.interval === "weekly" ? "Semanal" : t.interval === "yearly" ? "Anual" : "Mensal"})
                                          </span>
                                        )}
                                        {t.recurrence_type === "installment" && (
                                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                                            Parcela {t.installment_number || 1}/{t.installments_total || 1} ({t.interval === "weekly" ? "Semanal" : t.interval === "yearly" ? "Anual" : "Mensal"})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  {t.entity_id ? (
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full bg-zinc-950/40 ${
                                      t.entity_id === "ent-1"
                                        ? "bg-purple-600/10 text-purple-400 border-purple-500/20"
                                        : t.entity_id === "ent-2"
                                        ? "bg-rose-600/10 text-rose-400 border-rose-500/20"
                                        : t.entity_id === "ent-3"
                                        ? "bg-amber-600/10 text-amber-400 border-amber-500/20"
                                        : "bg-zinc-850 text-zinc-400 border-zinc-700"
                                    }`}>
                                      {entities.find((e) => e.id === t.entity_id)?.name || "Outro"}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-550 font-medium">-</span>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <span
                                    className="px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide"
                                    style={{ backgroundColor: cat?.color + "15", color: cat?.color, borderColor: cat?.color + "25" }}
                                  >
                                    {cat?.name || "Sem categoria"}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-zinc-500 font-semibold">{acc?.name}</td>
                                <td className={`py-4 px-6 text-right font-black text-xs ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                                  {isIncome ? "+" : "-"}
                                  {formatMoney(t.amount_cents)}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex justify-center items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onClearTransaction?.(t.id)}
                                      className={`w-8 h-8 rounded-full border border-white/5 bg-white/2 flex items-center justify-center transition-all cursor-pointer hover:bg-white/8 hover:scale-105 active:scale-95 ${
                                        t.cleared ? "text-emerald-400" : "text-rose-400"
                                      }`}
                                      title={t.cleared ? "Marcar como Pendente" : "Marcar como Pago"}
                                    >
                                      {t.cleared ? (
                                        <ThumbsUp className="w-4 h-4" />
                                      ) : (
                                        <ThumbsDown className="w-4 h-4" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onEditTransaction?.(t)}
                                      className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-zinc-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                                      title="Editar Lançamento"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    {confirmDeleteId === t.id ? (
                                      <div className="flex items-center gap-1.5 animate-fadeIn">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteTransaction?.(t.id);
                                            setConfirmDeleteId(null);
                                          }}
                                          className="w-8 h-8 rounded-full border border-red-500/20 bg-red-950/20 text-red-500 hover:text-red-400 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                          title="Confirmar Exclusão"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-zinc-550 hover:text-zinc-350 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                          title="Cancelar"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(t.id)}
                                        className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-zinc-500 hover:text-red-400 hover:bg-red-950/10 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                        title="Excluir Lançamento"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Grupos de Cartões de Crédito */}
                          {cardGroups.map((group) => (
                            <React.Fragment key={group.card.id}>
                              {/* Linha de Cabeçalho do Cartão */}
                              {(() => {
                                const isExpanded = expandedCards[group.card.id] !== false;
                                return (
                                  <>
                                    <tr 
                                      className="bg-white/[0.015] hover:bg-white/[0.025] border-y border-white/[0.03] cursor-pointer select-none transition-all duration-200"
                                      onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.closest(".actions-cell")) return;
                                        toggleCard(group.card.id);
                                      }}
                                    >
                                      <td className="py-3 px-6 text-zinc-550 font-semibold select-none">
                                        <div className="flex items-center gap-1.5">
                                          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-250 ${isExpanded ? "rotate-180" : ""}`} />
                                          <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                                          <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">Cartão</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-6 text-zinc-200">
                                        <div className="flex flex-col">
                                          <span className="font-extrabold text-xs uppercase tracking-wide text-zinc-300">
                                            Fatura {group.card.name}
                                          </span>
                                          <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider mt-0.5">
                                            Vence Dia {group.card.due_date || "--"} • Fecha Dia {group.card.closing_date || "--"}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-6">
                                        {group.card.entity_id ? (
                                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full bg-zinc-950/40 ${
                                            group.card.entity_id === "ent-1"
                                              ? "bg-purple-600/10 text-purple-400 border-purple-500/20"
                                              : group.card.entity_id === "ent-2"
                                              ? "bg-rose-600/10 text-rose-400 border-rose-500/20"
                                              : group.card.entity_id === "ent-3"
                                              ? "bg-amber-600/10 text-amber-400 border-amber-500/20"
                                              : "bg-zinc-850 text-zinc-400 border-zinc-700"
                                          }`}>
                                            {entities.find((e) => e.id === group.card.entity_id)?.name || "Outro"}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-550 font-medium">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-6">
                                        <span className="px-2.5 py-0.5 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/[0.02] text-zinc-400">
                                          Fatura Cartão
                                        </span>
                                      </td>
                                      <td className="py-3 px-6 text-zinc-500 font-semibold">{group.card.name}</td>
                                      <td className={`py-3 px-6 text-right font-black ${group.pendingCents > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                        {group.pendingCents > 0 ? "-" : ""}{formatMoney(group.pendingCents)}
                                      </td>
                                      <td className="py-3 px-6 text-center actions-cell" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center items-center gap-1.5">
                                          {group.pendingCents > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() => onPayCard(group.card.id)}
                                              className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-rose-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                              title="Pagar Fatura Completa (Quitar)"
                                            >
                                              <ThumbsDown className="w-4 h-4" />
                                            </button>
                                          ) : (
                                            <div
                                              className="w-8 h-8 flex items-center justify-center text-emerald-400 cursor-default"
                                              title="Fatura Totalmente Quitada"
                                            >
                                              <ThumbsUp className="w-4 h-4" />
                                            </div>
                                          )}
                                          {/* Espaçadores vazios para alinhamento perfeito com lápis/lixeira */}
                                          <div className="w-8 h-8" />
                                          <div className="w-8 h-8" />
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Linhas das Transações deste Cartão (Sanfona) */}
                                    {isExpanded && group.transactions.map((t) => {
                                      const cat = categories.find((c) => c.id === t.category_id);
                                      const isIncome = cat?.type === "income";

                                      return (
                                        <tr key={t.id} className="row-apple border-b border-white/[0.02] transition-all duration-200">
                                          <td className="py-4 px-6 text-zinc-550 font-semibold select-none">
                                            {new Date(t.date).toLocaleDateString("pt-BR")}
                                          </td>
                                          <td className="py-4 px-6 text-zinc-200 font-bold">
                                            <div className="flex flex-col gap-1">
                                              <span>{t.description}</span>
                                              {t.recurrence_type && t.recurrence_type !== "single" && (
                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                  {t.recurrence_type === "fixed" && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                                      Fixo ({t.interval === "weekly" ? "Semanal" : t.interval === "yearly" ? "Anual" : "Mensal"})
                                                    </span>
                                                  )}
                                                  {t.recurrence_type === "installment" && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                                                      Parcela {t.installment_number || 1}/{t.installments_total || 1} ({t.interval === "weekly" ? "Semanal" : t.interval === "yearly" ? "Anual" : "Mensal"})
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-4 px-6">
                                            {t.entity_id ? (
                                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full bg-zinc-950/40 ${
                                                t.entity_id === "ent-1"
                                                  ? "bg-purple-600/10 text-purple-400 border-purple-500/20"
                                                  : t.entity_id === "ent-2"
                                                  ? "bg-rose-600/10 text-rose-400 border-rose-500/20"
                                                  : t.entity_id === "ent-3"
                                                  ? "bg-amber-600/10 text-amber-400 border-amber-500/20"
                                                  : "bg-zinc-850 text-zinc-400 border-zinc-700"
                                              }`}>
                                                {entities.find((e) => e.id === t.entity_id)?.name || "Outro"}
                                              </span>
                                            ) : (
                                              <span className="text-zinc-550 font-medium">-</span>
                                            )}
                                          </td>
                                          <td className="py-4 px-6">
                                            <span
                                              className="px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-wide"
                                              style={{ backgroundColor: cat?.color + "15", color: cat?.color, borderColor: cat?.color + "25" }}
                                            >
                                              {cat?.name || "Sem categoria"}
                                            </span>
                                          </td>
                                          <td className="py-4 px-6 text-zinc-500 font-semibold">{group.card.name}</td>
                                          <td className={`py-4 px-6 text-right font-black text-xs ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                                            {isIncome ? "+" : "-"}
                                            {formatMoney(t.amount_cents)}
                                          </td>
                                          <td className="py-4 px-6 text-center">
                                            <div className="flex justify-center items-center gap-1.5">
                                              {/* Espaçador vazio no lugar do polegar de status */}
                                              <div className="w-8 h-8" />

                                              <button
                                                type="button"
                                                onClick={() => onEditTransaction?.(t)}
                                                className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-zinc-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                                                title="Editar Lançamento"
                                              >
                                                <Pencil className="w-4 h-4" />
                                              </button>

                                              {confirmDeleteId === t.id ? (
                                                <div className="flex items-center gap-1.5 animate-fadeIn">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      onDeleteTransaction?.(t.id);
                                                      setConfirmDeleteId(null);
                                                    }}
                                                    className="w-8 h-8 rounded-full border border-red-500/20 bg-red-950/20 text-red-500 hover:text-red-400 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                                    title="Confirmar Exclusão"
                                                  >
                                                    <Check className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-zinc-550 hover:text-zinc-350 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                                    title="Cancelar"
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => setConfirmDeleteId(t.id)}
                                                  className="w-8 h-8 rounded-full border border-white/5 bg-white/2 text-zinc-500 hover:text-red-400 hover:bg-red-950/10 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                                                  title="Excluir Lançamento"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}

                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2.3 CONTEÚDO DA ABA CONTAS */}
        {activeTab === "contas" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Cabeçalho interno com Ação de Adicionar Conta */}
            <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Contas e Carteiras
              </span>
              <button
                onClick={() => setIsAddAccountOpen(!isAddAccountOpen)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-350 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all"
              >
                {isAddAccountOpen ? "Cancelar" : "+ Adicionar Conta"}
              </button>
            </div>

            {/* Formulário de Adicionar Conta */}
            {isAddAccountOpen && (
              <form
                onSubmit={handleAddAccountSubmit}
                className="glass p-6 rounded-3xl max-w-xl space-y-4 border border-zinc-800"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
                  Configurar Nova Conta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Nome da Conta
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nubank, Carteira Física"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Tipo de Conta
                    </label>
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 relative">
                      {/* Switch Background */}
                      <div
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-700 rounded-lg transition-all duration-300 ease-out"
                        style={{
                          left: newAccountType === "bank" ? "4px" : "calc(50%)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setNewAccountType("bank")}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider relative z-10 transition-colors duration-300 ${
                          newAccountType === "bank" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                        }`}
                      >
                        Banco (Digital)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAccountType("cash")}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider relative z-10 transition-colors duration-300 ${
                          newAccountType === "cash" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                        }`}
                      >
                        Dinheiro Físico
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Saldo Inicial (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={getFormattedCurrency(newAccountBalance)}
                      onChange={(e) => handleCurrencyInputChange(e, setNewAccountBalance)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold text-center tracking-wider"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl active:scale-98 transition-all mt-2"
                >
                  Salvar Conta
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts
              .filter((acc) => acc.type !== "credit_card")
              .map((acc) => (
                <div
                  key={acc.id}
                  className="glass glass-hover p-6 rounded-[24px] space-y-5 relative overflow-hidden group cursor-default flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/3 rounded-full blur-2xl pointer-events-none group-hover:bg-white/5 transition-all duration-300" />
                  <div className="flex justify-between items-start z-10 relative">
                    <div>
                      {editingAccountId === acc.id ? (
                        <input
                          type="text"
                          value={editAccountName}
                          onChange={(e) => setEditAccountName(e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded px-2 py-1 outline-none w-full mb-2"
                          autoFocus
                        />
                      ) : (
                        <h4 className="text-base font-extrabold text-zinc-100">{acc.name}</h4>
                      )}
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500 block mt-1 select-none">
                        {acc.type === "bank" ? "Método PIX" : "Dinheiro Físico"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Lixeira */}
                      <button
                        onClick={() =>
                          setConfirmDeleteAccountId(
                            confirmDeleteAccountId === acc.id ? null : acc.id
                          )
                        }
                        title="Excluir conta"
                        className="p-2 rounded-xl border border-white/5 bg-white/3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Lápis */}
                      <button
                        onClick={() =>
                          editingAccountId === acc.id
                            ? saveEditAccount()
                            : startEditAccount(acc)
                        }
                        title={editingAccountId === acc.id ? "Salvar" : "Editar conta"}
                        className="p-2 rounded-xl border border-white/5 bg-white/3 text-zinc-400 hover:text-white hover:bg-white/8 active:scale-90 transition-all cursor-pointer"
                      >
                        {editingAccountId === acc.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Pencil className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="p-2.5 rounded-xl text-xs border border-white/5 bg-white/3 text-zinc-300">
                        <Wallet className="w-4 h-4 animate-float" />
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.03] pt-4 z-10 relative">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.18em] block select-none">
                      Saldo Disponível
                    </span>
                    {editingAccountId === acc.id ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={getFormattedCurrency(editAccountBalance)}
                        onChange={(e) => handleCurrencyInputChange(e, setEditAccountBalance)}
                        className="bg-zinc-900 border border-zinc-700 text-white text-lg font-black rounded px-2 py-1 outline-none w-full mt-1.5 text-center tracking-wider"
                      />
                    ) : (
                      <span className="text-2xl font-black block mt-1.5 text-gradient-apple">
                        {formatMoney(acc.balance_cents)}
                      </span>
                    )}
                  </div>
                  {confirmDeleteAccountId === acc.id && (
                    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-20 flex flex-col justify-center items-center p-4 rounded-[24px] animate-fadeIn">
                      <p className="text-xs font-bold text-red-400 mb-3 text-center">
                        Excluir esta conta permanentemente?
                      </p>
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => setConfirmDeleteAccountId(null)}
                          className="flex-1 py-2 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            onDeleteAccount?.(acc.id);
                            setConfirmDeleteAccountId(null);
                          }}
                          className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase tracking-wider text-white transition-all"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.3.1 CONTEÚDO DA ABA CARTÕES */}
        {activeTab === "cartoes" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Cabeçalho interno com Ação de Adicionar Cartão */}
            <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Cartões Compartilhados
              </span>
              <button
                onClick={() => setIsAddCardOpen(!isAddCardOpen)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-350 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all"
              >
                {isAddCardOpen ? "Cancelar" : "+ Adicionar Cartão"}
              </button>
            </div>

            {/* Formulário de Adicionar Cartão */}
            {isAddCardOpen && (
              <form
                onSubmit={handleAddCardSubmit}
                className="glass p-6 rounded-3xl max-w-xl space-y-4 border border-zinc-800"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
                  Configurar Novo Cartão
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Nome / Apelido do Cartão
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nubank Conjunto"
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Limite Total (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={getFormattedCurrency(newCardLimit)}
                      onChange={(e) => handleCurrencyInputChange(e, setNewCardLimit)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold text-center tracking-wider"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Dia de Fechamento da Fatura
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newCardClosing}
                      onChange={(e) => setNewCardClosing(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Dia de Vencimento da Fatura
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newCardDue}
                      onChange={(e) => setNewCardDue(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl active:scale-98 transition-all mt-2"
                >
                  Salvar Cartão
                </button>
              </form>
            )}

            {/* Lista de Cartões */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts
                .filter((acc) => acc.type === "credit_card")
                .map((acc) => {
                  const percent = acc.limit_cents
                    ? Math.min(
                        Math.round((acc.balance_cents / acc.limit_cents) * 100),
                        100
                      )
                    : 0;

                  return (
                    <div
                      key={acc.id}
                      className="glass glass-hover p-6 rounded-[24px] relative overflow-hidden group flex flex-col justify-between cursor-default"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-all duration-300" />
                      
                      <div className="space-y-5 z-10 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-extrabold text-zinc-100">{acc.name}</h4>
                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500 block mt-1 select-none">
                              Cartão de Crédito
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Lixeira */}
                            <button
                              onClick={() =>
                                setConfirmDeleteCardId(
                                  confirmDeleteCardId === acc.id ? null : acc.id
                                )
                              }
                              title="Excluir cartão"
                              className="p-2 rounded-xl border border-white/5 bg-white/3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Lápis */}
                            <button
                              onClick={() =>
                                editingCardId === acc.id
                                  ? setEditingCardId(null)
                                  : startEditCard(acc)
                              }
                              title="Editar cartão"
                              className="p-2 rounded-xl border border-white/5 bg-white/3 text-zinc-400 hover:text-white hover:bg-white/8 active:scale-90 transition-all cursor-pointer"
                            >
                              {editingCardId === acc.id ? (
                                <X className="w-3.5 h-3.5" />
                              ) : (
                                <Pencil className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="p-2.5 rounded-xl text-xs border border-rose-500/20 bg-rose-500/15 text-rose-400">
                              <CreditCard className="w-4 h-4 animate-float" />
                            </span>
                          </div>
                        </div>

                        {/* Informações de fechamento e vencimento */}
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-zinc-500 border-y border-white/[0.03] py-2.5 select-none">
                          <div>
                            <span>Fechamento:</span>
                            <span className="text-zinc-300 block mt-0.5">Todo dia {acc.closing_date || "3"}</span>
                          </div>
                          <div>
                            <span>Vencimento:</span>
                            <span className="text-zinc-300 block mt-0.5">Todo dia {acc.due_date || "10"}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.18em] block select-none">
                            Fatura Atual (Saldo Devedor)
                          </span>
                          <span className="text-2xl font-black block mt-1.5 text-gradient-rose">
                            -{formatMoney(acc.balance_cents)}
                          </span>
                        </div>

                        {acc.limit_cents && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold text-zinc-500 select-none">
                              <span>Limite Utilizado ({percent}%)</span>
                              <span>Teto: {formatMoney(acc.limit_cents)}</span>
                            </div>
                            <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Inline Edit Form */}
                      {editingCardId === acc.id && (
                        <form
                          onSubmit={handleEditCardSubmit}
                          className="border-t border-zinc-800 pt-4 space-y-3 animate-fadeIn"
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Editar Cartão</span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="col-span-2">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Nome / Apelido</label>
                              <input
                                type="text"
                                value={editCardName}
                                onChange={(e) => setEditCardName(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none font-semibold"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Limite (R$)</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={getFormattedCurrency(editCardLimit)}
                                onChange={(e) => handleCurrencyInputChange(e, setEditCardLimit)}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none font-semibold text-center tracking-wider"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Dia Fecham.</label>
                              <input
                                type="number" min="1" max="31"
                                value={editCardClosing}
                                onChange={(e) => setEditCardClosing(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none font-semibold"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Dia Vencim.</label>
                              <input
                                type="number" min="1" max="31"
                                value={editCardDue}
                                onChange={(e) => setEditCardDue(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none font-semibold"
                                required
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all"
                          >
                            Salvar Alterações
                          </button>
                        </form>
                      )}

                      {/* Confirmação de Exclusão */}
                      {confirmDeleteCardId === acc.id && (
                        <div className="border border-red-900/40 bg-red-950/20 rounded-xl p-3 flex items-center justify-between gap-3 animate-fadeIn">
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
                            Excluir este cartão?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteCardId(null)}
                              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
                            >
                              Não
                            </button>
                            <button
                              onClick={() => {
                                onDeleteCard?.(acc.id);
                                setConfirmDeleteCardId(null);
                                if (editingCardId === acc.id) setEditingCardId(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-[9px] font-black uppercase tracking-wider text-white transition-all"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botão de Pagar Fatura */}
                      <button
                        onClick={() => onPayCard(acc.id)}
                        disabled={acc.balance_cents === 0}
                        className="w-full py-2.5 mt-2 border border-zinc-800 bg-zinc-950/40 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-950/20 active:scale-[0.98] transition-all rounded-xl disabled:opacity-25 disabled:pointer-events-none"
                      >
                        Pagar Fatura (Quitar)
                      </button>
                    </div>
                  );
                })}
              {accounts.filter((acc) => acc.type === "credit_card").length === 0 && (
                <div className="col-span-3 glass p-8 rounded-3xl text-center text-zinc-550 italic text-xs">
                  Nenhum cartão de crédito cadastrado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2.4 CONTEÚDO DA ABA CATEGORIAS */}
        {activeTab === "categorias" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgets.map((b) => {
                const cat = categories.find((c) => c.id === b.category_id);
                const percent = Math.min(
                  Math.round((b.spent_amount_cents / b.limit_amount_cents) * 100),
                  100
                );
                const isOver = b.spent_amount_cents > b.limit_amount_cents;

                return (
                  <div key={b.id} className="glass p-5 rounded-3xl space-y-4 border border-zinc-900/50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat?.color }}
                        />
                        <h4 className="text-sm font-extrabold text-zinc-100">
                          {cat?.name || "Sem categoria"}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-white">{percent}%</span>
                    </div>

                    {/* Barra de orçamentos */}
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver
                            ? "bg-red-500"
                            : percent > 80
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 pt-1 border-t border-zinc-900/40">
                      <div className="flex flex-col">
                        <span>Gasto</span>
                        <span className="text-zinc-300 mt-0.5">{formatMoney(b.spent_amount_cents)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span>Teto Orçamentário</span>
                        <span className="text-zinc-350 mt-0.5">{formatMoney(b.limit_amount_cents)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <div className="col-span-2 glass p-8 rounded-3xl text-center text-zinc-550 italic text-xs">
                  Nenhum limite orçamentário configurado para este mês.
                </div>
              )}
            </div>

            {/* Gerenciamento de Categorias */}
            <div className="glass p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-zinc-550" />
                  Gerenciar Categorias
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(!isAddingCategory);
                    setEditingCategoryId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-350 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all cursor-pointer"
                >
                  {isAddingCategory ? "Cancelar" : "+ Nova Categoria"}
                </button>
              </div>

              {/* Formulário para Nova Categoria ou Edição */}
              {(isAddingCategory || editingCategoryId) && (
                <form
                  onSubmit={handleCategorySubmit}
                  className="space-y-4 p-4 border border-zinc-900 rounded-2xl bg-zinc-950/20"
                >
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    {editingCategoryId ? "Editar Categoria" : "Nova Categoria"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Assinaturas, Educação"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold"
                        required
                      />
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Tipo
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCatTypeDropdownOpen(!isCatTypeDropdownOpen);
                            setIsCatIconDropdownOpen(false);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold flex items-center justify-between cursor-pointer text-left"
                        >
                          <span>{categoryType === "expense" ? "Saída (Despesa)" : "Entrada (Receita)"}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isCatTypeDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isCatTypeDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="divide-y divide-zinc-900/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryType("expense");
                                  setIsCatTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left py-2 px-3.5 text-xs font-semibold hover:bg-zinc-900 transition-all cursor-pointer ${
                                  categoryType === "expense" ? "text-accent bg-accent/5" : "text-zinc-400"
                                }`}
                              >
                                Saída (Despesa)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryType("income");
                                  setIsCatTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left py-2 px-3.5 text-xs font-semibold hover:bg-zinc-900 transition-all cursor-pointer ${
                                  categoryType === "income" ? "text-accent bg-accent/5" : "text-zinc-400"
                                }`}
                              >
                                Entrada (Receita)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Ãcone
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCatIconDropdownOpen(!isCatIconDropdownOpen);
                            setIsCatTypeDropdownOpen(false);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold flex items-center justify-between cursor-pointer text-left"
                        >
                          <span>
                            {categoryIcon === "Tag"
                              ? "Etiqueta (Geral)"
                              : categoryIcon === "Utensils"
                              ? "Alimentação"
                              : categoryIcon === "Home"
                              ? "Moradia"
                              : categoryIcon === "Car"
                              ? "Transporte"
                              : categoryIcon === "Heart"
                              ? "Saúde / Lazer"
                              : categoryIcon === "DollarSign"
                              ? "Dinheiro / Salário"
                              : "Investimentos"}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isCatIconDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isCatIconDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                            <div className="divide-y divide-zinc-900/60">
                              {[
                                { val: "Tag", label: "Etiqueta (Geral)" },
                                { val: "Utensils", label: "Alimentação" },
                                { val: "Home", label: "Moradia" },
                                { val: "Car", label: "Transporte" },
                                { val: "Heart", label: "Saúde / Lazer" },
                                { val: "DollarSign", label: "Dinheiro / Salário" },
                                { val: "TrendingUp", label: "Investimentos" },
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    setCategoryIcon(opt.val);
                                    setIsCatIconDropdownOpen(false);
                                  }}
                                  className={`w-full text-left py-2 px-3.5 text-xs font-semibold hover:bg-zinc-900 transition-all cursor-pointer ${
                                    categoryIcon === opt.val ? "text-accent bg-accent/5" : "text-zinc-400"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cores Presets */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                      Cor de Identificação
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { hex: "#ef4444", label: "Vermelho" },
                        { hex: "#3b82f6", label: "Azul" },
                        { hex: "#f59e0b", label: "Laranja" },
                        { hex: "#10b981", label: "Verde" },
                        { hex: "#8b5cf6", label: "Roxo" },
                        { hex: "#ec4899", label: "Rosa" },
                        { hex: "#6b7280", label: "Cinza" },
                      ].map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setCategoryColor(c.hex)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                            categoryColor === c.hex
                              ? "border-white scale-110 shadow-lg shadow-white/10"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        >
                          {categoryColor === c.hex && (
                            <Check className="w-3.5 h-3.5 text-black bg-white rounded-full p-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl active:scale-98 transition-all mt-2 cursor-pointer"
                  >
                    {editingCategoryId ? "Salvar Alterações" : "Criar Categoria"}
                  </button>
                </form>
              )}

              {/* Lista de Categorias cadastradas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex items-center justify-between hover:border-zinc-800 transition-all animate-fadeIn"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div>
                        <h5 className="text-xs font-bold text-zinc-200">{cat.name}</h5>
                        <span className="text-[8px] text-zinc-550 block uppercase tracking-wider mt-0.5">
                          {cat.type === "income" ? "Entrada / Receita" : "Saída / Despesa"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setCategoryName(cat.name);
                          setCategoryType(cat.type);
                          setCategoryColor(cat.color);
                          setCategoryIcon(cat.icon);
                          setIsAddingCategory(false);
                        }}
                        className="px-2 py-1 rounded border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory?.(cat.id)}
                        className="px-2 py-1 rounded border border-red-950 bg-red-950/10 text-[9px] font-black uppercase text-red-400 hover:bg-red-900/20 transition-all cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2.5 CONTEÚDO DA ABA CONFIGURAÇÕES */}
        {activeTab === "configuracoes" && (
          <div className="max-w-2xl space-y-6 animate-fadeIn">
            {/* Lista de Membros */}
            <div className="glass p-6 rounded-3xl space-y-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-550" />
                Membros da Família
              </h3>

              <div className="divide-y divide-zinc-900/60">
                {members.map((member) => (
                  <div key={member.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-xs font-bold text-zinc-400">
                        {member.full_name[0]}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-200">
                          {member.full_name}
                        </h5>
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mt-0.5">
                          Usuário Associado
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-zinc-500 capitalize">
                        {member.role}
                      </span>
                      {member.role === "admin" && (
                        <span className="p-1 bg-accent/10 text-accent rounded-lg text-[9px] border border-accent/20">
                          <Shield className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controle de Personas e Empresas */}
            <div className="glass p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-550" />
                  Personas e Empresas (Entidades)
                </h3>
                <button
                  onClick={() => setIsAddingEntity(!isAddingEntity)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-350 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all"
                >
                  {isAddingEntity ? "Cancelar" : "+ Adicionar Entidade"}
                </button>
              </div>

              {/* Formulário para adicionar nova entidade */}
              {isAddingEntity && (
                <form
                  onSubmit={handleAddEntitySubmit}
                  className="space-y-4 p-4 border border-zinc-900 rounded-2xl bg-zinc-950/20"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Nome da Entidade
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Persona 3 (Carlos) ou Empresa 3 (Studio)"
                        value={newEntityName}
                        onChange={(e) => setNewEntityName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold"
                        required
                      />
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Tipo de Perfil
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsEntityTypeDropdownOpen(!isEntityTypeDropdownOpen)}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-zinc-200 outline-none font-semibold flex items-center justify-between cursor-pointer text-left"
                        >
                          <span>{newEntityType === "personal" ? "Pessoal (Persona)" : "Jurídico (Empresa)"}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-zinc-550 transition-transform duration-200 ${isEntityTypeDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isEntityTypeDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="divide-y divide-zinc-900/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewEntityType("personal");
                                  setIsEntityTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left py-2 px-3.5 text-xs font-semibold hover:bg-zinc-900 transition-all cursor-pointer ${
                                  newEntityType === "personal" ? "text-accent bg-accent/5" : "text-zinc-400"
                                }`}
                              >
                                Pessoal (Persona)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewEntityType("business");
                                  setIsEntityTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left py-2 px-3.5 text-xs font-semibold hover:bg-zinc-900 transition-all cursor-pointer ${
                                  newEntityType === "business" ? "text-accent bg-accent/5" : "text-zinc-400"
                                }`}
                              >
                                Jurídico (Empresa)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl active:scale-98 transition-all mt-2"
                  >
                    Salvar Entidade
                  </button>
                </form>
              )}

              {/* Lista de Entidades */}
              <div className="divide-y divide-zinc-900/60">
                {entities.map((ent) => (
                  <div key={ent.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-xs font-bold ${
                        ent.type === "personal"
                          ? "bg-purple-600/10 text-purple-400 border-purple-500/20"
                          : "bg-amber-600/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {ent.type === "personal" ? "P" : "E"}
                      </div>
                      <div>
                        {editingEntityId === ent.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={editingEntityName}
                              onChange={(e) => setEditingEntityName(e.target.value)}
                              className="bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1 text-xs text-zinc-200 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditEntity(ent.id)}
                              className="p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEntityId(null)}
                              className="p-1 text-zinc-500 hover:text-zinc-400 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h5 className="text-xs font-bold text-zinc-200">
                              {ent.name}
                            </h5>
                            <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mt-0.5">
                              {ent.type === "personal" ? "Perfil Pessoal" : "Perfil Jurídico / Empresa"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingEntityId !== ent.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntityId(ent.id);
                              setEditingEntityName(ent.name);
                              setEditingEntityType(ent.type);
                            }}
                            className="px-2 py-1 rounded border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntity?.(ent.id)}
                            className="px-2 py-1 rounded border border-red-950 bg-red-950/10 text-[9px] font-black uppercase text-red-400 hover:bg-red-900/20 transition-all cursor-pointer"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulação de Configuração */}
            <div className="glass p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-3">
                Parâmetros Globais
              </h3>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div>
                    <p className="text-zinc-200">Moeda Padrão</p>
                    <p className="text-[9px] text-zinc-550 mt-0.5">Define a localidade de formatação dos valores.</p>
                  </div>
                  <span className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400">
                    BRL (R$)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div>
                    <p className="text-zinc-200">Fuso Horário</p>
                    <p className="text-[9px] text-zinc-550 mt-0.5">Sincronização de datas dos lançamentos.</p>
                  </div>
                  <span className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400">
                    UTC-3 (Brasília)
                  </span>
                </div>
              </div>
            </div>

            {/* ===================== DANGER ZONE ===================== */}
            <div className="rounded-3xl border border-red-900/40 bg-red-950/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-red-900/30 bg-red-950/20">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-900/40 border border-red-800/40">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-400">Danger Zone</h3>
                  <p className="text-[9px] text-red-700 mt-0.5">Ações irreversíveis. Leia com atenção antes de prosseguir.</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Opções de reset */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-3">Selecione o que deseja apagar:</p>
                  {DANGER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleDangerItem(opt.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        dangerSelection.has(opt.id)
                          ? "border-red-700/60 bg-red-900/20"
                          : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40"
                      }`}
                    >
                      {/* Checkbox visual */}
                      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        dangerSelection.has(opt.id)
                          ? "border-red-500 bg-red-600"
                          : "border-zinc-700 bg-zinc-900"
                      }`}>
                        {dangerSelection.has(opt.id) && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${
                          dangerSelection.has(opt.id) ? "text-red-300" : "text-zinc-300"
                        } ${
                          opt.id === "all" ? "font-black" : ""
                        }`}>{opt.label}</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Botão de continuar â€” só aparece se algo foi selecionado */}
                {dangerSelection.size > 0 && !dangerConfirmStep && (
                  <button
                    type="button"
                    onClick={() => setDangerConfirmStep(true)}
                    className="w-full py-3 rounded-xl border border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/30 hover:text-red-300 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] animate-fadeIn"
                  >
                    Continuar &rarr;
                  </button>
                )}

                {/* Etapa 2: confirmar digitando CONFIRMAR */}
                {dangerConfirmStep && (
                  <div className="space-y-3 border border-red-800/40 rounded-2xl p-4 bg-red-950/20 animate-fadeIn">
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
                      Esta ação é irreversível. Digite <span className="font-black text-red-300">CONFIRMAR</span> para prosseguir:
                    </p>
                    <input
                      type="text"
                      value={dangerConfirmText}
                      onChange={(e) => setDangerConfirmText(e.target.value)}
                      placeholder="CONFIRMAR"
                      className="w-full bg-zinc-950 border border-red-900/50 focus:border-red-700 rounded-xl py-2.5 px-3.5 text-xs text-red-300 placeholder-red-900 outline-none font-bold tracking-widest"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setDangerConfirmStep(false); setDangerConfirmText(""); }}
                        className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={dangerConfirmText !== "CONFIRMAR"}
                        onClick={executeDangerReset}
                        className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                      >
                        Apagar Agora
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2.6 CONTEÚDO DA ABA COMPRAS */}
        {activeTab === "compras" && (
          <div className="animate-fadeIn w-full h-full relative">
            <ShoppingList />
          </div>
        )}
      </main>
    </div>
  );
}
