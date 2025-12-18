# Debugging: Notes Not Loading on grow.onehopechurch.com

## Why Bible Works But Notes Don't

- **Bible sync**: Uses backend API (`/api/bible/status`) → Server-side Supabase → No session needed
- **Notes loading**: Uses Supabase client directly → Client-side → **Requires Supabase session**

## Quick Debugging Steps

### Step 1: Check Browser Console

1. Open `grow.onehopechurch.com` in your browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Navigate to the Notes section
5. Look for these error messages:

**Common Errors:**
- `Supabase session not available` → Session tokens missing or expired
- `User ID not found` → User not properly authenticated
- `Error fetching notes:` → Check the full error message
- `RLS policy violation` → Row Level Security blocking access

### Step 2: Check localStorage

In the browser console, run:
```javascript
// Check if session tokens exist
console.log('Access Token:', localStorage.getItem('sb_access_token') ? 'EXISTS' : 'MISSING');
console.log('Refresh Token:', localStorage.getItem('sb_refresh_token') ? 'EXISTS' : 'MISSING');
console.log('User Token:', localStorage.getItem('onehope_token') ? 'EXISTS' : 'MISSING');
console.log('User Data:', localStorage.getItem('onehope_user'));
```

**Expected:**
- `sb_access_token`: Should exist
- `sb_refresh_token`: Should exist
- `onehope_token`: Should exist
- `onehope_user`: Should have user data with `id` field

### Step 3: Check Supabase Session

In the browser console, run:
```javascript
// Check Supabase client
if (window.supabase && supabaseClient) {
    supabaseClient.auth.getSession().then(({ data, error }) => {
        console.log('Supabase Session:', data?.session ? 'ACTIVE' : 'NONE');
        console.log('Session User:', data?.session?.user?.id);
        console.log('Error:', error);
    });
} else {
    console.log('Supabase client not initialized');
}
```

## Common Issues & Fixes

### Issue 1: Missing Session Tokens

**Symptoms:**
- `sb_access_token` is missing from localStorage
- Console shows: "Supabase session not available"

**Fix:**
1. **Log out and log back in** - This will create a new session
2. After logging in, check if `sb_access_token` is now in localStorage

### Issue 2: Expired Session

**Symptoms:**
- Session tokens exist but are expired
- Console shows session errors

**Fix:**
1. The app should auto-refresh, but if it doesn't:
2. **Log out and log back in** to get fresh tokens

### Issue 3: RLS Policy Blocking Access

**Symptoms:**
- Console shows: `RLS policy violation` or `permission denied`
- Session exists but query fails

**Fix:**
1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Find the `message_notes` table
3. Check that there's a SELECT policy that allows users to read their own notes:
   ```sql
   -- Example policy (should already exist)
   CREATE POLICY "Users can view own notes"
   ON message_notes FOR SELECT
   USING (auth.uid() = user_id);
   ```

### Issue 4: User ID Mismatch

**Symptoms:**
- `onehope_user` has a different ID than Supabase session user
- Notes query fails because user_id doesn't match

**Fix:**
1. Check that `localStorage.getItem('onehope_user')` has the correct `id`
2. This ID should match the Supabase auth user ID
3. If they don't match, **log out and log back in**

## Manual Test

Run this in the browser console to test notes loading:

```javascript
// Test notes loading manually
async function testNotesLoading() {
    // Check session
    const { data: sessionData } = await supabaseClient.auth.getSession();
    console.log('Session:', sessionData?.session ? 'Active' : 'None');
    
    // Get user
    const user = JSON.parse(localStorage.getItem('onehope_user') || '{}');
    console.log('User ID:', user.id);
    
    // Try to fetch notes
    const { data, error } = await supabaseClient
        .from('message_notes')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
    
    console.log('Notes:', data);
    console.log('Error:', error);
}

testNotesLoading();
```

## Still Not Working?

If notes still don't load after checking the above:

1. **Check Network Tab:**
   - Look for requests to Supabase API
   - Check response status codes
   - Look for CORS errors (though Bible working suggests CORS is fine)

2. **Verify Table Exists:**
   - Go to Supabase Dashboard → **Table Editor**
   - Check that `message_notes` table exists
   - Check that it has data

3. **Check RLS Policies:**
   - Go to Supabase Dashboard → **Authentication** → **Policies**
   - Verify `message_notes` has proper SELECT policy
   - Test the policy manually in SQL Editor

4. **Re-authenticate:**
   - Clear localStorage: `localStorage.clear()`
   - Log out completely
   - Log back in
   - Try loading notes again

---

**Note:** Since the Bible is syncing, Supabase is working. The issue is specifically with the client-side session for notes.

