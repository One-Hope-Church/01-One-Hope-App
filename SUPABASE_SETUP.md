# Supabase Setup Guide for One Hope App

## 🚀 Phase 1: Supabase Integration Setup

### Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/login
2. **Create a new project**:
   - Click "New Project"
   - Choose your organization
   - Project name: `one-hope-app` (or similar)
   - Database password: Create a strong password
   - Region: Choose closest to your users
   - Click "Create new project"

### Step 2: Get Project Credentials

1. **Go to Project Settings** (gear icon in sidebar)
2. **Click "API"** in the settings menu
3. **Copy the following values**:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **Service Role Key** (starts with `eyJ...`)

### Step 3: Set Up Database Schema

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy the contents** of `supabase-schema.sql` file
3. **Paste and run** the SQL in the Supabase SQL Editor
4. **Verify tables are created** by checking the "Table Editor" section

### Step 4: Configure Environment Variables

1. **Open your `env.txt` file**
2. **Add the Supabase credentials**:
   ```
   SUPABASE_URL=https://your-project-url.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### Step 5: Test the Integration

1. **Restart your local server**: `npm start`
2. **Try logging in** with Planning Center
3. **Check the console logs** for Supabase integration messages
4. **Verify user is created** in Supabase Table Editor

## 🔧 Database Schema Overview

### Tables Created:
- **`users`** - Core user data from Planning Center
- **`user_progress`** - Reading progress and streaks (Phase 2)
- **`reading_history`** - Individual reading completions (Phase 2)
- **`user_steps`** - Personalized step tracking (Phase 2)

### Security Features:
- ✅ **Row Level Security (RLS)** enabled
- ✅ **Users can only access their own data**
- ✅ **Automatic timestamps** for created_at/updated_at
- ✅ **Indexes** for optimal performance

## 🎯 What This Solves

### Current Problems Fixed:
- ✅ **Login persistence** - No more "John Doe" on refresh
- ✅ **Session reliability** - Works across browser sessions
- ✅ **Data consistency** - Single source of truth for user data

### Foundation for Phase 2:
- ✅ **Progress tracking** - Reading streaks, completion rates
- ✅ **Personalization** - User-specific recommendations
- ✅ **Analytics** - Engagement insights for One Hope

## 🚨 Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Check your `env.txt` file has the correct credentials
   - Restart the server after adding credentials

2. **"Database error" in console**
   - Verify the SQL schema was run successfully
   - Check Supabase project is active and accessible

3. **"Permission denied" errors**
   - Ensure you're using the Service Role Key (not anon key)
   - Check RLS policies are set up correctly

### Getting Help:
- Check Supabase logs in the dashboard
- Review server console output for detailed error messages
- Verify all environment variables are set correctly

## 🎉 Next Steps

Once Phase 1 is working:
1. **Test login persistence** across browser sessions
2. **Verify user data** is stored in Supabase
3. **Move to Phase 2** - Progress tracking and personalization

---

**Need help?** Check the server console logs for detailed debugging information! 