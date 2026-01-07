-- Allow agents to view conversations assigned to them
CREATE POLICY "Agents can view assigned conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = assigned_agent);

-- Allow agents to update conversations assigned to them
CREATE POLICY "Agents can update assigned conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = assigned_agent);