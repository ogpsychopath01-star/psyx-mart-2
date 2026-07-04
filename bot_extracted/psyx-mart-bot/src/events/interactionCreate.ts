import {
  EmbedBuilder, Events,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  ChannelType, PermissionFlagsBits, TextChannel,
} from 'discord.js';
import { BotClient } from '../client.js';
import { getActiveTempVc, updateTempVc, deleteActiveTempVc,
         getTicketSettings, getActiveTicket, getActiveTicketByUser, createTicket, deleteTicket } from '../database.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { getTicketCloseRow, TICKET_LABELS } from '../commands/tickets.js';
import { sendLog } from '../utils/helpers.js';

export default function registerInteractionCreate(client: BotClient) {
  client.on(Events.InteractionCreate, async (interaction) => {

    // ── TEMP VC BUTTONS ───────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('tvc_')) {
      const member = interaction.guild?.members.cache.get(interaction.user.id);
      const vc = member?.voice.channel;

      if (!vc) return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Not in VC').setDescription('You must be in your temp voice channel to use these controls.').setFooter(BOT_FOOTER).setTimestamp()],
        ephemeral: true
      });

      const tempvc = getActiveTempVc(vc.id);
      if (!tempvc) return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Not a Temp VC').setDescription('This is not a managed temp voice channel.').setFooter(BOT_FOOTER).setTimestamp()],
        ephemeral: true
      });

      if (tempvc.owner_id !== interaction.user.id) return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Not Owner').setDescription('Only the channel owner can control this channel.').setFooter(BOT_FOOTER).setTimestamp()],
        ephemeral: true
      });

      switch (interaction.customId) {
        case 'tvc_lock':
          await vc.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
          updateTempVc(vc.id, { locked: true });
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🔒 VC Locked').setDescription('Your voice channel is now **locked**.').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
          break;
        case 'tvc_unlock':
          await vc.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
          updateTempVc(vc.id, { locked: false });
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🔓 VC Unlocked').setDescription('Your voice channel is now **open**.').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
          break;
        case 'tvc_hide':
          await vc.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: false });
          updateTempVc(vc.id, { hidden: true });
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('👁️ VC Hidden').setDescription('Your channel is now **hidden**.').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
          break;
        case 'tvc_unhide':
          await vc.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: null });
          updateTempVc(vc.id, { hidden: false });
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✨ VC Visible').setDescription('Your channel is now **visible**.').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
          break;
        case 'tvc_delete':
          deleteActiveTempVc(vc.id);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle('🗑️ Deleting VC…').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
          await vc.delete('Owner deleted temp VC').catch(() => {});
          break;
        case 'tvc_limit': {
          const modal = new ModalBuilder().setCustomId('tvc_limit_modal').setTitle('Set User Limit');
          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('limit_value').setLabel('User Limit (0 = unlimited)').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(2).setRequired(true)
          ));
          await interaction.showModal(modal);
          break;
        }
        case 'tvc_rename': {
          const modal = new ModalBuilder().setCustomId('tvc_rename_modal').setTitle('Rename Channel');
          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('rename_value').setLabel('New Channel Name').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(100).setRequired(true)
          ));
          await interaction.showModal(modal);
          break;
        }
        case 'tvc_kick': {
          const modal = new ModalBuilder().setCustomId('tvc_kick_modal').setTitle('Kick from VC');
          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('kick_user_id').setLabel('User ID to kick').setStyle(TextInputStyle.Short).setMinLength(17).setMaxLength(20).setRequired(true)
          ));
          await interaction.showModal(modal);
          break;
        }
        case 'tvc_transfer': {
          const modal = new ModalBuilder().setCustomId('tvc_transfer_modal').setTitle('Transfer Ownership');
          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('transfer_user_id').setLabel('New Owner User ID').setStyle(TextInputStyle.Short).setMinLength(17).setMaxLength(20).setRequired(true)
          ));
          await interaction.showModal(modal);
          break;
        }
        case 'tvc_invite':
          await interaction.reply({ content: `📨 **Channel Link:** <#${vc.id}>`, ephemeral: true });
          break;
      }
    }

    // ── TICKET PANEL BUTTONS ──────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('ticket_') &&
        interaction.customId !== 'ticket_close' && interaction.customId !== 'ticket_claim') {

      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild!;
      const settings = getTicketSettings(guild.id);

      if (!settings?.enabled) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Tickets Disabled').setDescription('The ticket system is not currently enabled.').setFooter(BOT_FOOTER).setTimestamp()] });
      }

      // Block duplicate open tickets
      const existing = getActiveTicketByUser(guild.id, interaction.user.id);
      if (existing) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle('⚠️ Ticket Already Open').setDescription(`You already have an open ticket: <#${existing.channel_id}>\n\nPlease close your existing ticket first.`).setFooter(BOT_FOOTER).setTimestamp()] });
      }

      const ticketType = interaction.customId;
      const allBtns = settings.custom_buttons ?? [];
      const customLabel = allBtns.find(b => b.id === ticketType);
      const label = TICKET_LABELS[ticketType] ?? (customLabel ? `${customLabel.emoji} ${customLabel.label}` : '📋 Support');

      // Build permission overwrites
      const staffRoleOverwrites = guild.roles.cache
        .filter(r => r.permissions.has(PermissionFlagsBits.ManageChannels) && !r.managed)
        .map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] as bigint[] }));

      // Create private ticket channel (with full error handling)
      let ticketChannel: TextChannel;
      try {
        ticketChannel = await guild.channels.create({
          name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'user'}`,
          type: ChannelType.GuildText,
          parent: settings.category_id || undefined,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: guild.members.me!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
            ...staffRoleOverwrites,
          ],
        }) as TextChannel;
      } catch (err: any) {
        const hint = err?.code === 50013
          ? '\n\n**Fix:** Give the bot **Manage Channels** permission, or make sure the category allows the bot to create channels.'
          : err?.code === 50035
          ? '\n\n**Fix:** The category ID may be wrong. Use `!ticketcategory <categoryID>` to set a valid one.'
          : `\n\nError: ${err?.message ?? 'Unknown'}`;
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Could Not Create Ticket').setDescription(`Failed to create your ticket channel.${hint}`).setFooter(BOT_FOOTER).setTimestamp()] });
      }

      const ticketNum = createTicket(ticketChannel.id, interaction.user.id, guild.id, ticketType);
      const paddedNum = String(ticketNum).padStart(4, '0');
      await ticketChannel.setName(`ticket-${paddedNum}`).catch(() => {});

      const ticketEmbed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`${label}`)
        .setDescription(`> Welcome <@${interaction.user.id}>! A staff member will assist you shortly.\n\nPlease describe your issue in detail so we can help you faster.`)
        .addFields(
          { name: '🎫 Ticket', value: `#${paddedNum}`, inline: true },
          { name: '📁 Category', value: label, inline: true },
          { name: '👤 Opened By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📅 Opened', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      const pingContent = settings.ping_role_id
        ? `<@${interaction.user.id}> <@&${settings.ping_role_id}>`
        : `<@${interaction.user.id}>`;
      await ticketChannel.send({ content: pingContent, embeds: [ticketEmbed], components: [getTicketCloseRow()] });

      // ── Log ticket open ────────────────────────────────────────────────
      const openLogEmbed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🎫 Ticket Opened')
        .addFields(
          { name: 'User', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: true },
          { name: 'Category', value: label, inline: true },
          { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: true },
          { name: 'Ticket #', value: paddedNum, inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      // Send to ticket-specific log channel (ticketlog command)
      if (settings.log_channel_id) {
        const logCh = guild.channels.cache.get(settings.log_channel_id) as TextChannel | undefined;
        if (logCh?.isTextBased()) await logCh.send({ embeds: [openLogEmbed] }).catch(() => {});
      }
      // Also send to global ticketlog type (setlog/logssetup)
      await sendLog(client, guild.id, 'ticketlog', openLogEmbed);

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Ticket Created').setDescription(`Your ticket: <#${ticketChannel.id}>`).setFooter(BOT_FOOTER).setTimestamp()] });
    }

    // ── TICKET CLOSE ──────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.channel as TextChannel;
      const ticket = getActiveTicket(channel.id);

      if (!ticket) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Not a Ticket').setFooter(BOT_FOOTER).setTimestamp()] });

      const member = interaction.guild!.members.cache.get(interaction.user.id)!;
      const canClose = ticket.user_id === interaction.user.id || member.permissions.has(PermissionFlagsBits.ManageChannels);
      if (!canClose) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ No Permission').setDescription('Only the ticket opener or staff can close this ticket.').setFooter(BOT_FOOTER).setTimestamp()] });

      const settings = getTicketSettings(interaction.guild!.id);
      const paddedNum = String(ticket.ticket_number).padStart(4, '0');
      const label = TICKET_LABELS[ticket.type] ?? '📋 Support';

      const closeLogEmbed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle('🔒 Ticket Closed')
        .addFields(
          { name: 'Ticket #', value: paddedNum, inline: true },
          { name: 'Category', value: label, inline: true },
          { name: 'Opened By', value: `<@${ticket.user_id}>`, inline: true },
          { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Duration', value: `<t:${Math.floor(ticket.created_at / 1000)}:R>`, inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      // Send to ticket-specific log channel
      if (settings?.log_channel_id) {
        const logCh = interaction.guild!.channels.cache.get(settings.log_channel_id) as TextChannel | undefined;
        if (logCh?.isTextBased()) await logCh.send({ embeds: [closeLogEmbed] }).catch(() => {});
      }
      // Also send to global ticketlog
      await sendLog(client, interaction.guild!.id, 'ticketlog', closeLogEmbed);

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🔒 Closing Ticket').setDescription('This ticket will be deleted in 5 seconds.').setFooter(BOT_FOOTER).setTimestamp()] });
      deleteTicket(channel.id);
      setTimeout(() => channel.delete('Ticket closed').catch(() => {}), 5000);
    }

    // ── TICKET CLAIM ──────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_claim') {
      const member = interaction.guild!.members.cache.get(interaction.user.id)!;
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ No Permission').setDescription('Only staff can claim tickets.').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
      const ticket = getActiveTicket(interaction.channel!.id);
      if (!ticket) return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Not a Ticket').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✋ Ticket Claimed').setDescription(`<@${interaction.user.id}> has claimed this ticket and will assist you.`).setFooter(BOT_FOOTER).setTimestamp()] });
    }

    // ── MODAL SUBMITS ─────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const member = interaction.guild?.members.cache.get(interaction.user.id);
      const vc = member?.voice.channel;

      if (interaction.customId === 'tvc_limit_modal' && vc) {
        const limit = parseInt(interaction.fields.getTextInputValue('limit_value'));
        if (!isNaN(limit)) {
          await vc.setUserLimit(limit);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🔢 Limit Set').setDescription(`User limit set to **${limit === 0 ? 'Unlimited' : limit}**.`).setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
        }
      }
      if (interaction.customId === 'tvc_rename_modal' && vc) {
        const name = interaction.fields.getTextInputValue('rename_value');
        await vc.setName(name);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✏️ Renamed').setDescription(`Channel renamed to **${name}**.`).setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
      }
      if (interaction.customId === 'tvc_kick_modal' && vc) {
        const userId = interaction.fields.getTextInputValue('kick_user_id');
        const target = vc.members.get(userId);
        if (target) {
          await target.voice.disconnect();
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('👢 Kicked').setDescription(`<@${userId}> was kicked from your VC.`).setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Not Found').setDescription('That user is not in your VC.').setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
        }
      }
      if (interaction.customId === 'tvc_transfer_modal' && vc) {
        const userId = interaction.fields.getTextInputValue('transfer_user_id');
        updateTempVc(vc.id, { owner_id: userId });
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🔄 Transferred').setDescription(`Ownership transferred to <@${userId}>.`).setFooter(BOT_FOOTER).setTimestamp()], ephemeral: true });
      }
    }
  });
}
