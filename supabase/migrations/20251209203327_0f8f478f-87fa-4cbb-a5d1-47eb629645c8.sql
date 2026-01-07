-- Create user_connections table to store which connections each user can access
CREATE TABLE public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, connection_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Admins can manage all user connections
CREATE POLICY "Admins can manage user connections"
ON public.user_connections
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can view their own connections
CREATE POLICY "Users can view own connections"
ON public.user_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access user_connections"
ON public.user_connections
FOR ALL
USING (true)
WITH CHECK (true);