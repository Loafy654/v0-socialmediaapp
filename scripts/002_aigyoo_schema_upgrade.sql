-- Add role and verification columns to profiles
ALTER TABLE profiles ADD COLUMN role text DEFAULT 'patient' CHECK (role IN ('patient', 'doctor'));
ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN verification_date timestamp without time zone;
ALTER TABLE profiles ADD COLUMN specialization text;
ALTER TABLE profiles ADD COLUMN license_number text;

-- Create doctor_verifications table for ID document uploads
CREATE TABLE doctor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id_image_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamp without time zone DEFAULT now(),
  verified_at timestamp without time zone,
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamp without time zone DEFAULT now()
);

-- Create admin_users table for verification admins
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator')),
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE doctor_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctor_verifications
CREATE POLICY "doctor_verifications_select_own" ON doctor_verifications
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "doctor_verifications_insert_own" ON doctor_verifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "doctor_verifications_update_admin" ON doctor_verifications
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "admin_users_select_own" ON admin_users
  FOR SELECT USING (user_id = auth.uid());

-- Update profiles RLS to include role-based access
CREATE POLICY "profiles_select_all_public" ON profiles
  FOR SELECT USING (true);

-- Add indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX idx_doctor_verifications_status ON doctor_verifications(status);
CREATE INDEX idx_doctor_verifications_user_id ON doctor_verifications(user_id);
