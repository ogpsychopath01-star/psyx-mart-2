import { EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../client.js';
import { getLeaveSettings } from '../database.js';
import { COLORS } from '../utils/embeds.js';
import { sendLog } from '../utils/helpers.js';
import { buildWelcomeEmbed } from '../commands/welcome.js';

export default function registerGuildMemberRemove(client: BotClient) {
  client.on('guildMemberRemove', async (member) => {
    const guild = member.guild;

    // ── LEAVE LOG ─────────────────────────────────────────────────────────
    await sendLog(client, guild.id, 'joinleave', new EmbedBuilder()
      .setColor(COLORS.error).setTitle('📤 Member Left')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
      ).setTimestamp());

    // ── LEAVE MESSAGE ─────────────────────────────────────────────────────
    const settings = getLeaveSettings(guild.id);
    if (settings?.enabled) {
      try {
        const channel = guild.channels.cache.get(settings.channel_id) as TextChannel;
        if (channel) {
          const embed = buildWelcomeEmbed(
            settings,
            member.id,
            guild.name,
            guild.memberCount,
            member.user.displayAvatarURL({ size: 256 }),
          );
          // Set default title if none configured
          if (!embed.data.title) embed.setTitle('👋 Goodbye!');
          await channel.send({ embeds: [embed] });
        }
      } catch {}
    }
  });
}
