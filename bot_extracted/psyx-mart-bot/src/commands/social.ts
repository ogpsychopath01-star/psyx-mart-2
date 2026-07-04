import { EmbedBuilder } from 'discord.js';
import { BotCommand } from '../client.js';
import { COLORS, BOT_FOOTER } from '../utils/embeds.js';
import axios from 'axios';

function successEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}
function errorEmbed(t: string, d: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${t}`).setDescription(d).setFooter(BOT_FOOTER).setTimestamp();
}

// ── URL PLATFORM DETECTION ─────────────────────────────────────────────────
function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/reddit\.com/.test(url)) return 'reddit';
  if (/twitch\.tv/.test(url)) return 'twitch';
  if (/spotify\.com/.test(url)) return 'spotify';
  if (/soundcloud\.com/.test(url)) return 'soundcloud';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  if (/facebook\.com|fb\.com/.test(url)) return 'facebook';
  return 'other';
}

// ── PLATFORM COLORS ────────────────────────────────────────────────────────
const platformColors: Record<string, number> = {
  youtube: 0xFF0000, instagram: 0xE1306C, tiktok: 0x010101,
  twitter: 0x1DA1F2, reddit: 0xFF4500, twitch: 0x9146FF,
  spotify: 0x1DB954, soundcloud: 0xFF5500, vimeo: 0x1AB7EA,
  facebook: 0x1877F2, other: 0x6C63FF,
};

const platformEmojis: Record<string, string> = {
  youtube: '▶️', instagram: '📸', tiktok: '🎵', twitter: '🐦',
  reddit: '🤖', twitch: '🎮', spotify: '🎧', soundcloud: '🎶',
  vimeo: '🎬', facebook: '📘', other: '🔗',
};

// ── FETCH OG TAGS ──────────────────────────────────────────────────────────
async function fetchOgTags(url: string): Promise<{ title?: string; description?: string; image?: string; site_name?: string }> {
  try {
    const res = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)' } });
    const html = res.data as string;
    const getTag = (property: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
      return m ? m[1] : undefined;
    };
    return {
      title: getTag('og:title') || getTag('twitter:title'),
      description: getTag('og:description') || getTag('twitter:description'),
      image: getTag('og:image') || getTag('twitter:image'),
      site_name: getTag('og:site_name'),
    };
  } catch { return {}; }
}

// ── RANDOM ROASTS ──────────────────────────────────────────────────────────
const roasts = [
  "You're the reason God created the middle finger.",
  "I'd agree with you but then we'd both be wrong.",
  "You have the perfect face for radio.",
  "You're not stupid; you just have bad luck thinking.",
  "I'd explain it to you but I left my crayons at home.",
  "You're like a software update — whenever I see you I think 'not now'.",
  "Some cause happiness wherever they go; you cause it whenever you go.",
  "Somewhere out there, a tree is producing oxygen just for you. Go apologize.",
  "You have something on your chin... no, the third one down.",
  "I'm not saying I hate you, but I'd unplug your life support to charge my phone.",
  "If laughter is the best medicine, your face must be curing diseases.",
  "You're like a cloud — when you disappear it's a beautiful day.",
  "I'm jealous of people who don't know you.",
  "You're proof that evolution can go in reverse.",
  "I thought of you today. It reminded me to take out the trash.",
];

// ── COMPLIMENTS ────────────────────────────────────────────────────────────
const compliments = [
  "You make the world a better place just by being in it! 🌟",
  "Your kindness is a superpower! ⚡",
  "You have the most contagious smile! 😊",
  "Everything is more interesting when you're around! 💫",
  "You're one of the strongest people I know! 💪",
  "Your creativity is absolutely incredible! 🎨",
  "You are a ray of sunshine on a cloudy day! ☀️",
  "You inspire others more than you know! ✨",
  "Your potential is limitless! 🚀",
  "You always know what to say to make people feel better! 💖",
  "You light up every room you walk into! 🌟",
  "The world is lucky to have you in it! 🌍",
  "You are genuinely one of a kind! 💎",
  "Your passion is truly inspiring! 🔥",
  "You're more fun than bubble wrap! 🎉",
];

// ── 8BALL RESPONSES ────────────────────────────────────────────────────────
const eightBallResponses = [
  '✅ It is certain.', '✅ It is decidedly so.', '✅ Without a doubt.',
  '✅ Yes, definitely.', '✅ You may rely on it.', '✅ As I see it, yes.',
  '✅ Most likely.', '✅ Outlook good.', '✅ Yes.', '✅ Signs point to yes.',
  '🔮 Reply hazy, try again.', '🔮 Ask again later.', '🔮 Better not tell you now.',
  '🔮 Cannot predict now.', '🔮 Concentrate and ask again.',
  '❌ Don\'t count on it.', '❌ My reply is no.', '❌ My sources say no.',
  '❌ Outlook not so good.', '❌ Very doubtful.',
];

// ── WYR QUESTIONS ──────────────────────────────────────────────────────────
const wyrQuestions = [
  ['Have unlimited money but no friends', 'Have unlimited friends but no money'],
  ['Know when you\'ll die', 'Know how you\'ll die'],
  ['Be invisible', 'Be able to fly'],
  ['Never eat again', 'Never sleep again'],
  ['Always be cold', 'Always be hot'],
  ['Speak all languages', 'Play all musical instruments'],
  ['Have no internet for a year', 'Have no phone for a year'],
  ['Be able to talk to animals', 'Read minds'],
  ['Live in the past', 'Live in the future'],
  ['Have superspeed', 'Have superstrength'],
];

// ── TRUTH QUESTIONS ────────────────────────────────────────────────────────
const truthQuestions = [
  'What is the most embarrassing thing you\'ve ever done?',
  'What\'s the biggest lie you\'ve ever told?',
  'What\'s a secret you\'ve never told anyone?',
  'What\'s the weirdest thing you\'ve done when alone?',
  'Have you ever cheated on a test?',
  'Who was your first crush?',
  'What\'s your most irrational fear?',
  'What\'s the most embarrassing song you like?',
  'Have you ever ghosted someone? Why?',
  'What\'s the strangest dream you\'ve had?',
];

// ── DARE CHALLENGES ────────────────────────────────────────────────────────
const dareChallenges = [
  'Send a silly selfie in this server!',
  'Write a short poem about the person above you.',
  'Change your nickname to something embarrassing for 10 minutes.',
  'Say 5 nice things about the last person who spoke.',
  'Do a 10-second impression of your favorite celebrity.',
  'Tell everyone your most embarrassing childhood memory.',
  'Speak in a different accent for the next 3 messages.',
  'Share your most cringe text message.',
  'List 3 things you find attractive in a person.',
  'Describe yourself in 3 words — honestly!',
];

// ── NHIE ──────────────────────────────────────────────────────────────────
const nhieStatements = [
  'Never have I ever stayed up past 3AM playing games.',
  'Never have I ever sent a message to the wrong person.',
  'Never have I ever skipped school/work.',
  'Never have I ever lied to get out of trouble.',
  'Never have I ever eaten food off the floor.',
  'Never have I ever pretended to be busy to avoid someone.',
  'Never have I ever fallen asleep in class.',
  'Never have I ever stalked someone\'s profile for over an hour.',
  'Never have I ever cried during a movie.',
  'Never have I ever talked to myself for more than 5 minutes.',
];

// ── SLAP/HUG/PAT GIFS (Tenor) ─────────────────────────────────────────────
const slapGifs = [
  'https://media.tenor.com/images/b8ebe6c06f4946dce72c1e1d5041ec90/tenor.gif',
  'https://media.tenor.com/images/2ba35f15d2ece16a1dbf90a7a14f3a27/tenor.gif',
];
const hugGifs = [
  'https://media.tenor.com/images/dfc2bd4cd9ad2e09a99b98c73c5adeee/tenor.gif',
  'https://media.tenor.com/images/2b6038a3d04ab0ff0c12875acce07eac/tenor.gif',
];
const patGifs = [
  'https://media.tenor.com/images/e23bced60f74c3b78f7ab38b527ec42e/tenor.gif',
  'https://media.tenor.com/images/17e8cd4d7dc29e2484ffe99e31bff35e/tenor.gif',
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const socialCommands: BotCommand[] = [

  // ── STAIN / PLAY (LINK PREVIEW) ────────────────────────────────────────
  {
    name: 'stain',
    description: 'Fetch and display any social media link (YouTube, Instagram, TikTok, Twitter, etc.) with a rich embed',
    category: 'Social',
    aliases: ['play', 'media', 'link', 'preview', 'embed', 'show'],
    usage: 'stain <url>',
    async execute(message, args) {
      const url = args[0];
      if (!url || !url.startsWith('http')) {
        return message.reply({ embeds: [errorEmbed('Missing Link', 'Provide a social media link.\n**Example:** `!stain https://www.youtube.com/watch?v=dQw4w9WgXcQ`\n\n**Supported:** YouTube, Instagram, TikTok, Twitter/X, Reddit, Twitch, Spotify, SoundCloud, Vimeo, and more!')] });
      }

      const platform = detectPlatform(url);
      const color = platformColors[platform] || 0x6C63FF;
      const emoji = platformEmojis[platform] || '🔗';

      const loadMsg = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(color as any)
        .setTitle(`${emoji} Loading media...`)
        .setDescription('Fetching content info, please wait...')
        .setFooter(BOT_FOOTER)
      ] });

      try {
        let embedData: any = { title: '', description: '', image: '', author: '' };

        // YouTube-specific: use oEmbed
        if (platform === 'youtube') {
          try {
            const oembed = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
            const d = oembed.data;
            // Extract YouTube video ID for thumbnail
            const vidMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
            const thumb = vidMatch ? `https://img.youtube.com/vi/${vidMatch[1]}/maxresdefault.jpg` : d.thumbnail_url;
            embedData = { title: d.title, author: d.author_name, image: thumb, platform: 'YouTube' };
          } catch {
            const og = await fetchOgTags(url);
            embedData = { title: og.title, description: og.description, image: og.image, author: og.site_name };
          }
        } else {
          // Generic og:tag fetch for other platforms
          const og = await fetchOgTags(url);
          embedData = { title: og.title, description: og.description, image: og.image, author: og.site_name };
        }

        const platformName = {
          youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok',
          twitter: 'Twitter / X', reddit: 'Reddit', twitch: 'Twitch',
          spotify: 'Spotify', soundcloud: 'SoundCloud', vimeo: 'Vimeo',
          facebook: 'Facebook', other: 'Web',
        }[platform] || 'Link';

        const embed = new EmbedBuilder()
          .setColor(color as any)
          .setTitle(`${emoji}  ${embedData.title || `${platformName} Content`}`)
          .setURL(url)
          .setFooter({ text: `${platformName} • Requested by ${message.author.tag}` })
          .setTimestamp();

        if (embedData.description) embed.setDescription(embedData.description.slice(0, 300));
        if (embedData.image) embed.setImage(embedData.image);
        if (embedData.author) embed.setAuthor({ name: embedData.author });

        embed.addFields(
          { name: '🔗 Platform', value: platformName, inline: true },
          { name: '👤 Shared by', value: `<@${message.author.id}>`, inline: true },
          { name: '📎 Link', value: `[Open ${platformName}](${url})`, inline: true },
        );

        await loadMsg.edit({ embeds: [embed] });

      } catch {
        await loadMsg.edit({ embeds: [new EmbedBuilder()
          .setColor(color as any)
          .setTitle(`${emoji} ${platform === 'youtube' ? 'YouTube' : 'Media'} Link`)
          .setDescription(`Shared by <@${message.author.id}>\n\n**[Click to open ↗](${url})**`)
          .setURL(url)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── YOUTUBE SEARCH EMBED ───────────────────────────────────────────────
  {
    name: 'youtube',
    description: 'Show YouTube video info from a link',
    category: 'Social',
    aliases: ['yt', 'ytvideo'],
    usage: 'youtube <url>',
    async execute(message, args) {
      const url = args[0];
      if (!url || !/youtube\.com|youtu\.be/.test(url)) {
        return message.reply({ embeds: [errorEmbed('Invalid URL', 'Provide a valid YouTube video URL.')] });
      }
      try {
        const oembed = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
        const d = oembed.data;
        const vidMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        const thumb = vidMatch ? `https://img.youtube.com/vi/${vidMatch[1]}/maxresdefault.jpg` : d.thumbnail_url;

        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xFF0000 as any)
          .setTitle(`▶️  ${d.title}`)
          .setURL(url)
          .setImage(thumb)
          .addFields(
            { name: '👤 Channel', value: d.author_name, inline: true },
            { name: '📐 Resolution', value: `${d.width}×${d.height}`, inline: true },
            { name: '🔗 Watch', value: `[Open on YouTube](${url})`, inline: true },
          )
          .setFooter({ text: `YouTube • Shared by ${message.author.tag}` })
          .setTimestamp()
        ] });
      } catch {
        return message.reply({ embeds: [errorEmbed('Fetch Failed', 'Could not fetch YouTube video info. Make sure the URL is valid and the video is public.')] });
      }
    }
  },

  // ── MEME ──────────────────────────────────────────────────────────────
  {
    name: 'meme',
    description: 'Get a random meme from Reddit',
    category: 'Social',
    aliases: ['randommeme', 'getmeme'],
    usage: 'meme',
    async execute(message) {
      try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 8000 });
        const d = res.data;
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.fun as any)
          .setTitle(`😂  ${d.title}`)
          .setURL(d.postLink)
          .setImage(d.url)
          .addFields(
            { name: '👍 Upvotes', value: `${d.ups.toLocaleString()}`, inline: true },
            { name: '🤖 Subreddit', value: `r/${d.subreddit}`, inline: true },
            { name: '👤 Posted by', value: `u/${d.author}`, inline: true },
          )
          .setFooter({ text: `Random Meme • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Meme Failed', 'Could not fetch a meme right now. Try again!')] });
      }
    }
  },

  // ── JOKE ──────────────────────────────────────────────────────────────
  {
    name: 'joke',
    description: 'Get a random joke',
    category: 'Social',
    aliases: ['randomjoke', 'funfact'],
    usage: 'joke',
    async execute(message) {
      try {
        const res = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist,explicit', { timeout: 8000 });
        const d = res.data;
        const jokeText = d.type === 'twopart' ? `**${d.setup}**\n\n||${d.delivery}||` : d.joke;
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.fun as any)
          .setTitle('😄  Random Joke')
          .setDescription(jokeText)
          .setFooter({ text: `Category: ${d.category} • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        const jokes = [
          "Why don't scientists trust atoms? Because they make up everything!",
          "I'm reading a book about anti-gravity. It's impossible to put down!",
          "Why did the math book look so sad? Because it had too many problems.",
          "What do you call a fake noodle? An impasta!",
        ];
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.fun as any)
          .setTitle('😄  Random Joke')
          .setDescription(pick(jokes))
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── FACT ──────────────────────────────────────────────────────────────
  {
    name: 'fact',
    description: 'Get a random interesting fact',
    category: 'Social',
    aliases: ['randomfact', 'didyouknow'],
    usage: 'fact',
    async execute(message) {
      try {
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 8000 });
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x00BCD4 as any)
          .setTitle('💡  Random Fact')
          .setDescription(`> ${res.data.text}`)
          .setFooter({ text: `Useless Facts • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x00BCD4 as any)
          .setTitle('💡  Random Fact')
          .setDescription('> Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still perfectly edible!')
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── DOG ───────────────────────────────────────────────────────────────
  {
    name: 'dog',
    description: 'Get a random cute dog picture',
    category: 'Social',
    aliases: ['randomdog', 'doggo', 'woof'],
    usage: 'dog',
    async execute(message) {
      try {
        const res = await axios.get('https://dog.ceo/api/breeds/image/random', { timeout: 8000 });
        const breed = res.data.message.split('/').slice(-2, -1)[0].replace('-', ' ');
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x8B4513 as any)
          .setTitle('🐕  Random Doggo!')
          .setImage(res.data.message)
          .setDescription(`Breed: **${breed}**`)
          .setFooter({ text: `Woof! • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Dog Not Found', 'Could not fetch a doggo. Try again!')] });
      }
    }
  },

  // ── CAT ───────────────────────────────────────────────────────────────
  {
    name: 'cat',
    description: 'Get a random cute cat picture',
    category: 'Social',
    aliases: ['randomcat', 'kitty', 'meow'],
    usage: 'cat',
    async execute(message) {
      try {
        const res = await axios.get('https://api.thecatapi.com/v1/images/search', { timeout: 8000 });
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xFF6B9D as any)
          .setTitle('🐱  Random Kitty!')
          .setImage(res.data[0].url)
          .setFooter({ text: `Meow! • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Cat Not Found', 'Could not fetch a kitty. Try again!')] });
      }
    }
  },

  // ── ADVICE ────────────────────────────────────────────────────────────
  {
    name: 'advice',
    description: 'Get a random piece of advice',
    category: 'Social',
    aliases: ['randomadvice', 'tip'],
    usage: 'advice',
    async execute(message) {
      try {
        const res = await axios.get('https://api.adviceslip.com/advice', { timeout: 8000 });
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.teal as any)
          .setTitle('📖  Advice of the Moment')
          .setDescription(`> ${res.data.slip.advice}`)
          .setFooter({ text: `Advice #${res.data.slip.id} • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.teal as any)
          .setTitle('📖  Advice')
          .setDescription('> Be yourself; everyone else is already taken. — Oscar Wilde')
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── QUOTE ─────────────────────────────────────────────────────────────
  {
    name: 'quote',
    description: 'Get a random inspirational quote',
    category: 'Social',
    aliases: ['inspire', 'inspiration', 'qotd'],
    usage: 'quote',
    async execute(message) {
      try {
        const res = await axios.get('https://api.quotable.io/random', { timeout: 8000 });
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.gold as any)
          .setTitle('✨  Inspirational Quote')
          .setDescription(`*"${res.data.content}"*`)
          .addFields({ name: '— Author', value: res.data.author, inline: true })
          .setFooter({ text: `Tags: ${res.data.tags?.join(', ') || 'general'} • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        const quotes = [
          { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
          { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
          { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
        ];
        const q = pick(quotes);
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.gold as any)
          .setTitle('✨  Quote')
          .setDescription(`*"${q.text}"*\n\n— **${q.author}**`)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── WEATHER ───────────────────────────────────────────────────────────
  {
    name: 'weather',
    description: 'Check the current weather for a city',
    category: 'Social',
    aliases: ['forecast', 'temp', 'climate'],
    usage: 'weather <city>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing City', 'Provide a city name.\n**Example:** `!weather Mumbai`')] });
      const city = args.join(' ');
      try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 8000 });
        const d = res.data;
        const current = d.current_condition[0];
        const area = d.nearest_area[0];
        const name = `${area.areaName[0].value}, ${area.country[0].value}`;
        const tempC = current.temp_C;
        const tempF = current.temp_F;
        const feels = current.FeelsLikeC;
        const desc = current.weatherDesc[0].value;
        const humidity = current.humidity;
        const wind = current.windspeedKmph;
        const visibility = current.visibility;
        const uvIndex = current.uvIndex;

        const weatherEmoji = desc.toLowerCase().includes('sun') ? '☀️' :
          desc.toLowerCase().includes('rain') ? '🌧️' :
          desc.toLowerCase().includes('cloud') ? '☁️' :
          desc.toLowerCase().includes('snow') ? '❄️' :
          desc.toLowerCase().includes('storm') ? '⛈️' :
          desc.toLowerCase().includes('fog') ? '🌫️' : '🌡️';

        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x00B0F4 as any)
          .setTitle(`${weatherEmoji}  Weather in ${name}`)
          .addFields(
            { name: '🌡️ Temperature', value: `**${tempC}°C** / ${tempF}°F`, inline: true },
            { name: '🤔 Feels Like', value: `${feels}°C`, inline: true },
            { name: '📋 Condition', value: desc, inline: true },
            { name: '💧 Humidity', value: `${humidity}%`, inline: true },
            { name: '💨 Wind', value: `${wind} km/h`, inline: true },
            { name: '👁️ Visibility', value: `${visibility} km`, inline: true },
            { name: '☀️ UV Index', value: uvIndex, inline: true },
          )
          .setFooter({ text: `Weather data via wttr.in • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('City Not Found', `Could not fetch weather for **${city}**. Make sure the city name is correct.`)] });
      }
    }
  },

  // ── DEFINE ────────────────────────────────────────────────────────────
  {
    name: 'define',
    description: 'Get the dictionary definition of a word',
    category: 'Social',
    aliases: ['dictionary', 'definition', 'meaning'],
    usage: 'define <word>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Word', 'Provide a word to define.')] });
      const word = args[0];
      try {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 8000 });
        const entry = res.data[0];
        const meanings = entry.meanings.slice(0, 3);
        const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || '';

        const fields = meanings.map((m: any) => ({
          name: `📌 ${m.partOfSpeech}`,
          value: m.definitions.slice(0, 2).map((d: any, i: number) => `${i + 1}. ${d.definition}${d.example ? `\n   *"${d.example}"*` : ''}`).join('\n'),
          inline: false,
        }));

        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.info as any)
          .setTitle(`📚  ${word}${phonetic ? ` *${phonetic}*` : ''}`)
          .addFields(fields)
          .setFooter({ text: `Dictionary • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Not Found', `Could not find a definition for **${word}**. Check the spelling and try again.`)] });
      }
    }
  },

  // ── URBAN ─────────────────────────────────────────────────────────────
  {
    name: 'urban',
    description: 'Look up a slang term on Urban Dictionary',
    category: 'Social',
    aliases: ['ud', 'slang', 'urbandictionary'],
    usage: 'urban <term>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Term', 'Provide a slang term to look up.')] });
      const term = args.join(' ');
      try {
        const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`, { timeout: 8000 });
        const entry = res.data.list?.[0];
        if (!entry) return message.reply({ embeds: [errorEmbed('Not Found', `No Urban Dictionary entry found for **${term}**.`)] });

        const def = entry.definition.replace(/\[|\]/g, '').slice(0, 800);
        const example = entry.example?.replace(/\[|\]/g, '').slice(0, 300);

        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x134FE6 as any)
          .setTitle(`🔍  ${entry.word}`)
          .setURL(entry.permalink)
          .setDescription(def)
          .addFields(
            example ? { name: '📝 Example', value: `*${example}*`, inline: false } : { name: '\u200b', value: '\u200b', inline: false },
            { name: '👍 Thumbs Up', value: `${entry.thumbs_up.toLocaleString()}`, inline: true },
            { name: '👎 Thumbs Down', value: `${entry.thumbs_down.toLocaleString()}`, inline: true },
            { name: '✍️ Author', value: entry.author, inline: true },
          )
          .setFooter({ text: `Urban Dictionary • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Fetch Failed', 'Could not reach Urban Dictionary. Try again later.')] });
      }
    }
  },

  // ── TRIVIA ────────────────────────────────────────────────────────────
  {
    name: 'trivia',
    description: 'Answer a random trivia question',
    category: 'Social',
    aliases: ['quiz', 'question'],
    usage: 'trivia',
    async execute(message) {
      try {
        const res = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 8000 });
        const q = res.data.results[0];
        const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

        const question = decode(q.question);
        const correct = decode(q.correct_answer);
        const incorrect = q.incorrect_answers.map(decode);
        const options = [...incorrect, correct].sort(() => Math.random() - 0.5);
        const letters = ['🇦', '🇧', '🇨', '🇩'];
        const correctLetter = letters[options.indexOf(correct)];

        const optionText = options.map((o, i) => `${letters[i]} ${o}`).join('\n');

        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.purple as any)
          .setTitle('🧠  Trivia Question')
          .setDescription(`**${question}**\n\n${optionText}`)
          .addFields(
            { name: '📂 Category', value: q.category, inline: true },
            { name: '⚡ Difficulty', value: q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1), inline: true },
          )
          .setFooter({ text: `Answer: ||${correctLetter} ${correct}|| • ${BOT_FOOTER.text}` })
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Trivia Failed', 'Could not fetch a trivia question right now. Try again!')] });
      }
    }
  },

  // ── REDDIT ────────────────────────────────────────────────────────────
  {
    name: 'reddit',
    description: 'Get a random hot post from a subreddit',
    category: 'Social',
    aliases: ['subreddit', 'redditmeme'],
    usage: 'reddit [subreddit] (default: memes)',
    async execute(message, args) {
      const sub = args[0]?.replace(/^r\//i, '') || 'memes';
      try {
        const res = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
          timeout: 8000,
          headers: { 'User-Agent': 'PSYX-MART-Bot/3.0' }
        });
        const posts = res.data?.data?.children?.filter((p: any) => !p.data.stickied && !p.data.over_18) || [];
        if (!posts.length) return message.reply({ embeds: [errorEmbed('No Posts', `Could not find posts in **r/${sub}**. The subreddit may not exist or be empty.`)] });

        const post = pick(posts).data;
        const isImage = post.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        const embed = new EmbedBuilder()
          .setColor(0xFF4500 as any)
          .setTitle(post.title?.slice(0, 250) || 'Reddit Post')
          .setURL(`https://reddit.com${post.permalink}`)
          .addFields(
            { name: '👍 Upvotes', value: `${post.ups?.toLocaleString() || '0'}`, inline: true },
            { name: '💬 Comments', value: `${post.num_comments?.toLocaleString() || '0'}`, inline: true },
            { name: '📌 Flair', value: post.link_flair_text || 'None', inline: true },
          )
          .setFooter({ text: `r/${sub} • u/${post.author} • ${BOT_FOOTER.text}` })
          .setTimestamp();

        if (post.selftext) embed.setDescription(post.selftext.slice(0, 500));
        if (isImage) embed.setImage(post.url);

        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Subreddit Error', `Could not fetch from **r/${sub}**. Make sure the subreddit name is correct.`)] });
      }
    }
  },

  // ── 8BALL ─────────────────────────────────────────────────────────────
  {
    name: '8ball',
    description: 'Ask the magic 8-ball a yes/no question',
    category: 'Social',
    aliases: ['eightball', 'magic8', 'ask'],
    usage: '8ball <question>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Question', 'Ask the magic 8-ball a question!')] });
      const response = pick(eightBallResponses);
      const color = response.startsWith('✅') ? 0x2ECC71 : response.startsWith('🔮') ? 0x9B59B6 : 0xE74C3C;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(color as any)
        .setTitle('🎱  Magic 8-Ball')
        .addFields(
          { name: '❓ Question', value: args.join(' '), inline: false },
          { name: '🔮 Answer', value: response, inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── SHIP ──────────────────────────────────────────────────────────────
  {
    name: 'ship',
    description: 'Ship two users and get their compatibility score',
    category: 'Social',
    aliases: ['love', 'compatibility', 'match'],
    usage: 'ship <@user1> <@user2>',
    async execute(message, args) {
      const user1 = message.mentions.users.first() ?? message.author;
      const user2 = message.mentions.users.at(1) ?? message.author;
      if (user1.id === user2.id) return message.reply({ embeds: [errorEmbed('Same User', 'Mention two different users!')] });

      const score = Math.floor(Math.random() * 101);
      const bar = '❤️'.repeat(Math.floor(score / 10)) + '🖤'.repeat(10 - Math.floor(score / 10));
      const rating = score >= 90 ? '💞 Soulmates!' : score >= 70 ? '💖 Great match!' : score >= 50 ? '💛 Could work!' : score >= 30 ? '💔 Challenging...' : '😬 Not the best...';
      const shipName = user1.username.slice(0, Math.ceil(user1.username.length / 2)) + user2.username.slice(Math.floor(user2.username.length / 2));

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF69B4 as any)
        .setTitle(`💘  ${user1.username} + ${user2.username}`)
        .setDescription(`**Ship Name:** \`${shipName}\`\n\n${bar}\n\n**Compatibility: ${score}%** — ${rating}`)
        .setThumbnail(user1.displayAvatarURL())
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── RATE ──────────────────────────────────────────────────────────────
  {
    name: 'rate',
    description: 'Rate something out of 10',
    category: 'Social',
    aliases: ['rateit', 'howgood'],
    usage: 'rate <thing>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Input', 'Provide something to rate!')] });
      const thing = args.join(' ');
      const score = Math.floor(Math.random() * 11);
      const stars = '⭐'.repeat(score) + '☆'.repeat(10 - score);
      const comment = score === 10 ? 'Perfect! 🏆' : score >= 8 ? 'Excellent! 🌟' : score >= 6 ? 'Pretty good! 👍' : score >= 4 ? 'Not bad... 🤷' : score >= 2 ? 'Could be better 😬' : 'Yikes... 💀';

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.gold as any)
        .setTitle('⭐  Rating Machine')
        .setDescription(`I rate **${thing}**:\n\n${stars}\n\n**${score}/10** — ${comment}`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── CHOOSE ────────────────────────────────────────────────────────────
  {
    name: 'choose',
    description: 'Choose between multiple options (separate with |)',
    category: 'Social',
    aliases: ['pick', 'decide', 'random'],
    usage: 'choose <option1 | option2 | option3 ...>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Options', 'Provide options separated by `|`.\n**Example:** `!choose pizza | burger | sushi`')] });
      const options = args.join(' ').split('|').map(s => s.trim()).filter(Boolean);
      if (options.length < 2) return message.reply({ embeds: [errorEmbed('Too Few Options', 'Provide at least 2 options separated by `|`.')] });
      const chosen = pick(options);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.primary as any)
        .setTitle('🎯  Decision Made!')
        .setDescription(`From **${options.length}** options, I choose:\n\n# ${chosen}`)
        .addFields({ name: '📋 All Options', value: options.map((o, i) => `${i + 1}. ${o}`).join('\n'), inline: false })
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── PP SIZE ───────────────────────────────────────────────────────────
  {
    name: 'pp',
    description: 'Check the PP size of a user (fun command)',
    category: 'Social',
    aliases: ['ppsize', 'ppcheck'],
    usage: 'pp [@user]',
    async execute(message) {
      const target = message.mentions.users.first() ?? message.author;
      const size = Math.floor(Math.random() * 16);
      const bar = '8' + '='.repeat(size) + 'D';
      const rating = size >= 13 ? '💀 GODLIKE' : size >= 10 ? '🔥 Massive' : size >= 7 ? '😏 Decent' : size >= 4 ? '😅 Average' : '😬 Tiny';

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.fun as any)
        .setTitle(`📏  PP Measurement — ${target.username}`)
        .setDescription(`\`${bar}\`\n\n**Size:** ${size} inches — ${rating}`)
        .setFooter({ text: `Fun only! • ${BOT_FOOTER.text}` })
        .setTimestamp()
      ] });
    }
  },

  // ── IQ ─────────────────────────────────────────────────────────────────
  {
    name: 'iq',
    description: 'Check a user\'s IQ (fun command)',
    category: 'Social',
    aliases: ['smartness', 'brain'],
    usage: 'iq [@user]',
    async execute(message) {
      const target = message.mentions.users.first() ?? message.author;
      const iq = Math.floor(Math.random() * 201);
      const rating = iq >= 160 ? 'Genius level 🧠' : iq >= 130 ? 'Gifted 🌟' : iq >= 110 ? 'Above average 📈' : iq >= 90 ? 'Average 📊' : iq >= 70 ? 'Below average 📉' : 'Special... 💀';

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.purple as any)
        .setTitle(`🧠  IQ Test — ${target.username}`)
        .setDescription(`**IQ Score: ${iq}**\n\n${rating}`)
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: `Fun only! • ${BOT_FOOTER.text}` })
        .setTimestamp()
      ] });
    }
  },

  // ── ROULETTE ──────────────────────────────────────────────────────────
  {
    name: 'roulette',
    description: 'Play Russian roulette (6-chamber, 1 bullet) — fun',
    category: 'Social',
    aliases: ['russianroulette', 'shoot'],
    usage: 'roulette',
    async execute(message) {
      const shot = Math.random() < (1 / 6);
      if (shot) {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.error as any)
          .setTitle('🔫  BANG!')
          .setDescription(`<@${message.author.id}> pulled the trigger and...\n\n💀 **SHOT! You didn't make it this time.**\n\nBetter luck in the afterlife!`)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      } else {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.success as any)
          .setTitle('🔫  *click*')
          .setDescription(`<@${message.author.id}> pulled the trigger and...\n\n✅ **Empty chamber. You survive!**\n\nDon't push your luck...`)
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── ROAST ─────────────────────────────────────────────────────────────
  {
    name: 'roast',
    description: 'Roast a user with a random burn',
    category: 'Social',
    aliases: ['burn', 'toast'],
    usage: 'roast <@user>',
    async execute(message) {
      const target = message.mentions.users.first() ?? message.author;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4500 as any)
        .setTitle(`🔥  Roasting ${target.username}`)
        .setDescription(`<@${target.id}> — ${pick(roasts)}`)
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: `Fun only, no harm intended • ${BOT_FOOTER.text}` })
        .setTimestamp()
      ] });
    }
  },

  // ── COMPLIMENT ────────────────────────────────────────────────────────
  {
    name: 'compliment',
    description: 'Give a random compliment to a user',
    category: 'Social',
    aliases: ['love', 'appreciate', 'nice'],
    usage: 'compliment <@user>',
    async execute(message) {
      const target = message.mentions.users.first() ?? message.author;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.success as any)
        .setTitle(`💖  ${target.username}`)
        .setDescription(pick(compliments))
        .setThumbnail(target.displayAvatarURL())
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── SLAP ──────────────────────────────────────────────────────────────
  {
    name: 'slap',
    description: 'Slap someone!',
    category: 'Social',
    aliases: ['smack', 'hit'],
    usage: 'slap <@user>',
    async execute(message) {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention someone to slap!')] });
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF6B35 as any)
        .setTitle('👋  SLAP!')
        .setDescription(`<@${message.author.id}> slapped <@${target.id}>! 💥`)
        .setImage(pick(slapGifs))
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── HUG ───────────────────────────────────────────────────────────────
  {
    name: 'hug',
    description: 'Give someone a hug!',
    category: 'Social',
    aliases: ['embrace', 'cuddle'],
    usage: 'hug <@user>',
    async execute(message) {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention someone to hug!')] });
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF69B4 as any)
        .setTitle('🤗  HUG!')
        .setDescription(`<@${message.author.id}> gave <@${target.id}> a warm hug! 💖`)
        .setImage(pick(hugGifs))
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── PAT ───────────────────────────────────────────────────────────────
  {
    name: 'pat',
    description: 'Pat someone on the head!',
    category: 'Social',
    aliases: ['headpat', 'pets'],
    usage: 'pat <@user>',
    async execute(message) {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention someone to pat!')] });
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFFB347 as any)
        .setTitle('✋  PAT PAT!')
        .setDescription(`<@${message.author.id}> patted <@${target.id}> on the head! 🐾`)
        .setImage(pick(patGifs))
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── HACK ──────────────────────────────────────────────────────────────
  {
    name: 'hack',
    description: 'Fake-hack someone (fun animated message)',
    category: 'Social',
    aliases: ['fakehack', 'hacker'],
    usage: 'hack <@user>',
    async execute(message) {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Mention someone to hack!')] });

      const stages = [
        `\`\`\`[■□□□□□□□□□] 10% — Connecting to ${target.username}'s device...\`\`\``,
        `\`\`\`[■■■□□□□□□□] 30% — Bypassing firewall...\`\`\``,
        `\`\`\`[■■■■■□□□□□] 50% — Extracting data...\`\`\``,
        `\`\`\`[■■■■■■■□□□] 70% — Downloading browser history...\`\`\``,
        `\`\`\`[■■■■■■■■■□] 90% — Uploading to dark web...\`\`\``,
        `\`\`\`[■■■■■■■■■■] 100% — DONE! 😈\`\`\`\n\nSuccessfully hacked <@${target.id}>! All their secrets are now public 👀`,
      ];

      const msg = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00FF00 as any)
        .setTitle(`💻  Hacking ${target.username}...`)
        .setDescription(stages[0])
        .setFooter({ text: 'This is a joke • No real hacking involved!' })
      ] });

      for (let i = 1; i < stages.length; i++) {
        await new Promise(r => setTimeout(r, 1500));
        await msg.edit({ embeds: [new EmbedBuilder()
          .setColor(i === stages.length - 1 ? 0xFF0000 as any : 0x00FF00 as any)
          .setTitle(i === stages.length - 1 ? `💻  ${target.username} — HACKED! 🔴` : `💻  Hacking ${target.username}...`)
          .setDescription(stages[i])
          .setFooter({ text: 'This is a joke • No real hacking involved!' })
        ] }).catch(() => {});
      }
    }
  },

  // ── ROCK PAPER SCISSORS ───────────────────────────────────────────────
  {
    name: 'rps',
    description: 'Play Rock Paper Scissors against the bot',
    category: 'Social',
    aliases: ['rockpaperscissors', 'roshambo'],
    usage: 'rps <rock|paper|scissors>',
    async execute(message, args) {
      const choices = ['rock', 'paper', 'scissors'] as const;
      type Choice = typeof choices[number];
      const emojis: Record<Choice, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };
      const userChoice = args[0]?.toLowerCase() as Choice;
      if (!choices.includes(userChoice)) return message.reply({ embeds: [errorEmbed('Invalid Choice', 'Choose `rock`, `paper`, or `scissors`!')] });
      const botChoice = pick([...choices]) as Choice;
      const wins: Record<Choice, Choice> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      const result = wins[userChoice] === botChoice ? '🏆 You Win!' : userChoice === botChoice ? '🤝 It\'s a Tie!' : '💀 Bot Wins!';
      const color = result.includes('Win!') && !result.includes('Bot') ? COLORS.success : result.includes('Tie') ? COLORS.warning : COLORS.error;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(color as any)
        .setTitle(`✂️  Rock Paper Scissors — ${result}`)
        .addFields(
          { name: '👤 Your Move', value: `${emojis[userChoice]} ${userChoice}`, inline: true },
          { name: '🤖 Bot\'s Move', value: `${emojis[botChoice]} ${botChoice}`, inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── WOULD YOU RATHER ──────────────────────────────────────────────────
  {
    name: 'wouldyourather',
    description: 'Get a random "Would You Rather" question',
    category: 'Social',
    aliases: ['wyr', 'wouldurather', 'rather'],
    usage: 'wouldyourather',
    async execute(message) {
      const [opt1, opt2] = pick(wyrQuestions);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.purple as any)
        .setTitle('🤔  Would You Rather?')
        .addFields(
          { name: '🅰️ Option A', value: opt1, inline: true },
          { name: 'vs', value: '**OR**', inline: true },
          { name: '🅱️ Option B', value: opt2, inline: true },
        )
        .setDescription('React with 🅰️ or 🅱️ to vote!')
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] }).then(m => { m.react('🅰️').catch(() => {}); m.react('🅱️').catch(() => {}); });
    }
  },

  // ── TRUTH OR DARE ─────────────────────────────────────────────────────
  {
    name: 'truthordare',
    description: 'Get a random truth or dare challenge',
    category: 'Social',
    aliases: ['tod', 'truth', 'dare'],
    usage: 'truthordare [truth|dare]',
    async execute(message, args) {
      const choice = args[0]?.toLowerCase();
      if (choice === 'truth' || (!choice && Math.random() < 0.5)) {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x00B0F4 as any)
          .setTitle('🔵  TRUTH')
          .setDescription(pick(truthQuestions))
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      } else {
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xFF4500 as any)
          .setTitle('🔴  DARE')
          .setDescription(pick(dareChallenges))
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      }
    }
  },

  // ── NEVER HAVE I EVER ─────────────────────────────────────────────────
  {
    name: 'nhie',
    description: 'Get a random Never Have I Ever statement',
    category: 'Social',
    aliases: ['neverhaveiever', 'nhi'],
    usage: 'nhie',
    async execute(message) {
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.teal as any)
        .setTitle('🙋  Never Have I Ever...')
        .setDescription(`**${pick(nhieStatements)}**\n\nReact with ✅ if you HAVE and ❌ if you HAVEN'T!`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] }).then(m => { m.react('✅').catch(() => {}); m.react('❌').catch(() => {}); });
    }
  },

  // ── TEXT REVERSE ──────────────────────────────────────────────────────
  {
    name: 'reverse',
    description: 'Reverse a piece of text',
    category: 'Social',
    aliases: ['rev', 'backward', 'flip'],
    usage: 'reverse <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text to reverse!')] });
      const text = args.join(' ');
      const reversed = text.split('').reverse().join('');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info as any)
        .setTitle('🔄  Text Reversed')
        .addFields(
          { name: 'Original', value: `\`${text.slice(0, 200)}\``, inline: false },
          { name: 'Reversed', value: `\`${reversed.slice(0, 200)}\``, inline: false },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── MOCK ──────────────────────────────────────────────────────────────
  {
    name: 'mock',
    description: 'SpongeBob mock text',
    category: 'Social',
    aliases: ['spongebob', 'mocking'],
    usage: 'mock <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text to mock!')] });
      const text = args.join(' ');
      const mocked = text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFFD700 as any)
        .setTitle('🧽  SpongeBob Says...')
        .setDescription(`> ${mocked}`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── CLAP ──────────────────────────────────────────────────────────────
  {
    name: 'clap',
    description: 'Add 👏 between every word',
    category: 'Social',
    aliases: ['claptext'],
    usage: 'clap <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text!')] });
      const result = args.join(' 👏 ');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.fun as any)
        .setTitle('👏  Clap Text')
        .setDescription(`> ${result.slice(0, 1000)}`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── VAPORWAVE ─────────────────────────────────────────────────────────
  {
    name: 'vaporwave',
    description: 'Convert text to ａｅｓｔｈｅｔｉｃ vaporwave style',
    category: 'Social',
    aliases: ['aesthetic', 'aesthetic-text', 'vapor'],
    usage: 'vaporwave <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text!')] });
      const text = args.join(' ');
      const vapor = text.split('').map(c => {
        const code = c.charCodeAt(0);
        if (code >= 33 && code <= 126) return String.fromCharCode(code + 65248);
        return c === ' ' ? '　' : c;
      }).join('');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF6EC7 as any)
        .setTitle('🌊  ａｅｓｔｈｅｔｉｃ')
        .setDescription(`> ${vapor.slice(0, 1000)}`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── BIGTEXT ───────────────────────────────────────────────────────────
  {
    name: 'bigtext',
    description: 'Convert text to big Discord regional indicator letters',
    category: 'Social',
    aliases: ['regional', 'letters', 'bigletters'],
    usage: 'bigtext <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text!')] });
      const text = args.join(' ').toLowerCase();
      const result = text.split('').map(c => {
        if (c >= 'a' && c <= 'z') return `:regional_indicator_${c}: `;
        if (c === ' ') return '   ';
        if (c >= '0' && c <= '9') return `${['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][parseInt(c)]} `;
        return c + ' ';
      }).join('');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.primary as any)
        .setTitle('🔤  Big Text')
        .setDescription(result.slice(0, 1000))
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── EMOJIFY ───────────────────────────────────────────────────────────
  {
    name: 'emojify',
    description: 'Convert text to emojis',
    category: 'Social',
    aliases: ['emoji-text', 'emojitext'],
    usage: 'emojify <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text to emojify!')] });
      const emojiMap: Record<string, string> = {
        a: '🅰️', b: '🅱️', c: '🌊', d: '🦆', e: '📧', f: '🎏', g: '🌀',
        h: '♓', i: 'ℹ️', j: '🎷', k: '🎋', l: '🌊', m: '〽️', n: '♑',
        o: '🅾️', p: '🅿️', q: '❓', r: '®️', s: '💲', t: '✝️', u: '⛎',
        v: '✅', w: '〰️', x: '❌', y: '🍸', z: '💤',
        '0': '0️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣',
        '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣',
        '!': '❗', '?': '❓', ' ': '  ',
      };
      const text = args.join(' ').toLowerCase();
      const result = text.split('').map(c => emojiMap[c] || c).join('');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.fun as any)
        .setTitle('😀  Emojified!')
        .setDescription(result.slice(0, 1000))
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── SPOILER TEXT ──────────────────────────────────────────────────────
  {
    name: 'spoiler',
    description: 'Convert text to spoiler tags (character by character)',
    category: 'Social',
    aliases: ['blackout', 'hide', 'spoilertext'],
    usage: 'spoiler <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text to spoiler!')] });
      const text = args.join(' ');
      const result = text.split('').map(c => `||${c}||`).join('');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.dark as any)
        .setTitle('🔒  Spoiler Text')
        .setDescription(`Click each character to reveal!\n\n${result.slice(0, 900)}`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── STRIKE ────────────────────────────────────────────────────────────
  {
    name: 'strike',
    description: 'Apply strikethrough to text',
    category: 'Social',
    aliases: ['strikethrough', 'cross', 'delete'],
    usage: 'strike <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text!')] });
      const text = args.join(' ');
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.info as any)
        .setTitle('✂️  Strikethrough Text')
        .setDescription(`~~${text.slice(0, 1000)}~~`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── QR CODE GENERATOR ────────────────────────────────────────────────
  {
    name: 'qrgen',
    description: 'Generate a QR code for any text or URL',
    category: 'Social',
    aliases: ['generateqr', 'makeqr', 'qrcode'],
    usage: 'qrgen <text or URL>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text or a URL to encode in the QR code.')] });
      const text = args.join(' ');
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}`;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.primary as any)
        .setTitle('📱  QR Code Generated')
        .setDescription(`**Encoded:** \`${text.slice(0, 200)}\``)
        .setImage(qrUrl)
        .setFooter({ text: `Scan with your phone • ${BOT_FOOTER.text}` })
        .setTimestamp()
      ] });
    }
  },

  // ── COLOR INFO ────────────────────────────────────────────────────────
  {
    name: 'colorinfo',
    description: 'Get information about a hex color code',
    category: 'Social',
    aliases: ['color', 'hex', 'hexcolor', 'colorcheck'],
    usage: 'colorinfo <#hexcode>',
    async execute(message, args) {
      if (!args[0]) return message.reply({ embeds: [errorEmbed('Missing Color', 'Provide a hex color code.\n**Example:** `!colorinfo #FF6B6B`')] });
      const hex = args[0].replace('#', '');
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return message.reply({ embeds: [errorEmbed('Invalid Color', 'Provide a valid 6-digit hex color (e.g. `#FF6B6B`).')] });
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const int = parseInt(hex, 16);
      const colorPreview = `https://singlecolorimage.com/get/${hex}/200x200`;
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(int as any)
        .setTitle(`🎨  Color — #${hex.toUpperCase()}`)
        .setThumbnail(colorPreview)
        .addFields(
          { name: '🔢 Hex', value: `\`#${hex.toUpperCase()}\``, inline: true },
          { name: '🔴 Red', value: `${r}`, inline: true },
          { name: '🟢 Green', value: `${g}`, inline: true },
          { name: '🔵 Blue', value: `${b}`, inline: true },
          { name: '🎭 Integer', value: `${int}`, inline: true },
        )
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── TRUTH ─────────────────────────────────────────────────────────────
  {
    name: 'gettruth',
    description: 'Get a random truth question',
    category: 'Social',
    aliases: ['randomtruth', 'truthq'],
    usage: 'gettruth',
    async execute(message) {
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00B0F4 as any)
        .setTitle('🔵  Truth Question')
        .setDescription(`**${pick(truthQuestions)}**`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── DARE ──────────────────────────────────────────────────────────────
  {
    name: 'getdare',
    description: 'Get a random dare challenge',
    category: 'Social',
    aliases: ['randomdare', 'darechallenge'],
    usage: 'getdare',
    async execute(message) {
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4500 as any)
        .setTitle('🔴  Dare Challenge')
        .setDescription(`**${pick(dareChallenges)}**`)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── SPIN THE WHEEL ────────────────────────────────────────────────────
  {
    name: 'spin',
    description: 'Spin a wheel with custom options',
    category: 'Social',
    aliases: ['wheel', 'spinthewheel'],
    usage: 'spin <opt1 | opt2 | opt3 ...>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Options', 'Provide options separated by `|`!')] });
      const options = args.join(' ').split('|').map(s => s.trim()).filter(Boolean);
      if (options.length < 2) return message.reply({ embeds: [errorEmbed('Too Few Options', 'Provide at least 2 options!')] });
      const winner = pick(options);
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.giveaway as any)
        .setTitle('🎡  Spin the Wheel!')
        .setDescription(`🎉 The wheel stopped on:\n\n# 🏆 ${winner}`)
        .addFields({ name: '📋 Options', value: options.map((o, i) => `${i + 1}. ${o === winner ? `**${o}** ← Winner!` : o}`).join('\n'), inline: false })
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── ASCII ART ─────────────────────────────────────────────────────────
  {
    name: 'asciiart',
    description: 'Convert text to simple ASCII art',
    category: 'Social',
    aliases: ['ascii', 'textart'],
    usage: 'asciiart <text>',
    async execute(message, args) {
      if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide text for ASCII art!')] });
      const text = args.join(' ').toUpperCase().slice(0, 8);
      // Simple block letter mapping
      const blocks: Record<string, string[]> = {
        'A': ['▄▀▄','█▀█','▀ ▀'], 'B': ['█▀▄','█▀▄','▀▀ '], 'C': ['▄▀▀','█  ','▀▀▄'],
        'D': ['█▀▄','█ █','▀▀ '], 'E': ['█▀▀','█▀ ','▀▀▀'], 'F': ['█▀▀','█▀ ','▀  '],
        'G': ['▄▀▀','█ ▄','▀▀▄'], 'H': ['█ █','█▀█','▀ ▀'], 'I': ['▀█▀','█  ','▀▀▀'],
        'J': ['  █','  █','▀▀ '], 'K': ['█ █','█▀▀','▀ ▀'], 'L': ['█  ','█  ','▀▀▀'],
        'M': ['█▄█','█▀█','▀ ▀'], 'N': ['█▄█','█▀█','▀ ▀'], 'O': ['▄▀▄','█ █','▀▄▀'],
        'P': ['█▀▄','█▀▀','▀  '], 'Q': ['▄▀▄','█ █','▀▀█'], 'R': ['█▀▄','█▀▄','▀ ▀'],
        'S': ['▄▀▀','▀▀▄','▀▀▄'], 'T': ['▀█▀',' █ ',' ▀ '], 'U': ['█ █','█ █','▀▀▀'],
        'V': ['█ █','▀▄▀',' ▀ '], 'W': ['█ █','█▀█','▀ ▀'], 'X': ['▀▄▀',' █ ','▀▄▀'],
        'Y': ['█ █','▀█▀',' ▀ '], 'Z': ['▀▀█',' ▄▀','▀▀▀'], ' ': ['   ','   ','   '],
        '0': ['▄▀▄','█ █','▀▄▀'], '1': [' █ ','██ ',' ▀ '], '2': ['▀▀▄',' ▄▀','▀▀▀'],
        '!': [' █ ',' █ ',' ● '], '?': ['▀▀▄',' ▄▀',' ● '],
      };
      const lines = ['', '', ''];
      for (const ch of text) {
        const b = blocks[ch] || ['▓▓▓','▓  ','▓▓▓'];
        lines[0] += b[0] + ' ';
        lines[1] += b[1] + ' ';
        lines[2] += b[2] + ' ';
      }
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.primary as any)
        .setTitle('🔤  ASCII Art')
        .setDescription(`\`\`\`\n${lines.join('\n')}\n\`\`\``)
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },

  // ── ENCODE BASE64 ─────────────────────────────────────────────────────
  {
    name: 'base64',
    description: 'Encode or decode text in Base64',
    category: 'Social',
    aliases: ['b64', 'encode', 'decode'],
    usage: 'base64 <encode|decode> <text>',
    async execute(message, args) {
      const mode = args[0]?.toLowerCase();
      const text = args.slice(1).join(' ');
      if (!mode || !text) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: `!base64 encode <text>` or `!base64 decode <text>`')] });
      try {
        let result: string;
        if (mode === 'encode') {
          result = Buffer.from(text).toString('base64');
        } else if (mode === 'decode') {
          result = Buffer.from(text, 'base64').toString('utf-8');
        } else {
          return message.reply({ embeds: [errorEmbed('Invalid Mode', 'Use `encode` or `decode`.')] });
        }
        await message.reply({ embeds: [new EmbedBuilder()
          .setColor(COLORS.teal as any)
          .setTitle(`🔐  Base64 ${mode === 'encode' ? 'Encoded' : 'Decoded'}`)
          .addFields(
            { name: 'Input', value: `\`${text.slice(0, 500)}\``, inline: false },
            { name: mode === 'encode' ? 'Encoded' : 'Decoded', value: `\`${result.slice(0, 500)}\``, inline: false },
          )
          .setFooter(BOT_FOOTER)
          .setTimestamp()
        ] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Invalid Input', 'Could not decode the provided Base64 string.')] });
      }
    }
  },

  // ── SOCIAL STATS ──────────────────────────────────────────────────────
  {
    name: 'socialstats',
    description: 'View your fun social stats (ships, roasts, etc.)',
    category: 'Social',
    aliases: ['funstats', 'mylinks'],
    usage: 'socialstats',
    async execute(message) {
      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF6EC7 as any)
        .setTitle(`📊  Social Stats — ${message.author.username}`)
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: '💖 Ship Score', value: `${Math.floor(Math.random() * 100)}%`, inline: true },
          { name: '🧠 IQ', value: `${Math.floor(Math.random() * 200)}`, inline: true },
          { name: '📏 PP', value: `${Math.floor(Math.random() * 15)} inches`, inline: true },
          { name: '🔥 Roastable', value: `${Math.floor(Math.random() * 100)}%`, inline: true },
          { name: '🎯 Lucky', value: `${Math.floor(Math.random() * 100)}%`, inline: true },
          { name: '😎 Coolness', value: `${Math.floor(Math.random() * 100)}%`, inline: true },
        )
        .setDescription('*All stats are randomly generated for fun!*')
        .setFooter(BOT_FOOTER)
        .setTimestamp()
      ] });
    }
  },
];

export default socialCommands;
