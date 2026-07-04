import { EmbedBuilder, TextChannel, AttachmentBuilder, Collection, Message, PermissionFlagsBits } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { hasPermission, Perms, isBotStaff, BOT_OWNER_ID } from '../utils/permissions.js';
import { addSellTranscript, getSellTranscriptsByBuyer, getSellTranscriptsBySeller, SellTranscript } from '../database.js';
import { sendLog } from '../utils/helpers.js';

function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

// Helper: can user use say/sell (requires manage messages or be staff)
function canSayOrSell(message: Message): boolean {
  if (isBotStaff(message.author.id)) return true;
  if (hasPermission(message.member!, Perms.ManageMessages)) return true;
  if (message.author.id === message.guild?.ownerId) return true;
  return false;
}

const sellCommands: BotCommand[] = [

  // ── SAY COMMAND (EMBED FORMAT) ────────────────────────────────────────────
  {
    name: 'say',
    description: 'Send an announcement/message in a styled embed to a channel',
    category: 'Sell / Announce',
    usage: 'say [#channel] <message> (or reply to attach content)',
    aliases: ['announce_msg', 'sendmsg'],
    async execute(message, args) {
      if (!canSayOrSell(message))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Messages** permission to use the say command.')] });

      // Resolve target channel
      const mentionedChannel = message.mentions.channels.first() as TextChannel | undefined;
      const targetChannel = (mentionedChannel ?? message.channel) as TextChannel;

      // Build content — remove channel mention from args
      let contentArgs = args.filter(a => !a.match(/^<#\d+>$/));
      const content = contentArgs.join(' ').trim();

      if (!content && message.attachments.size === 0)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('📢 Say Command')
          .setDescription('Send a message in a beautiful embed format to any channel.')
          .addFields(
            { name: '📌 Usage', value: '`!say [#channel] <message>`', inline: false },
            { name: '📌 Examples', value: '`!say Hello everyone!`\n`!say #general Important announcement here!`', inline: false },
            { name: '💡 Tip', value: 'Attach files/images to include them in the message too.', inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      try {
        await message.delete().catch(() => {});
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setDescription(content || '\u200b')
        .setAuthor({ name: message.guild!.name, iconURL: message.guild!.iconURL() ?? undefined })
        .setFooter({ text: `Message from ${message.author.tag}` })
        .setTimestamp();

      const attachments = [...message.attachments.values()];
      const files: AttachmentBuilder[] = [];

      if (attachments.length > 0) {
        const firstImage = attachments.find(a => a.contentType?.startsWith('image/'));
        if (firstImage) embed.setImage(firstImage.url);
        // Pass remaining as files
        for (const att of attachments) {
          if (att !== firstImage) files.push(new AttachmentBuilder(att.url, { name: att.name }));
        }
      }

      await targetChannel.send({ embeds: [embed], files: files.length ? files : undefined });

      // Confirm to the sender if channel was different
      if (mentionedChannel && mentionedChannel.id !== message.channel.id) {
        const confirm = await (message.channel as TextChannel).send({ embeds: [
          new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Message Sent').setDescription(`Your message was sent to <#${targetChannel.id}>.`).setFooter(BOT_FOOTER).setTimestamp()
        ] });
        setTimeout(() => confirm.delete().catch(() => {}), 4000);
      }

      // Log
      await sendLog(message.client, message.guild!.id, 'commandlog', new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('📢 Say Command Used')
        .addFields(
          { name: '👤 By', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
          { name: '📍 Channel', value: `<#${targetChannel.id}>`, inline: true },
          { name: '💬 Content', value: content.slice(0, 300) || '*[attachment only]*', inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      );
    }
  },

  // ── SELL COMMAND ──────────────────────────────────────────────────────────
  {
    name: 'sell',
    description: 'Securely deliver a sold product/file to a buyer in a specific channel',
    category: 'Sell / Announce',
    usage: 'sell <#channel> <@buyer> <product_name> | <content/description>',
    aliases: ['deliver', 'sendproduct', 'giveproduct'],
    async execute(message, args) {
      if (!canSayOrSell(message))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Messages** permission to use the sell command.')] });

      if (args.length < 3 && message.attachments.size === 0)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🛍️ Sell Command — Help')
          .setDescription('Use this command to **securely deliver** a product to a buyer in any channel. A transcript is also sent to the buyer\'s DM.')
          .addFields(
            { name: '📌 Format', value: '`!sell <#channel> <@buyer> <product> | <content>`', inline: false },
            { name: '📌 Examples', value: [
              '`!sell #deliveries @buyer123 Netflix Account | Email: a@b.com | Pass: xyz123`',
              '`!sell #orders @john Discord Nitro Gift | Use the attached gift link`',
            ].join('\n'), inline: false },
            { name: '📎 Files', value: 'You can also attach files (accounts, keys, etc.) to this command — they will be sent securely.', inline: false },
            { name: '🔒 Privacy', value: 'The product content is sent **only** to the delivery channel and buyer\'s DM. No one else can see it if the channel is private.', inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      // Parse: !sell #channel @buyer product | content
      const targetChannel = message.mentions.channels.first() as TextChannel | undefined;
      if (!targetChannel)
        return message.reply({ embeds: [errorEmbed('Missing Channel', 'Mention the delivery channel.\n**Usage:** `!sell #channel @buyer <product>`')] });

      const buyer = message.mentions.members?.first();
      if (!buyer)
        return message.reply({ embeds: [errorEmbed('Missing Buyer', 'Mention the buyer who should receive this delivery.')] });

      if (buyer.id === message.author.id)
        return message.reply({ embeds: [errorEmbed('Invalid Buyer', 'You cannot sell to yourself.')] });

      // Content: everything after channel + buyer mention
      const remainingArgs = args.filter(a => !a.match(/^<#\d+>$/) && !a.match(/^<@!?\d+>$/));
      const fullContent = remainingArgs.join(' ').trim();

      let productName = 'Product';
      let deliveryContent = fullContent;

      if (fullContent.includes('|')) {
        const [prod, ...rest] = fullContent.split('|');
        productName = prod.trim() || 'Product';
        deliveryContent = rest.join('|').trim();
      } else if (fullContent) {
        productName = fullContent.split(' ').slice(0, 3).join(' ');
        deliveryContent = fullContent;
      }

      if (!deliveryContent && message.attachments.size === 0)
        return message.reply({ embeds: [errorEmbed('Missing Content', 'Provide the product content or attach a file.')] });

      const attachments = [...message.attachments.values()];
      const attachmentUrls = attachments.map(a => a.url);

      try { await message.delete().catch(() => {}); } catch {}

      // ── DELIVERY EMBED ────────────────────────────────────────────────────
      const deliveryEmbed = new EmbedBuilder()
        .setColor(COLORS.sell)
        .setTitle(`🎁 Product Delivery — ${productName}`)
        .setDescription(
          `**Hey <@${buyer.id}>! Here is your order!**\n\n` +
          (deliveryContent ? `📦 **Delivery Content:**\n\`\`\`\n${deliveryContent}\n\`\`\`` : '') +
          (attachments.length > 0 ? `\n📎 **Files:** ${attachments.length} file(s) attached below` : '')
        )
        .addFields(
          { name: '🛒 Buyer', value: `<@${buyer.id}>`, inline: true },
          { name: '🏪 Seller', value: `<@${message.author.id}>`, inline: true },
          { name: '📦 Product', value: productName, inline: true },
          { name: '📅 Delivered', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: `🔒 Secure Delivery • ${BOT_FOOTER.text}` })
        .setTimestamp();

      const files: AttachmentBuilder[] = attachments.map(a => new AttachmentBuilder(a.url, { name: a.name }));

      await targetChannel.send({
        content: `<@${buyer.id}>`,
        embeds: [deliveryEmbed],
        files: files.length ? files : undefined,
      });

      // ── TRANSCRIPT / RECEIPT ──────────────────────────────────────────────
      const transcript = addSellTranscript({
        guild_id: message.guild!.id,
        seller_id: message.author.id,
        buyer_id: buyer.id,
        channel_id: targetChannel.id,
        product: productName,
        content: deliveryContent,
        attachments: attachmentUrls,
        timestamp: Date.now(),
        dm_sent: false,
      });

      // ── DM BUYER WITH TRANSCRIPT ──────────────────────────────────────────
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.sell)
        .setTitle(`🧾 Order Receipt — ${productName}`)
        .setDescription(
          `✅ **Your order has been delivered!**\n\n` +
          (deliveryContent ? `📦 **Content:**\n\`\`\`\n${deliveryContent}\n\`\`\`` : '') +
          (attachments.length > 0 ? `\n📎 **Attachments:** ${attachments.length} file(s) — check the delivery channel` : '')
        )
        .addFields(
          { name: '🏪 Seller', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
          { name: '📦 Product', value: productName, inline: true },
          { name: '🏠 Server', value: message.guild!.name, inline: true },
          { name: '📅 Delivered', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '🆔 Order ID', value: `\`${transcript.id}\``, inline: true },
          { name: '📋 Note', value: 'Keep this receipt for your records. If there are any issues, contact the seller.', inline: false },
        )
        .setFooter({ text: `🔒 Secure Deal Receipt • ${BOT_FOOTER.text}` })
        .setTimestamp();

      let dmSent = false;
      try {
        await buyer.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch {}

      // Update dm_sent flag
      transcript.dm_sent = dmSent;

      // Confirm to seller
      const confirmEmbed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Delivery Sent!')
        .addFields(
          { name: '📦 Product', value: productName, inline: true },
          { name: '🛒 Buyer', value: `<@${buyer.id}>`, inline: true },
          { name: '📍 Channel', value: `<#${targetChannel.id}>`, inline: true },
          { name: '🆔 Order ID', value: `\`${transcript.id}\``, inline: true },
          { name: '📬 DM Receipt', value: dmSent ? '✅ Sent to buyer\'s DM' : '⚠️ Could not DM buyer (DMs closed)', inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      const confirmMsg = await (message.channel as TextChannel).send({ embeds: [confirmEmbed] });
      setTimeout(() => confirmMsg.delete().catch(() => {}), 8000);

      // Log
      await sendLog(message.client, message.guild!.id, 'selllog', new EmbedBuilder()
        .setColor(COLORS.sell)
        .setTitle('🛍️ Product Delivered')
        .addFields(
          { name: '🏪 Seller', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
          { name: '🛒 Buyer', value: `${buyer.user.tag} (<@${buyer.id}>)`, inline: true },
          { name: '📦 Product', value: productName, inline: true },
          { name: '📍 Channel', value: `<#${targetChannel.id}>`, inline: true },
          { name: '🆔 Order ID', value: `\`${transcript.id}\``, inline: true },
          { name: '📬 DM Receipt', value: dmSent ? '✅ Sent' : '❌ Failed', inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      );
    }
  },

  // ── VIEW SELL TRANSCRIPTS ─────────────────────────────────────────────────
  {
    name: 'orders',
    description: 'View sell order history for a buyer or seller',
    category: 'Sell / Announce',
    usage: 'orders [@user] [buyer|seller]',
    aliases: ['orderhistory', 'transactions', 'sells'],
    async execute(message, args) {
      if (!canSayOrSell(message))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Messages** permission.')] });

      const target = message.mentions.members?.first() ?? message.member!;
      const mode = args.find(a => ['buyer', 'seller'].includes(a?.toLowerCase()))?.toLowerCase() ?? 'seller';

      const transcripts = mode === 'buyer'
        ? getSellTranscriptsByBuyer(message.guild!.id, target.id)
        : getSellTranscriptsBySeller(message.guild!.id, target.id);

      if (!transcripts.length)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`🛍️ Orders — ${target.displayName}`)
          .setDescription(`No ${mode} records found for **${target.displayName}**.`)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      const recent = transcripts.slice(0, 10);
      const lines = recent.map(t =>
        `**\`${t.id}\`** — **${t.product}**\n` +
        `${mode === 'seller' ? `🛒 Buyer: <@${t.buyer_id}>` : `🏪 Seller: <@${t.seller_id}>`} • <t:${Math.floor(t.timestamp / 1000)}:R>`
      ).join('\n\n');

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.sell)
        .setTitle(`🛍️ Order History — ${target.displayName} (as ${mode})`)
        .setDescription(lines)
        .addFields(
          { name: '📊 Total', value: `${transcripts.length} order(s)`, inline: true },
        )
        .setThumbnail(target.user.displayAvatarURL({ size: 128 }))
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── DEAL CONFIRM ──────────────────────────────────────────────────────────
  {
    name: 'deal',
    description: 'Create a deal confirmation embed between seller and buyer',
    category: 'Sell / Announce',
    usage: 'deal <@buyer> <product> <amount>',
    aliases: ['dealconfirm', 'makedeal', 'confirmdeal'],
    async execute(message, args) {
      if (!canSayOrSell(message))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Messages** permission.')] });

      const buyer = message.mentions.members?.first();
      if (!buyer)
        return message.reply({ embeds: [errorEmbed('Missing Buyer', 'Mention the buyer.\n**Usage:** `!deal @buyer <product> <amount>`')] });

      const remArgs = args.filter(a => !a.match(/^<@!?\d+>$/));
      if (remArgs.length < 2)
        return message.reply({ embeds: [errorEmbed('Missing Details', 'Provide product name and amount.\n**Usage:** `!deal @buyer Netflix Account ₹199`')] });

      const amount = remArgs[remArgs.length - 1];
      const product = remArgs.slice(0, -1).join(' ');

      const embed = new EmbedBuilder()
        .setColor(0x00FF7F)
        .setTitle('🤝 Deal Confirmation')
        .setDescription('**A deal has been created. Both parties should confirm details before payment.**')
        .addFields(
          { name: '🏪 Seller', value: `<@${message.author.id}>`, inline: true },
          { name: '🛒 Buyer', value: `<@${buyer.id}>`, inline: true },
          { name: '📦 Product', value: product, inline: true },
          { name: '💰 Amount', value: amount, inline: true },
          { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '⚠️ Warning', value: 'Always verify product before paying. Report scammers to server staff immediately.', inline: false },
        )
        .setFooter({ text: `Deal ID: DEAL-${Date.now()} • ${BOT_FOOTER.text}` })
        .setTimestamp();

      await (message.channel as TextChannel).send({ content: `<@${buyer.id}> <@${message.author.id}>`, embeds: [embed] });
      await message.delete().catch(() => {});
    }
  },

  // ── PAYMENT PROOF ─────────────────────────────────────────────────────────
  {
    name: 'proof',
    description: 'Send a payment proof screenshot to a channel in a secure embed',
    category: 'Sell / Announce',
    usage: 'proof [#channel] (attach screenshot)',
    aliases: ['paymentproof', 'sendproof', 'payproof'],
    async execute(message, args) {
      // Permission gate — same as say/sell/deal
      if (!canSayOrSell(message))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Messages** permission to use the proof command.')] });

      const attachment = message.attachments.first();
      if (!attachment)
        return message.reply({ embeds: [errorEmbed('No Attachment', 'Attach a payment screenshot to your message.\n**Usage:** `!proof [#channel]` (with image attached)')] });

      // Only allow cross-channel posting if the bot member can view+send there
      const mentionedChannel = message.mentions.channels.first() as TextChannel | undefined;
      const targetChannel = (mentionedChannel ?? message.channel) as TextChannel;

      // Verify the invoker can actually send messages in the target channel
      if (mentionedChannel) {
        const invokerPerms = mentionedChannel.permissionsFor(message.member!);
        if (!invokerPerms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
          return message.reply({ embeds: [errorEmbed('No Access', `You do not have permission to send messages in <#${mentionedChannel.id}>.`)] });
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x00B4D8)
        .setTitle('💳 Payment Proof')
        .setDescription(`**${message.author.tag}** has submitted a payment proof.`)
        .setImage(attachment.url)
        .addFields(
          { name: '📤 Submitted By', value: `<@${message.author.id}>`, inline: true },
          { name: '📅 Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        )
        .setFooter({ text: `Payment Proof • ${BOT_FOOTER.text}` })
        .setTimestamp();

      await message.delete().catch(() => {});
      await targetChannel.send({ embeds: [embed] });

      if (targetChannel.id !== message.channel.id) {
        const conf = await (message.channel as TextChannel).send({ embeds: [successEmbed('Proof Sent', `Payment proof sent to <#${targetChannel.id}>.`)] });
        setTimeout(() => conf.delete().catch(() => {}), 4000);
      }
    }
  },

  // ── EMBED (generic embed sender for admins) ────────────────────────────────
  {
    name: 'embed',
    description: 'Send a fully customized embed to a channel',
    category: 'Sell / Announce',
    usage: 'embed [#channel] <title> | <description>',
    aliases: ['sendembed', 'embedmsg'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')] });

      const targetChannel = (message.mentions.channels.first() ?? message.channel) as TextChannel;
      const content = args.filter(a => !a.match(/^<#\d+>$/)).join(' ').trim();

      if (!content)
        return message.reply({ embeds: [errorEmbed('Missing Content', 'Provide content: `!embed [#channel] <title> | <description>`')] });

      let title = '';
      let description = content;
      if (content.includes('|')) {
        const parts = content.split('|');
        title = parts[0].trim();
        description = parts.slice(1).join('|').trim();
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setDescription(description)
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      if (title) embed.setTitle(title);

      const attachment = message.attachments.first();
      if (attachment?.contentType?.startsWith('image/')) embed.setImage(attachment.url);

      await message.delete().catch(() => {});
      await targetChannel.send({ embeds: [embed] });
    }
  },
];

export default sellCommands;
