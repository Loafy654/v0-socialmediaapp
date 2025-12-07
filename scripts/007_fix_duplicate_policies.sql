-- Remove duplicate message policies and keep only the ones from the original schema

-- Drop duplicate policies if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users can view their own messages'
    ) THEN
        DROP POLICY "Users can view their own messages" ON public.messages;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users can insert their own messages'
    ) THEN
        DROP POLICY "Users can insert their own messages" ON public.messages;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users cannot update messages'
    ) THEN
        DROP POLICY "Users cannot update messages" ON public.messages;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users can delete their own messages'
    ) THEN
        DROP POLICY "Users can delete their own messages" ON public.messages;
    END IF;
END $$;

-- Ensure the correct policies exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'messages_select_own'
    ) THEN
        CREATE POLICY "messages_select_own" ON public.messages 
        FOR SELECT 
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'messages_insert_own'
    ) THEN
        CREATE POLICY "messages_insert_own" ON public.messages 
        FOR INSERT 
        WITH CHECK (auth.uid() = sender_id);
    END IF;
END $$;
