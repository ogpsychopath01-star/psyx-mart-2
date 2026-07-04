import { EmbedBuilder, TextChannel } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import { hasPermission, Perms, isBotStaff } from '../utils/permissions.js';
import {
  addVouch, getVouchesForSeller, getVouchesFromBuyer, getAllVouches, deleteVouch,
  getLogChannel, VouchEntry,
} from '../database.js';
import { sendLog } from '../utils/helpers.js';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.vouch).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

function ratingStars(r: number): string {
  return '⭐'.repeat(Math.max(1, Math.min(5, r))) + '☆'.repeat(5 - Math.max(1, Math.min(5, r)));
}

function vouchEmbed(v: VouchEntry, buyerTag?: string, sellerTag?: string) {
  return new EmbedBuilder()
    .setColor(COLORS.vouch)
    .setTitle(`📦 Vouch #${v.id}`)
    .setDescription(`> ${v.message}`)
    .addFields(
      { name: '🛒 Buyer', value: `<@${v.buyer_id}>${buyerTag ? ` (${buyerTag})` : ''}`, inline: true },
      { name: '🏪 Seller', value: `<@${v.seller_id}>${sellerTag ? ` (${sellerTag})` : ''}`, inline: true },
      { name: '⭐ Rating', value: ratingStars(v.rating), inline: true },
      { name: '📅 Date', value: `<t:${Math.floor(v.timestamp / 1000)}:R>`, inline: true },
    )
    .setFooter(BOT_FOOTER)
    .setTimestamp(v.timestamp);
}

