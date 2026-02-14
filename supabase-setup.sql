-- ============================================
-- eipi Supabase Database Setup
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================

-- 1. Profiles table (student & admin users)
CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY,
  real_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  year_level TEXT NOT NULL DEFAULT '',
  referral_source TEXT DEFAULT '',
  password TEXT DEFAULT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picture_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Exam history table
CREATE TABLE IF NOT EXISTS exam_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  topic_stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_history_email ON exam_history(email);
CREATE INDEX IF NOT EXISTS idx_exam_history_date ON exam_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_joined ON profiles(joined_at DESC);

-- 4. Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_history ENABLE ROW LEVEL SECURITY;

-- Allow anon key full access (since we don't use Supabase Auth for login)
-- In production, you'd want tighter policies
CREATE POLICY "Allow all access to profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to exam_history" ON exam_history
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Done! Now go to Settings > API and copy:
--   - Project URL  → VITE_SUPABASE_URL
--   - anon key     → VITE_SUPABASE_ANON_KEY
-- Paste them into .env.local
-- ============================================
