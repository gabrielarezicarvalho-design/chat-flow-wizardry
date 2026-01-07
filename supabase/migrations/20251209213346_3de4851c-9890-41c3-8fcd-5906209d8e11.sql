-- Allow agents to view leads from connections they are assigned to
CREATE POLICY "Agents can view leads from assigned connections"
ON public.leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_connections uc
    JOIN connections c ON c.id = uc.connection_id
    WHERE uc.user_id = auth.uid() 
    AND c.user_id = leads.user_id
  )
);