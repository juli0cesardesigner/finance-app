-- ==========================================================
-- ADICIONA SUPORTE A RECORRÊNCIA E PARCELAMENTO EM TRANSAÇÕES
-- ==========================================================

ALTER TABLE public.transactions 
ADD COLUMN recurrence_type TEXT DEFAULT 'single' CHECK (recurrence_type IN ('single', 'fixed', 'installment')),
ADD COLUMN installments_total INT DEFAULT NULL,
ADD COLUMN installment_number INT DEFAULT NULL,
ADD COLUMN interval TEXT DEFAULT NULL CHECK (interval IN ('weekly', 'monthly', 'yearly')),
ADD COLUMN parent_transaction_id UUID DEFAULT NULL;

-- Criar comentário descritivo para as novas colunas
COMMENT ON COLUMN public.transactions.recurrence_type IS 'Define se a transação é avulsa (single), fixa (fixed) ou parcelada (installment)';
COMMENT ON COLUMN public.transactions.installments_total IS 'Quantidade total de parcelas (para transações parceladas)';
COMMENT ON COLUMN public.transactions.installment_number IS 'O número da parcela atual (ex: 2 para a segunda parcela de 2/5)';
COMMENT ON COLUMN public.transactions.interval IS 'Intervalo de tempo entre as repetições (weekly, monthly, yearly)';
COMMENT ON COLUMN public.transactions.parent_transaction_id IS 'Id da transação pai que gerou as parcelas ou recorrências';
