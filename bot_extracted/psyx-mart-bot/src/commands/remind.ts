import { EmbedBuilder } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import {
  createReminder, getUserReminders, deleteReminder, getDueReminders, markReminderSent,
} from '../database.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function infoEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(`ℹ️ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

function parseTime(str: string): number {
  let total = 0;
  const matches = str.matchAll(/(\d+)\s*(mo|w|d|h|m|s)/gi);
  for (const m of matches) {
    const n = parseInt(m[1]);
    switch (m[2].toLowerCase()) {
      case 'mo': total += n * 30 * 24 * 3600000; break;
      case 'w':  total += n * 7 * 24 * 3600000; break;
      case 'd':  total += n * 24 * 3600000; break;
      case 'h':  total += n * 3600000; break;
      case 'm':  total += n * 60000; break;
      case 's':  total += n * 1000; break;
    }
  }
  return total;
}

function formatDuration(ms: number): string {
  const parts: string[] = [];
  const d = Math.floor(ms / 86400000); if (d) parts.push(`${d}d`);
  const h = Math.floor((ms % 86400000) / 3600000); if (h) parts.push(`${h}h`);
  const m = Math.floor((ms % 3600000) / 60000); if (m) parts.push(`${m}m`);
  const s = Math.floor((ms % 60000) / 1000); if (s && !d && !h) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

const remindCommands: BotCommand[] = [
  {
    name: 'remind',
    description: 'Set a personal reminder — the bot will DM you when time is up',
    category: 'Utility',
    aliases: ['reminder', 'remindme', 'setreminder'],
    usage: 'remind <time> <message> | remind list | remind cancel <id>',
    async execute(message, args) {
      const sub = args[0]?.toLowerCase();

      // ── LIST ──────────────────────────────────────────────────────────
      if (sub === 'list' || sub === 'ls' || sub === 'show') {
        const reminders = getUserReminders(message.author.id);
        if (!reminders.length)
          return message.reply({ embeds: [infoEmbed('No Reminders', 'You have no active reminders.\n\nSet one with:\n`!remind <time> <message>`\n**Example:** `!remind 2h Take a break!`')] });

        const desc = reminders.map((r, i) =>
          `\`${String(i + 1).padStart(2, '0')}\` ⏰ **${r.message.slice(0, 60)}${r.message.length > 60 ? '...' : ''}**\n` +
          `> Due: <t:${Math.floor(r.dueAt / 1000)}:R> — <t:${Math.floor(r.dueAt / 1000)}:f>\n` +
          `> 🆔 \`${r.id}\``
        ).join('\n\n');

        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`⏰  Your Reminders — ${reminders.length}`)
          .setDescription(desc)
          .setFooter({ text: 'Use !remind cancel <id> to remove • PSYX MART Bot' })
          .setTimestamp()
        ] });
      }

      // ── CANCEL ────────────────────────────────────────────────────────
      if (sub === 'cancel' || sub === 'delete' || sub === 'remove' || sub === 'del') {
        const id = args[1];
        if (!id) return message.reply({ embeds: [errorEmbed('Missing ID', 'Provide the reminder ID.\n**Usage:** `!remind cancel <id>`\n**See IDs:** `!remind list`')] });
        const reminders = getUserReminders(message.author.id);
        const r = reminders.find(x => x.id === id || x.id.endsWith(id));
        if (!r) return message.reply({ embeds: [errorEmbed('Not Found', `No reminder with ID \`${id}\` found. Use \`!remind list\` to see your reminders.`)] });
        deleteReminder(r.id);
        return message.reply({ embeds: [successEmbed('Reminder Cancelled', `Removed reminder: **${r.message.slice(0, 80)}**`)] });
      }

      // ── SET (default) ─────────────────────────────────────────────────
      // Detect where the time arg ends and the message begins
      // Support: "!remind 2h30m Check email" or "!remind 2h Check email"
      const timeStr = args[0] ?? '';
      const duration = parseTime(timeStr);

      if (!duration || duration < 5000) {
        return message.reply({ embeds: [errorEmbed('Invalid Time',
          'Provide a valid duration, then your reminder message.\n\n' +
          '**Format:** `!remind <time> <message>`\n' +
          '**Examples:**\n' +
          '`!remind 30m Check the oven`\n' +
          '`!remind 2h Team meeting`\n' +
          '`!remind 1d30m Submit report`\n\n' +
          '**Units:** `s` seconds • `m` minutes • `h` hours • `d` days • `w` weeks\n\n' +
          '**Subcommands:**\n' +
          '`!remind list` — see all reminders\n' +
          '`!remind cancel <id>` — remove a reminder'
        )] });
      }

      if (duration > 30 * 24 * 3600000)
        return message.reply({ embeds: [errorEmbed('Too Far Away', 'Reminders can be set for a maximum of **30 days** in the future.')] });

      const reminderMsg = args.slice(1).join(' ').trim();
      if (!reminderMsg)
        return message.reply({ embeds: [errorEmbed('Missing Message', 'What should I remind you about?\n**Example:** `!remind 2h Check the giveaway`')] });

      const userReminders = getUserReminders(message.author.id);
      if (userReminders.length >= 20)
        return message.reply({ embeds: [errorEmbed('Too Many Reminders', 'You already have **20** active reminders (max). Cancel some with `!remind cancel <id>`.')] });

      const dueAt = Date.now() + duration;
      const id = createReminder(message.author.id, message.channel.id, message.guild?.id ?? 'dm', reminderMsg, dueAt);

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⏰  Reminder Set!')
        .setDescription(
          `📝 **${reminderMsg.slice(0, 200)}**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `⏱️  In **${formatDuration(duration)}**\n` +
          `🔔  <t:${Math.floor(dueAt / 1000)}:R> — <t:${Math.floor(dueAt / 1000)}:f>\n\n` +
          `> I'll DM you when it's time!\n` +
          `> 🆔 \`${id}\``
        )
        .setFooter({ text: 'Reminder saved • PSYX MART Bot' })
        .setTimestamp(dueAt)
      ] });
    }
  },

  {
    name: 'reminders',
    description: 'View all your active reminders',
    category: 'Utility',
    aliases: ['myreminders', 'listreminders', 'rlist'],
    usage: 'reminders',
    async execute(message) {
      const reminders = getUserReminders(message.author.id);
      if (!reminders.length)
        return message.reply({ embeds: [infoEmbed('No Reminders', 'You have no active reminders.\n\n**Set one:** `!remind 2h Check the giveaway`')] });

      const desc = reminders.map((r, i) =>
        `\`${String(i + 1).padStart(2, '0')}\` ⏰ **${r.message.slice(0, 60)}${r.message.length > 60 ? '...' : ''}**\n` +
        `> Due: <t:${Math.floor(r.dueAt / 1000)}:R> — <t:${Math.floor(r.dueAt / 1000)}:f>\n` +
        `> 🆔 \`${r.id}\``
      ).join('\n\n');

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`⏰  Active Reminders — ${reminders.length}`)
        .setDescription(desc)
        .setFooter({ text: 'Use !remind cancel <id> to remove • PSYX MART Bot' })
        .setTimestamp()
      ] });
    }
  },
];

export default remindCommands;
