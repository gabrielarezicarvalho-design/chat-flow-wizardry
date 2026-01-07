-- Fix infinite recursion in internal_chat_participants RLS policy
-- Drop the problematic policy and create a security definer function

-- Drop existing policy that causes recursion
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON public.internal_chat_participants;

-- Create a security definer function to check room membership
CREATE OR REPLACE FUNCTION public.is_room_participant(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.internal_chat_participants
    WHERE user_id = _user_id
      AND room_id = _room_id
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Users can view participants of their rooms" 
ON public.internal_chat_participants
FOR SELECT 
USING (public.is_room_participant(auth.uid(), room_id));