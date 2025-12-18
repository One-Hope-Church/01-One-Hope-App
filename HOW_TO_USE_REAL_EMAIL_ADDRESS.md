# How to Remove Sender Name (Display Name) from Emails

## Problem
Emails are showing as "One Hope Church <info@steps.onehopechurch.com>" but you want them to show as just "info@steps.onehopechurch.com" without the display name.

## Solution: Remove Sender Name in Supabase

### Step 1: Go to Supabase SMTP Settings
1. Go to **Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. Find the **"Sender name"** field

### Step 2: Set Sender Name to Email Address
Since Supabase requires a sender name, set it to match your email address:
- **Sender name**: `info@steps.onehopechurch.com`
- **Sender email**: `info@steps.onehopechurch.com`

### Step 3: Save Settings
1. Click **Save** or **Update**
2. The sender name will now match the email address

### What This Does
- **Before**: `One Hope Church <info@steps.onehopechurch.com>`
- **After**: `info@steps.onehopechurch.com <info@steps.onehopechurch.com>`

Most email clients will display this as just `info@steps.onehopechurch.com` since the name and email match.

### Alternative: Use Minimal Name
If you want to try a different approach:
- **Sender name**: `info` (just the username part)
- **Sender email**: `info@steps.onehopechurch.com`

This might display as: `info <info@steps.onehopechurch.com>`

**Recommended**: Set sender name to the full email address for best results.

---

## Original Guide: Why Use a Real Email Address?

Using a real, recognizable email address (like `info@onehopechurch.com` or `corey@onehopechurch.com`) instead of a generic sender improves deliverability because:
- ✅ Email providers trust real addresses more
- ✅ Recipients recognize the sender
- ✅ Less likely to be flagged as spam
- ✅ Better reputation with Microsoft Exchange/365

## Step-by-Step Setup

### Step 1: Verify Your Email Domain in Resend

1. Go to **Resend Dashboard** → **Domains**
2. Add/verify `onehopechurch.com` (root domain)
3. Complete DNS verification:
   - SPF record
   - DKIM records (3 CNAME records)
   - DMARC record
4. Wait for verification (can take up to 48 hours)

**Important**: You need to verify the **root domain** (`onehopechurch.com`), not the subdomain. Once verified, you can send from any address on that domain (like `info@onehopechurch.com`, `corey@onehopechurch.com`, etc.).

### Step 2: Choose Your Email Address

Pick a real email address that:
- ✅ Exists and you can access (for testing)
- ✅ Is recognizable (like `info@onehopechurch.com` or `corey@onehopechurch.com`)
- ✅ Uses the root domain (`@onehopechurch.com`), not subdomain

**Recommended options**:
- `info@onehopechurch.com` (if this is your general contact email)
- `corey@onehopechurch.com` (if this is your personal email)
- `noreply@onehopechurch.com` (if you want a dedicated sending address)

### Step 3: Configure Supabase SMTP Settings

1. Go to **Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. Enable **Custom SMTP** (if not already enabled)
3. Configure the settings:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: Your Resend API key
   - **Sender email**: `info@onehopechurch.com` (or your chosen address)
   - **Sender name**: `One Hope Church` (or your name, like `Corey Foshee`)

**Key Settings**:
- **Sender email**: This is the "From" address that appears in the email
- **Sender name**: This is the display name (can be different from email)

### Step 4: Test the Configuration

1. Send a test OTP email to yourself
2. Check that the "From" address shows as your real email
3. Verify it arrives in inbox (not spam)
4. Check with both Gmail and your Microsoft Exchange email

## Example Configuration

**Good Setup**:
```
Sender email: info@onehopechurch.com
Sender name: One Hope Church
```

**Even Better** (if you want personal touch):
```
Sender email: corey@onehopechurch.com
Sender name: Corey Foshee - One Hope Church
```

**What Recipients See**:
- **From**: `Corey Foshee - One Hope Church <corey@onehopechurch.com>`
- This shows a real person's name and email, which builds trust

## Important Notes

### You Don't Need to Create the Email Account

- You don't need to actually create `info@onehopechurch.com` as a mailbox
- As long as the domain (`onehopechurch.com`) is verified in Resend, you can send from any address on that domain
- The email address just needs to be valid format and use your verified domain

### Replies Will Go to This Address

- If someone replies to the OTP email, it will go to the "From" address
- Make sure you can receive emails at that address, OR
- Use an address you monitor (like `info@onehopechurch.com`)

### Microsoft Exchange Considerations

- Using a real email address helps with Microsoft Exchange deliverability
- Add the sender address to Safe Senders list
- The address should match your organization's domain

## Troubleshooting

### "Email not verified" Error
- Make sure `onehopechurch.com` is verified in Resend
- Check that DNS records (SPF, DKIM, DMARC) are correct
- Wait 24-48 hours for DNS propagation

### Emails Still Going to Spam
- Verify the domain in Resend is fully verified (green checkmark)
- Check DNS records are correct
- Add sender to Safe Senders in Microsoft Exchange
- Test with mail-tester.com

### Can't Send from Chosen Address
- Ensure the domain is verified in Resend (not just the subdomain)
- Check that you're using the root domain (`@onehopechurch.com`)
- Verify DNS records are set up correctly

## Quick Checklist

- [ ] Domain `onehopechurch.com` verified in Resend
- [ ] SPF record added to DNS
- [ ] DKIM records added to DNS
- [ ] DMARC record added to DNS
- [ ] Chosen real email address (e.g., `info@onehopechurch.com`)
- [ ] Supabase SMTP configured with real email address
- [ ] Test email sent and received successfully
- [ ] Added to Safe Senders in Microsoft Exchange

## Current vs. Recommended

**Current Setup** (if using subdomain):
```
From: info@steps.onehopechurch.com
```

**Recommended Setup**:
```
From: info@onehopechurch.com
```

**Even Better** (personal touch):
```
From: corey@onehopechurch.com
Sender Name: Corey Foshee - One Hope Church
```

The key is using the **root domain** (`onehopechurch.com`) instead of the subdomain (`steps.onehopechurch.com`) for better deliverability.

