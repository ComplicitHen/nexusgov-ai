# NexusGov AI - Deployment Guide

## VPS Information
- **Host:** 65.109.239.13
- **Port:** 3001
- **URL:** http://65.109.239.13:3001

## Auto-Deployment Setup

This project automatically deploys to the Hetzner VPS when changes are pushed to `main` or `master` branch.

### Prerequisites

1. **GitHub Repository Secrets**

   You need to add the SSH private key to your GitHub repository:

   - Go to your GitHub repository
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `SSH_PRIVATE_KEY`
   - Value: Copy the entire contents from `/data/data/com.termux/files/home/ai-portal/github-ssh-key.txt`

2. **VPS Requirements**
   - Node.js (v18 or higher)
   - npm
   - PM2 (process manager)
   - Git

### First-Time VPS Setup

SSH into your VPS and run:

```bash
# Install PM2 if not already installed
npm install -g pm2

# Create directory for the app
mkdir -p /root/nexusgov-ai

# Set up PM2 to start on boot
pm2 startup
pm2 save
```

### Manual Deployment

If you need to deploy manually:

```bash
ssh root@65.109.239.13
cd /root/nexusgov-ai
git pull origin main
npm install
npm run build
pm2 restart nexusgov-ai
```

### Environment Variables

**IMPORTANT**: You need to manually copy `.env.local` to the VPS:

```bash
# From your local machine, copy .env.local to VPS
scp .env.local root@65.109.239.13:/root/nexusgov-ai/.env.local

# Or manually create it on the VPS:
ssh root@65.109.239.13
cd /root/nexusgov-ai
nano .env.local
```

Then add these environment variables to `/root/nexusgov-ai/.env.local`:

```bash
# Database (Firestore/PostgreSQL)
DATABASE_URL=your_database_url

# Firebase (GDPR-compliant EU region: europe-west1)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key

# Vector Database (Qdrant)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Whisper API for Meeting Transcription
WHISPER_API_KEY=

# Application Settings
NEXT_PUBLIC_APP_URL=http://65.109.239.13:3001
NODE_ENV=production
```

### Monitoring

Check deployment status:
```bash
ssh root@65.109.239.13 "pm2 status"
ssh root@65.109.239.13 "pm2 logs nexusgov-ai"
```

### Troubleshooting

**App not starting?**
```bash
ssh root@65.109.239.13
cd /root/nexusgov-ai
pm2 logs nexusgov-ai --lines 50
```

**Port 3001 already in use?**
```bash
pm2 delete nexusgov-ai
pm2 start npm --name "nexusgov-ai" -- start -- -p 3002
```

## GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy.yml`) automatically:
1. Checks out the latest code
2. Connects to VPS via SSH
3. Pulls latest changes
4. Installs dependencies
5. Builds the production app
6. Restarts PM2 service

You can also trigger deployment manually from GitHub Actions tab.
