import axios from 'axios';
import { TextChannel, Client, Message, GuildMember, Collection, Guild, GuildBasedChannel, ChannelType } from 'discord.js';
import { getLogChannel } from '../database.js';
import { EmbedBuilder } from 'discord.js';

// ── PER-CATEGORY GIF DEDUP CACHE (last 6 URLs) ───────────────────────────────
const gifCache = new Map<string, string[]>();

function dedupPush(category: string, url: string) {
  const arr = gifCache.get(category) ?? [];
  arr.push(url);
  if (arr.length > 6) arr.shift();
  gifCache.set(category, arr);
}

function isRecentDup(category: string, url: string): boolean {
  return (gifCache.get(category) ?? []).includes(url);
}

// ── NEKOS.BEST v2 SFW CATEGORY MAP ────────────────────────────────────────────
const NEKOS_BEST_SFW: Record<string, string> = {
  kiss: 'kiss', hug: 'hug', slap: 'slap', pat: 'pat',
  highfive: 'highfive', wave: 'wave', stare: 'stare', cry: 'cry',
  happy: 'happy', sad: 'cry', angry: 'baka', funny: 'laugh',
  laugh: 'laugh', kick: 'kick', wink: 'wink', smile: 'smile',
  blush: 'blush', dance: 'dance', poke: 'poke', bonk: 'bonk',
  bite: 'bite', cuddle: 'cuddle', baka: 'baka', yeet: 'yeet',
  nom: 'nom', pout: 'pout', shrug: 'shrug', shoot: 'shoot',
  sleep: 'sleep', handhold: 'handhold', thumbsup: 'thumbsup', bored: 'bored',
  facepalm: 'facepalm', kill: 'shoot', punch: 'slap', hit: 'slap',
};

const WAIFU_SFW: Record<string, string> = {
  kiss: 'kiss', hug: 'hug', slap: 'slap', pat: 'pat', cry: 'cry',
  happy: 'happy', wave: 'wave', wink: 'wink', dance: 'dance', poke: 'poke',
  bonk: 'bonk', bite: 'bite', cuddle: 'cuddle', yeet: 'yeet', nom: 'nom',
  highfive: 'highfive', handhold: 'handhold', blush: 'blush', smile: 'smile',
  kick: 'kick', sad: 'cry', angry: 'bully', funny: 'smug',
  kill: 'kill', punch: 'slap', hit: 'slap',
};

// ── SFW GIF FETCH WITH DEDUP ─────────────────────────────────────────────────
export async function fetchGif(category: string): Promise<string> {
  const nekosCat = NEKOS_BEST_SFW[category] ?? 'hug';
  const waifuCat = WAIFU_SFW[category] ?? 'hug';

  const sources = [
    () => axios.get(`https://nekos.best/api/v2/${nekosCat}`, { timeout: 5000 })
            .then(r => r.data?.results?.[0]?.url ?? ''),
    () => axios.get(`https://api.waifu.pics/sfw/${waifuCat}`, { timeout: 5000 })
            .then(r => r.data?.url ?? ''),
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const source of sources) {
      try {
        const url = await source();
        if (!url) continue;
        if (isRecentDup(category, url) && attempt < 2) continue;
        dedupPush(category, url);
        return url;
      } catch {}
    }
  }
  return '';
}

// ── JOKE FETCH ────────────────────────────────────────────────────────────────
export async function fetchJoke(): Promise<string> {
  try {
    const res = await axios.get('https://v2.jokeapi.dev/joke/Any?safe-mode&type=twopart', { timeout: 5000 });
    return `**${res.data.setup}**\n||${res.data.delivery}||`;
  } catch {
    return 'Why did the bot fail? Because the API was down! 😅';
  }
}

// ── SEND LOG ─────────────────────────────────────────────────────────────────
export async function sendLog(client: Client, guildId: string, logType: string, embed: EmbedBuilder) {
  const channelId = getLogChannel(guildId, logType);
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId) as TextChannel;
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
  } catch {}
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
export function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function parseTime(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const map: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (map[unit] ?? 0);
}

export function randomPercent(): number {
  const a = Math.floor(Math.random() * 0xFFFFFF);
  const b = Math.floor(Math.random() * 0xFFFFFF);
  return (a ^ b) % 101;
}

export function mentionOrTag(userId: string): string {
  return `<@${userId}>`;
}

// ── RESOLVE GUILD MEMBER (mention OR user ID) ─────────────────────────────────
// Resolves strictly from the `arg` token (args[0]) — either a mention token
// like `<@123456>` or a plain 17-20 digit snowflake.
// Does NOT use message.mentions.members.first(), which can match mentions that
// appear anywhere in the message (e.g. in reason text) and target the wrong user.
export async function resolveGuildMember(message: Message, arg: string): Promise<GuildMember | null> {
  if (!arg) return null;
  // Strip mention formatting to get the raw user ID
  const id = arg.replace(/[<@!>]/g, '');
  if (!/^\d{17,20}$/.test(id)) return null;
  // Check cache first, then fetch from API
  return (message.guild!.members.cache.get(id) ?? null)
    ?? message.guild!.members.fetch(id).catch(() => null);
}

// ── RESOLVE MULTIPLE MEMBERS (mentions + raw IDs from args) ──────────────────
// Parses each arg token directly (safe — ignores mentions from reason text).
// Pass skipFirstArg=true when args[0] is something else (like a duration).
export async function resolveMassTargets(
  message: Message,
  args: string[],
  skipFirstArg = false
): Promise<Collection<string, GuildMember>> {
  const result = new Collection<string, GuildMember>();
  const start = skipFirstArg ? 1 : 0;
  for (let i = start; i < args.length; i++) {
    const id = args[i].replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(id)) continue; // skip non-ID tokens (reason words, etc.)
    if (result.has(id)) continue;
    try {
      const member = await message.guild!.members.fetch(id);
      result.set(id, member);
    } catch {}
  }
  return result;
}

// ── RESOLVE CHANNEL (mention OR channel ID) ───────────────────────────────────
export function resolveChannel(guild: Guild, arg: string): GuildBasedChannel | null {
  if (!arg) return null;
  const id = arg.replace(/[<#>]/g, '');
  if (/^\d{17,20}$/.test(id)) return guild.channels.cache.get(id) ?? null;
  return null;
}

// ── RESOLVE TEXT CHANNEL (mention OR ID, text-based only) ────────────────────
export function resolveTextChannel(guild: Guild, arg: string): TextChannel | null {
  const ch = resolveChannel(guild, arg);
  if (!ch) return null;
  if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) return null;
  return ch as TextChannel;
}
