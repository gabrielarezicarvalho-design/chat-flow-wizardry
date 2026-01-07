-- Allow public (anonymous) access to read smart_form_submissions by unique_token
CREATE POLICY "Anyone can read submissions by token" 
ON public.smart_form_submissions 
FOR SELECT 
USING (true);

-- Allow public (anonymous) access to update submissions (for form submission)
CREATE POLICY "Anyone can update their submission" 
ON public.smart_form_submissions 
FOR UPDATE 
USING (true);

-- Allow public (anonymous) access to read smart_forms
CREATE POLICY "Anyone can read active forms" 
ON public.smart_forms 
FOR SELECT 
USING (is_active = true);