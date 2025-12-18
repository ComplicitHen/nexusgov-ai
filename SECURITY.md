# Security Guidelines for NexusGov AI

## API Key Management

### Local Development

1. **Never commit API keys to Git**
   - `.env.local` is automatically gitignored
   - Your OpenRouter key is stored in `.env.local` (safe)
   - Double-check before committing: `git status`

2. **Current Setup**
   ```bash
   # This file is NOT tracked by Git
   .env.local
   ```

### VPS Deployment

When deploying to your VPS, you need to **manually** create the `.env.local` file on the server:

```bash
# SSH into your VPS
ssh root@65.109.239.13

# Navigate to the app directory
cd /root/nexusgov-ai

# Create .env.local file
nano .env.local
```

Then paste your environment variables:
```env
OPENROUTER_API_KEY=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
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://65.109.239.13:3001
# ... other variables
```

Save and restart the app:
```bash
pm2 restart nexusgov-ai
```

## Best Practices

### DO ✅
- Store sensitive keys in `.env.local`
- Use GitHub Secrets for CI/CD workflows
- Rotate API keys periodically
- Use different keys for dev/staging/production
- Monitor API usage for unusual activity
- Implement rate limiting

### DON'T ❌
- Never commit `.env.local` or `.env.production`
- Don't share keys in chat/email (except securely)
- Don't hardcode keys in source code
- Don't expose keys in client-side code
- Don't use production keys in development

## Environment Variables Security

### Client-Side vs Server-Side

**Client-Side** (exposed to browser, prefix with `NEXT_PUBLIC_`):
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=...  # This is OK, Firebase keys are safe for client
```

**Server-Side Only** (never exposed):
```env
OPENROUTER_API_KEY=...  # NO NEXT_PUBLIC_ prefix
DATABASE_URL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

## Checking for Exposed Secrets

Before every commit:
```bash
# Check what files will be committed
git status

# Make sure .env.local is NOT listed
# Should see: "nothing to commit, working tree clean" or only tracked files

# If you accidentally added .env.local:
git reset .env.local
```

## Key Rotation

If you suspect a key has been compromised:

1. **Immediately revoke** the old key at [OpenRouter Dashboard](https://openrouter.ai/)
2. Generate a new key
3. Update `.env.local` (local and VPS)
4. Restart the application

## GDPR Compliance

For production deployments handling EU citizen data:

- Store encryption keys in a secure vault (HashiCorp Vault, AWS Secrets Manager)
- Enable audit logging for all key access
- Document all third-party services and their data processing agreements
- Ensure all API keys have appropriate access controls

## GitHub Secrets

For GitHub Actions deployment:

1. Go to your repo: **Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `SSH_PRIVATE_KEY`: Your VPS SSH key
   - `OPENROUTER_API_KEY`: (Optional, if you want to deploy with it)

**Note:** The VPS deployment script doesn't need the OpenRouter key in GitHub Secrets because we manually create `.env.local` on the VPS.

## Monitoring

Set up monitoring for:
- Unusual API usage spikes
- Failed authentication attempts
- Budget alerts (NexusGov AI has built-in cost monitoring)
- Unauthorized access attempts

## Contact

If you discover a security vulnerability, please contact:
- Security team: [your-security-email]
- Or create a private security advisory on GitHub
