# Supabase User Invite Email Template Setup

## Overview
This guide explains how to set up the beautiful user invitation email template in your Supabase dashboard.

## Files Included
- `supabase-invite-user-template.html` - HTML email template (beautiful, responsive design)
- `supabase-invite-user-template.txt` - Plain text fallback template

## Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Update the Invite User Template

1. **Find the "Invite user" template** in the list of email templates
2. **Click on it** to edit

### Step 3: Copy HTML Template

1. Open `supabase-invite-user-template.html` in your text editor
2. **Copy the entire contents** of the file
3. **Paste it into the "HTML" field** in Supabase
4. The template uses these Supabase variables:
   - `{{ .ConfirmationURL }}` - The invitation acceptance link
   - These are automatically replaced by Supabase when sending emails

### Step 4: Copy Plain Text Template

1. Open `supabase-invite-user-template.txt` in your text editor
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

✅ **User-Friendly**
- Clear call-to-action button
- Alternative text link for accessibility
- Feature highlights with icons
- Expiration notice

✅ **Professional**
- Consistent branding throughout
- Footer with contact information
- Proper email structure

## Testing

To test the invite email template:

1. Go to **Authentication** → **Users** in Supabase
2. Click **"Invite user"** button
3. Enter an email address
4. Click **"Send invitation"**
5. Check the email inbox to see your template

## Customization

You can customize the template by editing the HTML file:

- **Colors**: Search for `#00A0DF` and `#0088C0` to change brand colors
- **Text**: Edit any text content directly in the HTML
- **Features**: Add or remove feature items in the list section
- **Styling**: Adjust padding, margins, and sizes as needed

## Notes

- The template uses inline CSS for maximum email client compatibility
- All images are emoji-based (no external image hosting required)
- The template is fully responsive and works on all devices
- Supabase automatically replaces `{{ .ConfirmationURL }}` with the actual invitation link

## Support

If you encounter any issues:
1. Make sure you copied the entire template (including all HTML tags)
2. Verify that `{{ .ConfirmationURL }}` is present (Supabase requires this)
3. Test by sending yourself an invitation
4. Check Supabase logs if emails aren't being sent

---

**Need help?** Contact the development team or check Supabase documentation for email template troubleshooting.



