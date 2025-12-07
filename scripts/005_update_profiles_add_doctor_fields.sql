-- Add doctor-specific fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hospital TEXT,
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Ensure specialization column exists (it already exists, but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='specialization') THEN
        ALTER TABLE profiles ADD COLUMN specialization TEXT;
    END IF;
END $$;
