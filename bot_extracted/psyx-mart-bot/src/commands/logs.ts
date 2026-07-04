import { EmbedBuilder, TextChannel, ChannelType, PermissionFlagsBits } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { hasPermission, Perms } from '../utils/permissions.js';
import { getLogChannel, setLogChannel, deleteLogChannel } from '../database.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

// ── 14 LOG TYPES ─────────────────────────────────────────────────────────────
export const LOG_TYPES: Record<string, { emoji: string; label: string; desc: string; channelName: string }> = {
  joinleave:   { emoji: '📥', label: 'Join / Leave',        desc: 'Member join and leave events',                  channelName: '📥・join-leave-log'   },
  antinuke:    { emoji: '🛡️', label: 'Anti-Nuke / Raid',   desc: 'Anti-nuke and raid protection logs',             channelName: '🛡️・antinuke-log'     },
  automod:     { emoji: '🤖', label: 'Automod',             desc: 'Automod punishments and actions',               channelName: '🤖・automod-log'       },
  automodlog:  { emoji: '🤖', label: 'Automod Log (alt)',   desc: 'Detailed automod punishment log',               channelName: '🤖・automod-log'       },
  vclog:       { emoji: '🎙️', label: 'Voice Channel',      desc: 'Voice join/leave/move/mute events',             channelName: '🎙️・vc-log'           },
  rolelog:     { emoji: '🎭', label: 'Role Log',            desc: 'Role create/delete/update events',              channelName: '🎭・role-log'          },
  memberslog:  { emoji: '👤', label: 'Members Log',         desc: 'Member update events (roles, nickname)',        channelName: '👤・members-log'       },
  messagelog:  { emoji: '💬', label: 'Message Log',         desc: 'Message delete and edit events',               channelName: '💬・message-log'       },
  commandlog:  { emoji: '⌨️', label: 'Command Log',        desc: 'Bot command usage log',                         channelName: '⌨️・command-log'      },
  boostlog:    { emoji: '🚀', label: 'Boost Log',           desc: 'Server boost and unboost events',              channelName: '🚀・boost-log'         },
  ticketlog:   { emoji: '🎫', label: 'Ticket Log',          desc: 'Ticket open/close/claim events',               channelName: '🎫・ticket-log'        },
  selllog:     { emoji: '🛍️', label: 'Sell Log',           desc: 'Product delivery and deal logs',               channelName: '🛍️・sell-log'         },
  vouchlog:    { emoji: '📦', label: 'Vouch Log',           desc: 'Vouch submission events',                      channelName: '📦・vouch-log'          },
  auditlog:    { emoji: '📋', label: 'Audit Log',           desc: 'General audit events (ban, kick, etc.)',       channelName: '📋・audit-log'          },
};

