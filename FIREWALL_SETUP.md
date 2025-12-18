# Firewall Setup for GitHub Actions

## Problem
Your VPS firewall only allows SSH from your personal IP, which blocks GitHub Actions from deploying.

## Solution: Allow GitHub Actions IP Ranges

GitHub Actions uses specific IP ranges that you need to whitelist.

### Option 1: Get Current GitHub IP Ranges (Recommended)

```bash
# SSH into your VPS
ssh root@65.109.239.13

# Get GitHub's current IP ranges
curl https://api.github.com/meta | jq -r '.actions[]' > /tmp/github_ips.txt

# If using UFW firewall:
while read ip; do
  sudo ufw allow from $ip to any port 22 comment 'GitHub Actions'
done < /tmp/github_ips.txt

# If using iptables:
while read ip; do
  sudo iptables -A INPUT -p tcp -s $ip --dport 22 -j ACCEPT -m comment --comment "GitHub Actions"
done < /tmp/github_ips.txt

# Save iptables rules
sudo iptables-save > /etc/iptables/rules.v4

# Verify
sudo ufw status numbered  # for UFW
# or
sudo iptables -L -n  # for iptables
```

### Option 2: Manual IP Ranges (as of 2025)

If the API method doesn't work, add these GitHub Actions IP ranges manually:

```bash
# GitHub Actions IP ranges (update periodically)
# Source: https://api.github.com/meta

# For UFW:
sudo ufw allow from 4.175.114.51/32 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.64.0.0/16 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.65.0.0/16 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.66.0.0/15 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.68.0.0/14 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.72.0.0/13 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.80.0.0/12 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.96.0.0/13 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 13.104.0.0/14 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 20.33.0.0/16 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 20.34.0.0/15 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 20.36.0.0/14 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 20.40.0.0/13 to any port 22 comment 'GitHub Actions'
sudo ufw allow from 20.48.0.0/12 to any port 22 comment 'GitHub Actions'
# ... (there are many more)

# For iptables:
sudo iptables -A INPUT -p tcp -s 13.64.0.0/16 --dport 22 -j ACCEPT -m comment --comment "GitHub Actions"
# ... (repeat for each range)
```

### Option 3: Use GitHub's Webhook IP Ranges (Simpler)

A smaller set of IPs that covers most GitHub services:

```bash
# For UFW:
sudo ufw allow from 140.82.112.0/20 to any port 22 comment 'GitHub'
sudo ufw allow from 143.55.64.0/20 to any port 22 comment 'GitHub'
sudo ufw allow from 185.199.108.0/22 to any port 22 comment 'GitHub'
sudo ufw allow from 192.30.252.0/22 to any port 22 comment 'GitHub'

# For iptables:
sudo iptables -A INPUT -p tcp -s 140.82.112.0/20 --dport 22 -j ACCEPT -m comment --comment "GitHub"
sudo iptables -A INPUT -p tcp -s 143.55.64.0/20 --dport 22 -j ACCEPT -m comment --comment "GitHub"
sudo iptables -A INPUT -p tcp -s 185.199.108.0/22 --dport 22 -j ACCEPT -m comment --comment "GitHub"
sudo iptables -A INPUT -p tcp -s 192.30.252.0/22 --dport 22 -j ACCEPT -m comment --comment "GitHub"
```

### Option 4: Alternative - Use Self-Hosted Runner (Most Secure)

Instead of opening firewall, use a self-hosted GitHub Actions runner:

```bash
# On your VPS
cd /opt
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure (get token from GitHub: Settings → Actions → Runners)
./config.sh --url https://github.com/ComplicitHen/nexusgov-ai --token YOUR_TOKEN

# Run as service
sudo ./svc.sh install
sudo ./svc.sh start
```

Then update `.github/workflows/deploy.yml`:
```yaml
jobs:
  deploy:
    runs-on: self-hosted  # Instead of ubuntu-latest
```

## Automated Script

Create this script on your VPS:

```bash
#!/bin/bash
# /root/update-github-ips.sh

echo "Fetching GitHub Actions IP ranges..."
curl -s https://api.github.com/meta | jq -r '.actions[]' > /tmp/github_ips_new.txt

# Backup current rules
sudo iptables-save > /root/iptables-backup-$(date +%Y%m%d-%H%M%S).txt

# Remove old GitHub Actions rules
sudo iptables -D INPUT -m comment --comment "GitHub Actions" 2>/dev/null

# Add new rules
while read ip; do
  sudo iptables -I INPUT -p tcp -s $ip --dport 22 -j ACCEPT -m comment --comment "GitHub Actions"
done < /tmp/github_ips_new.txt

# Save
sudo iptables-save > /etc/iptables/rules.v4

echo "GitHub Actions IPs updated!"
```

Run monthly via cron:
```bash
# Add to crontab
0 0 1 * * /root/update-github-ips.sh
```

## Verify Deployment Works

After adding IPs, test the deployment:

```bash
# From local machine, push a test commit
git commit --allow-empty -m "Test deployment"
git push origin main

# Watch GitHub Actions
gh run watch

# Check VPS logs
ssh root@65.109.239.13 "pm2 logs nexusgov-ai --lines 50"
```

## Security Notes

- GitHub publishes IP ranges at: https://api.github.com/meta
- These ranges can change - update periodically
- Self-hosted runner is more secure but requires maintenance
- Consider using a separate deploy key for GitHub Actions

## Current Setup

Your firewall currently allows:
- Your IP: [Your IP]
- GitHub Actions IPs: [To be added]
- Port 22 (SSH)
- Port 3001 (NexusGov AI app)
- Port 80/443 (if using reverse proxy)
