import { EmbedBuilder, Message } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

const OPTION_EMOJIS = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮','🇯'];
const BAR_FULL  = '█';
const BAR_EMPTY = '░';

function parseTime(str: string): number {
  let t = 0;
  for (const [, n, u] of str.matchAll(/(\d+)\s*(d|h|m|s)/gi)) {
    const v = parseInt(n);
    if (u.toLowerCase() === 'd') t += v * 86400000;
    else if (u.toLowerCase() === 'h') t += v * 3600000;
    else if (u.toLowerCase() === 'm') t += v * 60000;
    else if (u.toLowerCase() === 's') t += v * 1000;
  }
  return t;
}

function buildBar(count: number, total: number, len = 12): string {
  const filled = total ? Math.round((count / total) * len) : 0;
  return BAR_FULL.repeat(filled) + BAR_EMPTY.repeat(len - filled);
}

async function endPoll(pollMsg: Message, question: string, options: string[], hostId: string) {
  try {
    const fresh = await pollMsg.fetch();
    const results: { option: string; count: number; emoji: string }[] = [];
    let total = 0;

    for (let i = 0; i < options.length; i++) {
      const reaction = fresh.reactions.cache.get(OPTION_EMOJIS[i]);
      const count = Math.max(0, (reaction?.count ?? 1) - 1); // subtract bot's own reaction
      results.push({ option: options[i], count, emoji: OPTION_EMOJIS[i] });
      total += count;
    }

    results.sort((a, b) => b.count - a.count);
    const winner = results[0];
    const tied   = results.filter(r => r.count === winner.count && winner.count > 0);

    const desc = results.map(r =>
      `${r.emoji}  **${r.option}**\n` +
      `\`${buildBar(r.count, total)}\`  **${r.count}** vote${r.count !== 1 ? 's' : ''} ` +
      `*(${total ? Math.round((r.count / total) * 100) : 0}%)*` +
      (r.count === winner.count && winner.count > 0 && tied.length === 1 ? '  🏆' : '')
    ).join('\n\n');

    const winnerLine = winner.count === 0
      ? '📊 *No votes were cast.*'
      : tied.length > 1
        ? `🤝 **It's a tie!** — ${tied.map(r => `${r.emoji} ${r.option}`).join(' & ')}`
        : `🏆 **Winner: ${winner.emoji} ${winner.option}** with **${winner.count}** vote${winner.count !== 1 ? 's' : ''}!`;

    const resultEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊  Poll Results — ${question}`.slice(0, 256))
      .setDescription(
        `${desc}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${winnerLine}\n` +
        `📋 Total votes: **${total}**  •  Hosted by <@${hostId}>`
      )
      .setFooter({ text: 'Poll ended • PSYX MART Bot' })
      .setTimestamp();

    await pollMsg.edit({ embeds: [resultEmbed] });
    await pollMsg.reactions.removeAll().catch(() => {});
  } catch { /* message deleted */ }
}

const pollCommands: BotCommand[] = [
  {
    name: 'poll',
    description: 'Create an interactive poll with up to 10 options, a timer, and automatic result announcement',
    category: 'Utility',
    aliases: ['createpoll', 'vote', 'voting', 'makepoll'],
    usage: 'poll <duration> "<question>" | "<opt1>" | "<opt2>" [| "<opt3>" ...]',
    async execute(message, args) {
      if (!message.member?.permissions.has('ManageMessages') && !message.member?.permissions.has('ManageGuild')) {
        const raw = args.join(' ');
        // Allow anyone for simple yes/no polls
        if (!raw.includes('|')) {
          return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Messages** permission to create polls with custom options.')] });
        }
      }

      const raw = args.join(' ');

      if (!raw.trim()) {
        return message.reply({ embeds: [errorEmbed('Usage',
          '**Format:** `!poll <duration> "<question>" | "<opt1>" | "<opt2>" ...`\n\n' +
          '**Examples:**\n' +
          '`!poll 10m "Favourite colour?" | "Red" | "Blue" | "Green"`\n' +
          '`!poll 1h "Best game?" | "Minecraft" | "Fortnite" | "Valorant" | "CS2"`\n' +
          '`!poll 30m "Quick yes/no?" | "Yes" | "No"`\n\n' +
          '**Duration formats:** `30s` `5m` `2h` `1d`\n' +
          '**Options:** 2–10 options\n' +
          '**Subcommands:** `!poll end <messageId>` to end early'
        )] });
      }

      // ── EARLY END ─────────────────────────────────────────────────────
      if (args[0]?.toLowerCase() === 'end' || args[0]?.toLowerCase() === 'close') {
        const msgId = args[1];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Provide the poll message ID.\nRight-click the poll → **Copy Message ID**')] });

        try {
          const pollMsg = await message.channel.messages.fetch(msgId);
          const embed   = pollMsg.embeds[0];
          if (!embed || !embed.title?.includes('Poll')) {
            return message.reply({ embeds: [errorEmbed('Not a Poll', 'That message does not appear to be a poll created by this bot.')] });
          }
          // Extract data from the embed footer / description
          const question = embed.title?.replace(/^📊\s+/, '').replace(/\s+—.*$/, '') ?? 'Poll';
          const lines    = embed.description?.split('\n') ?? [];
          const options: string[] = [];
          const emojiRe = /^(🇦|🇧|🇨|🇩|🇪|🇫|🇬|🇭|🇮|🇯)\s+\*\*(.+?)\*\*/;
          for (const line of lines) {
            const m = line.match(emojiRe);
            if (m) options.push(m[2]);
          }
          await endPoll(pollMsg, question, options, message.author.id);
          await message.reply({ embeds: [successEmbed('Poll Ended', 'The poll has been ended early and results have been displayed.')] });
        } catch {
          return message.reply({ embeds: [errorEmbed('Not Found', 'Could not find that poll message. It may have been deleted.')] });
        }
        return;
      }

      // ── PARSE ARGS ────────────────────────────────────────────────────
      // Format: !poll <duration> "Question" | "Opt1" | "Opt2" ...
      // The duration is the first word, everything after is split by |
      const durationStr = args[0] ?? '';
      const duration    = parseTime(durationStr);

      if (!duration || duration < 10000) {
        return message.reply({ embeds: [errorEmbed('Invalid Duration',
          'Provide a valid duration as the first argument.\n' +
          '**Examples:** `30s` `5m` `2h30m` `1d`\n\n' +
          '**Full example:** `!poll 10m "Best colour?" | "Red" | "Blue" | "Green"`'
        )] });
      }

      if (duration > 7 * 24 * 3600000) {
        return message.reply({ embeds: [errorEmbed('Too Long', 'Polls can run for a maximum of **7 days**.')] });
      }

      // Everything after duration
      const body    = args.slice(1).join(' ');
      const parts   = body.split('|').map(s => s.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);

      if (parts.length < 2) {
        return message.reply({ embeds: [errorEmbed('Too Few Parts',
          'You need a **question** and at least **2 options** separated by `|`.\n\n' +
          '**Example:** `!poll 10m "Best fruit?" | "Apple" | "Banana" | "Mango"`'
        )] });
      }

      const question = parts[0];
      const options  = parts.slice(1, 11); // max 10 options

      if (options.length < 2) {
        return message.reply({ embeds: [errorEmbed('Too Few Options', 'A poll needs at least **2 options**.')] });
      }

      if (question.length > 200) {
        return message.reply({ embeds: [errorEmbed('Question Too Long', 'The poll question must be under **200 characters**.')] });
      }

      const endTime = Date.now() + duration;

      // ── BUILD POLL EMBED ──────────────────────────────────────────────
      const optionLines = options.map((opt, i) =>
        `${OPTION_EMOJIS[i]}  **${opt.slice(0, 100)}**`
      ).join('\n');

      const pollEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊  ${question}`.slice(0, 256))
        .setDescription(
          `${optionLines}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰  Ends <t:${Math.floor(endTime / 1000)}:R> — <t:${Math.floor(endTime / 1000)}:f>\n` +
          `👤  By <@${message.author.id}>  •  React to vote!`
        )
        .setFooter({ text: `${options.length} options • Use !poll end <id> to close early • PSYX MART Bot` })
        .setTimestamp(endTime);

      const pollMsg = await (message.channel as any).send({ embeds: [pollEmbed] });

      // Add reaction options
      for (let i = 0; i < options.length; i++) {
        await pollMsg.react(OPTION_EMOJIS[i]).catch(() => {});
      }

      await message.reply({ embeds: [successEmbed('Poll Created! 📊',
        `**${question}**\n\n` +
        `📋 ${options.length} options  •  ⏰ Ends <t:${Math.floor(endTime / 1000)}:R>\n` +
        `🔗 [Jump to Poll](${pollMsg.url})\n\n` +
        `> Use \`!poll end ${pollMsg.id}\` to close early`
      )] });

      // Auto-end timer
      setTimeout(() => endPoll(pollMsg, question, options, message.author.id), duration);
    }
  },

  {
    name: 'quickpoll',
    description: 'Instantly create a thumbs up / thumbs down poll',
    category: 'Utility',
    aliases: ['yesno', 'ynpoll', 'thumbspoll'],
    usage: 'quickpoll <question>',
    async execute(message, args) {
      const question = args.join(' ');
      if (!question) return message.reply({ embeds: [errorEmbed('Missing Question', 'What should the poll ask?\n**Example:** `!quickpoll Should we do a giveaway today?`')] });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊  ${question.slice(0, 250)}`)
        .setDescription(
          `👍  **Yes / Agree**\n` +
          `👎  **No / Disagree**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤  By <@${message.author.id}>  •  React to vote!`
        )
        .setFooter({ text: 'Quick Poll • PSYX MART Bot' })
        .setTimestamp();

      const pollMsg = await (message.channel as any).send({ embeds: [embed] });
      await pollMsg.react('👍');
      await pollMsg.react('👎');
      await message.delete().catch(() => {});
    }
  },
];

export default pollCommands;
