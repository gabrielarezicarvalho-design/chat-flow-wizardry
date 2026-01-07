-- Primeiro remover políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view all departments" ON public.departments;
DROP POLICY IF EXISTS "Users can create departments" ON public.departments;
DROP POLICY IF EXISTS "Users can update own departments" ON public.departments;
DROP POLICY IF EXISTS "Users can delete own departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can view department members" ON public.department_members;

-- Recriar política SELECT para departments - TODOS autenticados podem ver
CREATE POLICY "Authenticated users can view all departments" 
ON public.departments FOR SELECT TO authenticated USING (true);

-- Recriar política SELECT para department_members
CREATE POLICY "Authenticated users can view department members" 
ON public.department_members FOR SELECT TO authenticated USING (true);