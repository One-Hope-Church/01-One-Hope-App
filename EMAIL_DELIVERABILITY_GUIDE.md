# Email Deliverability Guide - Avoid Spam

## Overview
This guide helps improve email deliverability for OTP codes and other transactional emails sent through Supabase + Resend.

## Critical: DNS Authentication Records

These are the **most important** steps to prevent spam. Set them up in your domain's DNS settings.

### 1. SPF Record (Sender Policy Framework)
**Purpose**: Authorizes Resend to send emails on behalf of your domain

**Add to DNS** (TXT record):
```
v=spf1 include:_spf.resend.com ~all
```

**Where to add**: Your domain registrar (e.g., GoDaddy, Namecheap) or DNS provider (e.g., Cloudflare)

### 2. DKIM Record (DomainKeys Identified Mail)
**Purpose**: Cryptographically signs emails to prove authenticity

**Steps**:
1. Go to Resend Dashboard → Domains
2. Add/verify your domain (e.g., `onehopechurch.com`)
3. Resend will provide DKIM records (usually 3 CNAME records)
4. Add these CNAME records to your DNS

**Example DKIM records** (Resend will provide actual values):
```
resend._domainkey.onehopechurch.com → [Resend-provided value]
```

### 3. DMARC Record (Domain-based Message Authentication)
**Purpose**: Tells email providers what to do with unauthenticated emails

**Add to DNS** (TXT record for `_dmarc.onehopechurch.com`):
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@onehopechurch.com; pct=100
```

**Policy options**:
- `p=none` - Monitor only (start here)
- `p=quarantine` - Send to spam if fails
- `p=reject` - Reject if fails (strictest)

**Start with `p=none`** to monitor, then move to `p=quarantine` after a few weeks.

## Resend Configuration

### 1. Verify Your Domain in Resend
1. Go to Resend Dashboard → Domains
2. Add `onehopechurch.com` (or your sending domain)
3. Complete DNS verification (SPF, DKIM, DMARC)
4. Wait for verification (can take up to 48 hours)

### 2. Use Verified Domain for Sending
In Supabase SMTP settings, use:
- **From address**: `noreply@onehopechurch.com` or `auth@onehopechurch.com`
- **Not**: Generic addresses like `noreply@resend.dev`

### 3. Resend Settings
- **Disable link tracking** for transactional emails (OTP codes)
- **Disable open tracking** for transactional emails
- These can trigger spam filters

## Email Content Best Practices

### ✅ Good Practices (Your template already follows these)
- Professional HTML structure
- Plain text version included
- Clear sender name ("One Hope Church")
- Contact information in footer
- No excessive exclamation marks
- Proper text-to-image ratio

### ⚠️ Avoid Spam Trigger Words
Your current template is good, but avoid:
- "Free", "Act now", "Limited time"
- Excessive capitalization
- Too many emojis (you use them sparingly ✅)
- Suspicious links or shortened URLs

### 📧 Subject Line Best Practices
Keep subject lines:
- Clear and descriptive
- Not too long (50 characters or less)
- Avoid all caps
- Example: "Your One Hope sign-in code" ✅

## Supabase SMTP Settings

### Configure in Supabase Dashboard
1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Use Resend SMTP credentials:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: Your Resend API key
   - **Sender email**: `auth@onehopechurch.com` (use verified domain)
   - **Sender name**: `One Hope Church`

## Additional Improvements

### 1. Warm Up Your Domain (New Domains)
If you just set up a new sending domain:
- Start with low volume (10-20 emails/day)
- Gradually increase over 2-4 weeks
- Monitor bounce rates and spam complaints

### 2. Monitor Deliverability
- Check Resend dashboard for:
  - Bounce rates (should be < 2%)
  - Spam complaints (should be < 0.1%)
  - Delivery rates (should be > 95%)
- Use tools like:
  - Mail-tester.com (test spam score)
  - MXToolbox (check DNS records)

### 3. Maintain Good Sender Reputation
- Only send to valid email addresses
- Handle bounces properly (remove invalid emails)
- Don't send too frequently to same address
- Respect rate limits

### 4. Email List Hygiene
- Remove hard bounces immediately
- Remove soft bounces after 3 attempts
- Don't send to inactive addresses

## Testing Your Setup

### 1. Test DNS Records
Use these tools to verify:
- **MXToolbox**: https://mxtoolbox.com/spf.aspx
- **DMARC Analyzer**: https://www.dmarcanalyzer.com/
- **DKIM Validator**: https://dkimvalidator.com/

### 2. Test Email Deliverability
- **Mail-tester**: https://www.mail-tester.com/
  - Send test email to their address
  - Get spam score (aim for 10/10)
  - See what needs improvement

### 3. Test with Real Email Providers
Send test emails to:
- Gmail
- Outlook
- Yahoo
- Apple Mail
- Check spam folders

## Quick Checklist

- [ ] SPF record added to DNS
- [ ] DKIM records added to DNS (from Resend)
- [ ] DMARC record added to DNS
- [ ] Domain verified in Resend
- [ ] Supabase SMTP configured with Resend
- [ ] Using verified domain for "from" address
- [ ] Link tracking disabled for transactional emails
- [ ] Tested with mail-tester.com (score 8+/10)
- [ ] Tested with major email providers
- [ ] Monitoring bounce rates and spam complaints

## Troubleshooting

### Emails Still Going to Spam?

1. **Check DNS records** - Use MXToolbox to verify all records are correct
2. **Check sender reputation** - Use tools like Sender Score
3. **Review email content** - Run through mail-tester.com
4. **Check Resend logs** - Look for bounce reasons
5. **Verify domain age** - New domains need warm-up period

### Common Issues

**"SPF record not found"**
- Wait 24-48 hours for DNS propagation
- Verify record syntax is correct
- Check for typos in domain name

**"DKIM signature invalid"**
- Ensure all 3 DKIM CNAME records are added
- Wait for DNS propagation
- Verify records match exactly what Resend provided

**"DMARC policy too strict"**
- Start with `p=none` instead of `p=reject`
- Monitor reports before tightening policy

## Resources

- **Resend Deliverability Guide**: https://resend.com/docs/deliverability
- **Supabase SMTP Setup**: https://supabase.com/docs/guides/auth/auth-smtp
- **SPF Record Generator**: https://www.spf-record.com/
- **DMARC Record Generator**: https://www.dmarcanalyzer.com/dmarc-record-generator/

## Priority Actions

**Do First** (Most Impact):
1. ✅ Set up SPF record
2. ✅ Set up DKIM records (via Resend)
3. ✅ Set up DMARC record
4. ✅ Verify domain in Resend

**Do Next**:
5. ✅ Configure Supabase SMTP with verified domain
6. ✅ Test with mail-tester.com
7. ✅ Monitor for first week

**Ongoing**:
8. ✅ Monitor bounce rates
9. ✅ Check spam complaints
10. ✅ Maintain clean email list


