-- Habilitar RLS nas tabelas
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela messages (qualquer usuário autenticado pode ler/escrever)
CREATE POLICY "Usuários autenticados podem ler mensagens"
ON messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir mensagens"
ON messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role tem acesso total a messages"
ON messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para tabela conversas (qualquer usuário autenticado pode ler/escrever)
CREATE POLICY "Usuários autenticados podem ler conversas"
ON conversas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir conversas"
ON conversas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar conversas"
ON conversas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Service role tem acesso total a conversas"
ON conversas FOR ALL
TO service_role
USING (true)
WITH CHECK (true);