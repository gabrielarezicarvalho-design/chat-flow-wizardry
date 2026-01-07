-- Create table for feedback/bugs reports
CREATE TABLE public.feedback_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  type TEXT NOT NULL CHECK (type IN ('bug', 'improvement', 'suggestion', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own feedback
CREATE POLICY "Users can create their own feedback"
ON public.feedback_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for super admins to view all feedback (check user_roles table)
CREATE POLICY "Super admins can view all feedback"
ON public.feedback_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for super admins to update feedback
CREATE POLICY "Super admins can update all feedback"
ON public.feedback_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feedback_reports_updated_at
BEFORE UPDATE ON public.feedback_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();