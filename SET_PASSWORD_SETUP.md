# Set Password Page Setup Guide

## Overview
This guide explains how to set up the custom "Set Password" page for email invites in Supabase. When users are invited via Supabase, they'll be redirected to this page to set their password.

## What Was Created

1. **`public/set-password.html`** - Custom password setup page
2. **Server route** - Added `/set-password` route in `server.js`
3. **Updated invite email template** - Modified to redirect to set-password page

## Setup Steps

### Step 1: Configure Supabase Redirect URL

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://steps.onehopechurch.com/set-password
   ```
5. Click **Save changes**

### Step 2: Update Email Template in Supabase

1. Go to **Authentication** → **Email Templates**
2. Find the **"Invite user"** template
3. Click to edit
4. Update the HTML template:
   - Open `supabase-invite-user-template.html`
   - Copy the entire contents
   - Paste into the HTML field in Supabase
   - The template already includes the redirect: `&redirect_to=https://steps.onehopechurch.com/set-password`
5. Update the plain text template:
   - Open `supabase-invite-user-template.txt`
   - Copy the entire contents
   - Paste into the Plain text field in Supabase
6. Click **Save** or **Update**

### Step 3: Verify the Page is Accessible

The `/set-password` route is already configured in `server.js`. Make sure:
- The server is running
- The page is accessible at: `https://steps.onehopechurch.com/set-password`

## How It Works

1. **Admin invites user** via Supabase Dashboard → Auth → Users → Invite User
2. **User receives email** with invitation link
3. **User clicks link** - Supabase redirects to `/set-password` with auth tokens
4. **Page extracts tokens** from URL hash or params
5. **User sets password** - Page calls `updateUser()` with new password
6. **User is authenticated** - After password is set, user is logged in
7. **User is redirected** - Back to the app (or return URL if specified)

## Features

✅ **Secure Password Setup**
- Extracts Supabase tokens from URL
- Validates password (minimum 8 characters)
- Confirms password matches
- Uses Supabase's `updateUser()` method

✅ **User-Friendly**
- Matches login page styling
- Clear password requirements
- Show/hide password toggle
- Helpful error messages

✅ **Automatic Authentication**
- Establishes Supabase session
- Creates app auth token
- Initializes user profile
- Redirects to app after success

## Testing

To test the set password flow:

1. **Invite a user** via Supabase Dashboard:
   - Go to Authentication → Users
   - Click "Invite user"
   - Enter email address
   - Click "Send invitation"

2. **Check email** - User should receive invitation email

3. **Click invite link** - Should redirect to `/set-password`

4. **Set password** - User enters and confirms password

5. **Verify redirect** - User should be redirected to app and logged in

## Troubleshooting

### Issue: "Invalid or expired invitation link"
- **Solution**: Check that Supabase tokens are in the URL
- The link should include `#access_token=...` or `?access_token=...`
- Verify the redirect URL is configured in Supabase settings

### Issue: "Please wait while we verify your invitation..."
- **Solution**: Check browser console for errors
- Verify Supabase client is initialized
- Check that tokens are being extracted from URL

### Issue: Password update fails
- **Solution**: Check Supabase logs for errors
- Verify user session is established
- Ensure `updateUser()` is being called correctly

### Issue: Redirect doesn't work
- **Solution**: Check `buildRedirectUrl()` function
- Verify return URL is set correctly
- Check that tokens are stored in localStorage

## Security Notes

- Password reset links expire after 24 hours (configurable in Supabase)
- Tokens are single-use and removed from URL after processing
- Passwords are validated client-side and server-side
- All communication is over HTTPS

## Customization

You can customize the set password page:

- **Styling**: Edit styles in `set-password.html` or add CSS
- **Password requirements**: Change `minlength="8"` or add validation
- **Redirect URL**: Modify `buildRedirectUrl()` function
- **Success message**: Edit the "Password set successfully!" message

---

**Need help?** Check the Supabase documentation or contact the development team.
