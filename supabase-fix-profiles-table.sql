-- Fix for "profiles" table not found error during signup
-- Run this in your Supabase SQL Editor

-- Option 1: Create a profiles table that mirrors auth.users
-- This is a common pattern in Supabase where a trigger creates a profile on signup
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (in case table was created without them)
DO $$
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN name TEXT;
    END IF;
    
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Ensure email and name columns are nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'name'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;
    END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles (only if they don't exist)
DO $$
BEGIN
    -- Create policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
            FOR SELECT USING (true);
    END IF;
END $$;

-- Create or replace the trigger function that creates a profile on signup
-- This creates a minimal profile entry; the app will fill in details via /api/auth/profile/init
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert minimal profile - just the ID to satisfy the constraint
    -- The application will update this via /api/auth/profile/init endpoint
    -- Using NULL for email and name since they'll be filled by the app
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NULL, -- Will be filled by app
        NULL  -- Will be filled by app
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Success message
SELECT 'Profiles table and trigger created successfully!' as status;

