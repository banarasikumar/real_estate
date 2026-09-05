-- Migration: Realtime Notifications, WhatsApp-Style Message Read Receipts & Replica Identity, and Badge Counts

-- 1. Add push_token to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. Add read_at to public.messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Set replica identity full on public.messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 4. Add RLS policy: "Participants can update message read status" ON public.messages FOR UPDATE TO authenticated
DROP POLICY IF EXISTS "Participants can update message read status" ON public.messages;
CREATE POLICY "Participants can update message read status" 
ON public.messages FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id 
    AND (c.buyer_id = auth.uid() OR c.owner_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id 
    AND (c.buyer_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

-- 5. Add public.enquiries to supabase_realtime publication
DO $$ 
BEGIN 
  BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries; 
  EXCEPTION 
    WHEN duplicate_object THEN NULL; 
  END; 
END $$;

-- 6. Indexes for real-time unread tracking & performance
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, sender_id, is_read);
CREATE INDEX IF NOT EXISTS idx_enquiries_owner_status ON public.enquiries(owner_id, status);
