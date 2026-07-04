import { EmbedBuilder } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { getWelcomeSettings, setWelcomeSettings, getLeaveSettings, setLeaveSettings, WelcomeSetting } from '../database.js';
import { hasPermission, Perms } from '../utils/permissions.js';
import { resolveTextChannel } from '../utils/helpers.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

// Build the welcome/leave embed from saved settings
export function buildWelcomeEmbed(settings: WelcomeSetting, userId: string, guildName: string, memberCount: number, avatarUrl: string): EmbedBuilder {
  const msg = settings.message
    .replace(/{user}/g, `<@${userId}>`)
    .replace(/{username}/g, `<@${userId}>`)
    .replace(/{server}/g, guildName)
    .replace(/{membercount}/g, String(memberCount));

  const embed = new EmbedBuilder()
    .setColor(settings.embed_color ?? COLORS.success)
    .setTitle(settings.embed_title ?? null)
    .setDescription(msg)
    .setTimestamp();

  if (settings.embed_thumbnail !== false) embed.setThumbnail(avatarUrl); // default: on
  if (settings.embed_image) embed.setImage(settings.embed_image);
  if (settings.embed_footer) embed.setFooter({ text: settings.embed_footer });

  return embed;
}

const welcomeCommands: BotCommand[] = [

  // ── SET WELCOME ───────────────────────────────────────────────────────────
  {
    name: 'setwelcome',
    description: 'Set the welcome message and channel',
    category: 'Welcome',
    usage: 'setwelcome [#channel|channelID] [message] — Variables: {user} {server} {membercount}',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const channel = message.mentions.channels.first()
        ?? resolveTextChannel(message.guild!, args[0])
        ?? message.channel;
      const argsStart = (message.mentions.channels.first() || resolveTextChannel(message.guild!, args[0])) ? 1 : 0;
      const msg = args.slice(argsStart).join(' ') || 'Welcome to **{server}**, {user}! You are member #{membercount} 🎉';

      const existing = getWelcomeSettings(message.guild!.id);
      setWelcomeSettings(message.guild!.id, {
        channel_id: (channel as any).id,
        message: msg,
        enabled: true,
        embed_color: existing?.embed_color,
        embed_title: existing?.embed_title,
        embed_thumbnail: existing?.embed_thumbnail,
        embed_image: existing?.embed_image,
        embed_footer: existing?.embed_footer,
      });

      const preview = msg
        .replace(/{user}/g, `@${message.author.username}`)
        .replace(/{username}/g, `@${message.author.username}`)
        .replace(/{server}/g, message.guild!.name)
        .replace(/{membercount}/g, String(message.guild!.memberCount));

      await message.reply({ embeds: [successEmbed('Welcome Setup',
        `Welcome messages → <#${(channel as any).id}>\n\n**Preview:**\n${preview}\n\n` +
        `Customise the embed:\n• \`!welcometitle <text>\` — embed title\n• \`!welcomecolor <#hex>\` — embed color\n• \`!welcomeimage <url|off>\` — bottom image\n• \`!welcomethumbnail <on|off>\` — avatar thumbnail\n• \`!welcomefooter <text|off>\` — footer text`
      )] });
    }
  },

  // ── WELCOME TITLE ─────────────────────────────────────────────────────────
  {
    name: 'welcometitle',
    description: 'Set the title for the welcome embed',
    category: 'Welcome',
    usage: 'welcometitle <text|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getWelcomeSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up welcome first with `!setwelcome`.')] });
      const text = args.join(' ').trim();
      const newTitle = text.toLowerCase() === 'off' ? undefined : text || undefined;
      setWelcomeSettings(message.guild!.id, { ...existing, embed_title: newTitle });
      await message.reply({ embeds: [successEmbed('Welcome Title', newTitle ? `Title set to: **${newTitle}**` : 'Title removed.')] });
    }
  },

  // ── WELCOME COLOR ─────────────────────────────────────────────────────────
  {
    name: 'welcomecolor',
    description: 'Set the color for the welcome embed',
    category: 'Welcome',
    usage: 'welcomecolor <#RRGGBB|decimal>',
    aliases: ['welcomecolour'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getWelcomeSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up welcome first with `!setwelcome`.')] });
      const raw = args[0];
      if (!raw) return message.reply({ embeds: [errorEmbed('Missing Color', 'Provide a hex color like `#FF5500` or decimal like `16733952`.')] });
      const color = raw.startsWith('#') ? parseInt(raw.slice(1), 16) : parseInt(raw);
      if (isNaN(color) || color < 0 || color > 0xFFFFFF)
        return message.reply({ embeds: [errorEmbed('Invalid Color', 'Use a hex color like `#00B4D8` or a decimal number.')] });
      setWelcomeSettings(message.guild!.id, { ...existing, embed_color: color });
      await message.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle('✅ Welcome Color Set').setDescription(`Embed color updated to \`#${color.toString(16).padStart(6, '0').toUpperCase()}\`.`).setTimestamp()] });
    }
  },

  // ── WELCOME IMAGE ─────────────────────────────────────────────────────────
  {
    name: 'welcomeimage',
    description: 'Set a large image at the bottom of the welcome embed',
    category: 'Welcome',
    usage: 'welcomeimage <url|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getWelcomeSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up welcome first with `!setwelcome`.')] });
      const url = args[0]?.toLowerCase() === 'off' ? undefined : args[0];
      setWelcomeSettings(message.guild!.id, { ...existing, embed_image: url });
      await message.reply({ embeds: [successEmbed('Welcome Image', url ? `Image set to: ${url}` : 'Image removed.')] });
    }
  },

  // ── WELCOME THUMBNAIL ─────────────────────────────────────────────────────
  {
    name: 'welcomethumbnail',
    description: 'Toggle user avatar thumbnail in welcome embed',
    category: 'Welcome',
    usage: 'welcomethumbnail <on|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getWelcomeSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up welcome first with `!setwelcome`.')] });
      const toggle = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(toggle ?? ''))
        return message.reply({ embeds: [errorEmbed('Usage', '`!welcomethumbnail on` or `!welcomethumbnail off`')] });
      setWelcomeSettings(message.guild!.id, { ...existing, embed_thumbnail: toggle === 'on' });
      await message.reply({ embeds: [successEmbed('Welcome Thumbnail', toggle === 'on' ? 'User avatar will be shown as thumbnail.' : 'Thumbnail disabled.')] });
    }
  },

  // ── WELCOME FOOTER ────────────────────────────────────────────────────────
  {
    name: 'welcomefooter',
    description: 'Set the footer text for the welcome embed',
    category: 'Welcome',
    usage: 'welcomefooter <text|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getWelcomeSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up welcome first with `!setwelcome`.')] });
      const text = args.join(' ').trim();
      const footer = text.toLowerCase() === 'off' ? undefined : text || undefined;
      setWelcomeSettings(message.guild!.id, { ...existing, embed_footer: footer });
      await message.reply({ embeds: [successEmbed('Welcome Footer', footer ? `Footer set to: **${footer}**` : 'Footer removed.')] });
    }
  },

  // ── WELCOME VIEW ──────────────────────────────────────────────────────────
  {
    name: 'welcomeview',
    description: 'View current welcome settings',
    category: 'Welcome',
    usage: 'welcomeview',
    aliases: ['welcomeconfig'],
    async execute(message) {
      const s = getWelcomeSettings(message.guild!.id);
      if (!s) return message.reply({ embeds: [errorEmbed('Not Set', 'No welcome message configured yet. Use `!setwelcome` to set one.')] });
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(s.embed_color ?? COLORS.info)
        .setTitle('👋 Welcome Settings')
        .addFields(
          { name: '📢 Channel', value: `<#${s.channel_id}>`, inline: true },
          { name: '✅ Enabled', value: s.enabled ? 'Yes' : 'No', inline: true },
          { name: '🎨 Color', value: s.embed_color ? `#${s.embed_color.toString(16).padStart(6, '0').toUpperCase()}` : 'Default (green)', inline: true },
          { name: '📌 Title', value: s.embed_title ?? 'None', inline: true },
          { name: '🖼️ Thumbnail', value: s.embed_thumbnail === false ? 'Off' : 'On (avatar)', inline: true },
          { name: '🖼️ Image', value: s.embed_image ?? 'None', inline: true },
          { name: '📝 Footer', value: s.embed_footer ?? 'None', inline: true },
          { name: '💬 Message', value: `\`\`\`${s.message.slice(0, 400)}\`\`\``, inline: false },
        )
        .setFooter(BOT_FOOTER).setTimestamp()
      ] });
    }
  },

  // ── DISABLE WELCOME ───────────────────────────────────────────────────────
  {
    name: 'disablewelcome',
    description: 'Disable welcome messages',
    category: 'Welcome',
    usage: 'disablewelcome',
    async execute(message) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getWelcomeSettings(message.guild!.id);
      if (existing) setWelcomeSettings(message.guild!.id, { ...existing, enabled: false });
      await message.reply({ embeds: [successEmbed('Welcome Disabled', 'Welcome messages have been disabled.')] });
    }
  },

  // ── SET LEAVE ─────────────────────────────────────────────────────────────
  {
    name: 'setleave',
    description: 'Set the leave message and channel',
    category: 'Welcome',
    usage: 'setleave [#channel|channelID] [message]  Variables: {user} {server} {membercount}',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const channel = message.mentions.channels.first()
        ?? resolveTextChannel(message.guild!, args[0])
        ?? message.channel;
      const argsStart = (message.mentions.channels.first() || resolveTextChannel(message.guild!, args[0])) ? 1 : 0;
      const msg = args.slice(argsStart).join(' ') || '{user} has left **{server}**. Goodbye! 👋';

      const existing = getLeaveSettings(message.guild!.id);
      setLeaveSettings(message.guild!.id, {
        channel_id: (channel as any).id,
        message: msg,
        enabled: true,
        embed_color: existing?.embed_color,
        embed_title: existing?.embed_title,
        embed_thumbnail: existing?.embed_thumbnail,
        embed_image: existing?.embed_image,
        embed_footer: existing?.embed_footer,
      });

      await message.reply({ embeds: [successEmbed('Leave Setup',
        `Leave messages → <#${(channel as any).id}>\n\n**Message:** ${msg}\n\n` +
        `Customise with: \`!leavetitle\`, \`!leavecolor\`, \`!leaveimage\`, \`!leavethumbnail\`, \`!leavefooter\``
      )] });
    }
  },

  // ── LEAVE TITLE ───────────────────────────────────────────────────────────
  {
    name: 'leavetitle',
    description: 'Set the title for the leave embed',
    category: 'Welcome',
    usage: 'leavetitle <text|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getLeaveSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up leave first with `!setleave`.')] });
      const text = args.join(' ').trim();
      const newTitle = text.toLowerCase() === 'off' ? undefined : text || undefined;
      setLeaveSettings(message.guild!.id, { ...existing, embed_title: newTitle });
      await message.reply({ embeds: [successEmbed('Leave Title', newTitle ? `Title set to: **${newTitle}**` : 'Title removed.')] });
    }
  },

  // ── LEAVE COLOR ───────────────────────────────────────────────────────────
  {
    name: 'leavecolor',
    description: 'Set the color for the leave embed',
    category: 'Welcome',
    usage: 'leavecolor <#RRGGBB|decimal>',
    aliases: ['leavecolour'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getLeaveSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up leave first with `!setleave`.')] });
      const raw = args[0];
      if (!raw) return message.reply({ embeds: [errorEmbed('Missing Color', 'Provide a hex color like `#FF5500`.')] });
      const color = raw.startsWith('#') ? parseInt(raw.slice(1), 16) : parseInt(raw);
      if (isNaN(color) || color < 0 || color > 0xFFFFFF)
        return message.reply({ embeds: [errorEmbed('Invalid Color', 'Use a hex color like `#FF0000`.')] });
      setLeaveSettings(message.guild!.id, { ...existing, embed_color: color });
      await message.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle('✅ Leave Color Set').setDescription(`Embed color updated to \`#${color.toString(16).padStart(6, '0').toUpperCase()}\`.`).setTimestamp()] });
    }
  },

  // ── LEAVE IMAGE ───────────────────────────────────────────────────────────
  {
    name: 'leaveimage',
    description: 'Set a large image at the bottom of the leave embed',
    category: 'Welcome',
    usage: 'leaveimage <url|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getLeaveSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up leave first with `!setleave`.')] });
      const url = args[0]?.toLowerCase() === 'off' ? undefined : args[0];
      setLeaveSettings(message.guild!.id, { ...existing, embed_image: url });
      await message.reply({ embeds: [successEmbed('Leave Image', url ? `Image set to: ${url}` : 'Image removed.')] });
    }
  },

  // ── LEAVE THUMBNAIL ───────────────────────────────────────────────────────
  {
    name: 'leavethumbnail',
    description: 'Toggle user avatar thumbnail in leave embed',
    category: 'Welcome',
    usage: 'leavethumbnail <on|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getLeaveSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up leave first with `!setleave`.')] });
      const toggle = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(toggle ?? ''))
        return message.reply({ embeds: [errorEmbed('Usage', '`!leavethumbnail on` or `!leavethumbnail off`')] });
      setLeaveSettings(message.guild!.id, { ...existing, embed_thumbnail: toggle === 'on' });
      await message.reply({ embeds: [successEmbed('Leave Thumbnail', toggle === 'on' ? 'Avatar will be shown as thumbnail.' : 'Thumbnail disabled.')] });
    }
  },

  // ── LEAVE FOOTER ──────────────────────────────────────────────────────────
  {
    name: 'leavefooter',
    description: 'Set the footer text for the leave embed',
    category: 'Welcome',
    usage: 'leavefooter <text|off>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getLeaveSettings(message.guild!.id);
      if (!existing) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up leave first with `!setleave`.')] });
      const text = args.join(' ').trim();
      const footer = text.toLowerCase() === 'off' ? undefined : text || undefined;
      setLeaveSettings(message.guild!.id, { ...existing, embed_footer: footer });
      await message.reply({ embeds: [successEmbed('Leave Footer', footer ? `Footer set to: **${footer}**` : 'Footer removed.')] });
    }
  },

  // ── LEAVE VIEW ────────────────────────────────────────────────────────────
  {
    name: 'leaveview',
    description: 'View current leave settings',
    category: 'Welcome',
    usage: 'leaveview',
    aliases: ['leaveconfig'],
    async execute(message) {
      const s = getLeaveSettings(message.guild!.id);
      if (!s) return message.reply({ embeds: [errorEmbed('Not Set', 'No leave message configured yet. Use `!setleave` to set one.')] });
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(s.embed_color ?? COLORS.error)
        .setTitle('👋 Leave Settings')
        .addFields(
          { name: '📢 Channel', value: `<#${s.channel_id}>`, inline: true },
          { name: '✅ Enabled', value: s.enabled ? 'Yes' : 'No', inline: true },
          { name: '🎨 Color', value: s.embed_color ? `#${s.embed_color.toString(16).padStart(6, '0').toUpperCase()}` : 'Default (red)', inline: true },
          { name: '📌 Title', value: s.embed_title ?? 'None', inline: true },
          { name: '🖼️ Thumbnail', value: s.embed_thumbnail === false ? 'Off' : 'On (avatar)', inline: true },
          { name: '🖼️ Image', value: s.embed_image ?? 'None', inline: true },
          { name: '📝 Footer', value: s.embed_footer ?? 'None', inline: true },
          { name: '💬 Message', value: `\`\`\`${s.message.slice(0, 400)}\`\`\``, inline: false },
        )
        .setFooter(BOT_FOOTER).setTimestamp()
      ] });
    }
  },

  // ── DISABLE LEAVE ─────────────────────────────────────────────────────────
  {
    name: 'disableleave',
    description: 'Disable leave messages',
    category: 'Welcome',
    usage: 'disableleave',
    async execute(message) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const existing = getLeaveSettings(message.guild!.id);
      if (existing) setLeaveSettings(message.guild!.id, { ...existing, enabled: false });
      await message.reply({ embeds: [successEmbed('Leave Disabled', 'Leave messages have been disabled.')] });
    }
  },

  // ── TEST WELCOME ──────────────────────────────────────────────────────────
  {
    name: 'testwelcome',
    description: 'Preview the welcome message',
    category: 'Welcome',
    usage: 'testwelcome',
    async execute(message) {
      const settings = getWelcomeSettings(message.guild!.id);
      if (!settings) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up welcome with `!setwelcome` first.')] });
      const embed = buildWelcomeEmbed(settings, message.author.id, message.guild!.name, message.guild!.memberCount, message.author.displayAvatarURL({ size: 256 }));
      if (!embed.data.title) embed.setTitle('👋 Welcome! (Test)');
      await message.reply({ embeds: [embed] });
    }
  },

  // ── TEST LEAVE ────────────────────────────────────────────────────────────
  {
    name: 'testleave',
    description: 'Preview the leave message',
    category: 'Welcome',
    usage: 'testleave',
    async execute(message) {
      const settings = getLeaveSettings(message.guild!.id);
      if (!settings) return message.reply({ embeds: [errorEmbed('Not Set', 'Set up leave with `!setleave` first.')] });
      const embed = buildWelcomeEmbed(settings, message.author.id, message.guild!.name, message.guild!.memberCount, message.author.displayAvatarURL({ size: 256 }));
      if (!embed.data.title) embed.setTitle('👋 Leave (Test)');
      await message.reply({ embeds: [embed] });
    }
  },
];

export default welcomeCommands;
