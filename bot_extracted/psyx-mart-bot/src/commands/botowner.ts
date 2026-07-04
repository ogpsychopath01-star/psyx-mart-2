import { EmbedBuilder, ActivityType, TextChannel } from 'discord.js';
import { BotCommand, BotClient } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import {
  grantNoPfxAccess, revokeNoPfxAccess, getNoPfxAccessInfo,
  setBotRole, removeBotRole, getBotRoleUsers, getBotRole, db,
  resetVoiceStats, resetAllVoiceStats, resetMessageStats, resetAllMessageStats,
  setBotConfig, getBotConfig,
  setGuildBanner, getGuildBanner, setGuildPfp, getGuildPfp,
  disableGuildCommand, enableGuildCommand, disableGuildCategory, enableGuildCategory,
  disableGlobalCommand, enableGlobalCommand, disableGlobalCategory, enableGlobalCategory,
  getDisabledInfo,
} from '../database.js';
import { isBotOwner, isBotStaff, BOT_OWNER_ID, hasPermission, Perms } from '../utils/permissions.js';
import { isMaintenanceMode, setMaintenanceMode } from '../utils/state.js';
import axios from 'axios';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function ownerOnly(message: any): boolean {
  if (!isBotOwner(message.author.id)) {
    message.reply({ embeds: [errorEmbed('Owner Only', 'Only the bot owner can use this command.')] });
    return false;
  }
  return true;
}
function staffOnly(message: any): boolean {
  if (!isBotStaff(message.author.id)) {
    message.reply({ embeds: [errorEmbed('Staff Only', 'Only the bot owner, developers, or helpers can use this command.')] });
    return false;
  }
  return true;
}

