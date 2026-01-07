-- Add description column to flows table if it doesn't exist
ALTER TABLE public.flows ADD COLUMN IF NOT EXISTS description TEXT;

-- Update flow_json default to include nodes and edges structure
COMMENT ON COLUMN public.flows.flow_json IS 'Stores nodes and edges for React Flow: {nodes: [], edges: []}';