-- Allow users to read connections that are assigned to them via user_connections
CREATE POLICY "Users can view assigned connections"
ON public.connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_connections
    WHERE user_connections.connection_id = connections.id
    AND user_connections.user_id = auth.uid()
  )
);