const botownerCommands: BotCommand[] = [

  // ── NO-PREFIX ACCESS ──────────────────────────────────────────────────────
  {
    name: 'givenopfx',
    description: '[Staff] Grant no-prefix access to a user',
    category: 'Bot Owner',
    aliases: ['givenprefix', 'givenoprefix'],
    usage: 'givenopfx <@user> [days] (0 = permanent)',
    async execute(message, args) {
      if (!staffOnly(message)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a user.')] });
      const days = parseInt(args[1] ?? '0');
      grantNoPfxAccess(target.id, message.author.id, isNaN(days) ? 0 : days);
      await message.reply({ embeds: [successEmbed('No-Prefix Granted', `${target.tag} can now use commands without prefix.${days > 0 ? ` (${days} days)` : ' (permanent)'}`)] });
    }
  },

  {
    name: 'revokenpfx',
    description: '[Staff] Revoke no-prefix access from a user',
    category: 'Bot Owner',
    aliases: ['revokenoprefix', 'removenpfx'],
    usage: 'revokenpfx <@user>',
    async execute(message, args) {
      if (!staffOnly(message)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a user.')] });
      revokeNoPfxAccess(target.id);
      await message.reply({ embeds: [successEmbed('No-Prefix Revoked', `${target.tag} can no longer use commands without prefix.`)] });
    }
  },

  {
    name: 'listnopfx',
    description: '[Staff] List users with no-prefix access',
    category: 'Bot Owner',
    usage: 'listnopfx',
    async execute(message) {
      if (!staffOnly(message)) return;
      const entries = Object.entries((db.data as any).nopfx_access ?? {});
      if (!entries.length) return message.reply({ embeds: [errorEmbed('Empty', 'No users have no-prefix access.')] });
      const list = entries.map(([id, v]: any) => {
        const exp = v.expires_at > 0 ? `<t:${Math.floor(v.expires_at / 1000)}:R>` : 'Permanent';
        return `<@${id}> — ${exp}`;
      }).join('\n');
      await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('📋 No-Prefix Users').setDescription(list).setFooter(BOT_FOOTER).setTimestamp()] });
    }
  },

  // ── BOT ROLES ─────────────────────────────────────────────────────────────
  {
    name: 'givehelper',
    description: '[Owner] Give helper role to a user',
    category: 'Bot Owner',
    usage: 'givehelper <@user>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a user.')] });
      setBotRole(target.id, 'helper', message.author.id);
      await message.reply({ embeds: [successEmbed('Helper Assigned', `${target.tag} is now a bot **Helper**. They can grant/revoke no-prefix access.`)] });
    }
  },

  {
    name: 'removehelper',
    description: '[Owner] Remove helper role from a user',
    category: 'Bot Owner',
    usage: 'removehelper <@user>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a user.')] });
      removeBotRole(target.id);
      await message.reply({ embeds: [successEmbed('Helper Removed', `${target.tag} is no longer a bot Helper.`)] });
    }
  },

  {
    name: 'givedeveloper',
    description: '[Owner] Give developer role to a user',
    category: 'Bot Owner',
    usage: 'givedeveloper <@user>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a user.')] });
      setBotRole(target.id, 'developer', message.author.id);
      await message.reply({ embeds: [successEmbed('Developer Assigned', `${target.tag} is now a bot **Developer**. They can grant/revoke no-prefix access.`)] });
    }
  },

  {
    name: 'removedeveloper',
    description: '[Owner] Remove developer role from a user',
    category: 'Bot Owner',
    usage: 'removedeveloper <@user>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a user.')] });
      removeBotRole(target.id);
      await message.reply({ embeds: [successEmbed('Developer Removed', `${target.tag} is no longer a bot Developer.`)] });
    }
  },

  // ── HELPER / DEVELOPER LIST ───────────────────────────────────────────────
  {
    name: 'helper',
    description: 'View all bot helpers',
    category: 'Utility',
    usage: 'helper',
    async execute(message) {
      const helpers = getBotRoleUsers('helper');
      if (!helpers.length) return message.reply({ embeds: [errorEmbed('No Helpers', 'No bot helpers are assigned.')] });
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x00CED1).setTitle('🛠️ Bot Helpers')
        .setDescription(helpers.map(h => `<@${h.user_id}> (\`${h.user_id}\`)`).join('\n')).setFooter(BOT_FOOTER).setTimestamp()] });
    }
  },

  {
    name: 'developer',
    description: 'View all bot developers',
    category: 'Utility',
    usage: 'developer',
    async execute(message) {
      const devs = getBotRoleUsers('developer');
      if (!devs.length) return message.reply({ embeds: [errorEmbed('No Developers', 'No bot developers are assigned.')] });
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x7289DA).setTitle('💻 Bot Developers')
        .setDescription(devs.map(d => `<@${d.user_id}> (\`${d.user_id}\`)`).join('\n')).setFooter(BOT_FOOTER).setTimestamp()] });
    }
  },

  // ── BOT AVATAR ────────────────────────────────────────────────────────────
  {
    name: 'setbotpfp',
    description: '[Owner] Change bot global avatar — attach an image OR provide a URL',
    category: 'Bot Owner',
    usage: 'setbotpfp [image URL] (or attach an image)',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const url = message.attachments.first()?.url ?? args[0];
      if (!url) return message.reply({ embeds: [errorEmbed('Missing Image', 'Attach an image **or** provide a URL.\nExample: `!setbotpfp https://example.com/pfp.png`')] });
      try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        await message.client.user!.setAvatar(Buffer.from(res.data));
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🖼️ Bot Avatar Updated')
          .setDescription('Bot global avatar has been updated!')
          .setThumbnail(url)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Failed', 'Could not update avatar. Make sure it is a valid PNG/JPG image under 8MB.')] });
      }
    }
  },

  // ── SERVER BANNER ─────────────────────────────────────────────────────────
  {
    name: 'setserverbanner',
    description: '[Owner/Staff] Change this server\'s banner (attach image)',
    category: 'Bot Owner',
    aliases: ['guildbanner', 'serverbanner'],
    usage: 'setserverbanner (attach image) — Requires server boost level 2+',
    async execute(message) {
      if (!isBotStaff(message.author.id)) {
        return message.reply({ embeds: [errorEmbed('Staff Only', 'Only bot staff can change the server banner.')] });
      }
      const attachment = message.attachments.first();
      if (!attachment) return message.reply({ embeds: [errorEmbed('No Attachment', 'Please attach an image (PNG/JPG).')] });
      const guild = message.guild!;
      if (!guild.features.includes('BANNER' as any))
        return message.reply({ embeds: [errorEmbed('Not Available', 'This server does not have the **Banner** feature.\nRequires boost level 2+ or server partnership/verification.')] });
      try {
        const res = await axios.get(attachment.url, { responseType: 'arraybuffer', timeout: 10000 });
        await guild.setBanner(Buffer.from(res.data));
        await message.reply({ embeds: [successEmbed('Server Banner Changed', `The banner for **${guild.name}** has been updated!`)] });
      } catch (e: any) {
        await message.reply({ embeds: [errorEmbed('Failed', `Could not update banner: ${e?.message ?? 'Unknown error'}`)] });
      }
    }
  },

  // ── STAT RESET ────────────────────────────────────────────────────────────
  {
    name: 'resetvc',
    description: 'Reset voice stats for a member (requires Manage Guild)',
    category: 'Moderation',
    usage: 'resetvc <@user>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Guild** permission to reset stats.')] });
      const target = message.mentions.members?.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a member.')] });
      resetVoiceStats(message.guild!.id, target.id);
      await message.reply({ embeds: [successEmbed('VC Stats Reset', `Voice stats for **${target.user.tag}** reset to zero.`)] });
    }
  },

  {
    name: 'resetmsg',
    description: 'Reset message stats for a member (requires Manage Guild)',
    category: 'Moderation',
    usage: 'resetmsg <@user>',
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Guild** permission to reset stats.')] });
      const target = message.mentions.members?.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention a member.')] });
      resetMessageStats(message.guild!.id, target.id);
      await message.reply({ embeds: [successEmbed('Msg Stats Reset', `Message stats for **${target.user.tag}** reset to zero.`)] });
    }
  },

  {
    name: 'resetallvc',
    description: 'Reset ALL voice stats in the server (requires Administrator)',
    category: 'Moderation',
    usage: 'resetallvc',
    async execute(message) {
      if (!hasPermission(message.member!, Perms.Administrator) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Administrator** permission to reset all stats.')] });
      resetAllVoiceStats(message.guild!.id);
      await message.reply({ embeds: [successEmbed('All VC Stats Reset', 'Voice stats for **all members** have been reset.')] });
    }
  },

  {
    name: 'resetallmsg',
    description: 'Reset ALL message stats in the server (requires Administrator)',
    category: 'Moderation',
    usage: 'resetallmsg',
    async execute(message) {
      if (!hasPermission(message.member!, Perms.Administrator) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Administrator** permission to reset all stats.')] });
      resetAllMessageStats(message.guild!.id);
      await message.reply({ embeds: [successEmbed('All Msg Stats Reset', 'Message stats for **all members** have been reset.')] });
    }
  },

  // ── ANNOUNCE ─────────────────────────────────────────────────────────────
  {
    name: 'announce',
    description: 'Send an announcement. Admins: current server. Owner: all servers.',
    category: 'Moderation',
    usage: 'announce <message>',
    async execute(message, args) {
      const isAdmin = hasPermission(message.member!, Perms.ManageGuild);
      const isOwner = isBotOwner(message.author.id);
      if (!isAdmin && !isOwner)
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Guild** permission (or be the bot owner) to announce.')] });
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Message', 'Provide announcement text.')] });

      const text = args.join(' ');

      if (isOwner) {
        let sent = 0;
        for (const [, guild] of message.client.guilds.cache) {
          try {
            const channel = guild.systemChannel ??
              guild.channels.cache.find(c =>
                (c as any).isTextBased?.() &&
                (c as any).permissionsFor?.(guild.members.me!)?.has('SendMessages')
              );
            if (channel && (channel as any).isTextBased()) {
              await (channel as any).send({ embeds: [new EmbedBuilder()
                .setColor(COLORS.primary).setTitle('📢 Announcement').setDescription(text).setFooter(BOT_FOOTER).setTimestamp()] });
              sent++;
            }
          } catch {}
        }
        await message.reply({ embeds: [successEmbed('Announced', `Announcement sent to **${sent}** servers.`)] });
      } else {
        const guild = message.guild!;
        const channel = guild.systemChannel ??
          guild.channels.cache.find(c =>
            (c as any).isTextBased?.() &&
            (c as any).permissionsFor?.(guild.members.me!)?.has('SendMessages')
          );
        if (!channel || !(channel as any).isTextBased())
          return message.reply({ embeds: [errorEmbed('No Channel', 'Could not find a suitable channel to announce in.')] });
        await (channel as any).send({ embeds: [new EmbedBuilder()
          .setColor(COLORS.primary).setTitle('📢 Announcement').setDescription(text).setFooter(BOT_FOOTER).setTimestamp()] });
        await message.reply({ embeds: [successEmbed('Announced', `Announcement sent to <#${channel.id}>.`)] });
      }
    }
  },

  // ── BOT STATUS ────────────────────────────────────────────────────────────
  {
    name: 'setstatus',
    description: '[Owner] Set the bot\'s global presence/activity',
    category: 'Bot Owner',
    aliases: ['setpresence'],
    usage: 'setstatus <playing|watching|listening|competing|streaming> <text>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const type = args[0]?.toLowerCase();
      const text = args.slice(1).join(' ');
      if (!type || !text)
        return message.reply({ embeds: [errorEmbed('Usage', '`!setstatus <playing|watching|listening|competing|streaming> <text>`')] });

      const typeMap: Record<string, ActivityType> = {
        playing:    ActivityType.Playing,
        watching:   ActivityType.Watching,
        listening:  ActivityType.Listening,
        competing:  ActivityType.Competing,
        streaming:  ActivityType.Streaming,
      };
      if (!typeMap[type])
        return message.reply({ embeds: [errorEmbed('Invalid Type', 'Choose: `playing`, `watching`, `listening`, `competing`, or `streaming`.')] });

      message.client.user!.setActivity(text, { type: typeMap[type] });
      setBotConfig('status_type', type);
      setBotConfig('status_text', text);
      await message.reply({ embeds: [successEmbed('Status Updated', `Bot status set to **${type.charAt(0).toUpperCase() + type.slice(1)} ${text}** ✦`)] });
    }
  },

  {
    name: 'resetstatus',
    description: '[Owner] Reset the bot\'s status to default rotation',
    category: 'Bot Owner',
    aliases: ['clearstatus'],
    usage: 'resetstatus',
    async execute(message) {
      if (!ownerOnly(message)) return;
      message.client.user!.setActivity(undefined as any);
      setBotConfig('status_type', '');
      setBotConfig('status_text', '');
      await message.reply({ embeds: [successEmbed('Status Cleared', 'Bot status has been reset to the default rotation.')] });
    }
  },

  // ── BOT BIO ───────────────────────────────────────────────────────────────
  {
    name: 'setbotbio',
    description: '[Owner] Set the bot\'s global bio/description',
    category: 'Bot Owner',
    aliases: ['botbioset'],
    usage: 'setbotbio <bio text>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const bio = args.join(' ');
      if (!bio) return message.reply({ embeds: [errorEmbed('Missing Bio', 'Provide a bio text.')] });
      if (bio.length > 500) return message.reply({ embeds: [errorEmbed('Too Long', 'Bio must be 500 characters or less.')] });
      setBotConfig('bot_bio', bio);
      await message.reply({ embeds: [successEmbed('Bot Bio Updated', `Bot bio has been set to:\n> ${bio}`)] });
    }
  },

  {
    name: 'clearbotbio',
    description: '[Owner] Clear the bot\'s global bio',
    category: 'Bot Owner',
    aliases: ['removebotbio'],
    usage: 'clearbotbio',
    async execute(message) {
      if (!ownerOnly(message)) return;
      setBotConfig('bot_bio', '');
      await message.reply({ embeds: [successEmbed('Bot Bio Cleared', 'The bot bio has been removed.')] });
    }
  },

  {
    name: 'viewbotbio',
    description: 'View the bot\'s global bio and server-specific customizations',
    category: 'Bot Owner',
    aliases: ['botbio'],
    usage: 'viewbotbio',
    async execute(message) {
      const bio = getBotConfig('bot_bio');
      const status = getBotConfig('status_text');
      const statusType = getBotConfig('status_type');
      const guildId = message.guild!.id;
      const guildBanner = getGuildBanner(guildId);
      const guildPfp = getGuildPfp(guildId);

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('🌟 Bot Configuration')
        .setThumbnail(guildPfp || message.client.user!.displayAvatarURL())
        .addFields(
          { name: '💬 Bio', value: bio || '*No bio set. Use `!setbotbio <text>` to set one.*', inline: false },
          { name: '🎮 Status', value: status ? `**${statusType}** ${status}` : '*Default rotation*', inline: false },
          { name: '🤖 Tag', value: `${message.client.user!.tag}`, inline: true },
          { name: '🌐 Servers', value: `${message.client.guilds.cache.size}`, inline: true },
          { name: '🖼️ Server PFP', value: guildPfp ? `[View](${guildPfp}) ✅` : '*Not set*', inline: true },
          { name: '🎨 Server Banner', value: guildBanner ? `[View](${guildBanner}) ✅` : '*Not set*', inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      if (guildBanner) embed.setImage(guildBanner);

      await message.reply({ embeds: [embed] });
    }
  },

  // ── OWNER PROFILE CARD ────────────────────────────────────────────────────
  {
    name: 'owner',
    description: 'View the bot owner\'s profile card',
    category: 'Utility',
    usage: 'owner',
    async execute(message) {
      const guild = message.guild!;
      let ownerMember: any = null;
      try {
        ownerMember = await guild.members.fetch(BOT_OWNER_ID).catch(() => null);
      } catch {}

      const avatarUrl = ownerMember?.user.displayAvatarURL({ size: 512 }) ?? message.client.user!.displayAvatarURL({ size: 512 });
      const tag = ownerMember?.user.tag ?? 'ogpsyx';
      const joinedDiscord = ownerMember ? `<t:${Math.floor(ownerMember.user.createdTimestamp / 1000)}:D>` : 'Unknown';
      const joinedServer = ownerMember ? `<t:${Math.floor((ownerMember.joinedTimestamp ?? 0) / 1000)}:D>` : 'Not in this server';

      const embed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle(`👑  ${tag}`)
        .setDescription(`> The creator and owner of **PSYX MART Bot**.\n> <@${BOT_OWNER_ID}> is responsible for all features, updates, and support.`)
        .setThumbnail(avatarUrl)
        .addFields(
          { name: '📅 On Discord Since', value: joinedDiscord, inline: true },
          { name: '🏠 Server Join', value: joinedServer, inline: true },
          { name: '🌐 Servers', value: `${message.client.guilds.cache.size} servers`, inline: true },
          { name: '🤖 Bot', value: `[PSYX MART Bot](https://discord.com/users/${message.client.user!.id})`, inline: true },
          { name: '📊 Commands', value: `${(message.client as BotClient).commands.size} commands`, inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    }
  },

  // ── SET BOT BANNER (GLOBAL) ───────────────────────────────────────────────
  {
    name: 'setbanner',
    description: '[Owner] Set the bot\'s global banner — attach an image OR provide a URL',
    category: 'Bot Owner',
    usage: 'setbanner [image URL] (or attach an image)',
    aliases: ['botbanner', 'setbotbanner'],
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const url = message.attachments.first()?.url ?? args[0];
      if (!url) return message.reply({ embeds: [errorEmbed('Missing Image', 'Attach an image to the message **or** provide a URL.\nExample: `!setbanner https://example.com/banner.png`')] });
      try {
        const imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        const mime = imgRes.headers['content-type'] ?? 'image/png';
        const base64 = `data:${mime};base64,${Buffer.from(imgRes.data).toString('base64')}`;
        await axios.patch(
          'https://discord.com/api/v10/users/@me',
          { banner: base64 },
          { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🖼️ Bot Banner Updated (Global)')
          .setDescription('The bot\'s global banner has been updated.')
          .setImage(url)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      } catch (e: any) {
        await message.reply({ embeds: [errorEmbed('Failed', `Could not update banner.\n\`${e?.response?.data?.message ?? e?.message ?? 'Unknown error'}\``)] });
      }
    }
  },

  // ── SET / VIEW / CLEAR SERVER-SPECIFIC BANNER ────────────────────────────
  {
    name: 'setprebanner',
    description: '[Owner] Set, view or clear a server-specific banner shown in bot embeds',
    category: 'Bot Owner',
    usage: 'setprebanner [image URL | attach image | view | clear]',
    aliases: ['presetbanner', 'guildsetbanner', 'prebanner'],
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const sub = args[0]?.toLowerCase();

      if (sub === 'view' || sub === 'show' || sub === 'check') {
        const stored = getGuildBanner(message.guild!.id);
        if (!stored) return message.reply({ embeds: [errorEmbed('No Banner Set', `No server banner has been set for **${message.guild!.name}** yet.`)] });
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`🖼️ Server Banner — ${message.guild!.name}`)
          .setDescription('Current server-specific bot banner:')
          .setImage(stored)
          .setFooter({ text: `Use !setprebanner clear to remove • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      }

      if (sub === 'clear' || sub === 'remove' || sub === 'reset' || sub === 'off') {
        setGuildBanner(message.guild!.id, '');
        return message.reply({ embeds: [successEmbed('Banner Cleared', `The server-specific banner for **${message.guild!.name}** has been removed.`)] });
      }

      const attachment = message.attachments.first();
      let imageUrl = attachment?.url ?? args[0];
      if (!imageUrl) return message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🖼️ Server Banner Help')
        .addFields(
          { name: 'Set via attachment', value: 'Attach an image to the message and run `!setprebanner`', inline: false },
          { name: 'Set via URL', value: '`!setprebanner https://example.com/banner.png`', inline: false },
          { name: 'View current', value: '`!setprebanner view`', inline: false },
          { name: 'Clear banner', value: '`!setprebanner clear`', inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });

      if (attachment) {
        try {
          const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          const buf = Buffer.from(res.data);
          const mime = String(res.headers['content-type'] ?? 'image/png');
          const ext = mime.includes('gif') ? 'gif' : mime.includes('webp') ? 'webp' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
          const storageMsg = await (message.channel as TextChannel).send({ files: [{ attachment: buf, name: `guild_banner.${ext}` }] });
          const permanentUrl = storageMsg.attachments.first()?.url;
          if (permanentUrl) {
            imageUrl = permanentUrl.split('?')[0];
            await storageMsg.delete().catch(() => {});
          }
        } catch {}
      }

      setGuildBanner(message.guild!.id, imageUrl);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🖼️ Server Banner Set')
        .setDescription(`Custom banner saved for **${message.guild!.name}**.`)
        .setImage(imageUrl)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── SET / VIEW / CLEAR SERVER-SPECIFIC PFP ───────────────────────────────
  {
    name: 'setprepfp',
    description: '[Owner] Set, view or clear a server-specific bot profile picture shown in embeds',
    category: 'Bot Owner',
    usage: 'setprepfp [image URL | attach image | view | clear]',
    aliases: ['presetpfp', 'guildsetpfp', 'prepfp'],
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const sub = args[0]?.toLowerCase();

      if (sub === 'view' || sub === 'show' || sub === 'check') {
        const stored = getGuildPfp(message.guild!.id);
        if (!stored) return message.reply({ embeds: [errorEmbed('No PFP Set', `No server-specific bot PFP has been set for **${message.guild!.name}** yet.`)] });
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`🖼️ Server Bot PFP — ${message.guild!.name}`)
          .setDescription('Current server-specific bot profile picture:')
          .setThumbnail(stored)
          .setImage(stored)
          .setFooter({ text: `Use !setprepfp clear to remove • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      }

      if (sub === 'clear' || sub === 'remove' || sub === 'reset' || sub === 'off') {
        setGuildPfp(message.guild!.id, '');
        return message.reply({ embeds: [successEmbed('PFP Cleared', `The server-specific bot PFP for **${message.guild!.name}** has been removed.`)] });
      }

      const attachment = message.attachments.first();
      let imageUrl = attachment?.url ?? args[0];
      if (!imageUrl) return message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🖼️ Server Bot PFP Help')
        .addFields(
          { name: 'Set via attachment', value: 'Attach an image to the message and run `!setprepfp`', inline: false },
          { name: 'Set via URL', value: '`!setprepfp https://example.com/pfp.png`', inline: false },
          { name: 'View current', value: '`!setprepfp view`', inline: false },
          { name: 'Clear PFP', value: '`!setprepfp clear`', inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });

      if (attachment) {
        try {
          const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          const buf = Buffer.from(res.data);
          const mime = String(res.headers['content-type'] ?? 'image/png');
          const ext = mime.includes('gif') ? 'gif' : mime.includes('webp') ? 'webp' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
          const storageMsg = await (message.channel as TextChannel).send({ files: [{ attachment: buf, name: `guild_pfp.${ext}` }] });
          const permanentUrl = storageMsg.attachments.first()?.url;
          if (permanentUrl) {
            imageUrl = permanentUrl.split('?')[0];
            await storageMsg.delete().catch(() => {});
          }
        } catch {}
      }

      setGuildPfp(message.guild!.id, imageUrl);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🖼️ Server Bot PFP Set')
        .setDescription(`Custom bot profile picture saved for **${message.guild!.name}**.`)
        .setThumbnail(imageUrl)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── BOT PROFILE ──────────────────────────────────────────────────────────
  {
    name: 'botprofile',
    description: 'View the bot\'s profile for this server (custom banner, PFP, bio, status)',
    category: 'Bot Owner',
    usage: 'botprofile',
    aliases: ['guildbot', 'serverbot', 'mybotprofile'],
    async execute(message) {
      const guildId = message.guild!.id;
      const banner = getGuildBanner(guildId);
      const pfp = getGuildPfp(guildId);
      const bio = getBotConfig('bot_bio');
      const status = getBotConfig('status_text');
      const statusType = getBotConfig('status_type');

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`🤖 ${message.client.user!.username} — ${message.guild!.name}`)
        .setThumbnail(pfp || message.client.user!.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '💬 Bio', value: bio || '*Not set*', inline: false },
          { name: '🎮 Status', value: status ? `**${statusType}** ${status}` : '*Default*', inline: true },
          { name: '🌐 Servers', value: `${message.client.guilds.cache.size}`, inline: true },
          { name: '🖼️ Server PFP', value: pfp ? `[View Image](${pfp})` : '*Using global bot avatar*', inline: true },
          { name: '🎨 Server Banner', value: banner ? `[View Image](${banner})` : '*Not set*', inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      if (banner) embed.setImage(banner);

      await message.reply({ embeds: [embed] });
    }
  },

  // ── SHUTDOWN ──────────────────────────────────────────────────────────────
  {
    name: 'shutdown',
    description: '[Owner] Put bot in maintenance mode — only staff can use commands',
    category: 'Bot Owner',
    usage: 'shutdown',
    async execute(message) {
      if (!ownerOnly(message)) return;
      if (isMaintenanceMode()) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle('⚠️ Already in Maintenance').setDescription('The bot is already in maintenance mode.\nUse `!restart` to bring it back online for everyone.').setFooter(BOT_FOOTER).setTimestamp()] });
      }
      setMaintenanceMode(true);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle('🔴 Maintenance Mode ON')
        .setDescription(
          'Bot is now in **maintenance mode**.\n\n' +
          '• Regular members **cannot** use any commands\n' +
          '• Bot **owner, helpers & devs** can still use all commands\n\n' +
          'Use `!restart` or `!wakeup` to bring the bot back online for everyone.'
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── RESTART / WAKE UP ─────────────────────────────────────────────────────
  {
    name: 'restart',
    description: '[Owner] Wake up the bot / clear maintenance mode',
    category: 'Bot Owner',
    aliases: ['wakeup', 'wake', 'reboot', 'online'],
    usage: 'restart',
    async execute(message) {
      if (!ownerOnly(message)) return;
      if (!isMaintenanceMode()) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('ℹ️ Already Online')
          .setDescription('The bot is not in maintenance mode — it is already online for everyone.\nUse `!shutdown` to enter maintenance mode.')
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
      setMaintenanceMode(false);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🟢 Bot Back Online')
        .setDescription('Maintenance mode **cleared**. All members can use commands again!')
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── MAINTENANCE STATUS ─────────────────────────────────────────────────────
  {
    name: 'botstatus',
    description: '[Staff] Check if bot is in maintenance mode',
    category: 'Bot Owner',
    aliases: ['maintenancestatus', 'botmode'],
    usage: 'botstatus',
    async execute(message) {
      if (!staffOnly(message)) return;
      const inMaintenance = isMaintenanceMode();
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(inMaintenance ? COLORS.error : COLORS.success)
        .setTitle(inMaintenance ? '🔴 Maintenance Mode' : '🟢 Bot Online')
        .setDescription(inMaintenance
          ? 'The bot is in **maintenance mode**. Only staff can use commands.\nUse `!restart` to bring it back online.'
          : 'The bot is fully **online**. All commands are accessible to members.')
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── DISABLE COMMAND / CATEGORY ────────────────────────────────────────────
  {
    name: 'disable',
    description: '[Owner] Disable a command or category in this server',
    category: 'Bot Owner',
    aliases: ['disablecmd', 'disablecommand'],
    usage: 'disable <command|category> <name>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const type = args[0]?.toLowerCase();
      const name = args.slice(1).join(' ');
      if (!type || !name) return message.reply({ embeds: [errorEmbed('Missing Args',
        'Usage:\n`!disable command <commandname>` — disable a command in this server\n`!disable category <categoryname>` — disable a whole category\n`!disable global command <name>` — disable globally\n`!disable global category <name>` — disable category globally'
      )] });

      const guildId = message.guild!.id;

      if (type === 'global') {
        const subtype = args[1]?.toLowerCase();
        const subname = args.slice(2).join(' ');
        if (subtype === 'command') {
          disableGlobalCommand(subname);
          return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('🚫 Globally Disabled').setDescription(`Command \`${subname}\` is now **disabled globally** across all servers.`).setFooter(BOT_FOOTER).setTimestamp()] });
        } else if (subtype === 'category') {
          disableGlobalCategory(subname);
          return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('🚫 Category Globally Disabled').setDescription(`Category **${subname}** is now **disabled globally** across all servers.`).setFooter(BOT_FOOTER).setTimestamp()] });
        }
        return message.reply({ embeds: [errorEmbed('Invalid Type', 'Use `global command` or `global category`.')] });
      }

      if (type === 'command') {
        disableGuildCommand(guildId, name);
        return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle('🚫 Command Disabled').setDescription(`Command \`${name}\` has been **disabled** in **${message.guild!.name}**.\nUse \`!enable command ${name}\` to re-enable.`).setFooter(BOT_FOOTER).setTimestamp()] });
      }
      if (type === 'category') {
        disableGuildCategory(guildId, name);
        return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle('🚫 Category Disabled').setDescription(`Category **${name}** has been **disabled** in **${message.guild!.name}**.\nUse \`!enable category ${name}\` to re-enable.`).setFooter(BOT_FOOTER).setTimestamp()] });
      }
      return message.reply({ embeds: [errorEmbed('Invalid Type', 'Use `command` or `category`.')] });
    }
  },

  // ── ENABLE COMMAND / CATEGORY ─────────────────────────────────────────────
  {
    name: 'enable',
    description: '[Owner] Enable a previously disabled command or category',
    category: 'Bot Owner',
    aliases: ['enablecmd', 'enablecommand'],
    usage: 'enable <command|category> <name>',
    async execute(message, args) {
      if (!ownerOnly(message)) return;
      const type = args[0]?.toLowerCase();
      const name = args.slice(1).join(' ');
      if (!type || !name) return message.reply({ embeds: [errorEmbed('Missing Args',
        'Usage:\n`!enable command <commandname>`\n`!enable category <categoryname>`\n`!enable global command <name>`\n`!enable global category <name>`'
      )] });

      const guildId = message.guild!.id;

      if (type === 'global') {
        const subtype = args[1]?.toLowerCase();
        const subname = args.slice(2).join(' ');
        if (subtype === 'command') {
          enableGlobalCommand(subname);
          return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Globally Enabled').setDescription(`Command \`${subname}\` is now **enabled globally**.`).setFooter(BOT_FOOTER).setTimestamp()] });
        } else if (subtype === 'category') {
          enableGlobalCategory(subname);
          return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Category Globally Enabled').setDescription(`Category **${subname}** is now **enabled globally**.`).setFooter(BOT_FOOTER).setTimestamp()] });
        }
        return message.reply({ embeds: [errorEmbed('Invalid Type', 'Use `global command` or `global category`.')] });
      }

      if (type === 'command') {
        enableGuildCommand(guildId, name);
        return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Command Enabled').setDescription(`Command \`${name}\` has been **enabled** in **${message.guild!.name}**.`).setFooter(BOT_FOOTER).setTimestamp()] });
      }
      if (type === 'category') {
        enableGuildCategory(guildId, name);
        return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Category Enabled').setDescription(`Category **${name}** has been **enabled** in **${message.guild!.name}**.`).setFooter(BOT_FOOTER).setTimestamp()] });
      }
      return message.reply({ embeds: [errorEmbed('Invalid Type', 'Use `command` or `category`.')] });
    }
  },

  // ── LIST DISABLED ─────────────────────────────────────────────────────────
  {
    name: 'listdisabled',
    description: '[Owner] List all disabled commands and categories for this server',
    category: 'Bot Owner',
    aliases: ['disabledlist', 'showdisabled', 'disabled'],
    usage: 'listdisabled',
    async execute(message) {
      if (!staffOnly(message)) return;
      const guildId = message.guild!.id;
      const info = getDisabledInfo(guildId);

      const guildCmds = info.guildCommands.length ? info.guildCommands.map(c => `\`${c}\``).join(', ') : '*None*';
      const guildCats = info.guildCategories.length ? info.guildCategories.map(c => `**${c}**`).join(', ') : '*None*';
      const globalCmds = info.globalCommands.length ? info.globalCommands.map(c => `\`${c}\``).join(', ') : '*None*';
      const globalCats = info.globalCategories.length ? info.globalCategories.map(c => `**${c}**`).join(', ') : '*None*';

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`🚫  Disabled Commands — ${message.guild!.name}`)
        .addFields(
          { name: '🏠 Disabled Commands (This Server)', value: guildCmds, inline: false },
          { name: '📂 Disabled Categories (This Server)', value: guildCats, inline: false },
          { name: '🌐 Globally Disabled Commands', value: globalCmds, inline: false },
          { name: '🗂️ Globally Disabled Categories', value: globalCats, inline: false },
        )
        .setDescription('Use `!enable command <name>` or `!enable category <name>` to re-enable.\nUse `!disable command <name>` or `!disable category <name>` to disable.')
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },
];

export default botownerCommands;
