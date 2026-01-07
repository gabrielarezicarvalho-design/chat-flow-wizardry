-- Primeiro, deletar os registros duplicados, mantendo apenas o mais recente por usuário
DELETE FROM webhook_field_configs 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM webhook_field_configs 
  ORDER BY user_id, created_at DESC
);

-- Adicionar constraint UNIQUE para evitar duplicatas no futuro
ALTER TABLE webhook_field_configs 
ADD CONSTRAINT webhook_field_configs_user_id_unique UNIQUE (user_id);