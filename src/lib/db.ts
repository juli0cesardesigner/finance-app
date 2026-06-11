import localforage from "localforage";

// Configuração do banco de dados local
localforage.config({
  name: "findom-db",
  storeName: "findom-store",
});

export interface LocalTransaction {
  id: string; // UUID v4 gerado localmente
  amount_cents: number;
  type: "income" | "expense";
  category_id: string;
  account_id: string;
  description: string;
  date: string;
  cleared: boolean;
  offline_created: boolean;
  entity_id?: string;
  recurrence_type?: "single" | "fixed" | "installment";
  installments_total?: number;
  installment_number?: number;
  interval?: "weekly" | "monthly" | "yearly";
  parent_transaction_id?: string;
}

// Instâncias separadas para cada tabela local
const offlineTxStore = localforage.createInstance({
  name: "findom-db",
  storeName: "offline-transactions",
});

const cachedTxStore = localforage.createInstance({
  name: "findom-db",
  storeName: "cached-transactions",
});

const cachedProfileStore = localforage.createInstance({
  name: "findom-db",
  storeName: "cached-profile",
});

export const db = {
  // Salvar transação criada offline para sincronização futura
  async saveOfflineTransaction(tx: LocalTransaction): Promise<void> {
    await offlineTxStore.setItem(tx.id, tx);
  },

  // Obter todas as transações offline pendentes
  async getOfflineTransactions(): Promise<LocalTransaction[]> {
    const txs: LocalTransaction[] = [];
    await offlineTxStore.iterate((value: LocalTransaction) => {
      txs.push(value);
    });
    return txs;
  },

  // Remover transação offline após sincronização concluída com sucesso
  async removeOfflineTransaction(id: string): Promise<void> {
    await offlineTxStore.removeItem(id);
  },

  // Limpar a fila offline em caso de reset
  async clearOfflineTransactions(): Promise<void> {
    await offlineTxStore.clear();
  },

  // Cachear transações válidas vindas do Supabase para visualização imediata
  async cacheTransactions(txs: any[]): Promise<void> {
    await cachedTxStore.clear();
    // Armazena sequencialmente
    for (const tx of txs) {
      await cachedTxStore.setItem(tx.id, tx);
    }
  },

  // Obter transações cacheadas para visualização offline
  async getCachedTransactions(): Promise<any[]> {
    const txs: any[] = [];
    await cachedTxStore.iterate((value) => {
      txs.push(value);
    });
    // Retorna ordenado por data decrescente
    return txs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  // Cachear perfil do usuário e sua família associada
  async cacheProfile(profile: any): Promise<void> {
    await cachedProfileStore.setItem("user-profile", profile);
  },

  // Obter perfil do usuário em cache
  async getCachedProfile(): Promise<any> {
    return await cachedProfileStore.getItem("user-profile");
  },

  // Limpar todo o cache local (por exemplo, ao fazer logout)
  async clearAllCaches(): Promise<void> {
    await Promise.all([
      offlineTxStore.clear(),
      cachedTxStore.clear(),
      cachedProfileStore.clear(),
    ]);
  },
};
