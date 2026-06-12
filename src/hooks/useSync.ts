"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";

export function useSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Atualiza a contagem local de transações pendentes de envio
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await db.getOfflineTransactions();
      setPendingCount(pending.length);
    } catch (e) {
      console.error("PWA Sync: Erro ao ler fila do IndexedDB:", e);
    }
  }, []);

  // Lógica de sincronização com o Supabase
  const syncOfflineData = useCallback(async () => {
    // Evita chamadas concorrentes de sincronização
    if (isSyncing || !window.navigator.onLine) return;

    try {
      const pendingTxs = await db.getOfflineTransactions();
      if (pendingTxs.length === 0) return;

      setIsSyncing(true);
      console.log(
        `PWA Sync: Enviando ${pendingTxs.length} transações ao Supabase...`
      );

      // Garante que o usuário tem sessão ativa
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn("PWA Sync: Usuário não autenticado. Ignorando sync.");
        setIsSyncing(false);
        return;
      }

      // Obtém o perfil cacheado para recuperar o family_id
      const userProfile = await db.getCachedProfile();
      if (!userProfile) {
        console.warn(
          "PWA Sync: Perfil não encontrado no cache. Abortando sync."
        );
        setIsSyncing(false);
        return;
      }

      // Prepara os dados para o formato esperado pela tabela do banco de dados
      const txsToInsert = pendingTxs.map((tx) => ({
        id: tx.id,
        family_id: userProfile.family_id,
        user_id: userProfile.id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        amount_cents: tx.amount_cents,
        description: tx.description,
        date: tx.date,
        cleared: tx.cleared,
        entity_id: tx.entity_id,
      }));

      // Executa inserção em lote (upsert para evitar duplicidade de id)
      const { error } = await supabase.from("transactions").upsert(txsToInsert);

      if (error) {
        throw error;
      }

      // Limpa os registros sincronizados do IndexedDB
      for (const tx of pendingTxs) {
        await db.removeOfflineTransaction(tx.id);
      }

      console.log("PWA Sync: Sincronização em segundo plano concluída!");
      await updatePendingCount();
    } catch (err) {
      console.error("PWA Sync: Falha na sincronização:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount]);

  // Monitorar eventos de conectividade do navegador
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(window.navigator.onLine);
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Tenta sincronizar na inicialização do hook
    if (window.navigator.onLine) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineData, updatePendingCount]);

  const fetchSupabaseData = useCallback(async () => {
    if (!window.navigator.onLine) return null;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn("fetchSupabaseData: Sem sessão");
        return null;
      }

      let userProfile = await db.getCachedProfile();
      if (!userProfile) {
        // Tenta buscar o profile direto do banco
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profileData) {
           await db.cacheProfile(profileData);
           userProfile = profileData;
        } else {
           console.warn("fetchSupabaseData: Perfil não encontrado.");
           return null;
        }
      }

      const familyId = userProfile.family_id;
      if (!familyId) return null;

      const [accountsRes, categoriesRes, budgetsRes, transactionsRes, profilesRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("family_id", familyId),
        supabase.from("categories").select("*").or(`family_id.eq.${familyId},family_id.is.null`),
        supabase.from("budgets").select("*").eq("family_id", familyId),
        supabase.from("transactions").select("*").eq("family_id", familyId).order('date', { ascending: false }),
        supabase.from("profiles").select("*").eq("family_id", familyId),
      ]);

      return {
        accounts: accountsRes.data || [],
        categories: categoriesRes.data || [],
        budgets: budgetsRes.data || [],
        transactions: transactionsRes.data || [],
        members: profilesRes.data || [],
      };
    } catch (err) {
      console.error("Erro no fetch do Supabase:", err);
      return null;
    }
  }, []);

  const migrateLocalDataToSupabase = useCallback(async () => {
    if (!window.navigator.onLine) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const userProfile = await db.getCachedProfile();
      if (!userProfile) return;
      const familyId = userProfile.family_id;
      if (!familyId) return;

      // Verifica se a nuvem está vazia de contas
      const { data: existingAccounts } = await supabase.from('accounts').select('id').eq('family_id', familyId).limit(1);
      
      if (!existingAccounts || existingAccounts.length === 0) {
        console.log("Migração: Banco em branco detectado. Sincronizando LocalStorage para a nuvem...");
        
        const storedAccounts = localStorage.getItem("findom-accounts");
        if (storedAccounts) {
          const localAccounts = JSON.parse(storedAccounts);
          // O usuário quer preservar o que digitou. Se houver contas locais, faremos o push.
          if (localAccounts.length > 0) {
             const accountsToInsert = localAccounts.map((acc: any) => ({
                id: acc.id,
                family_id: familyId,
                name: acc.name,
                type: acc.type || 'bank',
                balance_cents: acc.balance_cents || 0,
                limit_cents: acc.limit_cents || 0,
                entity_id: acc.entity_id || null,
             }));
             await supabase.from("accounts").upsert(accountsToInsert);
          }
        }

        const storedCategories = localStorage.getItem("findom-categories");
        if (storedCategories) {
          const localCategories = JSON.parse(storedCategories);
          if (localCategories.length > 0) {
             // Algumas categorias já foram injetadas pelo schema.sql (as categorias padrão globais).
             // Se o usuário editou ou criou novas, nós faremos push das "customizadas".
             // Para simplificar, o banco lida bem com upsert de IDs gerados no frontend.
             const categoriesToInsert = localCategories.map((cat: any) => ({
                id: cat.id,
                family_id: familyId,
                name: cat.name,
                type: cat.type || 'expense',
                color: cat.color || '#3b82f6',
                icon: cat.icon || 'Tag',
             }));
             await supabase.from("categories").upsert(categoriesToInsert);
          }
        }
        
        const storedBudgets = localStorage.getItem("findom-budgets");
        if (storedBudgets) {
          const localBudgets = JSON.parse(storedBudgets);
          if (localBudgets.length > 0) {
             const budgetsToInsert = localBudgets.map((b: any) => ({
                id: b.id,
                family_id: familyId,
                category_id: b.category_id,
                limit_amount_cents: b.limit_amount_cents || 0,
                month_year: new Date().toISOString().split('T')[0],
                entity_id: b.entity_id || null,
             }));
             await supabase.from("budgets").upsert(budgetsToInsert);
          }
        }
        
        // Transações serão puxadas pelo syncOfflineData logo em seguida
      }
    } catch (err) {
      console.error("Erro na migração de dados:", err);
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncOfflineData,
    updatePendingCount,
    fetchSupabaseData,
    migrateLocalDataToSupabase,
  };
}
