# Supabase Magic Link Email Template Setup

## Overview
This guide explains how to set up the beautiful magic link email template in your Supabase dashboard for passwordless authentication.

## Files Included
- `supabase-magic-link-template.html` - HTML email template (beautiful, responsive design)
- `supabase-magic-link-template.txt` - Plain text fallback template

## Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Update the Magic Link Template

1. **Find the "Magic Link" template** in the list of email templates
2. **Click on it** to edit

### Step 3: Copy HTML Template

1. Open `supabase-magic-link-template.html` in your text editor
2. **Copy the entire contents** of the file
3. **Paste it into the "HTML" field** in Supabase
4. The template uses these Supabase variables:
   - `{{ .ConfirmationURL }}` - The magic link URL
   - These are automatically replaced by Supabase when sending emails

### Step 4: Copy Plain Text Template

1. Open `supabase-magic-link-template.txt` in your text editor
2. **Copy the entire contents** of the file
3. **Paste it into the "Plain text" field** in Supabase
4. This serves as a fallback for email clients that don't support HTML

### Step 5: Save Changes

1. Click **"Save"** or **"Update"** in the Supabase dashboard
2. Your template is now active!

## Template Features

✅ **Beautiful Design**
- Matches One Hope Church branding
- Gradient header with church colors (#00A0DF)
- Clean, modern layout
- Fully responsive for mobile devices

✅ **Security-Focused**
- Clear security notice about link expiration
- One-time use warning
- 1-hour expiration notice
- Reassurance if user didn't request the link

✅ **User-Friendly**
- Clear call-to-action button
- Alternative text link for accessibility
- Professional footer with contact information

✅ **Professional**
- Consistent branding throughout
- Proper email structure
- Mobile-responsive design

## Testing

To test the magic link email template:

1. In your app, implement a "Sign in with magic link" feature
2. Use Supabase's `auth.signInWithOtp()` method:
   ```javascript
   const { data, error } = await supabase.auth.signInWithOtp({
     email: 'user@example.com',
     options: {
       emailRedirectTo: 'https://grow.onehopechurch.com'
     }
   })
   ```
3. Check the email inbox to see your template

## Magic Link Flow

1. **User requests magic link** - User enters their email address
2. **Supabase sends email** - Using your template with the magic link
3. **User clicks link** - Link contains a secure token
4. **User is signed in** - Supabase authenticates the user automatically
5. **Redirect to app** - User is taken to your app, already logged in

## Customization

You can customize the template by editing the HTML file:

- **Colors**: Search for `#00A0DF` and `#0088C0` to change brand colors
- **Text**: Edit any text content directly in the HTML
- **Expiration Time**: Change "1 hour" to match your Supabase settings
- **Styling**: Adjust padding, margins, and sizes as needed

## Notes

- The template uses inline CSS for maximum email client compatibility
- All images are emoji-based (no external image hosting required)
- The template is fully responsive and works on all devices
- Supabase automatically replaces `{{ .ConfirmationURL }}` with the actual magic link
- Magic links expire after 1 hour by default (configurable in Supabase)

## Security Considerations

- Magic links are single-use tokens
- They expire after a set time (default: 1 hour)
- Links are unique to each user and email
- Never share magic links - they provide immediate access to accounts

## Support

If you encounter any issues:
1. Make sure you copied the entire template (including all HTML tags)
2. Verify that `{{ .ConfirmationURL }}` is present (Supabase requires this)
3. Test by requesting a magic link for your own email
4. Check Supabase logs if emails aren't being sent
5. Verify your Site URL is set correctly in Supabase settings

---

**Need help?** Contact the development team or check Supabase documentation for magic link authentication.



