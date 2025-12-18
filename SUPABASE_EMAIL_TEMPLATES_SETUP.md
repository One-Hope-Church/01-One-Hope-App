# Supabase Email Templates Setup Guide

## Overview
This guide explains how to set up all the beautiful email templates for One Hope Church in your Supabase dashboard.

## Available Templates

### 1. Email Confirmation Template
- **File**: `supabase-email-confirmation-template.html` / `.txt`
- **When used**: When a new user signs up and needs to confirm their email
- **Template name in Supabase**: "Confirm signup"

### 2. Magic Link Template
- **File**: `supabase-magic-link-template.html` / `.txt`
- **When used**: When a user requests a passwordless sign-in link
- **Template name in Supabase**: "Magic Link"

### 3. Invite User Template
- **File**: `supabase-invite-user-template.html` / `.txt`
- **When used**: When an admin invites a new user to the platform
- **Template name in Supabase**: "Invite user"

### 4. Change Email Template
- **File**: `supabase-change-email-template.html` / `.txt`
- **When used**: When a user requests to change their email address
- **Template name in Supabase**: "Change email address"

### 5. Reset Password Template
- **File**: `supabase-reset-password-template.html` / `.txt`
- **When used**: When a user requests to reset their password
- **Template name in Supabase**: "Reset password"

## Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Update Each Template

For each template:

1. **Find the template** in the list (e.g., "Confirm signup", "Magic Link", etc.)
2. **Click on it** to edit
3. **Copy the HTML** from the corresponding `.html` file
4. **Paste it into the "HTML" field** in Supabase
5. **Copy the plain text** from the corresponding `.txt` file
6. **Paste it into the "Plain text" field** in Supabase
7. **Click "Save"** or **"Update"**

### Step 3: Verify Template Variables

All templates use Supabase's `{{ .ConfirmationURL }}` variable, which is automatically replaced with the actual link when the email is sent.

## Template Features

✅ **Consistent Branding**
- All templates match One Hope Church branding
- Gradient headers with church colors (#00A0DF, #0088C0)
- Professional, clean design

✅ **Security-Focused**
- Clear expiration notices
- Security warnings when appropriate
- Reassurance if user didn't request the action

✅ **User-Friendly**
- Clear call-to-action buttons
- Alternative text links for accessibility
- Helpful tips where relevant (e.g., password tips)

✅ **Responsive Design**
- Mobile-friendly layouts
- Works on all email clients
- Inline CSS for maximum compatibility

## Quick Reference

| Template | Expiration | Key Features |
|----------|------------|--------------|
| Email Confirmation | 24 hours | Welcome message, account setup |
| Magic Link | 1 hour | Passwordless sign-in |
| Invite User | 24 hours | Feature highlights, community welcome |
| Change Email | 24 hours | Email change confirmation |
| Reset Password | 1 hour | Password reset, security tips |

## Testing

To test each template:

1. **Email Confirmation**: Sign up with a new email address
2. **Magic Link**: Request a magic link sign-in
3. **Invite User**: Invite a user from Supabase dashboard
4. **Change Email**: Request to change email address
5. **Reset Password**: Request a password reset

## Customization

All templates can be customized by editing the HTML files:

- **Colors**: Search for `#00A0DF` and `#0088C0` to change brand colors
- **Text**: Edit any text content directly in the HTML
- **Expiration Times**: Change expiration notices to match your Supabase settings
- **Styling**: Adjust padding, margins, and sizes as needed

## Notes

- All templates use inline CSS for maximum email client compatibility
- All images are emoji-based (no external image hosting required)
- Templates are fully responsive and work on all devices
- Supabase automatically replaces `{{ .ConfirmationURL }}` with the actual link
- Expiration times are configurable in Supabase settings

## Support

If you encounter any issues:

1. Make sure you copied the entire template (including all HTML tags)
2. Verify that `{{ .ConfirmationURL }}` is present (Supabase requires this)
3. Test by triggering each email type
4. Check Supabase logs if emails aren't being sent
5. Verify your Site URL is set correctly in Supabase settings

---

**Need help?** Contact the development team or check Supabase documentation for email template troubleshooting.



