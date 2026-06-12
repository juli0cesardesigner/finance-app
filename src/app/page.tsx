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

// Dados estruturais padrão sem transações mockadas ou saldos falsos.
const DEFAULT_CATEGORIES: Category[] = [];
const DEFAULT_ENTITIES: Entity[] = [];
const DEFAULT_ACCOUNTS: Account[] = [];
const DEFAULT_BUDGETS: any[] = [];

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const getFamilyId = async () => {
    const profile = await db.getCachedProfile();
    return profile?.family_id || "d0000000-0000-0000-0000-000000000001";
  };

  // Estados locais da aplicação
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-accounts");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  const [budgets, setBudgets] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-budgets");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_BUDGETS;
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
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_ENTITIES;
  });

  useEffect(() => {
    localStorage.setItem("findom-entities", JSON.stringify(entities));
  }, [entities]);

  const handleAddEntity = async (name: string, type: "personal" | "business") => {
    const newEntity: Entity = {
      id: crypto.randomUUID(),
      name,
      type,
    };
    setEntities((prev) => [...prev, newEntity]);

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        await supabase.from("entities").upsert({
          id: newEntity.id,
          family_id: familyId,
          name: newEntity.name,
          type: newEntity.type,
        });
      } catch (e) {
        console.error("Erro ao sincronizar entidade:", e);
      }
    }
  };

  const handleEditEntity = async (id: string, name: string, type: "personal" | "business") => {
    setEntities((prev) =>
      prev.map((ent) => (ent.id === id ? { ...ent, name, type } : ent))
    );

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        await supabase.from("entities").upsert({
          id,
          family_id: familyId,
          name,
          type,
        });
      } catch (e) {
        console.error("Erro ao editar entidade:", e);
      }
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (entities.length <= 1) {
      setToastMessage("É necessário ter pelo menos uma entidade cadastrada!");
      return;
    }
    setEntities((prev) => prev.filter((ent) => ent.id !== id));
    if (selectedEntityId === id) {
      setSelectedEntityId("all");
    }

    if (window.navigator.onLine) {
      try {
        await supabase.from("entities").delete().eq("id", id);
      } catch (e) {
        console.error("Erro ao excluir entidade:", e);
      }
    }
  };

  // Estados locais para controle de categorias
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("findom-categories");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem("findom-categories", JSON.stringify(categories));
  }, [categories]);

  const handleAddCategory = async (categoryData: Omit<Category, "id">) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      ...categoryData,
    };
    setCategories((prev) => [...prev, newCategory]);

    let newBudget: any = null;
    if (categoryData.type === "expense") {
      newBudget = {
        id: crypto.randomUUID(),
        category_id: newCategory.id,
        limit_amount_cents: 100000,
        spent_amount_cents: 0,
        entity_id: selectedEntityId === "all" ? "ent-1" : selectedEntityId,
      };
      setBudgets((prev) => [...prev, newBudget]);
    }

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        await supabase.from("categories").upsert({
          id: newCategory.id,
          family_id: familyId,
          name: newCategory.name,
          type: newCategory.type,
          color: newCategory.color,
          icon: newCategory.icon,
        });

        if (newBudget) {
          await supabase.from("budgets").upsert({
            id: newBudget.id,
            family_id: familyId,
            category_id: newBudget.category_id,
            entity_id: newBudget.entity_id === "ent-1" ? null : newBudget.entity_id,
            limit_amount_cents: newBudget.limit_amount_cents,
            month_year: new Date().toISOString().split("T")[0],
          });
        }
      } catch (e) {
        console.error("Erro ao sincronizar categoria:", e);
      }
    }
  };

  const handleEditCategory = async (id: string, categoryData: Omit<Category, "id">) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...categoryData } : cat))
    );

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        await supabase.from("categories").upsert({
          id,
          family_id: familyId,
          name: categoryData.name,
          type: categoryData.type,
          color: categoryData.color,
          icon: categoryData.icon,
        });
      } catch (e) {
        console.error("Erro ao editar categoria:", e);
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (categories.length <= 1) {
      setToastMessage("É necessário ter pelo menos uma categoria cadastrada!");
      return;
    }
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    setBudgets((prev) => prev.filter((b) => b.category_id !== id));

    if (window.navigator.onLine) {
      try {
        await supabase.from("budgets").delete().eq("category_id", id);
        await supabase.from("categories").delete().eq("id", id);
      } catch (e) {
        console.error("Erro ao excluir categoria:", e);
      }
    }
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
      // Função auto-cicatrizante para normalizar IDs legados para UUIDv4
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      let accountsChanged = false;
      let categoriesChanged = false;
      let budgetsChanged = false;
      let transactionsChanged = false;
      let entitiesChanged = false;

      let localEntities: any[] = [];
      try {
        const stored = localStorage.getItem("findom-entities");
        if (stored) localEntities = JSON.parse(stored) || [];
      } catch (e) {}

      let localCategories: any[] = [];
      try {
        const stored = localStorage.getItem("findom-categories");
        if (stored) localCategories = JSON.parse(stored) || [];
      } catch (e) {}

      let localAccounts: any[] = [];
      try {
        const stored = localStorage.getItem("findom-accounts");
        if (stored) localAccounts = JSON.parse(stored) || [];
      } catch (e) {}

      let localBudgets: any[] = [];
      try {
        const stored = localStorage.getItem("findom-budgets");
        if (stored) localBudgets = JSON.parse(stored) || [];
      } catch (e) {}

      let localTransactions = await db.getCachedTransactions();

      const entityIdMap: Record<string, string> = {};
      const categoryIdMap: Record<string, string> = {};
      const accountIdMap: Record<string, string> = {};
      const budgetIdMap: Record<string, string> = {};

      localEntities = localEntities.map((ent) => {
        if (!isUuid(ent.id)) {
          const newId = crypto.randomUUID();
          entityIdMap[ent.id] = newId;
          entitiesChanged = true;
          return { ...ent, id: newId };
        }
        return ent;
      });

      localCategories = localCategories.map((cat) => {
        if (!isUuid(cat.id)) {
          const newId = crypto.randomUUID();
          categoryIdMap[cat.id] = newId;
          categoriesChanged = true;
          return { ...cat, id: newId };
        }
        return cat;
      });

      localAccounts = localAccounts.map((acc) => {
        let changed = false;
        let newAcc = { ...acc };
        if (!isUuid(acc.id)) {
          const newId = crypto.randomUUID();
          accountIdMap[acc.id] = newId;
          newAcc.id = newId;
          changed = true;
          accountsChanged = true;
        }
        if (acc.entity_id && entityIdMap[acc.entity_id]) {
          newAcc.entity_id = entityIdMap[acc.entity_id];
          changed = true;
          accountsChanged = true;
        }
        return newAcc;
      });

      localBudgets = localBudgets.map((b) => {
        let changed = false;
        let newB = { ...b };
        if (!isUuid(b.id)) {
          const newId = crypto.randomUUID();
          budgetIdMap[b.id] = newId;
          newB.id = newId;
          changed = true;
          budgetsChanged = true;
        }
        if (b.category_id && categoryIdMap[b.category_id]) {
          newB.category_id = categoryIdMap[b.category_id];
          changed = true;
          budgetsChanged = true;
        }
        if (b.entity_id && entityIdMap[b.entity_id]) {
          newB.entity_id = entityIdMap[b.entity_id];
          changed = true;
          budgetsChanged = true;
        }
        return newB;
      });

      localTransactions = localTransactions.map((tx) => {
        let changed = false;
        let newTx = { ...tx };
        if (!isUuid(tx.id)) {
          newTx.id = crypto.randomUUID();
          changed = true;
          transactionsChanged = true;
        }
        if (tx.account_id && accountIdMap[tx.account_id]) {
          newTx.account_id = accountIdMap[tx.account_id];
          changed = true;
          transactionsChanged = true;
        }
        if (tx.category_id && categoryIdMap[tx.category_id]) {
          newTx.category_id = categoryIdMap[tx.category_id];
          changed = true;
          transactionsChanged = true;
        }
        if (tx.entity_id && entityIdMap[tx.entity_id]) {
          newTx.entity_id = entityIdMap[tx.entity_id];
          changed = true;
          transactionsChanged = true;
        }
        return newTx;
      });

      if (entitiesChanged) {
        localStorage.setItem("findom-entities", JSON.stringify(localEntities));
        setEntities(localEntities);
      } else {
        setEntities(localEntities);
      }
      if (categoriesChanged) {
        localStorage.setItem("findom-categories", JSON.stringify(localCategories));
        setCategories(localCategories);
      } else {
        setCategories(localCategories);
      }
      if (accountsChanged) {
        localStorage.setItem("findom-accounts", JSON.stringify(localAccounts));
        setAccounts(localAccounts);
      } else {
        setAccounts(localAccounts);
      }
      if (budgetsChanged) {
        localStorage.setItem("findom-budgets", JSON.stringify(localBudgets));
        setBudgets(localBudgets);
      } else {
        setBudgets(localBudgets);
      }
      if (transactionsChanged) {
        await db.cacheTransactions(localTransactions);
      }
      setTransactions(localTransactions);

      const offlineTxs = await db.getOfflineTransactions();
      let offlineChanged = false;
      const normalizedOfflineTxs = [];
      for (const tx of offlineTxs) {
        let changed = false;
        let newTx = { ...tx };
        if (!isUuid(tx.id)) {
          newTx.id = crypto.randomUUID();
          changed = true;
          offlineChanged = true;
        }
        if (tx.account_id && accountIdMap[tx.account_id]) {
          newTx.account_id = accountIdMap[tx.account_id];
          changed = true;
          offlineChanged = true;
        }
        if (tx.category_id && categoryIdMap[tx.category_id]) {
          newTx.category_id = categoryIdMap[tx.category_id];
          changed = true;
          offlineChanged = true;
        }
        if (tx.entity_id && entityIdMap[tx.entity_id]) {
          newTx.entity_id = entityIdMap[tx.entity_id];
          changed = true;
          offlineChanged = true;
        }
        normalizedOfflineTxs.push({ newTx, oldId: tx.id, changed });
      }

      if (offlineChanged) {
        for (const item of normalizedOfflineTxs) {
          if (item.changed) {
            await db.removeOfflineTransaction(item.oldId);
            await db.saveOfflineTransaction(item.newTx);
          }
        }
      }

      // 1. Garantir que o perfil cacheado existe localmente
      const cachedProfile = await db.getCachedProfile();
      if (!cachedProfile) {
        await db.cacheProfile({
          id: "local-user-uuid",
          family_id: "local-family-uuid",
          full_name: "Desenvolvedor Local",
          role: "admin",
        });
      }

      // 2. Tentar autenticação anônima se estiver online
      if (window.navigator.onLine) {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const res = await supabase.auth.signInAnonymously();
          session = res.data.session;
        }

        if (session) {
          // Disparar sincronização offline inicial
          await syncOfflineData();
          // Migrar dados locais para o Supabase se a nuvem estiver vazia
          await migrateLocalDataToSupabase();

          // Puxar todos os dados remotos atualizados do Supabase
          const cloudData = await fetchSupabaseData();
          if (cloudData) {
            if (cloudData.entities.length > 0) {
              setEntities(cloudData.entities);
              localStorage.setItem("findom-entities", JSON.stringify(cloudData.entities));
            }
            if (cloudData.accounts.length > 0) {
              setAccounts(cloudData.accounts);
              localStorage.setItem("findom-accounts", JSON.stringify(cloudData.accounts));
            }
            if (cloudData.categories.length > 0) {
              setCategories(cloudData.categories);
              localStorage.setItem("findom-categories", JSON.stringify(cloudData.categories));
            }
            if (cloudData.budgets.length > 0) {
              setBudgets(cloudData.budgets);
              localStorage.setItem("findom-budgets", JSON.stringify(cloudData.budgets));
            }
            setTransactions(cloudData.transactions);
            await db.cacheTransactions(cloudData.transactions);
          }
        }
      }
    } catch (e) {
      console.error("Erro na inicialização local:", e);
    }
  }, [fetchSupabaseData, migrateLocalDataToSupabase, syncOfflineData]);

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

  const handleAddCard = async (cardData: {
    name: string;
    limit_cents: number;
    due_date: number;
    closing_date: number;
  }) => {
    const newCard = {
      id: crypto.randomUUID(),
      name: cardData.name,
      type: "credit_card" as const,
      balance_cents: 0,
      limit_cents: cardData.limit_cents,
      due_date: cardData.due_date,
      closing_date: cardData.closing_date,
      entity_id: selectedEntityId === "all" ? "ent-1" : selectedEntityId,
    };
    setAccounts((prev) => [...prev, newCard]);

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        await supabase.from("accounts").upsert({
          id: newCard.id,
          family_id: familyId,
          name: newCard.name,
          type: newCard.type,
          balance_cents: newCard.balance_cents,
          limit_cents: newCard.limit_cents,
          entity_id: newCard.entity_id === "ent-1" ? null : newCard.entity_id,
        });
      } catch (e) {
        console.error("Erro ao sincronizar novo cartão:", e);
      }
    }
  };

  const handleEditCard = async (id: string, cardData: {
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

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        const existingAcc = accounts.find((a) => a.id === id);
        await supabase.from("accounts").upsert({
          id,
          family_id: familyId,
          name: cardData.name,
          type: "credit_card",
          balance_cents: existingAcc?.balance_cents || 0,
          limit_cents: cardData.limit_cents,
          entity_id: existingAcc?.entity_id === "ent-1" ? null : existingAcc?.entity_id,
        });
      } catch (e) {
        console.error("Erro ao editar cartão:", e);
      }
    }
  };

  const handleAddAccount = async (accountData: { name: string; type: "cash" | "bank"; balance_cents: number }) => {
    const newAccount = {
      id: crypto.randomUUID(),
      name: accountData.name,
      type: accountData.type,
      balance_cents: accountData.balance_cents,
      entity_id: selectedEntityId === "all" ? "ent-1" : selectedEntityId,
    };
    setAccounts((prev) => [...prev, newAccount]);

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        await supabase.from("accounts").upsert({
          id: newAccount.id,
          family_id: familyId,
          name: newAccount.name,
          type: newAccount.type,
          balance_cents: newAccount.balance_cents,
          limit_cents: 0,
          entity_id: newAccount.entity_id === "ent-1" ? null : newAccount.entity_id,
        });
      } catch (e) {
        console.error("Erro ao sincronizar nova conta:", e);
      }
    }
  };

  const handleEditAccount = async (id: string, accountData: { name: string; type: "cash" | "bank"; balance_cents: number }) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? { ...acc, ...accountData }
          : acc
      )
    );

    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        const existingAcc = accounts.find((a) => a.id === id);
        await supabase.from("accounts").upsert({
          id,
          family_id: familyId,
          name: accountData.name,
          type: accountData.type,
          balance_cents: accountData.balance_cents,
          limit_cents: 0,
          entity_id: existingAcc?.entity_id === "ent-1" ? null : existingAcc?.entity_id,
        });
      } catch (e) {
        console.error("Erro ao editar conta:", e);
      }
    }
  };

  const handleDeleteCard = async (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));

    if (window.navigator.onLine) {
      try {
        await supabase.from("accounts").delete().eq("id", id);
      } catch (e) {
        console.error("Erro ao excluir conta/cartão:", e);
      }
    }
  };

  const handleReset = async (target: "transactions" | "cards" | "categories" | "entities" | "all") => {
    console.log("Executando reset para:", target);
    
    if (window.navigator.onLine) {
      try {
        const familyId = await getFamilyId();
        if (target === "transactions" || target === "all") {
          await supabase.from("transactions").delete().eq("family_id", familyId);
        }
        if (target === "cards" || target === "all") {
          if (target === "cards") {
            await supabase.from("accounts").delete().eq("family_id", familyId).eq("type", "credit_card");
          } else {
            await supabase.from("accounts").delete().eq("family_id", familyId);
          }
        }
        if (target === "categories" || target === "all") {
          await supabase.from("budgets").delete().eq("family_id", familyId);
          await supabase.from("categories").delete().eq("family_id", familyId);
        }
        if (target === "entities" || target === "all") {
          await supabase.from("entities").delete().eq("family_id", familyId);
        }
      } catch (e) {
        console.error("Erro ao resetar dados no Supabase:", e);
      }
    }

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
      setCategories(DEFAULT_CATEGORIES);
      setBudgets(DEFAULT_BUDGETS);
    }
    if (target === "entities" || target === "all") {
      setEntities(DEFAULT_ENTITIES);
      setSelectedEntityId("all");
    }
    if (target === "all") {
      setAccounts(DEFAULT_ACCOUNTS);
      setBudgets(DEFAULT_BUDGETS);
      try {
        await db.clearAllCaches();
        // Restaura as estruturas padrão limpas no localStorage
        localStorage.setItem("findom-entities", JSON.stringify(DEFAULT_ENTITIES));
        localStorage.setItem("findom-categories", JSON.stringify(DEFAULT_CATEGORIES));
        localStorage.setItem("findom-accounts", JSON.stringify(DEFAULT_ACCOUNTS));
        localStorage.setItem("findom-budgets", JSON.stringify(DEFAULT_BUDGETS));
        
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
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-zinc-950/80 border border-zinc-800 backdrop-blur-xl rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in">
            <span className="text-sm font-medium text-white">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
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
        members={[]}
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
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-zinc-950/80 border border-zinc-800 backdrop-blur-xl rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in">
          <span className="text-sm font-medium text-white">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
