-- Create table for AI doctor chat history
CREATE TABLE IF NOT EXISTS ai_doctor_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_ongoing BOOLEAN DEFAULT true,
  duration TEXT,
  patterns TEXT,
  notes TEXT,
  chat_messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_doctor_chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating to avoid "already exists" errors
DROP POLICY IF EXISTS ai_doctor_chat_history_select_own ON ai_doctor_chat_history;
DROP POLICY IF EXISTS ai_doctor_chat_history_insert_own ON ai_doctor_chat_history;
DROP POLICY IF EXISTS ai_doctor_chat_history_update_own ON ai_doctor_chat_history;
DROP POLICY IF EXISTS ai_doctor_chat_history_delete_own ON ai_doctor_chat_history;

-- Policy: Users can only see their own chat history
CREATE POLICY ai_doctor_chat_history_select_own ON ai_doctor_chat_history
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own chat history
CREATE POLICY ai_doctor_chat_history_insert_own ON ai_doctor_chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chat history
CREATE POLICY ai_doctor_chat_history_update_own ON ai_doctor_chat_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own chat history
CREATE POLICY ai_doctor_chat_history_delete_own ON ai_doctor_chat_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_doctor_chat_history_user_id ON ai_doctor_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_doctor_chat_history_created_at ON ai_doctor_chat_history(created_at DESC);
