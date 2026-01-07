-- Allow agents to read messages from conversations assigned to them
CREATE POLICY "Agents can read messages from assigned conversations" 
ON public.messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = messages.id_da_conversa 
  AND conversations.assigned_agent = auth.uid()
));

-- Allow agents to insert messages in conversations assigned to them
CREATE POLICY "Agents can insert messages in assigned conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = messages.id_da_conversa 
  AND conversations.assigned_agent = auth.uid()
));