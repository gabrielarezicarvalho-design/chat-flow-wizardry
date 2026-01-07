-- Fix internal_chat_rooms RLS policy to allow authenticated users to create rooms
-- Currently only admins can create rooms, which blocks normal chat creation

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Admins can create rooms" ON public.internal_chat_rooms;

-- Create new policy that allows any authenticated user to create rooms
-- Users can create rooms where they are the creator
CREATE POLICY "Authenticated users can create rooms" 
ON public.internal_chat_rooms 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);