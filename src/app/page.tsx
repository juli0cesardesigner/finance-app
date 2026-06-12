"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSync } from "@/hooks/useSync";
import { db, LocalTransaction } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import QuickInsertModal from "@/components/pwa/QuickInsertModal";
import Dashboard from "@/components/desktop/Dashboard";
import {
  Wifi,
  WifiOff,
  CloudLightning,
  RefreshCw,
  Plus,
  Minus,
  Wallet,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  X,
} from "lucide-react";
import ShoppingList from "@/components/shared/ShoppingList";

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

// Mock data removida por solicitação do usuário. Estado começa vazio e sincroniza com o banco.

// Helper to add weeks, months, or years to a local YYYY-MM-DD date string without timezones or month overflows
const addIntervalToDate = (dateStr: string, index: number, interval: "weekly" | "monthly" | "yearly"): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  
  if (interval === "weekly") {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + index * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const rDay = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${rDay}`;
  }
  
  if (interval === "monthly") {
    const d = new Date(year, month - 1, day);
    d.setMonth(d.getMonth() + index);
    const expectedMonth = (month - 1 + index) % 12;
    const expectedYear = year + Math.floor((month - 1 + index) / 12);
    const actualMonth = d.getMonth();
    const targetMonthVal = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;
    if (actualMonth !== targetMonthVal) {
      // Month overflowed (e.g., Jan 31 + 1 month became March 3)
      // Set to the last day of the target month
      const lastDayDate = new Date(expectedYear, targetMonthVal + 1, 0);
      const y = lastDayDate.getFullYear();
      const m = String(lastDayDate.getMonth() + 1).padStart(2, "0");
      const rDay = String(lastDayDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${rDay}`;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const rDay = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${rDay}`;
  }
  
  if (interval === "yearly") {
    const d = new Date(year, month - 1, day);
    d.setFullYear(d.getFullYear() + index);
    // Handle Feb 29 leap year overflow
    if (month === 2 && day === 29 && d.getMonth() !== 1) {
      const lastDayDate = new Date(year + index, 2, 0);
      const y = lastDayDate.getFullYear();
      const m = String(lastDayDate.getMonth() + 1).padStart(2, "0");
      const rDay = String(lastDayDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${rDay}`;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const rDay = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${rDay}`;
  }
  
  return dateStr;
};

export default function Home() {
  const { isOnline, isSyncing, pendingCount, syncOfflineData, updatePendingCount, fetchSupabaseData, migrateLocalDataToSupabase } = useSync();
  const [isMobile, setIsMobile] = useState(false);

  // Estados locais da aplicação
  const [transactions, setTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-accounts");
      if (stored) return JSON.parse(stored);
    }
    return [];
  });

  const [budgets, setBudgets] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-budgets");
      if (stored) return JSON.parse(stored);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("findom-accounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("findom-budgets", JSON.stringify(budgets));
  }, [budgets]);
  const [familyName, setFamilyName] = useState("Financeiro Compartilhado");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [entities, setEntities] = useState<Entity[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-entities");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("findom-entities", JSON.stringify(entities));
  }, [entities]);

  const handleAddEntity = (name: string, type: "personal" | "business") => {
    const newEntity: Entity = {
      id: `ent-${Date.now()}`,
      name,
      type,
    };
    setEntities((prev) => [...prev, newEntity]);
  };

  const handleEditEntity = (id: string, name: string, type: "personal" | "business") => {
    setEntities((prev) =>
      prev.map((ent) => (ent.id === id ? { ...ent, name, type } : ent))
    );
  };

  const handleDeleteEntity = (id: string) => {
    if (entities.length <= 1) {
      alert("É necessário ter pelo menos uma entidade cadastrada!");
      return;
    }
    setEntities((prev) => prev.filter((ent) => ent.id !== id));
    if (selectedEntityId === id) {
      setSelectedEntityId("all");
    }
  };

  // Estados locais para controle de categorias
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-categories");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("findom-categories", JSON.stringify(categories));
  }, [categories]);

  const handleAddCategory = (categoryData: Omit<Category, "id">) => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      ...categoryData,
    };
    setCategories((prev) => [...prev, newCategory]);

    if (categoryData.type === "expense") {
      const newBudget = {
        id: `b-${Date.now()}`,
        category_id: newCategory.id,
        limit_amount_cents: 100000,
        spent_amount_cents: 0,
        entity_id: selectedEntityId === "all" ? "ent-1" : selectedEntityId,
      };
      setBudgets((prev) => [...prev, newBudget]);
    }
  };

  const handleEditCategory = (id: string, categoryData: Omit<Category, "id">) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...categoryData } : cat))
    );
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      alert("É necessário ter pelo menos uma categoria cadastrada!");
      return;
    }
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    setBudgets((prev) => prev.filter((b) => b.category_id !== id));
  };

  // Estado do Modal PWA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"income" | "expense">("expense");
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  // Detecção responsiva client-side para evitar descompasso de hidratação (SSR)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Inicialização do cache e perfil local
  const initializeLocalData = useCallback(async () => {
    try {
      // 1. Garantir que o perfil cacheado existe localmente (para a RLS local funcionar)
      const cachedProfile = await db.getCachedProfile();
      if (!cachedProfile) {
        await db.cacheProfile({
          id: "local-user-uuid",
          family_id: "local-family-uuid",
          full_name: "Desenvolvedor Local",
          role: "admin",
        });
      }

      if (window.navigator.onLine) {
        // Primeiro: verifica se precisamos salvar os dados do LocalStorage na nuvem
        await migrateLocalDataToSupabase();

        const remoteData = await fetchSupabaseData();
        if (remoteData) {
          setAccounts(remoteData.accounts);
          setCategories(remoteData.categories);
          setBudgets(remoteData.budgets);
          setTransactions(remoteData.transactions);
          setMembers(remoteData.members);
          
          // Atualizar o cache local
          localStorage.setItem("findom-accounts", JSON.stringify(remoteData.accounts));
          localStorage.setItem("findom-categories", JSON.stringify(remoteData.categories));
          localStorage.setItem("findom-budgets", JSON.stringify(remoteData.budgets));
          await db.cacheTransactions(remoteData.transactions);
          return;
        }
      }

      // 2. Carregar transações locais se offline ou falha no fetch
      const cachedTxs = await db.getCachedTransactions();
      setTransactions(cachedTxs);
    } catch (e) {
      console.error("Erro na inicialização:", e);
    }
  }, [fetchSupabaseData, migrateLocalDataToSupabase]);

  useEffect(() => {
    initializeLocalData();
  }, [initializeLocalData]);

  // Handler para salvar transação (tanto de PWA quanto de Desktop)
  const handleSaveTransaction = async (data: {
    amount_cents: number;
    category_id: string;
    account_id: string;
    description: string;
    date: string;
    recurrence_type: "single" | "fixed" | "installment";
    installments_total?: number;
    interval?: "weekly" | "monthly" | "yearly";
    cleared?: boolean;
    entity_id?: string;
  }, editScope?: "single" | "future" | "all") => {
    if (editingTransaction) {
      try {
        const oldTx = editingTransaction;
        const isSeriesEdit = oldTx.parent_transaction_id !== undefined;
        const allSiblings = isSeriesEdit
          ? transactions.filter((t) => t.parent_transaction_id === oldTx.parent_transaction_id || t.id === oldTx.parent_transaction_id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          : [oldTx];

        let targetSiblings = [...allSiblings];
        
        if (editScope === "single") {
          targetSiblings = [oldTx];
        } else if (editScope === "future") {
          const oldTxDate = new Date(oldTx.date).getTime();
          targetSiblings = allSiblings.filter(t => new Date(t.date).getTime() >= oldTxDate);
        } else {
          targetSiblings = allSiblings;
        }

        // 1. Reverter impactos apenas dos targetSiblings
        setAccounts((prev) => {
          let updated = [...prev];
          for (const sib of targetSiblings) {
            if (sib.cleared) {
              const wasIncome = categories.find((c) => c.id === sib.category_id)?.type === "income";
              const isOldCard = updated.find((a) => a.id === sib.account_id)?.type === "credit_card";
              let revertDiff = wasIncome ? -sib.amount_cents : sib.amount_cents;
              if (isOldCard) {
                revertDiff = wasIncome ? sib.amount_cents : -sib.amount_cents;
              }
              updated = updated.map((a) =>
                a.id === sib.account_id ? { ...a, balance_cents: a.balance_cents + revertDiff } : a
              );
            }
          }
          return updated;
        });

        setBudgets((prev) => {
          let updated = [...prev];
          for (const sib of targetSiblings) {
            const wasExpense = categories.find((c) => c.id === sib.category_id)?.type === "expense";
            if (wasExpense) {
              updated = updated.map((b) =>
                b.category_id === sib.category_id && b.entity_id === sib.entity_id
                  ? { ...b, spent_amount_cents: Math.max(0, b.spent_amount_cents - sib.amount_cents) }
                  : b
              );
            }
          }
          return updated;
        });

        // 2. Gerar a nova série de transações
        const parentId = oldTx.parent_transaction_id || oldTx.id;
        const txsToCreate: LocalTransaction[] = [];
        const baseDesc = data.description.replace(/\s\(\d+\/\d+\)$/, ""); // Limpa sufixos
        
        if (editScope === "single" || !data.recurrence_type || data.recurrence_type === "single") {
          // Apenas edita esta ocorrência, mantendo os dados da série original se houver
          txsToCreate.push({
            ...oldTx,
            amount_cents: data.amount_cents,
            category_id: data.category_id,
            account_id: data.account_id,
            description: oldTx.recurrence_type === "installment" ? `${baseDesc} (${oldTx.installment_number || 1}/${oldTx.installments_total || 1})` : baseDesc,
            date: data.date,
            cleared: data.cleared ?? oldTx.cleared,
            // Keep previous recurrence fields
            recurrence_type: oldTx.recurrence_type,
            installments_total: oldTx.installments_total,
            installment_number: oldTx.installment_number,
            interval: oldTx.interval,
            parent_transaction_id: oldTx.parent_transaction_id,
          });
        } else {
          // future ou all
          const startIndex = editScope === "future" ? allSiblings.findIndex(t => t.id === oldTx.id) : 0;
          const totalTxsToCreate = editScope === "future" ? allSiblings.length - startIndex : (data.recurrence_type === "installment" ? (data.installments_total || 3) : 12);
          const originalTotal = data.installments_total || oldTx.installments_total || 3;
          
          const installmentAmount = data.recurrence_type === "installment" ? Math.round(data.amount_cents / originalTotal) : data.amount_cents;

          for (let i = 0; i < totalTxsToCreate; i++) {
            const absoluteIndex = startIndex + i;
            const futureDateStr = addIntervalToDate(data.date, i, data.interval || oldTx.interval || "monthly");
            
            const existingSib = allSiblings[absoluteIndex];
            const existingId = existingSib?.id || crypto.randomUUID();
            
            let currentAmount = data.amount_cents;
            if (data.recurrence_type === "installment") {
              const isLast = absoluteIndex === originalTotal - 1;
              currentAmount = isLast ? data.amount_cents - (installmentAmount * (originalTotal - 1)) : installmentAmount;
            }

            txsToCreate.push({
              ...oldTx,
              id: existingId,
              amount_cents: currentAmount,
              category_id: data.category_id,
              account_id: data.account_id,
              description: data.recurrence_type === "installment" ? `${baseDesc} (${absoluteIndex + 1}/${originalTotal})` : baseDesc,
              date: futureDateStr,
              cleared: i === 0 && editScope === "all" ? (data.cleared ?? false) : (existingSib?.cleared ?? false),
              recurrence_type: data.recurrence_type,
              installments_total: data.recurrence_type === "installment" ? originalTotal : undefined,
              installment_number: data.recurrence_type === "installment" ? absoluteIndex + 1 : undefined,
              interval: data.interval,
              parent_transaction_id: parentId,
            });
          }
        }

        // 3. Aplicar impactos das novas transações
        setAccounts((prev) => {
          let updated = [...prev];
          for (const tx of txsToCreate) {
            if (tx.cleared) {
              const isIncome = categories.find((c) => c.id === tx.category_id)?.type === "income";
              const isNewCard = updated.find((a) => a.id === tx.account_id)?.type === "credit_card";
              let applyDiff = isIncome ? tx.amount_cents : -tx.amount_cents;
              if (isNewCard) {
                applyDiff = isIncome ? -tx.amount_cents : tx.amount_cents;
              }
              updated = updated.map((a) =>
                a.id === tx.account_id ? { ...a, balance_cents: a.balance_cents + applyDiff } : a
              );
            }
          }
          return updated;
        });

        setBudgets((prev) => {
          let updated = [...prev];
          for (const tx of txsToCreate) {
            const isExpense = categories.find((c) => c.id === tx.category_id)?.type === "expense";
            if (isExpense) {
              updated = updated.map((b) =>
                b.category_id === tx.category_id && b.entity_id === (data.entity_id || tx.entity_id)
                  ? { ...b, spent_amount_cents: b.spent_amount_cents + tx.amount_cents }
                  : b
              );
            }
          }
          return updated;
        });

        // 4. Atualizar a lista de transações
        const targetSiblingIds = new Set(targetSiblings.map((s) => s.id));
        const otherTxs = transactions.filter((t) => !targetSiblingIds.has(t.id));
        const updatedTxs = [...otherTxs, ...txsToCreate];

        setTransactions(updatedTxs);
        await db.cacheTransactions(updatedTxs);

        for (const tx of txsToCreate) {
          await db.saveOfflineTransaction({ ...tx, offline_created: true });
        }

        setEditingTransaction(null);
        await updatePendingCount();

        if (window.navigator.onLine) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) syncOfflineData();
        }
      } catch (err) {
        console.error("Erro ao editar série de transações:", err);
      }
      return;
    }

    const account = accounts.find((a) => a.id === data.account_id);
    const parentId = crypto.randomUUID();

    // Gerar a lista de transações a serem salvas
    const txsToCreate: LocalTransaction[] = [];
    const isCleared = data.cleared ?? false;

    if (data.recurrence_type === "single" || !data.recurrence_type) {
      txsToCreate.push({
        id: parentId,
        amount_cents: data.amount_cents,
        type: modalType,
        category_id: data.category_id,
        account_id: data.account_id,
        description: data.description,
        date: data.date,
        cleared: isCleared,
        offline_created: true,
        entity_id: data.entity_id || account?.entity_id || "ent-1",
        recurrence_type: "single",
      });
    } else if (data.recurrence_type === "fixed") {
      // Cria 12 repetições para projeção de fluxo de caixa nos próximos meses
      for (let i = 0; i < 12; i++) {
        const futureDateStr = addIntervalToDate(data.date, i, data.interval || "monthly");
        txsToCreate.push({
          id: i === 0 ? parentId : crypto.randomUUID(),
          amount_cents: data.amount_cents,
          type: modalType,
          category_id: data.category_id,
          account_id: data.account_id,
          description: data.description,
          date: futureDateStr,
          cleared: i === 0 ? isCleared : false,
          offline_created: true,
          entity_id: data.entity_id || account?.entity_id || "ent-1",
          recurrence_type: "fixed",
          interval: data.interval,
          parent_transaction_id: parentId,
        });
      }
    } else if (data.recurrence_type === "installment") {
      // Cria a quantidade exata de parcelas especificadas pelo usuário dividindo o valor total
      const totalInstallments = data.installments_total || 3;
      const installmentAmount = Math.round(data.amount_cents / totalInstallments);
      
      for (let i = 0; i < totalInstallments; i++) {
        const futureDateStr = addIntervalToDate(data.date, i, data.interval || "monthly");
        const installmentNum = i + 1;
        
        // Ajusta a última parcela com qualquer diferença de arredondamento
        const isLastInstallment = i === totalInstallments - 1;
        const currentAmount = isLastInstallment ? data.amount_cents - (installmentAmount * (totalInstallments - 1)) : installmentAmount;

        txsToCreate.push({
          id: i === 0 ? parentId : crypto.randomUUID(),
          amount_cents: currentAmount,
          type: modalType,
          category_id: data.category_id,
          account_id: data.account_id,
          description: `${data.description} (${installmentNum}/${totalInstallments})`,
          date: futureDateStr,
          cleared: i === 0 ? isCleared : false,
          offline_created: true,
          entity_id: data.entity_id || account?.entity_id || "ent-1",
          recurrence_type: "installment",
          installments_total: totalInstallments,
          installment_number: installmentNum,
          interval: data.interval,
          parent_transaction_id: parentId,
        });
      }
    }

    try {
      // 1. Sempre salvar no IndexedDB offline queue imediatamente (para resiliência garantida)
      for (const tx of txsToCreate) {
        await db.saveOfflineTransaction(tx);
      }
      
      // 2. Atualizar estado visual local imediatamente (fricção zero, feedback rápido)
      const updatedTxs = [...txsToCreate, ...transactions];
      setTransactions(updatedTxs);
      await db.cacheTransactions(updatedTxs);

      // 3. Atualizar saldos das contas localmente com o valor da primeira transação da recorrência (se estiver paga/cleared)
      if (isCleared) {
        const isIncome = categories.find(c => c.id === data.category_id)?.type === "income";
        const isCard = accounts.find((a) => a.id === data.account_id)?.type === "credit_card";
        let diff = isIncome ? data.amount_cents : -data.amount_cents;
        if (isCard) {
          diff = isIncome ? -data.amount_cents : data.amount_cents;
        }
        setAccounts((prevAccounts) =>
          prevAccounts.map((acc) => {
            if (acc.id === data.account_id) {
              return {
                ...acc,
                balance_cents: acc.balance_cents + diff,
              };
            }
            return acc;
          })
        );
      }

      // 4. Atualizar orçamentos localmente com o valor do lançamento atual
      const isExpense = categories.find(c => c.id === data.category_id)?.type === "expense";
      if (isExpense) {
        setBudgets((prevBudgets) =>
          prevBudgets.map((b) => {
            if (b.category_id === data.category_id && b.entity_id === (data.entity_id || account?.entity_id)) {
              return {
                ...b,
                spent_amount_cents: b.spent_amount_cents + data.amount_cents,
              };
            }
            return b;
          })
        );
      }

      await updatePendingCount();

      // 5. Se estiver online e autenticado no Supabase, disparar sync em background
      if (window.navigator.onLine) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          syncOfflineData();
        }
      }
    } catch (err) {
      console.error("Erro ao salvar transação:", err);
    }
  };

  const openInsertModal = (type: "income" | "expense") => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handlePayCard = async (accountId: string) => {
    // 1. Zerar o saldo devedor do cartão
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, balance_cents: 0 } : acc
      )
    );

    // 2. Marcar transações ligadas ao cartão como conciliadas/quitadas (cleared = true)
    setTransactions((prev) =>
      prev.map((t) => (t.account_id === accountId ? { ...t, cleared: true } : t))
    );

    // 3. Atualizar no IndexedDB local para persistência offline e enfileirar para sync
    try {
      const cachedTxs = await db.getCachedTransactions();
      const updatedTxs = cachedTxs.map((t) =>
        t.account_id === accountId ? { ...t, cleared: true } : t
      );
      await db.cacheTransactions(updatedTxs);

      // Enfileirar cada transação atualizada do cartão para sincronização offline
      const cardTxs = updatedTxs.filter((t) => t.account_id === accountId);
      for (const tx of cardTxs) {
        await db.saveOfflineTransaction({ ...tx, offline_created: true });
      }
      await updatePendingCount();

      // Sincronizar com o Supabase se estiver online
      if (typeof window !== "undefined" && window.navigator.onLine) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          syncOfflineData();
        }
      }
    } catch (err) {
      console.error("Erro ao quitar faturas no cache local:", err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    try {
      // 1. Reverter saldo da conta se estava pago (cleared)
      const isIncome = categories.find((c) => c.id === txToDelete.category_id)?.type === "income";
      const isExpense = categories.find((c) => c.id === txToDelete.category_id)?.type === "expense";
      if (txToDelete.cleared) {
        const isCard = accounts.find((a) => a.id === txToDelete.account_id)?.type === "credit_card";
        let revertDiff = isIncome ? -txToDelete.amount_cents : txToDelete.amount_cents;
        if (isCard) {
          revertDiff = isIncome ? txToDelete.amount_cents : -txToDelete.amount_cents;
        }
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === txToDelete.account_id
              ? { ...acc, balance_cents: acc.balance_cents + revertDiff }
              : acc
          )
        );
      }

      // 2. Reverter orçamento
      if (isExpense) {
        setBudgets((prev) =>
          prev.map((b) =>
            b.category_id === txToDelete.category_id && b.entity_id === txToDelete.entity_id
              ? { ...b, spent_amount_cents: Math.max(0, b.spent_amount_cents - txToDelete.amount_cents) }
              : b
          )
        );
      }

      // 3. Remover do estado e do cache
      const updatedTxs = transactions.filter((t) => t.id !== id);
      setTransactions(updatedTxs);
      await db.cacheTransactions(updatedTxs);

      // 4. Salvar exclusão offline
      await db.saveOfflineTransaction({
        ...txToDelete,
        cleared: false,
        amount_cents: 0,
        offline_created: true,
      });

      await updatePendingCount();
    } catch (err) {
      console.error("Erro ao excluir transação:", err);
    }
  };

  const handleClearTransaction = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    const isCleared = !tx.cleared;

    // 1. Reajustar saldos da conta
    const cat = categories.find((c) => c.id === tx.category_id);
    const isIncome = cat?.type === "income";
    const isCard = accounts.find((a) => a.id === tx.account_id)?.type === "credit_card";
    
    let amountDiff = isIncome ? tx.amount_cents : -tx.amount_cents;
    if (isCard) {
      amountDiff = isIncome ? -tx.amount_cents : tx.amount_cents;
    }

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === tx.account_id) {
          const diff = isCleared ? amountDiff : -amountDiff;
          return { ...acc, balance_cents: acc.balance_cents + diff };
        }
        return acc;
      })
    );

    // 2. Atualizar estado visual local das transações
    const updatedTxs = transactions.map((t) =>
      t.id === id ? { ...t, cleared: isCleared } : t
    );
    setTransactions(updatedTxs);
    await db.cacheTransactions(updatedTxs);

    // 3. Salvar na fila offline
    const updatedTx = updatedTxs.find((t) => t.id === id);
    if (updatedTx) {
      await db.saveOfflineTransaction({ ...updatedTx, offline_created: true });
    }
    await updatePendingCount();
  };

  const handleAddCard = (cardData: {
    name: string;
    limit_cents: number;
    due_date: number;
    closing_date: number;
  }) => {
    const newCard = {
      id: `acc-${Date.now()}`,
      name: cardData.name,
      type: "credit_card" as const,
      balance_cents: 0,
      limit_cents: cardData.limit_cents,
      due_date: cardData.due_date,
      closing_date: cardData.closing_date,
      entity_id: selectedEntityId === "all" ? "ent-1" : selectedEntityId,
    };
    setAccounts((prev) => [...prev, newCard]);
  };

  const handleEditCard = (id: string, cardData: {
    name: string;
    limit_cents: number;
    due_date: number;
    closing_date: number;
  }) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? { ...acc, ...cardData }
          : acc
      )
    );
  };

  const handleAddAccount = (accountData: { name: string; type: "cash" | "bank"; balance_cents: number }) => {
    const newAccount = {
      id: `acc-${Date.now()}`,
      name: accountData.name,
      type: accountData.type,
      balance_cents: accountData.balance_cents,
      entity_id: selectedEntityId === "all" ? "ent-1" : selectedEntityId,
    };
    setAccounts((prev) => [...prev, newAccount]);
  };

  const handleEditAccount = (id: string, accountData: { name: string; type: "cash" | "bank"; balance_cents: number }) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? { ...acc, ...accountData }
          : acc
      )
    );
  };

  const handleDeleteCard = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const handleReset = async (target: "transactions" | "cards" | "categories" | "entities" | "all") => {
    console.log("Executando reset para:", target);
    
    if (target === "transactions" || target === "all") {
      setTransactions([]);
      try {
        await db.cacheTransactions([]);
        await db.clearOfflineTransactions();
      } catch (e) {
        console.error("Erro limpando transações:", e);
      }
      setBudgets((prev) => prev.map((b) => ({ ...b, spent_amount_cents: 0 })));
    }
    if (target === "cards" || target === "all") {
      setAccounts((prev) => prev.filter((acc) => acc.type !== "credit_card"));
    }
    if (target === "categories" || target === "all") {
      setCategories([]);
      setBudgets([]);
    }
    if (target === "entities" || target === "all") {
      setEntities([]);
      setSelectedEntityId("all");
    }
    if (target === "all") {
      setAccounts([]);
      setBudgets([]);
      try {
        await db.clearAllCaches();
        // Seta arrays vazios para impedir que o React recarregue os DEFAULT_*
        localStorage.setItem("findom-entities", JSON.stringify([]));
        localStorage.setItem("findom-categories", JSON.stringify([]));
        localStorage.setItem("findom-accounts", JSON.stringify([]));
        localStorage.setItem("findom-budgets", JSON.stringify([]));
        
        // Tentativa agressiva de deletar o IndexedDB do localforage
        const req = indexedDB.deleteDatabase("findom-db");
        req.onsuccess = () => {
          console.log("IndexedDB deletado com sucesso");
          window.location.reload();
        };
        req.onerror = () => {
          console.log("Erro ao deletar IndexedDB");
          window.location.reload();
        };
        req.onblocked = () => {
          console.log("Deleção do IndexedDB bloqueada");
          window.location.reload();
        };
        
        // Fallback caso as callbacks do indexedDB falhem
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (e) {
        console.error("Erro no reset total:", e);
        window.location.reload();
      }
    }
  };

  if (isMobile) {
    if (isShoppingListOpen) {
      return (
        <main className="flex-1 flex flex-col justify-stretch relative bg-black text-white min-h-dvh h-dvh overflow-hidden w-full">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setIsShoppingListOpen(false)}
              className="p-3 bg-zinc-900/80 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all backdrop-blur-md"
            >
              <X size={24} />
            </button>
          </div>
          <ShoppingList />
        </main>
      );
    }

    return (
      <main className="flex-1 flex flex-col justify-stretch relative bg-black select-none text-white p-6 min-h-dvh h-dvh overflow-hidden">
        {/* Apple 2026 Siri-Glow Background Spheres */}
        <div className="fixed top-[-25%] -left-[30%] w-[160vw] h-[60vh] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none -z-10 animate-siri-pulse-1" />
        <div className="fixed bottom-[-25%] -right-[30%] w-[160vw] h-[60vh] bg-purple-600/12 rounded-full blur-[150px] pointer-events-none -z-10 animate-siri-pulse-2" />

        {/* 2 grandes botões circulares alinhados verticalmente no centro */}
        <div className="flex-1 flex flex-col items-center justify-center gap-14 py-4 h-full relative z-10">
          {/* Botão Gasto (Saída) */}
          <button
            onClick={() => openInsertModal("expense")}
            className="w-36 h-36 rounded-full flex items-center justify-center border border-red-500/30 bg-gradient-to-b from-red-950/15 to-black text-red-400 active:scale-95 transition-all shadow-[0_0_40px_rgba(239,68,68,0.15)] hover:border-red-500/50 relative group cursor-pointer"
            style={{
              backdropFilter: "blur(30px) saturate(200%)",
              WebkitBackdropFilter: "blur(30px) saturate(200%)",
            }}
          >
            {/* Outer neon glow ring */}
            <div className="absolute -inset-1.5 rounded-full bg-red-500/10 blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-350" />
            
            {/* Inner smaller circle (concentric) */}
            <div className="w-24 h-24 rounded-full border border-red-500/20 group-hover:border-red-500/40 transition-all duration-350 flex items-center justify-center">
              <Minus className="w-10 h-10 text-red-400" />
            </div>
          </button>

          {/* Botão Receita (Entrada) */}
          <button
            onClick={() => openInsertModal("income")}
            className="w-36 h-36 rounded-full flex items-center justify-center border border-blue-500/30 bg-gradient-to-b from-blue-950/15 to-black text-blue-400 active:scale-95 transition-all shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:border-blue-500/50 relative group cursor-pointer"
            style={{
              backdropFilter: "blur(30px) saturate(200%)",
              WebkitBackdropFilter: "blur(30px) saturate(200%)",
            }}
          >
            {/* Outer neon glow ring */}
            <div className="absolute -inset-1.5 rounded-full bg-blue-500/10 blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-350" />
            
            {/* Inner smaller circle (concentric) */}
            <div className="w-24 h-24 rounded-full border border-blue-500/20 group-hover:border-blue-500/40 transition-all duration-350 flex items-center justify-center">
              <Plus className="w-10 h-10 text-blue-400" />
            </div>
          </button>

          {/* Botão Lista de Compras (Menor) */}
          <div className="absolute bottom-6 w-full flex justify-center z-20">
            <button
              onClick={() => setIsShoppingListOpen(true)}
              className="w-16 h-16 rounded-full flex items-center justify-center border border-zinc-500/30 bg-gradient-to-b from-zinc-800/15 to-black text-zinc-300 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-zinc-500/50 relative group cursor-pointer"
              style={{
                backdropFilter: "blur(20px) saturate(200%)",
                WebkitBackdropFilter: "blur(20px) saturate(200%)",
              }}
            >
              <div className="absolute -inset-1 rounded-full bg-zinc-500/10 blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-350" />
              <div className="w-10 h-10 rounded-full border border-zinc-500/20 group-hover:border-zinc-500/40 transition-all duration-350 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-zinc-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Modal de Lançamento Rápido */}
        <QuickInsertModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          type={modalType}
          categories={categories}
          accounts={accounts}
          entities={entities}
          onSave={handleSaveTransaction}
          onAddCategory={handleAddCategory}
          editingTransaction={editingTransaction}
          defaultEntityId={selectedEntityId === "all" ? "ent-1" : selectedEntityId}
        />
      </main>
    );
  }

  // Filtrar contas, transações e orçamentos baseados na Persona/Empresa selecionada
  const filteredAccounts = selectedEntityId === "all"
    ? accounts
    : accounts.filter((acc) => acc.entity_id === selectedEntityId);

  const filteredTransactions = selectedEntityId === "all"
    ? transactions
    : transactions.filter((t) => t.entity_id === selectedEntityId);

  const filteredBudgets = selectedEntityId === "all"
    ? budgets
    : budgets.filter((b) => b.entity_id === selectedEntityId);

  // Renderização Condicional Desktop Web Dashboard
  return (
    <main className="flex-1 flex flex-col bg-black h-dvh max-h-dvh min-h-0 overflow-hidden relative">
      {/* Pontos de luz difusos do Design System */}
      <div className="fixed top-[-10%] -left-20 w-[40vw] h-[40vw] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-5%] -right-20 w-[50vw] h-[50vw] bg-purple-600/5 rounded-full blur-[180px] pointer-events-none -z-10" />


      {/* Área Principal do Dashboard */}
      <Dashboard
        transactions={filteredTransactions}
        categories={categories}
        accounts={filteredAccounts}
        allAccounts={accounts}
        budgets={filteredBudgets}
        members={members}
        onAddTransactionClick={openInsertModal}
        onRefresh={initializeLocalData}
        familyName={familyName}
        onPayCard={handlePayCard}
        onAddCard={handleAddCard}
        onEditCard={handleEditCard}
        onDeleteCard={handleDeleteCard}
        onAddAccount={handleAddAccount}
        onEditAccount={handleEditAccount}
        onDeleteAccount={handleDeleteCard}
        onReset={handleReset}
        selectedEntityId={selectedEntityId}
        onEntityChange={setSelectedEntityId}
        entities={entities}
        onAddEntity={handleAddEntity}
        onEditEntity={handleEditEntity}
        onDeleteEntity={handleDeleteEntity}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onEditTransaction={(tx) => {
          setEditingTransaction(tx);
          setModalType(categories.find((c) => c.id === tx.category_id)?.type || "expense");
          setIsModalOpen(true);
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onClearTransaction={handleClearTransaction}
      />

      {/* Modal compartilhado que surge do FAB/Header em desktop também */}
      <QuickInsertModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        type={modalType}
        categories={categories}
        accounts={accounts}
        entities={entities}
        onSave={handleSaveTransaction}
        onAddCategory={handleAddCategory}
        editingTransaction={editingTransaction}
        defaultEntityId={selectedEntityId === "all" ? "ent-1" : selectedEntityId}
      />
    </main>
  );
}
