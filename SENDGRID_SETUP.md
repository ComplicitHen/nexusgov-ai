# SendGrid Email Setup Guide

## 📧 Step-by-Step SendGrid Configuration

### 1. Create SendGrid Account
1. Go to https://signup.sendgrid.com/
2. Sign up (free tier: 100 emails/day forever)
3. Verify your email address

### 2. Get API Key
1. Log in to SendGrid: https://app.sendgrid.com/
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `NexusGov AI Production`
5. Select **Full Access** (or **Restricted Access** with Mail Send permission)
6. Click **Create & View**
7. **COPY THE KEY NOW** (you won't see it again!)

### 3. Configure Environment Variables

Add to your `.env.local`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=NexusGov AI
```

### 4. Domain Authentication (Required for Production)

⚠️ **Without domain authentication, SendGrid may reject your emails!**

#### Option A: Single Sender Verification (Quick - for testing)
1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **Create New Sender**
3. Fill in details:
   - From Name: `NexusGov AI`
   - From Email: Your verified email (e.g., `you@gmail.com`)
4. Verify the email
5. Update `.env.local`:
   ```bash
   SENDGRID_FROM_EMAIL=you@gmail.com  # Your verified email
   ```

#### Option B: Domain Authentication (Recommended - for production)
1. Go to **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Select your DNS provider: **Cloudflare**
3. Enter your domain: `yourdomain.com`
4. SendGrid will provide DNS records to add

### 5. DNS Records for Cloudflare (Domain Authentication)

SendGrid will give you these records to add:

#### CNAME Records (for authentication):
```
Type: CNAME
Name: s1._domainkey
Content: s1.domainkey.u12345678.wl123.sendgrid.net
TTL: Auto

Type: CNAME
Name: s2._domainkey
Content: s2.domainkey.u12345678.wl123.sendgrid.net
TTL: Auto
```

#### CNAME Record (for email links):
```
Type: CNAME
Name: em1234
Content: u12345678.wl123.sendgrid.net
TTL: Auto
```

#### TXT Record (for SPF - optional but recommended):
```
Type: TXT
Name: @
Content: v=spf1 include:sendgrid.net ~all
TTL: Auto
```

### 6. Add DNS Records via Cloudflare API

I can help you add these records automatically! Just provide:
1. Your domain name
2. The CNAME records from SendGrid

Or use Cloudflare Dashboard manually:
1. Log in to https://dash.cloudflare.com/
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Add each CNAME/TXT record from SendGrid

### 7. Verify Domain in SendGrid
1. After adding DNS records, wait 5-10 minutes
2. Go back to SendGrid → **Settings** → **Sender Authentication**
3. Click **Verify** next to your domain
4. Should show ✓ **Verified**

### 8. Test Email Sending

Once DNS is configured, test the invitation system:

```bash
# 1. Start your development server
npm run dev

# 2. Navigate to: http://localhost:3000/admin/users/invite

# 3. Add a test invitation:
Email: your-email@example.com
Organization: Test Org
Role: USER

# 4. Send invitation

# 5. Check your email inbox
# You should receive a beautifully formatted invitation email!
```

### 9. Troubleshooting

#### "API key not configured" error
- Make sure `SENDGRID_API_KEY` is in `.env.local`
- Restart your Next.js dev server: `npm run dev`

#### "Sender email not verified" error
- Complete Single Sender Verification (Option A above)
- Or complete Domain Authentication (Option B above)

#### Emails not arriving
- Check spam folder
- Verify DNS records propagated: `dig CNAME s1._domainkey.yourdomain.com`
- Check SendGrid Activity Feed: https://app.sendgrid.com/email_activity

#### "403 Forbidden" error
- API key doesn't have Mail Send permission
- Create new key with Full Access or Mail Send permission

## 🎨 Email Preview

Your invitation emails will look like this:

```
┌─────────────────────────────────────────┐
│           NexusGov AI                   │
│   GDPR-kompatibel AI-portal för         │
│   svenska myndigheter                   │
├─────────────────────────────────────────┤
│                                         │
│  Du har blivit inbjuden!                │
│                                         │
│  Du har blivit inbjuden att gå med i    │
│  Kommun Stockholm på NexusGov AI.       │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Organisation: Kommun Stockholm    │  │
│  │ Roll: Användare                   │  │
│  │ Tokengräns: 100,000 tokens/månad  │  │
│  │ Budget: 500 SEK/månad             │  │
│  └───────────────────────────────────┘  │
│                                         │
│       [Acceptera inbjudan]              │
│                                         │
│  ⚠️ Denna inbjudan går ut om 7 dagar.  │
│                                         │
└─────────────────────────────────────────┘
```

## 📊 SendGrid Free Tier Limits

- ✅ **100 emails/day** forever (no credit card required)
- ✅ **Unlimited contacts**
- ✅ **Email API access**
- ✅ **Email activity history (30 days)**

For production with > 100 invitations/day, consider:
- **Essentials Plan**: $19.95/mo for 50,000 emails
- **Pro Plan**: $89.95/mo for 100,000 emails

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - already in `.gitignore`
2. **Rotate API keys** every 90 days
3. **Use restricted API keys** in production (Mail Send only)
4. **Enable 2FA** on SendGrid account
5. **Monitor Activity Feed** for suspicious sending patterns

## 🚀 Next Steps

Once SendGrid is configured:
- [ ] Set up domain authentication
- [ ] Test invitation emails
- [ ] Configure budget alert emails
- [ ] Set up weekly usage reports
- [ ] Monitor bounce rates in SendGrid dashboard

## 📞 Support

- SendGrid Docs: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- NexusGov AI Issues: https://github.com/yourusername/nexusgov-ai/issues
