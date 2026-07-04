import { EmbedBuilder } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { hasPermission, Perms, isBotStaff } from '../utils/permissions.js';
import {
  getAutomodUserWhitelist, addAutomodUserWhitelist, removeAutomodUserWhitelist,
  getAutomodRoleWhitelist, addAutomodRoleWhitelist, removeAutomodRoleWhitelist,
  getAutomodWhitelist, addAutomodWhitelist, removeAutomodWhitelist,
} from '../database.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

const whitelistCommands: BotCommand[] = [

  // ── MASTER WHITELIST VIEW ─────────────────────────────────────────────────
  {
    name: 'whitelist',
    description: 'View the server whitelist (trusted users/roles/channels exempt from automod)',
    category: 'Whitelist',
    usage: 'whitelist [users|roles|channels]',
    aliases: ['wl', 'trustlist'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const sub = args[0]?.toLowerCase();
      const guildId = message.guild!.id;

      const users = getAutomodUserWhitelist(guildId);
      const roles = getAutomodRoleWhitelist(guildId);
      const channels = getAutomodWhitelist(guildId);

      if (sub === 'users') {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Whitelisted Users')
          .setDescription(users.length > 0
            ? users.map(id => `• <@${id}> (\`${id}\`)`).join('\n')
            : 'No users whitelisted. Use `!wluser add @user` to add.')
          .addFields({ name: '📊 Total', value: `${users.length} user(s)`, inline: true })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      if (sub === 'roles') {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Whitelisted Roles')
          .setDescription(roles.length > 0
            ? roles.map(id => `• <@&${id}> (\`${id}\`)`).join('\n')
            : 'No roles whitelisted. Use `!wlrole add @role` to add.')
          .addFields({ name: '📊 Total', value: `${roles.length} role(s)`, inline: true })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      if (sub === 'channels') {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Whitelisted Channels')
          .setDescription(channels.length > 0
            ? channels.map(id => `• <#${id}>`).join('\n')
            : 'No channels whitelisted. Use `!wlchannel add #channel` to add.')
          .addFields({ name: '📊 Total', value: `${channels.length} channel(s)`, inline: true })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      // Full overview
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🛡️ Server Whitelist Overview')
        .setDescription(
          'Whitelisted members, roles, and channels are **exempt from automod** features ' +
          '(anti-link, anti-spam, reg-protect, etc.). Perfect for trusted sellers, staff, and special channels.'
        )
        .addFields(
          {
            name: `👥 Whitelisted Users (${users.length})`,
            value: users.length > 0 ? users.slice(0, 5).map(id => `<@${id}>`).join(', ') + (users.length > 5 ? ` +${users.length - 5} more` : '') : '*None*',
            inline: false
          },
          {
            name: `🎭 Whitelisted Roles (${roles.length})`,
            value: roles.length > 0 ? roles.slice(0, 5).map(id => `<@&${id}>`).join(', ') + (roles.length > 5 ? ` +${roles.length - 5} more` : '') : '*None*',
            inline: false
          },
          {
            name: `📢 Whitelisted Channels (${channels.length})`,
            value: channels.length > 0 ? channels.slice(0, 5).map(id => `<#${id}>`).join(', ') + (channels.length > 5 ? ` +${channels.length - 5} more` : '') : '*None*',
            inline: false
          },
          {
            name: '⚙️ Commands',
            value: [
              '`!wluser add/remove/list @user` — Whitelist a user',
              '`!wlrole add/remove/list @role` — Whitelist a role',
              '`!wlchannel add/remove/list #channel` — Whitelist a channel',
              '`!whitelist [users|roles|channels]` — View details',
            ].join('\n'),
            inline: false
          },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── USER WHITELIST ────────────────────────────────────────────────────────
  {
    name: 'wluser',
    description: 'Add/remove/list users in the automod whitelist (trusted members)',
    category: 'Whitelist',
    usage: 'wluser <add|remove|list> [@user]',
    aliases: ['whitelistuser', 'trustuser', 'wlmember'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const sub = args[0]?.toLowerCase();
      const guildId = message.guild!.id;

      if (sub === 'list' || sub === 'show') {
        const users = getAutomodUserWhitelist(guildId);
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Whitelisted Users')
          .setDescription(users.length > 0
            ? users.map(id => `• <@${id}> (\`${id}\`)`).join('\n')
            : 'No users whitelisted yet.\nUse `!wluser add @user` to add trusted members.')
          .addFields({ name: '📊 Total', value: `${users.length} user(s)`, inline: true })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      const target = message.mentions.users.first() ?? message.mentions.members?.first()?.user;
      if (!target)
        return message.reply({ embeds: [errorEmbed('Missing User', 'Mention the user.\n**Usage:** `!wluser add @user` or `!wluser remove @user`')] });

      if (sub === 'add' || sub === 'set') {
        addAutomodUserWhitelist(guildId, target.id);
        await message.reply({ embeds: [successEmbed('User Whitelisted',
          `<@${target.id}> (**${target.tag}**) has been added to the whitelist.\n\n` +
          `They are now **exempt from all automod rules** including anti-link, anti-spam, and registration date protection.`
        )] });
      } else if (sub === 'remove' || sub === 'delete' || sub === 'del') {
        removeAutomodUserWhitelist(guildId, target.id);
        await message.reply({ embeds: [successEmbed('User Removed from Whitelist',
          `<@${target.id}> has been removed from the whitelist. Automod rules now apply to them.`
        )] });
      } else {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ User Whitelist Help')
          .addFields(
            { name: 'Add a User', value: '`!wluser add @user`', inline: false },
            { name: 'Remove a User', value: '`!wluser remove @user`', inline: false },
            { name: 'List All', value: '`!wluser list`', inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── ROLE WHITELIST ────────────────────────────────────────────────────────
  {
    name: 'wlrole',
    description: 'Add/remove/list roles in the automod whitelist',
    category: 'Whitelist',
    usage: 'wlrole <add|remove|list> [@role]',
    aliases: ['whitelistrole', 'trustrole', 'wlr'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const sub = args[0]?.toLowerCase();
      const guildId = message.guild!.id;

      if (sub === 'list' || sub === 'show') {
        const roles = getAutomodRoleWhitelist(guildId);
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Whitelisted Roles')
          .setDescription(roles.length > 0
            ? roles.map(id => `• <@&${id}> (\`${id}\`)`).join('\n')
            : 'No roles whitelisted yet.\nUse `!wlrole add @role` to add trusted roles.')
          .addFields({ name: '📊 Total', value: `${roles.length} role(s)`, inline: true })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      const role = message.mentions.roles.first();
      if (!role)
        return message.reply({ embeds: [errorEmbed('Missing Role', 'Mention the role.\n**Usage:** `!wlrole add @role`')] });

      if (sub === 'add' || sub === 'set') {
        addAutomodRoleWhitelist(guildId, role.id);
        await message.reply({ embeds: [successEmbed('Role Whitelisted',
          `<@&${role.id}> (**${role.name}**) has been whitelisted.\n\n` +
          `All members with this role are now **exempt from automod rules**.`
        )] });
      } else if (sub === 'remove' || sub === 'delete' || sub === 'del') {
        removeAutomodRoleWhitelist(guildId, role.id);
        await message.reply({ embeds: [successEmbed('Role Removed', `<@&${role.id}> has been removed from the whitelist.`)] });
      } else {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Role Whitelist Help')
          .addFields(
            { name: 'Add a Role', value: '`!wlrole add @role`', inline: false },
            { name: 'Remove a Role', value: '`!wlrole remove @role`', inline: false },
            { name: 'List All', value: '`!wlrole list`', inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── CHANNEL WHITELIST ──────────────────────────────────────────────────────
  {
    name: 'wlchannel',
    description: 'Add/remove/list channels in the automod whitelist',
    category: 'Whitelist',
    usage: 'wlchannel <add|remove|list> [#channel]',
    aliases: ['whitelistchannel', 'trustchannel', 'wlch'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const sub = args[0]?.toLowerCase();
      const guildId = message.guild!.id;

      if (sub === 'list' || sub === 'show') {
        const channels = getAutomodWhitelist(guildId);
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Whitelisted Channels')
          .setDescription(channels.length > 0
            ? channels.map(id => `• <#${id}>`).join('\n')
            : 'No channels whitelisted yet.')
          .addFields({ name: '📊 Total', value: `${channels.length} channel(s)`, inline: true })
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      const channel = message.mentions.channels.first() ?? message.channel;

      if (sub === 'add' || sub === 'set') {
        addAutomodWhitelist(guildId, channel.id);
        await message.reply({ embeds: [successEmbed('Channel Whitelisted',
          `<#${channel.id}> is now exempt from automod. Links, invites, etc. are allowed in this channel.`
        )] });
      } else if (sub === 'remove' || sub === 'delete' || sub === 'del') {
        removeAutomodWhitelist(guildId, channel.id);
        await message.reply({ embeds: [successEmbed('Channel Removed', `<#${channel.id}> has been removed from the whitelist.`)] });
      } else {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛡️ Channel Whitelist Help')
          .addFields(
            { name: 'Add a Channel', value: '`!wlchannel add [#channel]`', inline: false },
            { name: 'Remove a Channel', value: '`!wlchannel remove [#channel]`', inline: false },
            { name: 'List All', value: '`!wlchannel list`', inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── CLEAR ALL WHITELIST ────────────────────────────────────────────────────
  {
    name: 'wlclear',
    description: 'Clear the entire whitelist (users, roles, and/or channels)',
    category: 'Whitelist',
    usage: 'wlclear [all|users|roles|channels]',
    aliases: ['clearwl', 'whitelistclear'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.Administrator) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Administrator** permission to clear the whitelist.')] });

      const sub = args[0]?.toLowerCase() ?? 'all';
      const guildId = message.guild!.id;

      const cleared: string[] = [];

      if (sub === 'all' || sub === 'users') {
        const users = getAutomodUserWhitelist(guildId);
        for (const u of users) removeAutomodUserWhitelist(guildId, u);
        cleared.push(`${users.length} users`);
      }
      if (sub === 'all' || sub === 'roles') {
        const roles = getAutomodRoleWhitelist(guildId);
        for (const r of roles) removeAutomodRoleWhitelist(guildId, r);
        cleared.push(`${roles.length} roles`);
      }
      if (sub === 'all' || sub === 'channels') {
        const channels = getAutomodWhitelist(guildId);
        for (const c of channels) removeAutomodWhitelist(guildId, c);
        cleared.push(`${channels.length} channels`);
      }

      await message.reply({ embeds: [successEmbed('Whitelist Cleared', `Cleared: ${cleared.join(', ')} from the whitelist.`)] });
    }
  },
];

export default whitelistCommands;