const vouchCommands: BotCommand[] = [

  // ── VOUCH (submit a vouch) ────────────────────────────────────────────────
  {
    name: 'vouch',
    description: 'Submit a vouch for a seller after purchasing from them',
    category: 'Vouches',
    usage: 'vouch <@seller> [1-5 stars] <message>',
    aliases: ['addvouch', 'review'],
    async execute(message, args) {
      const seller = message.mentions.members?.first();
      if (!seller)
        return message.reply({ embeds: [errorEmbed('Missing Seller', 'Mention the seller you are vouching for.\n**Usage:** `!vouch @seller [1-5] Your message here`')] });

      if (seller.id === message.author.id)
        return message.reply({ embeds: [errorEmbed('Cannot Self-Vouch', 'You cannot vouch for yourself.')] });

      if (seller.user.bot)
        return message.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot vouch for a bot.')] });

      // Parse rating from args (optional, defaults to 5)
      let rating = 5;
      let msgStart = 1;
      const potentialRating = parseInt(args[1]);
      if (!isNaN(potentialRating) && potentialRating >= 1 && potentialRating <= 5) {
        rating = potentialRating;
        msgStart = 2;
      }

      const vouchMsg = args.slice(msgStart).join(' ').trim();
      if (!vouchMsg || vouchMsg.length < 5)
        return message.reply({ embeds: [errorEmbed('Missing Message', 'Please write a vouch message (at least 5 characters).\n**Usage:** `!vouch @seller [1-5] Your honest review here`')] });

      if (vouchMsg.length > 500)
        return message.reply({ embeds: [errorEmbed('Too Long', 'Vouch message must be 500 characters or less.')] });

      const entry = addVouch({
        guild_id: message.guild!.id,
        buyer_id: message.author.id,
        seller_id: seller.id,
        message: vouchMsg,
        rating,
        timestamp: Date.now(),
      });

      const allVouches = getVouchesForSeller(message.guild!.id, seller.id);
      const avgRating = (allVouches.reduce((sum, v) => sum + v.rating, 0) / allVouches.length).toFixed(1);

      const embed = new EmbedBuilder()
        .setColor(COLORS.vouch)
        .setTitle('📦 Vouch Recorded!')
        .setDescription(`> ${vouchMsg}`)
        .addFields(
          { name: '🛒 Vouched By', value: `<@${message.author.id}>`, inline: true },
          { name: '🏪 Seller', value: `<@${seller.id}>`, inline: true },
          { name: '⭐ Rating', value: `${ratingStars(rating)} (${rating}/5)`, inline: true },
          { name: '📊 Seller Stats', value: `Total Vouches: **${allVouches.length}** | Avg Rating: **${avgRating}/5**`, inline: false },
          { name: '🆔 Vouch ID', value: `#${entry.id}`, inline: true },
        )
        .setThumbnail(seller.user.displayAvatarURL({ size: 128 }))
        .setFooter(BOT_FOOTER)
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Log to vouch log channel
      await sendLog(message.client, message.guild!.id, 'vouchlog', embed);

      // DM the seller
      try {
        await seller.send({ embeds: [new EmbedBuilder()
          .setColor(COLORS.vouch)
          .setTitle('📦 New Vouch Received!')
          .setDescription(`**${message.author.tag}** left you a vouch in **${message.guild!.name}**!`)
          .addFields(
            { name: '⭐ Rating', value: `${ratingStars(rating)} (${rating}/5)`, inline: true },
            { name: '💬 Message', value: `> ${vouchMsg}`, inline: false },
            { name: '📊 Your Total', value: `${allVouches.length} vouch(es) | Avg: ${avgRating}/5`, inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      } catch {}
    }
  },

  // ── VOUCHES (view vouches for a seller) ──────────────────────────────────
  {
    name: 'vouches',
    description: 'View all vouches for a seller, or server vouch stats',
    category: 'Vouches',
    usage: 'vouches [@seller] [all|me|page]',
    aliases: ['checkvouch', 'vouchlist', 'vouchs'],
    async execute(message, args) {
      const target = message.mentions.members?.first();
      const sub = args[0]?.toLowerCase();

      // Server-wide vouches (no mention, or sub = all)
      if (!target || sub === 'all') {
        const allVouches = getAllVouches(message.guild!.id);

        if (!allVouches.length)
          return message.reply({ embeds: [new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('📦 Server Vouches')
            .setDescription('No vouches have been submitted in this server yet.\nUse `!vouch @seller <message>` to submit one!')
            .setFooter(BOT_FOOTER)
            .setTimestamp()
          ] });

        // Calculate stats
        const sellerMap = new Map<string, VouchEntry[]>();
        for (const v of allVouches) {
          if (!sellerMap.has(v.seller_id)) sellerMap.set(v.seller_id, []);
          sellerMap.get(v.seller_id)!.push(v);
        }

        const topSellers = [...sellerMap.entries()]
          .map(([id, vouches]) => ({
            id,
            count: vouches.length,
            avg: (vouches.reduce((s, v) => s + v.rating, 0) / vouches.length).toFixed(1),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const totalAvg = (allVouches.reduce((s, v) => s + v.rating, 0) / allVouches.length).toFixed(1);

        const sellerList = topSellers.map((s, i) =>
          `**${i + 1}.** <@${s.id}> — **${s.count}** vouches | ⭐ ${s.avg}/5`
        ).join('\n');

        const recentVouches = allVouches.slice(0, 5).map(v =>
          `• <@${v.buyer_id}> → <@${v.seller_id}> — ${ratingStars(v.rating)} — \`${v.message.slice(0, 60)}${v.message.length > 60 ? '...' : ''}\``
        ).join('\n');

        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.vouch)
          .setTitle(`📦 Server Vouches — ${message.guild!.name}`)
          .addFields(
            { name: '📊 Statistics', value: `Total Vouches: **${allVouches.length}** | Average Rating: **${totalAvg}/5** ⭐`, inline: false },
            { name: '🏆 Top Sellers', value: sellerList || '*No sellers yet*', inline: false },
            { name: '🕐 Recent Vouches', value: recentVouches || '*None*', inline: false },
          )
          .setFooter({ text: `Use !vouches @seller to see details • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
        return;
      }

      // Vouches for a specific seller
      const vouches = getVouchesForSeller(message.guild!.id, target.id);

      if (!vouches.length)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`📦 Vouches — ${target.displayName}`)
          .setDescription(`**${target.displayName}** has no vouches yet.\nBuyers can use \`!vouch @${target.displayName} <message>\` to leave one.`)
          .setThumbnail(target.user.displayAvatarURL({ size: 128 }))
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      const avgRating = (vouches.reduce((s, v) => s + v.rating, 0) / vouches.length).toFixed(1);
      const fiveStars = vouches.filter(v => v.rating === 5).length;
      const recent = vouches.slice(0, 8);

      const vouchLines = recent.map(v =>
        `**#${v.id}** • <@${v.buyer_id}> • ${ratingStars(v.rating)} • <t:${Math.floor(v.timestamp / 1000)}:R>\n> ${v.message.slice(0, 120)}${v.message.length > 120 ? '...' : ''}`
      ).join('\n\n');

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.vouch)
        .setTitle(`📦 Vouches — ${target.displayName}`)
        .setThumbnail(target.user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '📊 Stats', value: `Total: **${vouches.length}** | Avg: **${avgRating}/5** ⭐ | 5-Star: **${fiveStars}**`, inline: false },
          { name: `📋 Recent Vouches (showing ${recent.length}/${vouches.length})`, value: vouchLines, inline: false },
        )
        .setFooter({ text: `Use !vouch @${target.displayName} <msg> to leave a vouch • ${BOT_FOOTER.text}` })
        .setTimestamp()
      ] });
    }
  },

  // ── VOUCHCHECK (view a specific vouch by ID) ──────────────────────────────
  {
    name: 'vouchcheck',
    description: 'View details of a specific vouch by ID',
    category: 'Vouches',
    usage: 'vouchcheck <vouch_id>',
    aliases: ['vouchid', 'checkvouch'],
    async execute(message, args) {
      const id = parseInt(args[0]);
      if (isNaN(id))
        return message.reply({ embeds: [errorEmbed('Invalid ID', 'Provide a valid vouch ID number.\n**Usage:** `!vouchcheck 5`')] });

      const allVouches = getAllVouches(message.guild!.id);
      const v = allVouches.find(v => v.id === id);

      if (!v)
        return message.reply({ embeds: [errorEmbed('Not Found', `Vouch **#${id}** was not found in this server.`)] });

      let buyerTag = ''; let sellerTag = '';
      try {
        const buyer = await message.guild!.members.fetch(v.buyer_id).catch(() => null);
        const seller = await message.guild!.members.fetch(v.seller_id).catch(() => null);
        buyerTag = buyer?.user.tag ?? '';
        sellerTag = seller?.user.tag ?? '';
      } catch {}

      await message.reply({ embeds: [vouchEmbed(v, buyerTag, sellerTag)] });
    }
  },

  // ── MY VOUCHES ────────────────────────────────────────────────────────────
  {
    name: 'myvouches',
    description: 'View vouches you received (as a seller)',
    category: 'Vouches',
    usage: 'myvouches',
    aliases: ['myvouchlist', 'myreviews'],
    async execute(message) {
      const vouches = getVouchesForSeller(message.guild!.id, message.author.id);
      if (!vouches.length)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('📦 Your Vouches')
          .setDescription('You have no vouches yet. Ask your buyers to use `!vouch @you <message>`!')
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      const avg = (vouches.reduce((s, v) => s + v.rating, 0) / vouches.length).toFixed(1);
      const recent = vouches.slice(0, 8);
      const lines = recent.map(v =>
        `**#${v.id}** • <@${v.buyer_id}> • ${ratingStars(v.rating)} • <t:${Math.floor(v.timestamp / 1000)}:R>\n> ${v.message.slice(0, 100)}...`
      ).join('\n\n');

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.vouch)
        .setTitle('📦 Your Vouches (as Seller)')
        .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '📊 Stats', value: `Total: **${vouches.length}** | Avg Rating: **${avg}/5** ⭐`, inline: false },
          { name: `📋 Recent (${recent.length}/${vouches.length})`, value: lines, inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── DELETE VOUCH (mod/owner only) ─────────────────────────────────────────
  {
    name: 'delvouche',
    description: 'Delete a vouch by ID (Manage Server required)',
    category: 'Vouches',
    usage: 'delvouche <vouch_id>',
    aliases: ['deletevouch', 'removevouch', 'vouchdel'],
    async execute(message, args) {
      if (!hasPermission(message.member!, Perms.ManageGuild) && !isBotStaff(message.author.id))
        return message.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission to delete vouches.')] });

      const id = parseInt(args[0]);
      if (isNaN(id))
        return message.reply({ embeds: [errorEmbed('Invalid ID', 'Provide a valid vouch ID.\n**Usage:** `!delvouche 5`')] });

      const allVouches = getAllVouches(message.guild!.id);
      const v = allVouches.find(v => v.id === id);
      if (!v)
        return message.reply({ embeds: [errorEmbed('Not Found', `Vouch **#${id}** was not found in this server.`)] });

      deleteVouch(id);
      await message.reply({ embeds: [successEmbed('Vouch Deleted', `Vouch **#${id}** has been removed from the server records.\n\n**Buyer:** <@${v.buyer_id}>\n**Seller:** <@${v.seller_id}>\n**Message:** ${v.message.slice(0, 100)}`)] });
    }
  },

  // ── VOUCH LEADERBOARD ─────────────────────────────────────────────────────
  {
    name: 'vouchlb',
    description: 'Show the server vouch leaderboard — top sellers by vouch count',
    category: 'Vouches',
    usage: 'vouchlb',
    aliases: ['vouchrankings', 'vouchboard', 'toplb'],
    async execute(message) {
      const allVouches = getAllVouches(message.guild!.id);
      if (!allVouches.length)
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('📦 Vouch Leaderboard')
          .setDescription('No vouches have been recorded yet!\nUse `!vouch @seller <message>` to submit the first one.')
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });

      const sellerMap = new Map<string, VouchEntry[]>();
      for (const v of allVouches) {
        if (!sellerMap.has(v.seller_id)) sellerMap.set(v.seller_id, []);
        sellerMap.get(v.seller_id)!.push(v);
      }

      const sorted = [...sellerMap.entries()]
        .map(([id, vouches]) => ({
          id,
          count: vouches.length,
          avg: vouches.reduce((s, v) => s + v.rating, 0) / vouches.length,
        }))
        .sort((a, b) => b.count - a.count || b.avg - a.avg)
        .slice(0, 10);

      const medals = ['🥇', '🥈', '🥉'];
      const lines = sorted.map((s, i) => {
        const bar = '▓'.repeat(Math.min(s.count, 10)) + '░'.repeat(Math.max(0, 10 - s.count));
        return `${medals[i] ?? `**#${i + 1}**`} <@${s.id}>\n\`${bar}\` **${s.count}** vouches • ⭐ ${s.avg.toFixed(1)}/5`;
      }).join('\n\n');

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.vouch)
        .setTitle(`📦 Vouch Leaderboard — ${message.guild!.name}`)
        .setDescription(lines)
        .addFields(
          { name: '📊 Server Total', value: `**${allVouches.length}** vouches across **${sellerMap.size}** sellers`, inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },
];

export default vouchCommands;
