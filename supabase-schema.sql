-- Execute este SQL no Supabase SQL Editor para criar a tabela

CREATE TABLE diarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  militar_nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por nome
CREATE INDEX idx_diarias_militar_nome ON diarias(militar_nome);

-- Habilitar RLS (Row Level Security) - permitir tudo por enquanto (ambiente de teste)
ALTER TABLE diarias ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ambiente de teste)
CREATE POLICY "Permitir todas as operações" ON diarias
  FOR ALL
  USING (true)
  WITH CHECK (true);
