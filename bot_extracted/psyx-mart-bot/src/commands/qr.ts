import { EmbedBuilder, TextChannel, AttachmentBuilder } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { hasPermission, Perms } from '../utils/permissions.js';
import {
  getQrCode, setQrCode, deleteQrCode, listQrCodes,
  getPaymentInfo, setPaymentInfo, deletePaymentInfo, listPaymentInfo, PaymentInfo,
} from '../database.js';
import axios from 'axios';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

const VALID_SLOTS = ['qr1', 'qr2', 'qr3'] as const;
type Slot = typeof VALID_SLOTS[number];

// ── DISPLAY QR + PAYMENT INFO (COMBINED) ─────────────────────────────────────
function makeQrDisplayCommand(slot: Slot): BotCommand {
  const slotNum = slot.replace('qr', '');
  return {
    name: slot,
    description: `Show payment info & QR code for slot ${slotNum}`,
    category: 'QR / Payment',
    usage: slot,
    async execute(message) {
      const qrEntry = getQrCode(message.guild!.id, slot);
      const payInfo = getPaymentInfo(message.guild!.id, slot);

      if (!qrEntry && !payInfo) {
        return message.reply({ embeds: [errorEmbed(
          `Payment Slot ${slotNum} Not Configured`,
          `No payment info or QR code is set for slot **${slot.toUpperCase()}** yet.\n\n` +
          `**Setup commands:**\n` +
          `• \`!qrsetup ${slot} <image URL or attach>\` — Set QR image\n` +
          `• \`!paysetup ${slot}\` — Set UPI/bank account details`
        )] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x00B4D8)
        .setTitle(`💳 Payment Details — Slot ${slotNum.toUpperCase()}`)
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      if (payInfo) {
        const details: string[] = [];
        if (payInfo.upi_id) details.push(`📱 **UPI ID:** \`${payInfo.upi_id}\``);
        if (payInfo.account_name) details.push(`👤 **Account Name:** ${payInfo.account_name}`);
        if (payInfo.account_number) details.push(`🏦 **Account No.:** \`${payInfo.account_number}\``);
        if (payInfo.ifsc) details.push(`🔢 **IFSC Code:** \`${payInfo.ifsc}\``);
        if (payInfo.bank_name) details.push(`🏛️ **Bank:** ${payInfo.bank_name}`);
        if (payInfo.phone) details.push(`📞 **Phone/UPI No.:** \`${payInfo.phone}\``);
        if (payInfo.extra_note) details.push(`📝 **Note:** ${payInfo.extra_note}`);
        if (details.length > 0) {
          embed.addFields({ name: '💰 Payment Information', value: details.join('\n'), inline: false });
        }
      }

      if (qrEntry) {
        if (qrEntry.label) embed.addFields({ name: '🏷️ Label', value: qrEntry.label, inline: true });
        embed.addFields({ name: '📲 QR Code', value: 'Scan the QR code below to pay', inline: false });
        // Set the QR image on the embed
        embed.setImage(qrEntry.url);
      }

      if (!payInfo && qrEntry?.label) {
        embed.setDescription(qrEntry.label ? `**Label:** ${qrEntry.label}` : `*QR Code Slot ${slotNum}*`);
      }

      await message.reply({ embeds: [embed] });
    }
  };
}

const qrCommands: BotCommand[] = [
  makeQrDisplayCommand('qr1'),
  makeQrDisplayCommand('qr2'),
  makeQrDisplayCommand('qr3'),

  // ── QR IMAGE SETUP ────────────────────────────────────────────────────────
  {
    name: 'qrsetup',
    description: 'Set up a QR code image for a payment slot (qr1, qr2, qr3)',
    category: 'QR / Payment',
    usage: 'qrsetup <qr1|qr2|qr3> [image URL] [label] (or attach an image)',
    aliases: ['setqr', 'qrset'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission to set up QR codes.')] });

      const slot = args[0]?.toLowerCase() as Slot;
      if (!slot || !VALID_SLOTS.includes(slot))
        return message.reply({ embeds: [errorEmbed('Invalid Slot', 'Provide a valid slot: **qr1**, **qr2**, or **qr3**.\nExample: `!qrsetup qr1 https://example.com/qr.png`')] });

      const attachment = message.attachments.first();
      let imageUrl: string | undefined = attachment?.url ?? args[1];

      if (!imageUrl)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('📲 QR Setup Help')
          .setDescription(`**How to set up a QR code for slot \`${slot}\`:**`)
          .addFields(
            { name: 'Option 1 — Attach Image', value: `Attach your QR image to the message and run:\n\`!qrsetup ${slot}\``, inline: false },
            { name: 'Option 2 — Image URL', value: `\`!qrsetup ${slot} https://example.com/qr.png\``, inline: false },
            { name: 'Add a Label (optional)', value: `\`!qrsetup ${slot} https://example.com/qr.png My QR Label\``, inline: false },
            { name: '💡 Tip', value: `Also set UPI/bank details with \`!paysetup ${slot}\` for a complete payment panel!`, inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      const label = attachment ? args.slice(1).join(' ').trim() : args.slice(2).join(' ').trim();

      // ── IMAGE HANDLING ──────────────────────────────────────────────────
      // Strategy: if an attachment was uploaded, download it and re-upload it
      // as part of the success reply. The reply message is bot-owned and won't
      // be deleted, so the resulting CDN URL is long-lived. Never strip the
      // query string — Discord CDN now requires the signed token in the URL.
      if (attachment) {
        try {
          const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          const buf = Buffer.from(res.data);
          const mime = String(res.headers['content-type'] ?? 'image/png');
          const ext = mime.includes('gif') ? 'gif' : mime.includes('webp') ? 'webp' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
          const fileName = `qr_${slot}.${ext}`;

          // Pre-save with source URL so it's in DB before the reply
          setQrCode(message.guild!.id, slot, imageUrl, label || '', message.author.id);

          // Build success embed that also shows the image as an attachment
          const successEmbedObj = new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`✅ QR Slot ${slot.toUpperCase()} Set`)
            .setDescription(
              `QR code saved to slot **${slot.toUpperCase()}**!\n\n` +
              (label ? `**Label:** ${label}\n\n` : '') +
              `Use \`!${slot}\` to display payment info + QR code.`
            )
            .setImage(`attachment://${fileName}`)
            .setFooter(BOT_FOOTER)
            .setTimestamp();

          // Send the reply with the image attached — get the permanent URL from this reply
          const replyMsg = await message.reply({
            embeds: [successEmbedObj],
            files: [{ attachment: buf, name: fileName }],
          });

          // Update DB with the URL from our own reply (bot-owned message, won't be deleted)
          const permanentUrl = replyMsg.attachments.first()?.url;
          if (permanentUrl) {
            setQrCode(message.guild!.id, slot, permanentUrl, label || '', message.author.id);
          }
          return;
        } catch (err) {
          // Fall through to URL-based storage if download fails
          imageUrl = attachment.url;
        }
      }

      // URL-based setup: just store the URL directly (no re-upload needed)
      setQrCode(message.guild!.id, slot, imageUrl, label || '', message.author.id);

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`✅ QR Slot ${slot.toUpperCase()} Set`)
        .setDescription(
          `QR code saved to slot **${slot.toUpperCase()}**!\n\n` +
          (label ? `**Label:** ${label}\n\n` : '') +
          `Use \`!${slot}\` to display payment info + QR code.`
        )
        .setImage(imageUrl)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── PAYMENT INFO SETUP ──────────────────────────────────────────────────
  {
    name: 'paysetup',
    description: 'Set UPI ID / account details for a payment slot',
    category: 'QR / Payment',
    usage: 'paysetup <qr1|qr2|qr3>',
    aliases: ['setpayment', 'payinfo', 'setupay', 'setupayment'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission to set up payment info.')] });

      const slot = args[0]?.toLowerCase();
      if (!slot || !VALID_SLOTS.includes(slot as Slot)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('💳 Payment Setup Guide')
          .setDescription('Set UPI ID, bank details, and more for each payment slot.')
          .addFields(
            { name: '📌 Usage', value: '`!paysetup <qr1|qr2|qr3>`', inline: false },
            { name: '📱 UPI ID', value: '`!payupi qr1 yourname@paytm`', inline: false },
            { name: '👤 Account Name', value: '`!payname qr1 Your Full Name`', inline: false },
            { name: '🏦 Account Number', value: '`!payaccount qr1 1234567890`', inline: false },
            { name: '🔢 IFSC Code', value: '`!payifsc qr1 HDFC0001234`', inline: false },
            { name: '🏛️ Bank Name', value: '`!paybank qr1 HDFC Bank`', inline: false },
            { name: '📞 Phone Number', value: '`!payphone qr1 9876543210`', inline: false },
            { name: '📝 Extra Note', value: '`!paynote qr1 Send screenshot after payment`', inline: false },
            { name: '🗑️ Clear Slot', value: '`!payclear qr1`', inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }

      const existing = getPaymentInfo(message.guild!.id, slot) ?? {} as PaymentInfo;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`💳 Payment Setup — Slot ${slot.toUpperCase()}`)
        .setDescription(
          `**Current settings for slot ${slot.toUpperCase()}:**\n\n` +
          `📱 UPI ID: ${existing.upi_id || '*Not set*'}\n` +
          `👤 Name: ${existing.account_name || '*Not set*'}\n` +
          `🏦 Account No.: ${existing.account_number || '*Not set*'}\n` +
          `🔢 IFSC: ${existing.ifsc || '*Not set*'}\n` +
          `🏛️ Bank: ${existing.bank_name || '*Not set*'}\n` +
          `📞 Phone: ${existing.phone || '*Not set*'}\n` +
          `📝 Note: ${existing.extra_note || '*Not set*'}\n\n` +
          `**Commands to update:**\n` +
          `\`!payupi ${slot} <upi_id>\`\n` +
          `\`!payname ${slot} <name>\`\n` +
          `\`!payaccount ${slot} <account_number>\`\n` +
          `\`!payifsc ${slot} <ifsc>\`\n` +
          `\`!paybank ${slot} <bank_name>\`\n` +
          `\`!payphone ${slot} <phone>\`\n` +
          `\`!paynote ${slot} <note>\``
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── PAYMENT FIELD SETTERS ─────────────────────────────────────────────────
  ...((['upi', 'name', 'account', 'ifsc', 'bank', 'phone', 'note'] as const).map(field => {
    const fieldMap: Record<string, { key: keyof PaymentInfo; label: string; cmdName: string }> = {
      upi:     { key: 'upi_id',         label: '📱 UPI ID',         cmdName: 'payupi' },
      name:    { key: 'account_name',   label: '👤 Account Name',   cmdName: 'payname' },
      account: { key: 'account_number', label: '🏦 Account Number', cmdName: 'payaccount' },
      ifsc:    { key: 'ifsc',           label: '🔢 IFSC Code',      cmdName: 'payifsc' },
      bank:    { key: 'bank_name',      label: '🏛️ Bank Name',     cmdName: 'paybank' },
      phone:   { key: 'phone',          label: '📞 Phone/UPI No.',  cmdName: 'payphone' },
      note:    { key: 'extra_note',     label: '📝 Extra Note',     cmdName: 'paynote' },
    };
    const meta = fieldMap[field];
    return {
      name: meta.cmdName,
      description: `Set ${meta.label} for a payment slot`,
      category: 'QR / Payment',
      usage: `${meta.cmdName} <qr1|qr2|qr3> <value>`,
      async execute(message: any, args: any[]) {
        if (!hasPermission(message.member!, Perms.ManageGuild))
          return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
        const slot = args[0]?.toLowerCase();
        if (!slot || !VALID_SLOTS.includes(slot as Slot))
          return message.reply({ embeds: [errorEmbed('Invalid Slot', 'Valid slots: **qr1**, **qr2**, **qr3**')] });
        const value = args.slice(1).join(' ').trim();
        if (!value)
          return message.reply({ embeds: [errorEmbed('Missing Value', `Provide the ${meta.label} value.\nUsage: \`!${meta.cmdName} ${slot} <value>\``)] });

        const existing = getPaymentInfo(message.guild!.id, slot) ?? { set_by: message.author.id, set_at: Date.now() } as PaymentInfo;
        (existing as any)[meta.key] = value;
        existing.set_by = message.author.id;
        existing.set_at = Date.now();
        setPaymentInfo(message.guild!.id, slot, existing);

        await message.reply({ embeds: [successEmbed(`${meta.label} Set`, `${meta.label} for slot **${slot.toUpperCase()}** set to: \`${value}\`\n\nUse \`!${slot}\` to view the full payment panel.`)] });
      }
    } as BotCommand;
  })),

  // ── CLEAR PAYMENT INFO ────────────────────────────────────────────────────
  {
    name: 'payclear',
    description: 'Clear all payment info for a slot',
    category: 'QR / Payment',
    usage: 'payclear <qr1|qr2|qr3>',
    aliases: ['clearPayment', 'clearpay'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });
      const slot = args[0]?.toLowerCase();
      if (!slot || !VALID_SLOTS.includes(slot as Slot))
        return message.reply({ embeds: [errorEmbed('Invalid Slot', 'Valid slots: **qr1**, **qr2**, **qr3**')] });
      deletePaymentInfo(message.guild!.id, slot);
      await message.reply({ embeds: [successEmbed('Payment Info Cleared', `All payment details for slot **${slot.toUpperCase()}** have been cleared.`)] });
    }
  },

  // ── QR REMOVE ─────────────────────────────────────────────────────────────
  {
    name: 'qrremove',
    description: 'Remove a QR code image from a slot',
    category: 'QR / Payment',
    usage: 'qrremove <qr1|qr2|qr3>',
    aliases: ['removeqr', 'qrdel', 'qrdelete'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission to remove QR codes.')] });
      const slot = args[0]?.toLowerCase() as Slot;
      if (!slot || !VALID_SLOTS.includes(slot))
        return message.reply({ embeds: [errorEmbed('Invalid Slot', 'Valid slots: **qr1**, **qr2**, **qr3**')] });
      if (!getQrCode(message.guild!.id, slot))
        return message.reply({ embeds: [errorEmbed('Not Found', `Slot **${slot.toUpperCase()}** does not have a QR code.`)] });
      deleteQrCode(message.guild!.id, slot);
      await message.reply({ embeds: [successEmbed('QR Removed', `The QR code in slot **${slot.toUpperCase()}** has been removed. Payment text info is still saved.`)] });
    }
  },

  // ── QR / PAY LIST ─────────────────────────────────────────────────────────
  {
    name: 'qrlist',
    description: 'List all configured QR codes and payment info',
    category: 'QR / Payment',
    usage: 'qrlist',
    aliases: ['listqr', 'qrs', 'paylist'],
    async execute(message) {
      const codes = listQrCodes(message.guild!.id);
      const payments = listPaymentInfo(message.guild!.id);
      const slots: Slot[] = ['qr1', 'qr2', 'qr3'];

      const fields = slots.map(slot => {
        const slotNum = slot.replace('qr', '');
        const qr = codes[slot];
        const pay = payments[slot];
        let value = '';
        if (qr) value += `📷 QR: ✅ ${qr.label ? `(${qr.label})` : ''}\n`;
        else value += `📷 QR: ❌ Not set\n`;
        if (pay?.upi_id) value += `💳 UPI: \`${pay.upi_id}\`\n`;
        if (pay?.account_number) value += `🏦 Account: \`${pay.account_number}\`\n`;
        if (!qr && !pay) value = '❌ Nothing configured\n';
        value += `Use \`!${slot}\` to view`;
        return { name: `📲 Slot ${slotNum} (${slot.toUpperCase()})`, value, inline: true };
      });

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00B4D8)
        .setTitle('💳 Payment & QR Slots')
        .setDescription('Overview of all configured payment slots. Use `!paysetup <slot>` to configure.')
        .addFields(fields)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },
];

export default qrCommands;
