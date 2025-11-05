# Supabase Email Template Setup Guide

This guide explains how to set up the email confirmation template in Supabase.

## Files

- `supabase-email-confirmation-template.html` - HTML version of the email template
- `supabase-email-confirmation-template.txt` - Plain text version of the email template

## How to Set Up in Supabase

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/jdnjpdhlyohlnrbkajli
   - Go to **Authentication** → **Email Templates** in the left sidebar

2. **Select "Confirm signup" template**
   - Click on the "Confirm signup" template from the list

3. **Copy the HTML template**
   - Open `supabase-email-confirmation-template.html`
   - Copy the entire contents
   - Paste it into the "HTML" field in the Supabase template editor

4. **Copy the Plain Text template** (optional but recommended)
   - Open `supabase-email-confirmation-template.txt`
   - Copy the entire contents
   - Paste it into the "Plain text" field in the Supabase template editor

5. **Save the template**
   - Click "Save" to save your changes

## Template Variables

The template uses Supabase's built-in variables:
- `{{ .ConfirmationURL }}` - The confirmation link that users click to verify their email

## Customization

You can customize the template by:
- Changing colors (currently uses One Hope's primary blue: #00A0DF)
- Adjusting text content
- Modifying the layout and spacing
- Adding your logo image (if you have a hosted URL)

## Testing

To test the email template:
1. Create a test account in your app
2. Check your email for the confirmation message
3. Verify the styling looks good across different email clients

## Notes

- The template is responsive and works on mobile devices
- The design matches One Hope's branding (blue #00A0DF, Inter font, modern styling)
- The template includes both HTML and plain text versions for better email client compatibility

