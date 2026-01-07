-- Atualizar o fluxo para usar o agente correto
UPDATE flows 
SET flow_json = jsonb_set(
  flow_json::jsonb,
  '{nodes,1,data,agentId}',
  '"97c6ceb3-aff5-4dd0-8d29-4e0553311873"'
)
WHERE id = 'cd70cba3-eb5d-47ee-96be-fbb70f193c6b';