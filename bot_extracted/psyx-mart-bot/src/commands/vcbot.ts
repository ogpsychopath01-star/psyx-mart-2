import { EmbedBuilder, Guild, ChannelType } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS } from '../utils/embeds.js';
import { get247Channel, set247Channel, remove247Channel } from '../database.js';
import { hasPermission, Perms } from '../utils/permissions.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setTimestamp();
}
function infoEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(`ℹ️ ${t}`).setDescription(d).setTimestamp();
}

// ── GATEWAY OP 4: Join/leave VC via WebSocket ─────────────────────────────────
export function gatewayJoinVC(guild: Guild, channelId: string | null) {
  (guild.shard as any).send({
    op: 4,
    d: {
      guild_id: guild.id,
      channel_id: channelId,
      self_mute: false,
      self_deaf: false,
    },
  });
}

const vcBotCommands: BotCommand[] = [

  {
    name: 'join',
    description: 'Make the bot join your voice channel (or a specific channel by ID)',
    category: 'Voice Bot',
    usage: 'join [channelID]',
    async execute(message, args) {
      // If a channel ID is provided, join that channel directly
      if (args[0] && /^\d{17,20}$/.test(args[0])) {
        const ch = message.guild!.channels.cache.get(args[0]);
        if (!ch || (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice)) {
          return message.reply({ embeds: [errorEmbed('Invalid Channel', `\`${args[0]}\` is not a valid voice channel ID. Right-click a voice channel → Copy ID.`)] });
        }
        try {
          gatewayJoinVC(message.guild!, args[0]);
          return message.reply({ embeds: [successEmbed('Joined VC', `Joined <#${args[0]}> 🎙️`)] });
        } catch (err: any) {
          return message.reply({ embeds: [errorEmbed('Join Failed', `Could not join <#${args[0]}>. Error: ${err?.message ?? 'Unknown'}`)] });
        }
      }

      // Otherwise join the user's current VC
      const vc = message.member!.voice.channel;
      if (!vc)
        return message.reply({ embeds: [errorEmbed('Not in VC', 'You must be in a voice channel, or provide a **Channel ID**.\nExample: `!join 1234567890123456789`')] });

      try {
        gatewayJoinVC(message.guild!, vc.id);
        await message.reply({ embeds: [successEmbed('Joined VC', `Joined **${vc.name}** 🎙️`)] });
      } catch (err: any) {
        await message.reply({ embeds: [errorEmbed('Join Failed', `Could not join **${vc.name}**. Error: ${err?.message ?? 'Unknown error'}`)] });
      }
    }
  },

  {
    name: 'disconnect',
    description: 'Disconnect bot from voice channel',
    category: 'Voice Bot',
    aliases: ['leave', 'dc'],
    usage: 'disconnect',
    async execute(message) {
      const botVc = message.guild!.members.me?.voice.channel;
      if (!botVc)
        return message.reply({ embeds: [errorEmbed('Not Connected', 'I am not in a voice channel.')] });

      remove247Channel(message.guild!.id);
      gatewayJoinVC(message.guild!, null);
      await message.reply({ embeds: [successEmbed('Disconnected', `Left **${botVc.name}**.`)] });
    }
  },

  {
    name: '247',
    description: 'Toggle 24/7 mode — bot stays in VC permanently',
    category: 'Voice Bot',
    usage: '247 [channelID]',
    async execute(message, args) {
      const existing = get247Channel(message.guild!.id);

      if (existing) {
        remove247Channel(message.guild!.id);
        gatewayJoinVC(message.guild!, null);
        return message.reply({ embeds: [infoEmbed('24/7 Disabled', 'Bot will no longer stay permanently in voice.')] });
      }

      // Support channel ID arg — validate it's an actual voice channel
      let vcId: string | undefined;
      if (args[0] && /^\d{17,20}$/.test(args[0])) {
        const ch = message.guild!.channels.cache.get(args[0]);
        if (!ch || (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice)) {
          return message.reply({ embeds: [errorEmbed('Invalid Channel', `\`${args[0]}\` is not a valid voice channel ID.`)] });
        }
        vcId = args[0];
      } else {
        vcId = message.member!.voice.channel?.id;
      }

      if (!vcId)
        return message.reply({ embeds: [errorEmbed('Not in VC', 'You must be in a voice channel or provide a **Voice Channel ID** to enable 24/7 mode.')] });

      const ch = message.guild!.channels.cache.get(vcId);
      set247Channel(message.guild!.id, vcId);
      gatewayJoinVC(message.guild!, vcId);
      await message.reply({ embeds: [successEmbed('24/7 Enabled', `Now permanently staying in **${ch?.name ?? vcId}**.\nIf disconnected, I will rejoin automatically. 🔒`)] });
    }
  },

  {
    name: 'vcstatus',
    description: 'Check the bot voice channel status',
    category: 'Voice Bot',
    usage: 'vcstatus',
    async execute(message) {
      const botVc = message.guild!.members.me?.voice.channel;
      const is247 = get247Channel(message.guild!.id);
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🎙️ Voice Status')
        .addFields(
          { name: 'Connected', value: botVc ? `✅ <#${botVc.id}>` : '❌ Not connected', inline: true },
          { name: '24/7 Mode', value: is247 ? `✅ <#${is247}>` : '❌ Off', inline: true },
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    }
  },
];

export default vcBotCommands;
