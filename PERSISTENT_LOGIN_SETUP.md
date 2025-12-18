# Persistent Login & Cross-Site Sync Setup

## Overview
This document explains how persistent login works across both the One Hope Production site (`onehopechurch.com`) and the One Hope App (`grow.onehopechurch.com`), ensuring users stay logged in for extended periods and notes sync properly.

## How It Works

### 1. Token Expiration Logic (Activity-Based)

**Email Login (OTP - Current Implementation):**
- **30 days of INACTIVITY** (not 30 days from login)
- Token timestamp is updated on each page load/activity
- Session extends as long as user is active
- **Automatic logout after 30 days of inactivity**

**How It Works:**
- When user visits the site → Token timestamp updates → Session extends
- If user doesn't visit for 30 days → Token timestamp doesn't update → Session expires
- Token is also updated every 15 minutes during active use
- This ensures users stay logged in while active, but are logged out after 30 days of inactivity

**Note:** Since the login uses email OTP (one-time password) without a "Remember Me" checkbox, all logins default to activity-based persistent sessions. Users stay logged in while active, but are automatically logged out after 30 days of inactivity.

### 2. Automatic Session Refresh

**On App Load:**
- Supabase session is automatically refreshed when the app loads
- Checks if session expires within 1 hour and refreshes proactively

**Periodic Refresh:**
- Session refreshes every **30 minutes** in the background
- Token activity timestamp updates every **15 minutes** during active use
- Prevents expiration during active use

**Activity Tracking:**
- Token timestamp updates on each page load
- Token timestamp updates every 15 minutes during active use
- This extends the session as long as user is active
- After 30 days of inactivity, session expires and user is logged out

### 3. Cross-Site Token Sync

**When logging in on App (`grow.onehopechurch.com`):**
1. User logs in → Supabase session created
2. Tokens stored in localStorage:
   - `onehope_token` (custom app token)
   - `onehope_user` (user data)
   - `sb_access_token` (Supabase access token)
   - `sb_refresh_token` (Supabase refresh token)
3. If redirecting to production site, tokens are passed in URL:
   - `?auth_token=...&sb_access_token=...&sb_refresh_token=...`
4. Production site stores tokens in its localStorage

**When logging in on Production Site:**
1. User clicks "Sign In" → Redirects to app login
2. After login, redirects back with tokens in URL
3. Production site stores tokens
4. Notes can now sync from Supabase

### 4. Notes Sync

**Requirements for Notes to Load:**
1. ✅ User must be logged in (`onehope_token` exists)
2. ✅ Supabase session must be valid (`sb_access_token` and `sb_refresh_token`)
3. ✅ Session is automatically refreshed before expiration
4. ✅ Notes query uses Supabase client with valid session

**If Notes Don't Load:**
- Check browser console for errors
- Verify `sb_access_token` exists in localStorage
- Session may need manual refresh (log out and back in)

## Implementation Details

### Files Modified

**One Hope App (`public/script.js`):**
- ✅ Token expiration respects `remember_me` flag
- ✅ Proactive Supabase session refresh on init
- ✅ Periodic session refresh every 30 minutes
- ✅ Session refresh threshold increased to 1 hour before expiration
- ✅ Notes loading more resilient (tries even if session not perfect)

**Production Site (`lib/supabase-auth.js`):**
- ✅ Token expiration respects `remember_me` flag (30 days vs 24 hours)
- ✅ Listens for Supabase token changes in localStorage

**Production Site (`src/components/AuthStatus/index.js`):**
- ✅ Listens for cross-domain messages from app
- ✅ Syncs tokens when app sends AUTH_SYNC message
- ✅ Handles Supabase tokens from URL parameters

## Testing

### Test Persistent Login (30 Days)

1. **Log in with "Remember Me" checked**
2. **Wait 2+ weeks** (or modify code to test faster)
3. **Visit app** → Should still be logged in
4. **Visit production site** → Should show as logged in
5. **Check Notes** → Should load from Supabase

### Test Cross-Site Sync

1. **Log in on app** (`grow.onehopechurch.com`)
2. **Open production site** (`onehopechurch.com`) in new tab
3. **Should show as logged in** (via localStorage sync or URL params)
4. **Notes should be accessible** on both sites

### Test Session Refresh

1. **Log in on app**
2. **Open browser console**
3. **Wait 30 minutes** (or check console logs)
4. **Should see session refresh logs** (if logging enabled)
5. **Notes should still load** after refresh

## Troubleshooting

### Issue: Notes not loading after 2 weeks

**Possible Causes:**
1. Supabase session tokens expired
2. Token expiration check removed tokens
3. Session refresh failed

**Solutions:**
1. **Check localStorage:**
   ```javascript
   localStorage.getItem('sb_access_token')  // Should exist
   localStorage.getItem('sb_refresh_token')  // Should exist
   localStorage.getItem('onehope_token')     // Should exist
   ```

2. **Log out and log back in** - Creates fresh session

3. **Check browser console** for session refresh errors

### Issue: User logged out after 30 days of inactivity

**This is Expected Behavior:**
- If user hasn't visited the site for 30 days, they will be automatically logged out
- Token timestamp tracks last activity, not login time
- User will see "Your session has expired" message on login page
- This is a security feature to ensure inactive accounts are logged out

### Issue: Not logged in on production site after logging in on app

**Possible Causes:**
1. Cross-domain restrictions
2. URL parameters not being read
3. localStorage not syncing

**Solutions:**
1. **Check URL parameters** - Should have `?auth_token=...&sb_access_token=...`
2. **Check localStorage** on production site
3. **Try logging in directly** on production site (redirects to app)

### Issue: Session expires too quickly

**Check:**
1. **"Remember Me" was checked** when logging in
2. **Token has `remember_me: true`** in payload
3. **Token expiration logic** is using 30 days (not 24 hours)

## Security Notes

- Tokens are stored in localStorage (domain-specific)
- Supabase tokens are automatically refreshed
- Custom tokens expire after 30 days (with Remember Me)
- Users can manually log out to clear all tokens
- Cross-domain sync uses postMessage (secure origin checking)

## Future Improvements

1. **Shared Cookie Approach**: Use httpOnly cookies for cross-domain auth
2. **Token Refresh Endpoint**: Backend endpoint to refresh tokens
3. **Session Monitoring**: Dashboard to see active sessions
4. **Multi-Device Sync**: Sync across multiple devices/browsers

---

**Last Updated:** After implementing persistent login improvements

