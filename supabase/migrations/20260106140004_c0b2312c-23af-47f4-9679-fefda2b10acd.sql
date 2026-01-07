-- Remover referência da conexão nos ai_tickets (não deletar, só limpar FK)
UPDATE ai_tickets SET connection_id = NULL WHERE connection_id = 'd2bfefb8-0a5d-4e7b-85f4-f0bbe2e703a1';

-- Remover referência nas conversations
UPDATE conversations SET connection_id = NULL WHERE connection_id = 'd2bfefb8-0a5d-4e7b-85f4-f0bbe2e703a1';

-- Agora deletar a conexão
DELETE FROM connections WHERE id = 'd2bfefb8-0a5d-4e7b-85f4-f0bbe2e703a1';