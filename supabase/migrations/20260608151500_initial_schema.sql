-- ==========================================================
-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS (SUPABASE POSTGRES)
-- ==========================================================

-- Habilitar a extensão de geração de UUIDs se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE FAMÍLIAS (Unidades Organizacionais Compartilhadas)
CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE CONTAS E CARTEIRAS
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    entity_id TEXT DEFAULT NULL, -- Identificador da Persona ou Empresa associada
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card')),
    balance_cents INT DEFAULT 0,
    limit_cents INT DEFAULT 0, -- Relevante apenas para cartão de crédito
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE CATEGORIAS DE TRANSAÇÃO
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE, -- Se NULL, categoria é padrão global
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT NOT NULL DEFAULT 'Tag',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE TRANSAÇÕES (Lançamentos Financeiros)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    entity_id TEXT DEFAULT NULL, -- Identificador da Persona ou Empresa associada
    amount_cents INT NOT NULL, -- Valor em centavos (evita problemas de ponto flutuante)
    description TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    cleared BOOLEAN DEFAULT TRUE, -- Se a transação já foi confirmada (útil para faturas/agendamentos)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE ORÇAMENTOS MENSAIS
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    entity_id TEXT DEFAULT NULL, -- Identificador da Persona ou Empresa associada
    limit_amount_cents INT NOT NULL,
    month_year DATE NOT NULL, -- Guardar como primeiro dia do mês correspondente (ex: 2026-06-01)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==========================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para resgatar o family_id do usuário logado (evita loops recursivos de política)
CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT family_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- Políticas para FAMILIES
CREATE POLICY "Usuários podem ver sua própria família" 
    ON public.families FOR SELECT 
    USING (id = public.get_user_family_id());

CREATE POLICY "Usuários autenticados podem criar uma família" 
    ON public.families FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins podem atualizar os dados da sua própria família" 
    ON public.families FOR UPDATE 
    USING (id = public.get_user_family_id());

-- Políticas para PROFILES
CREATE POLICY "Usuários podem ver perfis da sua família ou o seu próprio" 
    ON public.profiles FOR SELECT 
    USING (family_id = public.get_user_family_id() OR id = auth.uid());

CREATE POLICY "Qualquer usuário autenticado pode criar seu perfil" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Políticas para ACCOUNTS
CREATE POLICY "Acesso total a contas baseado em vinculo familiar" 
    ON public.accounts FOR ALL 
    USING (family_id = public.get_user_family_id());

-- Políticas para CATEGORIES
CREATE POLICY "Usuários veem categorias globais ou da sua própria família" 
    ON public.categories FOR SELECT 
    USING (family_id IS NULL OR family_id = public.get_user_family_id());

CREATE POLICY "Usuários podem inserir categorias da sua própria família" 
    ON public.categories FOR INSERT 
    WITH CHECK (family_id = public.get_user_family_id());

CREATE POLICY "Usuários podem atualizar categorias da sua própria família" 
    ON public.categories FOR UPDATE 
    USING (family_id = public.get_user_family_id());

CREATE POLICY "Usuários podem deletar categorias da sua própria família" 
    ON public.categories FOR DELETE 
    USING (family_id = public.get_user_family_id());

-- Políticas para TRANSACTIONS
CREATE POLICY "Acesso total a transações baseado em vinculo familiar" 
    ON public.transactions FOR ALL 
    USING (family_id = public.get_user_family_id());

-- Políticas para BUDGETS
CREATE POLICY "Acesso total a orçamentos baseado em vinculo familiar" 
    ON public.budgets FOR ALL 
    USING (family_id = public.get_user_family_id());

-- ==========================================================
-- TRIGGERS E FUNÇÕES AUTOMÁTICAS
-- ==========================================================

-- Trigger para criar perfil de usuário no banco público assim que ele se registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Membro'), 
    'member'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- INSERÇÃO DE CATEGORIAS PADRÃO (CATEGORIAS GLOBAIS)
-- ==========================================================
INSERT INTO public.categories (name, type, color, icon) VALUES
  ('Alimentação', 'expense', '#ef4444', 'Utensils'),
  ('Moradia', 'expense', '#3b82f6', 'Home'),
  ('Transporte', 'expense', '#f59e0b', 'Car'),
  ('Lazer & Saúde', 'expense', '#10b981', 'Heart'),
  ('Salário', 'income', '#10b981', 'DollarSign'),
  ('Investimentos', 'income', '#8b5cf6', 'TrendingUp'),
  ('Outros', 'expense', '#6b7280', 'Tag');
