# Microsoft Exchange/365 Email Delivery Troubleshooting

## Problem
OTP emails are received by Gmail but not by onehopechurch.com (Microsoft Exchange/365) addresses.

**Important**: Emails are being sent FROM `info@steps.onehopechurch.com` (subdomain). This requires special DNS configuration.

## Critical: Subdomain Email Configuration

Since emails are sent from `steps.onehopechurch.com`, you have two options:

### Option 1: Use Root Domain (Recommended - Better Deliverability)
Change the "from" address in Supabase SMTP settings to use the root domain:
- **From**: `auth@onehopechurch.com` or `noreply@onehopechurch.com`
- **Not**: `info@steps.onehopechurch.com`

**Why**: Root domain emails have better deliverability and trust with Microsoft Exchange.

### Option 2: Configure DNS for Subdomain (If you must use subdomain)
If you need to keep `info@steps.onehopechurch.com`, set up DNS records for the subdomain:
- SPF: Add to `steps.onehopechurch.com` DNS
- DKIM: Resend will provide subdomain-specific DKIM records
- DMARC: Can use root domain DMARC or create subdomain-specific

**Note**: Microsoft Exchange is stricter with subdomain authentication, so Option 1 is strongly recommended.

## Quick Checks (Do These First)

### 1. Check Junk/Spam Folder
- Open Outlook (web or desktop)
- Check **Junk Email** folder
- Check **Quarantine** (if available in Microsoft 365 Defender)
- Look for emails from `info@steps.onehopechurch.com` (current sender)

### 2. Check Microsoft 365 Defender Quarantine
1. Go to https://security.microsoft.com/quarantine
2. Sign in as admin
3. Search for emails from your sending domain
4. If found, release them and mark as "Not junk"

### 3. Check Safe Senders List
**For Individual Users:**
1. Outlook → Settings → Mail → Junk email
2. Add to **Safe senders**:
   - `info@steps.onehopechurch.com` (current sender)
   - `@steps.onehopechurch.com` (entire subdomain)
   - `@onehopechurch.com` (entire root domain - recommended)

**For Organization (Admin):**
1. Microsoft 365 Admin Center → Exchange Admin Center
2. Protection → Anti-spam policies
3. Add sending domain to allowed list

## Admin-Level Fixes (Most Important)

### 1. Verify DNS Records Are Correct
Microsoft Exchange is very strict about SPF, DKIM, and DMARC. Verify all records are properly set:

**Check SPF Record:**
```
v=spf1 include:_spf.resend.com ~all
```

**Verify in Microsoft 365:**
1. Go to Exchange Admin Center
2. Protection → Anti-spam policies
3. Check if SPF is passing

**Check DKIM:**
- Ensure all 3 DKIM CNAME records from Resend are added
- Wait 24-48 hours for propagation
- Verify with: https://dkimvalidator.com/

**Check DMARC:**
- Should be: `v=DMARC1; p=none; rua=mailto:dmarc@onehopechurch.com`
- Start with `p=none` (monitoring mode)
- Verify with: https://www.dmarcanalyzer.com/

### 2. Add Resend to Allowed Senders (Organization Level)

**Option A: Mail Flow Rule (Recommended)**
1. Exchange Admin Center → Mail flow → Rules
2. Create new rule:
   - **Name**: "Allow Resend OTP Emails"
   - **Apply this rule if**: Sender domain is `steps.onehopechurch.com` OR `onehopechurch.com`
   - **Do the following**: Set spam confidence level (SCL) to -1 (Bypass spam filtering)
3. Save and enable

**Option B: Connection Filter**
1. Exchange Admin Center → Protection → Connection filter
2. Add IP allow list (get Resend IPs from their support)
3. Or add domain to allowed list

### 3. Disable Safe Links for OTP Emails
Microsoft Safe Links can break OTP codes. Disable it for your sending domain:

1. Microsoft 365 Defender → Policies & rules → Threat policies
2. Safe Links → Edit policy
3. Add exception for: `@steps.onehopechurch.com` and `@onehopechurch.com`
4. Or disable Safe Links scanning for links from your domain

### 4. Check Anti-Spam Policies
1. Exchange Admin Center → Protection → Anti-spam policies
2. Check **Default spam filter policy**
3. Ensure it's not too aggressive
4. Consider adding `steps.onehopechurch.com` and `onehopechurch.com` to allowed domains

### 5. Message Trace (Diagnostic Tool)
Use this to see what's happening to the emails:

1. Exchange Admin Center → Mail flow → Message trace
2. Search for emails to the affected address
3. Check the status:
   - **Delivered** = Check spam folder
   - **Filtered as spam** = Add to safe senders
   - **Rejected** = Check DNS records
   - **Quarantined** = Release from quarantine

## Resend-Specific Settings

