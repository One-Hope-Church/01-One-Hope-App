# Domain Change Checklist: steps.onehopechurch.com → grow.onehopechurch.com

## ✅ Code Changes Completed

All code references have been updated from `steps.onehopechurch.com` to `grow.onehopechurch.com`:

- ✅ HTML meta tags (OG and Twitter URLs)
- ✅ Supabase email templates (HTML and TXT)
- ✅ Documentation files

---

## 🔧 External Configuration Changes Required

### 1. Vercel Domain Configuration

**Steps:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. **Remove** the old domain: `steps.onehopechurch.com`
4. **Add** the new domain: `grow.onehopechurch.com`
5. Follow Vercel's DNS configuration instructions

**DNS Records Needed:**
- CNAME record: `grow` → `cname.vercel-dns.com` (or follow Vercel's specific instructions)
- Or A record if Vercel provides an IP address

---

### 2. DNS Configuration (Domain Provider)

**Steps:**
1. Log into your domain provider (where `onehopechurch.com` is registered)
2. Navigate to DNS management
3. **Update or add** DNS record for `grow.onehopechurch.com`:
   - **Type**: CNAME
   - **Name**: `grow`
   - **Value**: `cname.vercel-dns.com` (or Vercel's provided value)
4. **Remove** or update the old `steps` subdomain record if no longer needed
5. Wait for DNS propagation (can take up to 48 hours, usually much faster)

**Note:** DNS changes may take a few minutes to several hours to propagate globally.

---

### 3. Supabase Configuration

**Critical - Must be updated for authentication to work!**

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

**Update Site URL:**
- **Current**: `https://steps.onehopechurch.com`
- **New**: `https://grow.onehopechurch.com`
- Click **Save**

**Update Redirect URLs:**
1. Under **Redirect URLs**, add:
   ```
   https://grow.onehopechurch.com/**
   https://grow.onehopechurch.com/set-password
   ```
2. **Remove** old redirect URLs:
   ```
   https://steps.onehopechurch.com/**
   https://steps.onehopechurch.com/set-password
   ```
3. Click **Save**

**Update Email Templates:**
1. Go to **Authentication** → **Email Templates**
2. Find **"Invite user"** template
3. Update both HTML and Plain text templates with the new domain:
   - Copy contents from `supabase-invite-user-template.html`
   - Copy contents from `supabase-invite-user-template.txt`
   - Paste into Supabase templates
   - Verify redirect URLs show `grow.onehopechurch.com`
4. Click **Save**

**Update CORS Settings (Required for Notes/API to work):**
1. Go to **Settings** → **API**
2. Scroll to **CORS Configuration** or **Allowed Origins**
3. Add: `https://grow.onehopechurch.com`
4. Remove or keep: `https://steps.onehopechurch.com` (if fully migrated, remove it)
5. Click **Save**

**Note:** Without updating CORS, notes and other Supabase API calls will fail with CORS errors.

---

### 4. Email Service Configuration (If Using Resend)

**If you're using Resend for email sending:**

1. Log into [Resend Dashboard](https://resend.com)
2. Go to **Domains**
3. **Verify** `grow.onehopechurch.com` domain (if using subdomain for email)
   - Or continue using root domain `onehopechurch.com` (recommended)
4. Update any domain-specific email settings

**Note:** If you're sending from `info@onehopechurch.com` (root domain), no changes needed. Only update if using `info@grow.onehopechurch.com`.

---

### 5. Other Services to Update

**Google Analytics (if configured):**
- Update property settings if domain-specific
- Update any filters or views that reference the old domain

**Monitoring Tools:**
- Update uptime monitoring services (UptimeRobot, Pingdom, etc.)
- Update error tracking (Sentry, etc.) if domain-specific

**Third-Party Integrations:**
- Check any services that require domain whitelisting
- Update OAuth redirect URIs if applicable

---

## 📋 Testing Checklist

After making all changes, test the following:

- [ ] Domain resolves correctly: `https://grow.onehopechurch.com`
- [ ] Homepage loads correctly
- [ ] User login works
- [ ] User registration works
- [ ] Email invitations work (test sending an invite)
- [ ] Password reset emails work
- [ ] Magic link emails work (if used)
- [ ] Set password page accessible: `https://grow.onehopechurch.com/set-password`
- [ ] All redirects work correctly
- [ ] Social sharing (OG tags) show correct URL
- [ ] Mobile app functionality (if applicable)

---

## ⚠️ Important Notes

1. **DNS Propagation**: DNS changes can take 15 minutes to 48 hours to fully propagate. Most changes are visible within 1-2 hours.

2. **SSL Certificate**: Vercel will automatically provision an SSL certificate for the new domain. This usually happens within minutes of adding the domain.

3. **Old Domain**: Consider keeping the old domain (`steps.onehopechurch.com`) temporarily and setting up a redirect to the new domain to avoid broken links.

4. **Email Sender**: The email sender address (`info@steps.onehopechurch.com` vs `info@grow.onehopechurch.com`) is separate from the website domain. You can:
   - Keep using `info@onehopechurch.com` (root domain - recommended)
   - Change to `info@grow.onehopechurch.com` (requires DNS setup for subdomain)

5. **Backup**: Make sure you have backups of your Supabase email templates before updating them.

---

## 🆘 Troubleshooting

**Issue: Domain not resolving**
- Check DNS records are correct
- Wait for DNS propagation (use `dig grow.onehopechurch.com` to check)
- Verify Vercel domain is properly configured

**Issue: Authentication not working**
- Verify Supabase Site URL is updated
- Check Redirect URLs include new domain
- Clear browser cache and cookies
- Check browser console for errors

**Issue: Email links not working**
- Verify Supabase email templates are updated
- Check redirect URLs in templates match new domain
- Test sending a new invitation email

---

## 📝 Summary

**Code Changes:** ✅ Complete  
**External Config:** ⚠️ Requires manual updates

**Estimated Time for External Config:** 30-60 minutes  
**Critical Priority:** Supabase configuration (authentication will break without it)

---

**Last Updated:** After code changes completed  
**Next Steps:** Complete external configuration checklist above

