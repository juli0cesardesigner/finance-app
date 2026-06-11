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

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncOfflineData,
    updatePendingCount,
  };
}
