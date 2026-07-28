
-- 1. app_settings: remove blanket authenticated read
DROP POLICY IF EXISTS "Authenticated can read app_settings" ON public.app_settings;
CREATE POLICY "Admins can read app_settings" ON public.app_settings
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. flow_forms: remove public read/update (handled by edge function with service role)
DROP POLICY IF EXISTS "public can read active flow forms" ON public.flow_forms;
DROP POLICY IF EXISTS "public can mark answered" ON public.flow_forms;
CREATE POLICY "company members read flow forms" ON public.flow_forms
FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "company members update flow forms" ON public.flow_forms
FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
REVOKE ALL ON public.flow_forms FROM anon;

-- 3. leads_forms_responses: no anonymous inserts
DROP POLICY IF EXISTS "public can submit responses" ON public.leads_forms_responses;
REVOKE ALL ON public.leads_forms_responses FROM anon;

-- 4. flow_sessions: remove always-true policy for public role
DROP POLICY IF EXISTS "Service role full access on flow_sessions" ON public.flow_sessions;
CREATE POLICY "company members read flow sessions" ON public.flow_sessions
FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
REVOKE ALL ON public.flow_sessions FROM anon;
GRANT ALL ON public.flow_sessions TO service_role;

-- 5. smart_forms / smart_form_submissions: remove public access
DROP POLICY IF EXISTS "Anyone can view active smart forms" ON public.smart_forms;
DROP POLICY IF EXISTS "Anyone can submit to smart forms" ON public.smart_form_submissions;
REVOKE ALL ON public.smart_forms FROM anon;
REVOKE ALL ON public.smart_form_submissions FROM anon;

-- 6. white_label_partners: remove public read of credentials
DROP POLICY IF EXISTS "Anyone can view active partners for login" ON public.white_label_partners;
REVOKE ALL ON public.white_label_partners FROM anon;

-- 7. SECURITY DEFINER functions: revoke execute from anon/public
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_room_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_plan_usage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_company_cycle_start(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_agent_knowledge(uuid, vector, integer, double precision) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_distribute_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_conversation_unread() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_room_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_plan_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_cycle_start(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_agent_knowledge(uuid, vector, integer, double precision) TO service_role;
