-- One Hope App Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (core user data)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    planning_center_id TEXT UNIQUE,
    planning_center_email TEXT,
    name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_planning_center_id ON users(planning_center_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(planning_center_email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_date ON reading_history(reading_date);
CREATE INDEX IF NOT EXISTS idx_user_steps_user_id ON user_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_steps_step_id ON user_steps(step_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_steps ENABLE ROW LEVEL SECURITY;

-- Planning Center group memberships per user
CREATE TABLE IF NOT EXISTS pc_group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pc_group_id TEXT NOT NULL,
    pc_group_name TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pc_group_id)
);

-- Planning Center event registrations per user
CREATE TABLE IF NOT EXISTS pc_event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pc_event_id TEXT NOT NULL,
    pc_event_name TEXT,
    pc_event_time_id TEXT,
    status TEXT,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    registration_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pc_event_id)
);

ALTER TABLE pc_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_event_registrations ENABLE ROW LEVEL SECURITY;

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

-- Group memberships policies
CREATE POLICY "Users can view own group memberships" ON pc_group_memberships
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can upsert own group memberships" ON pc_group_memberships
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own group memberships" ON pc_group_memberships
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Event registrations policies
CREATE POLICY "Users can view own event registrations" ON pc_event_registrations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can upsert own event registrations" ON pc_event_registrations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own event registrations" ON pc_event_registrations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_steps_updated_at 
    BEFORE UPDATE ON user_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pc_group_memberships_updated_at 
    BEFORE UPDATE ON pc_group_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pc_event_registrations_updated_at 
    BEFORE UPDATE ON pc_event_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO users (planning_center_id, planning_center_email, name) 
-- VALUES ('5403866', 'corey@onehopechurch.com', 'Corey Foshee'); 