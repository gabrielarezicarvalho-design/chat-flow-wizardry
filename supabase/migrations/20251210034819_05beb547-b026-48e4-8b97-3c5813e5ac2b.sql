
-- Allow agents to view conversations in their departments (queue)
CREATE POLICY "Agents can view department queue conversations" 
ON public.conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM department_members 
    WHERE department_members.department_id = conversations.department_id 
    AND department_members.agent_id = auth.uid()
  )
);

-- Allow agents to update conversations in their departments (to accept from queue)
CREATE POLICY "Agents can update department queue conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM department_members 
    WHERE department_members.department_id = conversations.department_id 
    AND department_members.agent_id = auth.uid()
  )
);

-- Allow agents to read messages from department conversations
CREATE POLICY "Agents can read messages from department conversations" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN department_members dm ON dm.department_id = c.department_id
    WHERE c.id = messages.id_da_conversa 
    AND dm.agent_id = auth.uid()
  )
);

-- Allow agents to insert messages in department conversations
CREATE POLICY "Agents can insert messages in department conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN department_members dm ON dm.department_id = c.department_id
    WHERE c.id = messages.id_da_conversa 
    AND dm.agent_id = auth.uid()
  )
);
