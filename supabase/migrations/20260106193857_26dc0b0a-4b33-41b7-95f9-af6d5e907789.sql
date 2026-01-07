-- Corrigir o fluxo "Teste" para ter o bloco de início e agente correto
UPDATE flows 
SET flow_json = '{
  "type": "chat",
  "edges": [
    {
      "id": "e-start-1-aiAgent-1767542090792",
      "type": "smoothstep",
      "style": {"stroke": "#3b82f6", "strokeWidth": 2.5},
      "source": "start-1",
      "target": "aiAgent-1767542090792",
      "animated": false,
      "markerEnd": {"type": "arrowclosed", "color": "#3b82f6", "width": 16, "height": 16}
    },
    {
      "id": "e-aiAgent-1767542090792-forward-1767542108444",
      "type": "smoothstep",
      "style": {"stroke": "#f97316", "strokeWidth": 2.5},
      "source": "aiAgent-1767542090792",
      "target": "forward-1767542108444",
      "animated": false,
      "markerEnd": {"type": "arrowclosed", "color": "#f97316", "width": 16, "height": 16},
      "sourceHandle": "fallback"
    }
  ],
  "nodes": [
    {
      "id": "start-1",
      "data": {"label": "Início"},
      "type": "start",
      "position": {"x": 100, "y": 120}
    },
    {
      "id": "aiAgent-1767542090792",
      "data": {"label": "Assistente IA", "agentId": "97c6ceb3-aff5-4dd0-8d29-4e0553311873", "agentName": "Igor"},
      "type": "aiAgent",
      "position": {"x": 280, "y": 120}
    },
    {
      "id": "forward-1767542108444",
      "data": {"label": "Encaminhar", "departmentId": "3bcaaa69-2c4d-4d91-bff3-374afae02b4d", "departmentName": "FINANCEIRO"},
      "type": "forward",
      "position": {"x": 580, "y": 220}
    }
  ]
}'::jsonb
WHERE id = '453b057d-29fe-439b-ae2e-10b84d002821';