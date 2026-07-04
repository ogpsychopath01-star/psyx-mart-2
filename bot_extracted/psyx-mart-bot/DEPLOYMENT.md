# PSYX MART Bot — Deployment Guide

## Requirements
- Node.js 18+ (or 20+ recommended)
- A Discord bot token ([create one here](https://discord.com/developers/applications))

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set your bot token
Create a `.env` file:
```env
DISCORD_TOKEN=your_bot_token_here
```
Or set the environment variable directly:
```bash
export DISCORD_TOKEN=your_bot_token_here
```

### 3. Run the bot
```bash
npm start
```
Or for development (auto-restart on changes):
```bash
npm run dev
```

---

## What's New in This Version

### ✅ New Social Category (40+ commands)
- **`!stain <url>`** — Paste any YouTube / Instagram / TikTok / Twitter / Reddit link and the bot generates a rich embed with title, thumbnail, and metadata. Aliases: `!play`, `!media`, `!link`, `!preview`
- **`!youtube <url>`** — YouTube-specific embed with channel info and thumbnail
- **`!meme`** — Random meme from Reddit
- **`!joke`** — Random joke (clean)
- **`!fact`** — Random interesting fact
- **`!dog`** / **`!cat`** — Random pet pictures
- **`!advice`** — Random life advice
- **`!quote`** — Inspirational quote
- **`!weather <city>`** — Current weather for any city
- **`!define <word>`** — Dictionary definition
- **`!urban <term>`** — Urban Dictionary lookup
- **`!trivia`** — Random trivia question with hidden spoiler answer
- **`!reddit [subreddit]`** — Random top post from any subreddit
- **`!8ball <question>`** — Magic 8-ball
- **`!ship @user1 @user2`** — Compatibility score
- **`!rate <thing>`** — Rate anything out of 10
- **`!choose <opt1 | opt2 | opt3>`** — Choose between options
- **`!spin <opt1 | opt2 | ...>`** — Spin the wheel
- **`!pp [@user]`** — Fun PP size meter
- **`!iq [@user]`** — Fun IQ score
- **`!roulette`** — Russian roulette (fun)
- **`!roast @user`** — Random roast
- **`!compliment @user`** — Random compliment
- **`!slap @user`** / **`!hug @user`** / **`!pat @user`** — Action GIFs
- **`!hack @user`** — Animated fake hack sequence
- **`!rps <rock|paper|scissors>`** — Rock Paper Scissors vs bot
- **`!wouldyourather`** — Would You Rather question (voteable)
- **`!truthordare [truth|dare]`** — Truth or Dare
- **`!nhie`** — Never Have I Ever (voteable)
- **`!reverse <text>`** — Reverse text
- **`!mock <text>`** — SpongeBob mock text
- **`!clap <text>`** — Add 👏 between words
- **`!vaporwave <text>`** — ａｅｓｔｈｅｔｉｃ text
- **`!bigtext <text>`** — Regional indicator big letters
- **`!emojify <text>`** — Convert text to emojis
- **`!spoiler <text>`** — Spoiler tag every character
- **`!strike <text>`** — Strikethrough text
- **`!qrgen <text/url>`** — Generate a QR code
- **`!colorinfo #hexcode`** — Hex color info with preview
- **`!base64 encode/decode <text>`** — Base64 encode/decode
- **`!asciiart <text>`** — Simple ASCII block art
- **`!socialstats`** — Fun random stats card

### ✅ Disable / Enable Commands (Bot Owner)
- **`!disable command <name>`** — Disable a command in this server
- **`!disable category <name>`** — Disable a whole category in this server
- **`!disable global command <name>`** — Disable a command across ALL servers
- **`!disable global category <name>`** — Disable a category globally
- **`!enable command <name>`** — Re-enable a command
- **`!enable category <name>`** — Re-enable a category
- **`!listdisabled`** — See all disabled commands and categories

### ✅ Bug Fixes
- **Help panel** — Removed "QR/Pay" and "Vouches" from the main embed quick links. Added Social category with proper emoji and description.
- **`!temprole`** — Fixed argument parsing to robustly find the days number regardless of argument order.
- **`!botowner`** — Cleaned up embed: no longer shows raw user ID alongside the mention.
- **`!owner`** — Removed the "🪪 User ID" field that showed the raw ID awkwardly.

---

## Bot Prefix
Default: `!`

## Owner ID
`812192341179236382`

## Data Storage
All bot data is stored in `bot-data.json` in the bot root directory. This file is created automatically on first run.

## Notes
- The bot needs the following Discord intents: Guilds, GuildMessages, GuildMembers, GuildVoiceStates, MessageContent, GuildPresences, DirectMessages
- All slash commands are message-based (prefix commands), not Discord slash commands
- To invite the bot, go to Discord Developer Portal → OAuth2 → URL Generator → Select `bot` scope and the permissions you need
