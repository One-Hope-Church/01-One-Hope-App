# Supabase OTP Email Template Setup

## Overview
This guide explains how to configure Supabase to send OTP (One-Time Password) codes via email for passwordless authentication.

## Important: Template Variable

**CRITICAL**: Supabase uses the **"Magic Link"** email template for OTP codes, but you must use `{{ .Token }}` instead of `{{ .ConfirmationURL }}` to send codes instead of links.

- ✅ **`{{ .Token }}`** = Sends a 6-digit OTP code
- ❌ **`{{ .ConfirmationURL }}`** = Sends a magic link (not what we want)

## Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Update the Magic Link Template

1. **Find the "Magic Link" template** in the list of email templates
2. **Click on it** to edit

### Step 3: Copy HTML Template

1. Open `supabase-otp-template.html` in your text editor
2. **Copy the entire contents** of the file
3. **Paste it into the "HTML" field** in Supabase
4. **IMPORTANT**: The template uses `{{ .Token }}` which will display the 6-digit OTP code

### Step 4: Copy Plain Text Template

1. Open `supabase-otp-template.txt` in your text editor
2. **Copy the entire contents** of the file
3. **Paste it into the "Plain text" field** in Supabase
4. This serves as a fallback for email clients that don't support HTML

### Step 5: Save Changes

1. Click **"Save"** or **"Update"** in the Supabase dashboard
2. Your OTP template is now active!

## Additional Supabase Settings

### OTP Expiration Time

1. Go to **Authentication** → **Settings**
2. Find **"OTP Expiry"** or **"OTP Lifetime"**
3. Default is usually 60 seconds (1 minute)
4. Recommended: **300 seconds (5 minutes)** for better user experience
5. This matches the expiration notice in the email template

### Email Rate Limits

You mentioned you already increased the rate limit. Make sure:
- **Rate limit** is set high enough (you're using Resend, so this should be fine)
- **Rate limit window** is reasonable (e.g., 10 requests per hour per email)

### SMTP Configuration

Since you're using Resend for custom SMTP:
1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Verify your Resend configuration is active
3. Test that emails are being sent through Resend

## How It Works

1. User enters email on login page
2. Your app calls `signInWithOtp({ email })`
3. Supabase sends email using the "Magic Link" template
4. Email contains `{{ .Token }}` which displays the 6-digit code
5. User enters code in your app
6. Your app calls `verifyOtp({ email, token: code, type: 'email' })`
7. User is authenticated

## Testing

To test the OTP flow:

1. Go to your login page
2. Enter your email address
3. Click "Continue"
4. Check your email for the 6-digit code
5. Enter the code on the login page
6. Click "Verify Code"
7. You should be signed in

## Troubleshooting

### Code Not Appearing in Email
- Check that the template uses `{{ .Token }}` (not `{{ .ConfirmationURL }}`)
- Verify SMTP settings are correct
- Check spam folder

### Code Expires Too Quickly
- Increase OTP expiry time in Supabase settings
- Update expiration notice in email template to match

### Rate Limit Errors
- Increase rate limit in Supabase settings
- Wait a few minutes between requests

## Notes

- The "Magic Link" template is used for both magic links AND OTP codes
- The presence of `{{ .ConfirmationURL }}` makes Supabase send a link
- The presence of `{{ .Token }}` makes Supabase send a code
- You can have both variables, but Supabase will prioritize the link if both are present
- For OTP-only, only include `{{ .Token }}`


