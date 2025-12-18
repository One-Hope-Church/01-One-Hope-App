# Fix: Notes Not Loading on grow.onehopechurch.com

## Problem
Notes aren't loading from Supabase on the new domain `grow.onehopechurch.com`. This is likely a CORS (Cross-Origin Resource Sharing) issue.

## Solution: Update Supabase CORS Settings

Supabase needs to allow requests from your new domain. Here's how to fix it:

### Step 1: Go to Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project

### Step 2: Update API Settings
1. Navigate to **Settings** → **API**
2. Scroll down to **CORS Configuration** or **Allowed Origins**

### Step 3: Add New Domain
Add the following to your allowed origins:
```
https://grow.onehopechurch.com
```

**If there's a list of allowed origins:**
- Add: `https://grow.onehopechurch.com`
- Keep: `https://steps.onehopechurch.com` (if you want to keep it working temporarily)
- Or remove the old domain if you're fully migrated

**If it's a single field with comma-separated values:**
```
https://grow.onehopechurch.com, https://steps.onehopechurch.com
```

### Step 4: Save Changes
Click **Save** or **Update**

### Step 5: Test
1. Clear your browser cache
2. Visit `https://grow.onehopechurch.com`
3. Log in
4. Navigate to the Notes section
5. Notes should now load from Supabase

## Alternative: Check Browser Console

If notes still don't load after updating CORS:

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for CORS errors like:
   - `Access to fetch at '...' from origin 'https://grow.onehopechurch.com' has been blocked by CORS policy`
   - `No 'Access-Control-Allow-Origin' header is present`

4. If you see CORS errors, verify:
   - The domain is correctly added in Supabase
   - You saved the changes
   - You cleared browser cache

## Additional Checks

### Verify Supabase Client Initialization
Check the browser console for:
- `Supabase config missing` - means environment variables aren't set
- `Failed to init Supabase` - means Supabase client failed to initialize
- `Supabase session not available` - means authentication session isn't working

### Check Environment Variables
Make sure these are set in your Vercel/hosting environment:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Still Not Working?

If notes still don't load after updating CORS:

1. **Check Network Tab** in browser DevTools:
   - Look for requests to Supabase API
   - Check if they're returning 200 (success) or errors
   - Look for CORS-related error responses

2. **Verify Supabase Project Settings**:
   - Go to **Settings** → **General**
   - Check that your project is active
   - Verify API keys are correct

3. **Test Direct API Call**:
   - Try accessing Supabase API directly from browser console
   - This will help identify if it's a CORS issue or something else

4. **Check Row Level Security (RLS)**:
   - Go to **Authentication** → **Policies**
   - Verify that `message_notes` table has proper RLS policies
   - Users should be able to SELECT their own notes

---

**Last Updated:** After domain migration to grow.onehopechurch.com

