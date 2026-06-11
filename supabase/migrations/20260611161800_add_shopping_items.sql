CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    name TEXT NOT NULL,
    quantity TEXT DEFAULT '1',
    is_completed BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can manage their own items" ON public.items
    FOR ALL
    USING (true)
    WITH CHECK (true);
