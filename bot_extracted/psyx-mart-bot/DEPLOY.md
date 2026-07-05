# PSYX MART Bot — Deployment Guide

## Quick Start (Any Linux VPS / Host)

### Requirements
- Node.js 18+ (22 LTS recommended)
- npm or pnpm
- A Discord bot token

### Steps

1. **Upload the zip** to your server and extract:
   ```bash
   unzip psyx-mart-bot.zip -d psyx-mart-bot
   cd psyx-mart-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set your bot token:**
   ```bash
   # Create .env file
   echo "DISCORD_TOKEN=your_token_here" > .env
   ```
   Or export directly:
   ```bash
   export DISCORD_TOKEN=your_token_here
   ```

4. **Start the bot:**
   ```bash
   npm start
   ```

### Run 24/7 with PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start "npm start" --name "psyx-mart-bot"

# Save so it auto-restarts on reboot
pm2 save
pm2 startup
```

### Run with Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
ENV DISCORD_TOKEN=your_token_here
CMD ["npm", "start"]
```

```bash
docker build -t psyx-mart-bot .
docker run -d --name psyx-mart-bot --env DISCORD_TOKEN=your_token psyx-mart-bot
```

---

## Environment Variables

| Variable         | Required | Description                              |
|------------------|----------|------------------------------------------|
| `DISCORD_TOKEN`  | ✅ Yes   | Your bot's token from Discord Developer Portal |
| `DB_PATH`        | No       | Custom path for bot-data.json (default: ./bot-data.json) |

---

## Hosting Options (Cheap to Free)

| Host             | Cost     | Notes                                    |
|------------------|----------|------------------------------------------|
| **Railway**      | Free/5$/mo | Easy deploy, auto-restart, free tier OK |
| **Render**       | Free     | Free tier spins down after inactivity — use a cron to ping |
| **Fly.io**       | Free     | 3 free machines, great for bots         |
| **Oracle Cloud** | Free     | Always-free ARM VM, best free option    |
| **DigitalOcean** | $4/mo    | Reliable, cheap Droplet                 |
| **Hetzner**      | €3/mo    | Best price/performance in Europe        |
| **VPS.gg**       | $2/mo    | Discord-community friendly host         |

---

## Deployment Tips

### Token Safety
- NEVER hardcode your token in the source code
- Use environment variables or a `.env` file (already supported)
- Regenerate your token on the Discord Developer Portal if it ever leaks
- Add `.env` to `.gitignore` if using Git

### Data Persistence
- All data is stored in `bot-data.json` (flat JSON database)
- Back it up regularly: `cp bot-data.json bot-data-backup.json`
- If using Docker, mount a volume: `-v /host/data:/app/bot-data.json`
- If using Railway/Render, add a persistent disk or use an external DB

### Keeping the Bot Online
- Use **PM2** on a VPS for automatic restart on crash and reboot
- Set up a **health check**: the bot runs an HTTP server on port 3999 (`/health`)
- Use UptimeRobot (free) to ping `http://your-server:3999/health` every 5 min

### Scaling Tips
- For multiple servers (50+), consider switching to a real DB (PostgreSQL/SQLite)
- Enable Discord gateway intents only what you need (already optimized)
- Avoid running in Replit's free tier 24/7 — use a proper VPS

### Discord Bot Settings (Developer Portal)
Make sure these are enabled under **Bot → Privileged Gateway Intents**:
- ✅ **Server Members Intent** (for ban/kick/welcome features)
- ✅ **Message Content Intent** (required for prefix commands)
- ✅ **Presence Intent** (optional, for status features)

---

## Commands Overview

| Category    | Count | Key Commands                          |
|-------------|-------|---------------------------------------|
| Moderation  | 30+   | ban, kick, mute, warn, jail           |
| Giveaway    | 7     | gcreate, gend, greroll, gauto         |
| Utility     | 40+   | remind, afk, bio, stats               |
| Social      | 27+   | stain, profile, etc.                  |
| Tickets     | 8     | ticket setup, close, transcript       |
| Setup       | 15+   | welcome, automod, logs, temprole      |
| Owner       | 10+   | enable/disable commands, bot config   |

---

## Support

Bot owner ID: `812192341179236382`
Use `!help` in any server to see all available commands.
