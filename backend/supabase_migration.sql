-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  age INTEGER,
  fitness_level TEXT CHECK (fitness_level IN ('Beginner', 'Intermediate', 'Advanced')),
  goal TEXT CHECK (goal IN ('Weight Loss', 'Build Muscle', 'General Health')),
  cookie_balance INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create biometrics table
CREATE TABLE biometrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  steps INTEGER,
  sleep_hours NUMERIC,
  resting_hr INTEGER,
  hrv_trend TEXT,
  recorded_date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS on biometrics
ALTER TABLE biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own biometrics"
  ON biometrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometrics"
  ON biometrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create missions table
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT,
  description TEXT,
  activity_category TEXT,
  target_metrics JSONB,
  cookie_reward INTEGER,
  readiness_score INTEGER,
  analysis_summary TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  assigned_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ
);

-- Enable RLS on missions
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own missions"
  ON missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own missions"
  ON missions FOR UPDATE
  USING (auth.uid() = user_id);
