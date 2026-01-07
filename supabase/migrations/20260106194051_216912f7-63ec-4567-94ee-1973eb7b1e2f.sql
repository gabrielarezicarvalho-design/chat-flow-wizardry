-- Atualizar APENAS o agentId no nó aiAgent do fluxo Teste
UPDATE flows 
SET flow_json = jsonb_set(
  flow_json::jsonb,
  '{nodes,0,data,agentId}',
  '"97c6ceb3-aff5-4dd0-8d29-4e0553311873"'
)
WHERE id = '453b057d-29fe-439b-ae2e-10b84d002821'
AND flow_json::jsonb->'nodes'->0->>'type' = 'aiAgent';