-- Migration: Message Delivery Acknowledgment (delivered_at)
-- 00000000000007_message_delivered_status.sql

-- 1. Add delivered_at column to public.messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Index for message delivery queries
CREATE INDEX IF NOT EXISTS idx_messages_delivered ON public.messages(conversation_id, sender_id, delivered_at);

-- 3. RLS policy allowing conversation participants to update delivery and read status
DROP POLICY IF EXISTS "Participants can update message read status" ON public.messages;
DROP POLICY IF EXISTS "Participants can update message delivery and read status" ON public.messages;

CREATE POLICY "Participants can update message delivery and read status" 
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