### 1. Verify Domain in Resend
1. Go to Resend Dashboard → Domains
2. Verify BOTH:
   - `onehopechurch.com` (root domain - recommended)
   - `steps.onehopechurch.com` (subdomain - if using current setup)
3. All DNS records (SPF, DKIM, DMARC) should show as verified

### 2. Use Verified Domain for "From" Address
**Current Setup**: `info@steps.onehopechurch.com`

**Recommended Change** (better deliverability):
- **From**: `auth@onehopechurch.com` or `noreply@onehopechurch.com` (root domain)
- **From Name**: `One Hope Church`

**If keeping subdomain**:
- Ensure `steps.onehopechurch.com` is verified in Resend
- Set up DNS records for the subdomain

### 3. Disable Tracking (Important for Microsoft)
In Resend settings:
- **Disable link tracking** ✅
- **Disable open tracking** ✅
- Microsoft flags tracked links as suspicious

## Step-by-Step Fix Process

### Step 1: Immediate User Fix
1. Check Junk folder
2. Add sender to Safe Senders
3. Check Quarantine in Microsoft 365 Defender

### Step 2: Verify DNS (Critical)
1. Check SPF record exists and is correct
2. Verify all 3 DKIM records are added
3. Add DMARC record (start with `p=none`)
4. Wait 24-48 hours for propagation
5. Test with: https://mxtoolbox.com/

### Step 3: Admin Configuration
1. Create mail flow rule to bypass spam for your domain
2. Add domain to connection filter allow list
3. Disable Safe Links for your domain
4. Check anti-spam policy settings

### Step 4: Test
1. Send test OTP email
2. Check Message Trace in Exchange Admin Center
3. Verify email arrives (check all folders)
4. If still not working, check Message Trace for error

## Common Microsoft Exchange Error Messages

**"550 5.7.1 Message rejected due to content filtering"**
- Solution: Add to safe senders, create mail flow rule

**"550 5.7.606 Access denied, spam abuse detected"**
- Solution: Check DNS records, verify domain in Resend

**"550 5.7.1 Message rejected by policy"**
- Solution: Check mail flow rules, anti-spam policies

**Email shows as "Delivered" but not in inbox**
- Solution: Check Junk folder, Quarantine, Safe Links

## Testing Tools

### 1. Microsoft Message Trace
- Exchange Admin Center → Mail flow → Message trace
- Shows exactly what happened to the email

### 2. MXToolbox
- https://mxtoolbox.com/spf.aspx
- Verify SPF record is correct

### 3. DKIM Validator
- https://dkimvalidator.com/
- Verify DKIM is working

### 4. Mail-Tester
- https://www.mail-tester.com/
- Get spam score (aim for 8+/10)

## Long-Term Solution

### 1. Set Up Proper DNS Records
- SPF: `v=spf1 include:_spf.resend.com ~all`
- DKIM: All 3 CNAME records from Resend
- DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@onehopechurch.com`

### 2. Warm Up Domain Reputation
- Start with low volume
- Gradually increase over 2-4 weeks
- Monitor bounce rates

### 3. Maintain Good Practices
- Only send to valid addresses
- Handle bounces properly
- Monitor spam complaints
- Keep DNS records updated

## Contact Information

If issues persist:
1. **Resend Support**: support@resend.com
   - Ask about Microsoft Exchange deliverability
   - Request IP addresses for allow list
   
2. **Microsoft Support**: 
   - If you have Microsoft 365 support plan
   - Or contact your IT administrator

3. **Your IT Administrator**:
   - They can check Exchange logs
   - Adjust mail flow rules
   - Review anti-spam policies

## Quick Checklist

- [ ] Checked Junk/Spam folder
- [ ] Checked Microsoft 365 Defender Quarantine
- [ ] Added sender to Safe Senders (user level)
- [ ] Verified SPF record is correct
- [ ] Verified DKIM records are added
- [ ] Added DMARC record
- [ ] Created mail flow rule to bypass spam
- [ ] Disabled Safe Links for your domain
- [ ] Verified domain in Resend
- [ ] Using verified domain for "from" address
- [ ] Disabled tracking in Resend
- [ ] Checked Message Trace for errors
- [ ] Tested with mail-tester.com

## Most Likely Causes (In Order)

1. **Emails going to Junk/Quarantine** (90% of cases)
   - Fix: Check folders, add to safe senders

2. **Missing or incorrect DNS records** (80% of cases)
   - Fix: Verify SPF, DKIM, DMARC are all set correctly

3. **Safe Links breaking emails** (50% of cases)
   - Fix: Disable Safe Links for your domain

4. **Mail flow rules blocking** (30% of cases)
   - Fix: Create rule to allow your domain

5. **Anti-spam policy too strict** (20% of cases)
   - Fix: Adjust policy or add to allow list

Start with checking the Junk folder and adding to Safe Senders - that fixes most issues!

