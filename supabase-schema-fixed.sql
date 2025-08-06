-- One Hope App Database Schema (Fixed Version)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (core user data)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    planning_center_id TEXT UNIQUE NOT NULL,
    planning_center_email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance (ignore if they exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_planning_center_id') THEN
        CREATE INDEX idx_users_planning_center_id ON users(planning_center_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON users(planning_center_email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_last_login') THEN
        CREATE INDEX idx_users_last_login ON users(last_login);
    END IF;
END $$;

-- User Progress table (for tracking reading progress, streaks, etc.)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    total_readings INTEGER DEFAULT 0,
    last_reading_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Reading History table (track individual reading completions)
CREATE TABLE IF NOT EXISTS reading_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reading_date)
);

-- User Steps table (track personalized step completions)
CREATE TABLE IF NOT EXISTS user_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, step_id)
);

-- Add indexes for performance (ignore if they exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_progress_user_id') THEN
        CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reading_history_user_id') THEN
        CREATE INDEX idx_reading_history_user_id ON reading_history(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reading_history_date') THEN
        CREATE INDEX idx_reading_history_date ON reading_history(reading_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_steps_user_id') THEN
        CREATE INDEX idx_user_steps_user_id ON user_steps(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_steps_step_id') THEN
        CREATE INDEX idx_user_steps_step_id ON user_steps(step_id);
    END IF;
END $$;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$ 
BEGIN
    -- Users policies
    DROP POLICY IF EXISTS "Users can view own data" ON users;
    DROP POLICY IF EXISTS "Users can update own data" ON users;
    
    -- User progress policies
    DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
    DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
    DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
    
    -- Reading history policies
    DROP POLICY IF EXISTS "Users can view own reading history" ON reading_history;
    DROP POLICY IF EXISTS "Users can update own reading history" ON reading_history;
    DROP POLICY IF EXISTS "Users can insert own reading history" ON reading_history;
    
    -- User steps policies
    DROP POLICY IF EXISTS "Users can view own steps" ON user_steps;
    DROP POLICY IF EXISTS "Users can update own steps" ON user_steps;
    DROP POLICY IF EXISTS "Users can insert own steps" ON user_steps;
END $$;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- User progress policies
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own progress" ON user_progress
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Reading history policies
CREATE POLICY "Users can view own reading history" ON reading_history
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own reading history" ON reading_history
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own reading history" ON reading_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- User steps policies
CREATE POLICY "Users can view own steps" ON user_steps
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own steps" ON user_steps
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own steps" ON user_steps
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
DROP TRIGGER IF EXISTS update_user_steps_updated_at ON user_steps;

-- Triggers for updated_at
CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_steps_updated_at 
    BEFORE UPDATE ON user_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'One Hope App database schema setup completed successfully!' as status; 