const logsCommands: BotCommand[] = [

  // ── SET LOG ───────────────────────────────────────────────────────────────
  {
    name: 'setlog',
    description: 'Set a log channel for a specific log type',
    category: 'Logs',
    usage: 'setlog <type> [#channel]',
    aliases: ['logset', 'logchannel', 'setlogchannel'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const type = args[0]?.toLowerCase();

      if (!type) {
        const typeList = Object.entries(LOG_TYPES)
          .map(([k, v]) => {
            const ch = getLogChannel(message.guild!.id, k);
            return `${v.emoji} \`${k}\` — ${v.label}: ${ch ? `<#${ch}>` : '❌ Not set'}`;
          })
          .join('\n');

        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('📋 Log System — All Types')
          .setDescription(typeList)
          .addFields({ name: '💡 Usage', value: '`!setlog <type> [#channel]`\n`!logssetup` — Auto-create all log channels', inline: false })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      // Handle "off" / "disable"
      if (!LOG_TYPES[type]) {
        const closest = Object.keys(LOG_TYPES).find(k => k.includes(type) || type.includes(k));
        return message.reply({ embeds: [errorEmbed('Invalid Log Type',
          `\`${type}\` is not a valid log type${closest ? `. Did you mean \`${closest}\`?` : '.'}\n\n**Valid types:**\n${Object.keys(LOG_TYPES).map(k => `\`${k}\``).join(', ')}`
        )] });
      }

      const channel = message.mentions.channels.first() ?? message.channel;
      setLogChannel(message.guild!.id, type, channel.id);

      await message.reply({ embeds: [successEmbed('Log Channel Set',
        `${LOG_TYPES[type].emoji} **${LOG_TYPES[type].label}** logs will now be sent to <#${channel.id}>.\n\n*${LOG_TYPES[type].desc}*`
      )] });
    }
  },

  // ── DISABLE LOG ───────────────────────────────────────────────────────────
  {
    name: 'disablelog',
    description: 'Disable a specific log type',
    category: 'Logs',
    usage: 'disablelog <type>',
    aliases: ['removelog', 'logoff', 'logdisable'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const type = args[0]?.toLowerCase();
      if (!type || !LOG_TYPES[type])
        return message.reply({ embeds: [errorEmbed('Invalid Log Type', `Valid types:\n${Object.keys(LOG_TYPES).map(k => `\`${k}\``).join(', ')}`)] });

      if (!getLogChannel(message.guild!.id, type))
        return message.reply({ embeds: [errorEmbed('Not Set', `**${LOG_TYPES[type].label}** logs are not currently enabled.`)] });

      deleteLogChannel(message.guild!.id, type);
      await message.reply({ embeds: [successEmbed('Log Disabled', `${LOG_TYPES[type].emoji} **${LOG_TYPES[type].label}** logs have been disabled.`)] });
    }
  },

  // ── VIEW LOGS ─────────────────────────────────────────────────────────────
  {
    name: 'viewlogs',
    description: 'View all configured log channels for this server',
    category: 'Logs',
    usage: 'viewlogs',
    aliases: ['loglist', 'logs', 'logstatus'],
    async execute(message) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const guildId = message.guild!.id;
      let enabled = 0;

      const fields = Object.entries(LOG_TYPES).map(([key, { emoji, label, desc }]) => {
        const channelId = getLogChannel(guildId, key);
        if (channelId) enabled++;
        return {
          name: `${emoji} ${label}`,
          value: channelId ? `<#${channelId}>` : '❌ Not set',
          inline: true,
        };
      });

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`📋 Log Status — ${message.guild!.name}`)
        .setDescription(`**${enabled}/${Object.keys(LOG_TYPES).length}** log types configured.\n\nUse \`!logssetup\` to auto-create all log channels!`)
        .addFields(fields)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── LOGS SETUP (AUTO-CREATE ALL) ──────────────────────────────────────────
  {
    name: 'logssetup',
    description: 'Automatically create all log channels and configure them',
    category: 'Logs',
    usage: 'logssetup',
    aliases: ['setuplogging', 'logsetup', 'setuplog', 'setuplogs'],
    async execute(message) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const guild = message.guild!;

      // Check bot perms
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels))
        return message.reply({ embeds: [errorEmbed('Missing Permissions', 'I need **Manage Channels** permission to create log channels.')] });

      const statusMsg = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('⏳ Setting Up Logs...')
        .setDescription(`Creating **${Object.keys(LOG_TYPES).length}** log channels. This may take a moment...`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });

      const botPermissionOverwrites = [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel] as bigint[],
        },
        {
          id: botMember.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] as bigint[],
        },
      ];

      // Add view permission for roles with ManageGuild
      const staffRoles = guild.roles.cache
        .filter(r => r.permissions.has(PermissionFlagsBits.ManageGuild) && !r.managed && r.id !== guild.id)
        .map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] as bigint[] }));

      // Create category for logs
      let logCategory;
      try {
        logCategory = await guild.channels.create({
          name: '📋 Server Logs',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [...botPermissionOverwrites, ...staffRoles],
        });
      } catch {
        logCategory = null;
      }

      const results: string[] = [];
      const UNIQUE_LOG_TYPES = Object.entries(LOG_TYPES).filter(([key]) => key !== 'automodlog'); // skip duplicate

      for (const [type, { emoji, label, channelName }] of UNIQUE_LOG_TYPES) {
        try {
          // Check if already set
          const existing = getLogChannel(guild.id, type);
          if (existing) {
            const ch = guild.channels.cache.get(existing);
            if (ch) { results.push(`${emoji} **${label}**: already set → <#${existing}>`); continue; }
          }

          const ch = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: logCategory?.id,
            permissionOverwrites: [...botPermissionOverwrites, ...staffRoles],
            topic: `${label} Log — PSYX MART Bot`,
          }) as TextChannel;

          setLogChannel(guild.id, type, ch.id);
          if (type === 'automod') setLogChannel(guild.id, 'automodlog', ch.id);

          // Welcome message in log channel
          await ch.send({ embeds: [new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`${emoji} ${label} Log Channel`)
            .setDescription(`This channel is configured to receive **${label}** logs from PSYX MART Bot.\n\n*${LOG_TYPES[type].desc}*`)
            .setFooter(BOT_FOOTER)
            .setTimestamp()
          ] });

          results.push(`${emoji} **${label}**: ✅ Created → <#${ch.id}>`);
        } catch (err) {
          results.push(`${emoji} **${label}**: ❌ Failed — ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      await statusMsg.edit({ embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Log Setup Complete!')
        .setDescription(results.join('\n'))
        .addFields(
          { name: '📁 Category', value: logCategory ? `<#${logCategory.id}>` : 'Failed to create (channels created at root)', inline: false },
          { name: '📝 Note', value: 'Staff with **Manage Server** can see all log channels. Others cannot view them.', inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },
];

export default logsCommands;
