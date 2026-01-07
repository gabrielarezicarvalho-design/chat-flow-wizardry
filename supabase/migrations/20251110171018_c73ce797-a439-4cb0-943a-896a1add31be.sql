-- ====================================================================
-- ATUALIZAÇÃO DAS TABELAS PARA SISTEMA COMPLETO DE CHAT
-- ====================================================================

-- Ajustar tabela profiles para incluir department_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);

-- Ajustar tabela connections para campos diretos ao invés de JSON
ALTER TABLE connections ADD COLUMN IF NOT EXISTS base_url text DEFAULT 'https://free.uazapi.com';
ALTER TABLE connections ADD COLUMN IF NOT EXISTS instance_id text;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS token text;

-- Extrair instance_id e token do JSONB credentials se existir
UPDATE connections 
SET 
  base_url = COALESCE(credentials->>'base_url', 'https://free.uazapi.com'),
  instance_id = credentials->>'instance_id',
  token = credentials->>'token'
WHERE credentials IS NOT NULL AND instance_id IS NULL;

-- Ajustar tabela conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES connections(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_phone text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE conversations DROP COLUMN IF EXISTS is_online;
ALTER TABLE conversations DROP COLUMN IF EXISTS unread_count;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_agent uuid REFERENCES profiles(id);

-- Ajustar tabela messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timestamp timestamp with time zone DEFAULT now();

-- Renomear coluna text para content se ainda não foi renomeada
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'text'
  ) THEN
    ALTER TABLE messages RENAME COLUMN text TO content;
  END IF;
END $$;

-- Ajustar tabela leads
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'novo';

-- Ajustar tabela flows
ALTER TABLE flows ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES connections(id);

-- Renomear flow_data para flow_json se ainda não foi renomeado
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'flow_data'
  ) THEN
    ALTER TABLE flows RENAME COLUMN flow_data TO flow_json;
  END IF;
END $$;

-- ====================================================================
-- ÍNDICES PARA PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_connection_id ON conversations(connection_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_phone ON conversations(user_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_flows_connection_id ON flows(connection_id);