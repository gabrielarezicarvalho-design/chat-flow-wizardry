
CREATE OR REPLACE FUNCTION public.increment_conversation_unread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type IN ('customer', 'contact') AND NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET unread_count = COALESCE(unread_count, 0) + 1,
        last_message = COALESCE(NEW.content, last_message),
        last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_conversation_unread ON public.messages;
CREATE TRIGGER trg_increment_conversation_unread
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_conversation_unread();
