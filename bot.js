import 'dotenv/config'
import { Telegraf, Markup } from 'telegraf'
import fs from 'fs'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing in .env')

const bot = new Telegraf(token)

const MINI_APP_URL      = 'https://t.me/MBOSSUSbot/mbossus'
const MINI_APP_CART_URL = 'https://mbossus-miniapp-github-io.pages.dev'
const SHOPIFY_CART_URL  = 'https://www.mboss.us/cart'
const TRACK_URL     = 'https://www.mboss.us/pages/track-ticket'
const ORDERS_URL    = 'https://account.mboss.us/orders'
const RETURNS_URL   = 'https://www.mboss.us/blogs/helpdesk/return-and-refund-policy'
const PRIVACY_URL   = 'https://www.mboss.us/pages/privacy-policy'
const WEBSITE_URL   = 'https://www.mboss.us'

const isPrivate = ctx => ctx.chat?.type === 'private'

// ── User profile storage ───────────────────────────────────────────────────────

const USERS_FILE = './users.json'

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) }
  catch { return {} }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

function getUser(userId) {
  return loadUsers()[String(userId)] || null
}

function upsertUser(userId, data) {
  const users = loadUsers()
  users[String(userId)] = { ...(users[String(userId)] || {}), ...data }
  saveUsers(users)
}

function hasCompleteProfile(userId) {
  const u = getUser(userId)
  return u?.email && u?.phone
}

// ── Conversation session state (in-memory) ─────────────────────────────────────
// Tracks multi-step data collection per user: awaiting_phone | awaiting_email

const sessions = new Map()

// ── Keyboards ─────────────────────────────────────────────────────────────────

function homeKeyboard(priv) {
  return Markup.inlineKeyboard([
    [
      Markup.button.url('🛍️ Shop', MINI_APP_URL),
      priv ? Markup.button.webApp('🛒 Cart', MINI_APP_CART_URL)
           : Markup.button.url('🛒 Cart', MINI_APP_CART_URL),
    ],
    [Markup.button.url('💳 Checkout on MBOSS.US', SHOPIFY_CART_URL)],
    [Markup.button.callback('📦 Track My Order', 'track_order')],
    [Markup.button.callback('🔄 Return & Refund Policy', 'returns')],
    [Markup.button.url('🌐 Visit MBOSS.US', WEBSITE_URL)],
    [Markup.button.url('🔐 MBOSS.US Privacy Policy', 'https://www.mboss.us/blogs/helpdesk/privacy-policy')],
  ])
}

const trackKeyboard = Markup.inlineKeyboard([
  [Markup.button.url('📦 Track My Order', TRACK_URL)],
  [Markup.button.url('📋 My Order History', ORDERS_URL)],
  [Markup.button.callback('⬅️ Back', 'back_home')],
])

const returnsKeyboard = Markup.inlineKeyboard([
  [Markup.button.url('🔄 Read Return & Refund Policy', RETURNS_URL)],
  [Markup.button.callback('⬅️ Back', 'back_home')],
])

// ── Set menu button on startup ─────────────────────────────────────────────────

bot.telegram.setChatMenuButton({
  menuButton: {
    type: 'web_app',
    text: '🛍️ Shop',
    web_app: { url: MINI_APP_URL },
  },
}).then(() => console.log('✅ Menu button set'))
  .catch(err => console.error('Menu button error:', err.message))

// ── Group guard — redirect all commands to private chat ───────────────────────

bot.use((ctx, next) => {
  if (ctx.chat?.type !== 'private' && ctx.message?.text?.startsWith('/')) {
    return ctx.reply(
      `👋 Hi! Please open my private chat to use commands.`,
      Markup.inlineKeyboard([
        [Markup.button.url('💬 Open private chat', 'https://t.me/MBOSSUSbot')],
      ])
    )
  }
  return next()
})

// ── Reusable reply helpers ────────────────────────────────────────────────────

function replyHome(ctx, text) {
  return ctx.reply(text, { parse_mode: 'Markdown', ...homeKeyboard(isPrivate(ctx)) })
}

// ── Deep links ────────────────────────────────────────────────────────────────
// Format: https://t.me/MBOSSUSbot?start=PAYLOAD
// Share these links anywhere — clicking them opens the bot and fires the right message

const DEEP_LINKS = {
  start:       ctx => replyStart(ctx),
  join:        ctx => replyJoin(ctx),
  welcome:     ctx => replyWelcome(ctx),
  stop:        ctx => replyStop(ctx),
  unsubscribe: ctx => replyUnsubscribe(ctx),
  privacy:     ctx => replyPrivacy(ctx),
  help:        ctx => replyHelp(ctx),
}

// ── /start — routes deep links ────────────────────────────────────────────────

function replyStart(ctx) {
  return ctx.reply(
    `Hi there! 👋\n` +
    `This chatbot is here to keep you up to date and assist you 24/7 with customer service, product questions, and order help for\n` +
    `👉 MBOSS.US (https://www.mboss.us/)\n\n` +
    `Feel free to share your ideas, feedback, wishes, or suggestions for improvement — we truly value your input! 💡✨\n\n` +
    `You're also very welcome to check out our newest products and collections at\n` +
    `🛍️ MBOSS.US Shop (https://t.me/MBOSSUSbot/mbossus) — we hope you find something you love!`,
    { disable_web_page_preview: true }
  )
}

bot.start(ctx => {
  const payload = ctx.startPayload
  const handler = DEEP_LINKS[payload]
  if (handler) return handler(ctx)
  return replyStart(ctx)
})

// ── Commands ──────────────────────────────────────────────────────────────────

// ── Profile collection helpers ────────────────────────────────────────────────

function askForPhone(ctx) {
  sessions.set(ctx.from.id, { step: 'awaiting_phone' })
  return ctx.reply(
    `👋 Almost there! To complete your subscription we need two quick details.\n\n` +
    `📱 *Step 1 of 2* — Please share your phone number by tapping the button below:`,
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        [Markup.button.contactRequest('📱 Share my phone number')]
      ]).oneTime().resize(),
    }
  )
}

function askForEmail(ctx) {
  sessions.set(ctx.from.id, { step: 'awaiting_email' })
  return ctx.reply(
    `✅ Phone saved!\n\n` +
    `✉️ *Step 2 of 2* — Now please type your email address:`,
    { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
  )
}

function replyJoinSuccess(ctx) {
  return ctx.reply(
    `🎉 Success - ⭐ You are in! ⭐\n\n` +
    `✅ You've successfully subscribed to our chatbot!\n\n` +
    `New posts and updates are coming soon — stay tuned! 💌\n\n` +
    `As an 🎓Insider Member you can 💲Profit with this 📧 News service from 🐣 early-bird offers, 📈 Product beta tests, 💝 Gifts and 🥳 Surprises.\n\n` +
    `📢 You can unsubscribe anytime.\n` +
    `Just reply with /stop or /unsubscribe to end your subscription.\n\n` +
    `📖 Want to know more?\n` +
    `Type /privacy to read our Privacy Notice,\n` +
    `or /menu for getting started\n` +
    `or /welcome to see our Welcome Message with additional information.`
  )
}

function replyJoin(ctx) {
  if (!hasCompleteProfile(ctx.from.id)) return askForPhone(ctx)
  return replyJoinSuccess(ctx)
}

function replyWelcome(ctx) {
  return ctx.reply(
    `🛍️ Welcome to the MBOSS.US Chatbot!\n` +
    `Start shopping, get product help, updates, and personalized support from our eStore MBOSS.US.\n\n` +
    `Commands:\n` +
    `/join – Join MBOSS.US Chatbot 💌\n` +
    `/welcome – Info & intro 👋\n` +
    `/menu – Start Shopping 🛍️\n` +
    `/start – Subscribe 🛎️\n` +
    `/unsubscribe – Opt-Out Messages 🧭\n` +
    `/stop – Reset support ❌\n` +
    `/privacy – Read privacy policy 🔐\n` +
    `/help – See all again 🤖\n\n` +
    `Explore products: MBOSS.US 💼`
  )
}

// ── Retention: feedback-first exit flow ──────────────────────────────────────

const feedbackKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📨 Too many messages',    'fb_too_many')],
  [Markup.button.callback('🤷 Not relevant to me',  'fb_not_relevant')],
  [Markup.button.callback('👀 Just browsing',        'fb_just_browsing')],
  [Markup.button.callback('💬 Something else',       'fb_other')],
])

const retentionOffers = {
  fb_too_many: {
    message:
      `📨 We hear you — less is more!\n\n` +
      `We'll dial back the updates so you only get what matters: new arrivals, restocks, and exclusive Insider deals.\n\n` +
      `🎁 As a thank-you for staying, enjoy *10% off* your next order:\n` +
      `👉 Code: *STAY@MBOSS.US*\n\n` +
      `Still want to leave?`,
    stayLabel:  '✅ Sounds good — keep me in!',
    leaveLabel: '❌ No thanks, unsubscribe me',
  },
  fb_not_relevant: {
    message:
      `🤷 Not finding what you're looking for?\n\n` +
      `We're constantly expanding — new collections, collaborations, and exclusive drops are on the way.\n\n` +
      `🛍️ Before you go, take a peek at what's new at MBOSS.US — you might be surprised!\n\n` +
      `Still want to leave?`,
    stayLabel:  '👀 Let me take a look first',
    leaveLabel: '❌ Still want to unsubscribe',
  },
  fb_just_browsing: {
    message:
      `👀 No worries — just browsing is totally fine!\n\n` +
      `As an 🎓 Insider Member, you'll be the first to know when something special drops.\n\n` +
      `🐣 Early-bird offers, 📈 Product beta tests, 💝 Gifts and 🥳 Surprises are coming soon — stick around!\n\n` +
      `Still want to leave?`,
    stayLabel:  '🐣 I\'ll stay for the drops!',
    leaveLabel: '❌ Unsubscribe me anyway',
  },
  fb_other: {
    message:
      `💬 We're sorry to hear that.\n\n` +
      `If something went wrong or you have suggestions, we'd love to hear from you — your feedback helps us grow!\n\n` +
      `📩 Reach us anytime: https://www.mboss.us/pages/customer-service\n\n` +
      `Still want to leave?`,
    stayLabel:  '💬 I\'ll send feedback instead',
    leaveLabel: '❌ Just unsubscribe me',
  },
}

function replyFeedbackQuestion(ctx) {
  return ctx.reply(
    `😢 We're sorry to see you go!\n\n` +
    `Before you leave — could you tell us why?\n` +
    `Your answer helps us improve the experience for everyone. 🙏`,
    feedbackKeyboard
  )
}

function replyStop(ctx)        { return replyFeedbackQuestion(ctx) }
function replyUnsubscribe(ctx) { return replyFeedbackQuestion(ctx) }

async function replyPrivacy(ctx) {
  await ctx.reply(
    `🔐 Privacy Policy for Telegram Chatbot\n\n` +
    `📅 Effective Date: 02/04/2026\n` +
    `🤖 Bot Name: MBOSS.US\n` +
    `🏢 Operator: MBOSS.US e.K.\n` +
    `📩 Contact: https://www.mboss.us/pages/customer-service\n\n` +
    `1️⃣ Introduction\n` +
    `Hi there! 👋 This Privacy Policy explains how we — MBOSS.US e.K. — collect, use, and protect your personal data when you interact with our Telegram chatbot "MBOSS.US".\n` +
    `You can also use this bot to explore or shop from 🌐 https://www.mboss.us/\n\n` +
    `We use trusted services like Telegram 📲 and SendPulse ⚙️ to run this bot. Check out their privacy policies here:\n` +
    `🔗 MBOSS.US Privacy Policy: https://www.mboss.us/policies/privacy-policy\n` +
    `🔗 Telegram: https://telegram.org/privacy\n` +
    `🔗 SendPulse: https://sendpulse.com/legal/pp\n\n` +
    `2️⃣ What Data We Collect 📋\n` +
    `When you use our bot, we may collect:\n` +
    `🧑 Your name (first + last)\n` +
    `💬 Your Telegram username + profile photo\n` +
    `✉️ Messages you send to the bot\n` +
    `🛍️ Order info if you make purchases\n\n` +
    `Your data stays with us as long as the bot is active — or until you remove it (see Section 6 👇).\n\n` +
    `3️⃣ Why We Use Your Data ⚖️\n` +
    `We process your data:\n` +
    `✅ With your consent\n` +
    `📦 To fulfill your orders or requests\n` +
    `📊 To improve and secure the bot\n` +
    `📜 To meet legal obligations (GDPR, BDSG)\n\n` +
    `4️⃣ Who Sees Your Data 🕵️‍♀️\n` +
    `We do not sell your data ❌💸\n` +
    `We only share it with trusted providers (like SendPulse or secure servers) so the bot runs smoothly.\n` +
    `📍 All data is stored within 🇪🇺 EU data protection standards.\n\n` +
    `5️⃣ Your Privacy Rights 🧑‍⚖️\n` +
    `You can request:\n` +
    `🔎 Access to your data\n` +
    `🧽 Deletion or correction\n` +
    `🚫 Stop or limit processing\n` +
    `🔁 Transfer to another service\n` +
    `❌ Withdraw consent anytime\n` +
    `🟢 Take action here:\n` +
    `👉 https://www.mboss.us/pages/customer-service`,
    { disable_web_page_preview: true }
  )
  return ctx.reply(
    `6️⃣ How to Delete Your Data 🧹\n` +
    `Just block the bot in Telegram to trigger auto-deletion!\n` +
    `🗑️ Your data will be erased within 30 days, unless legal rules require us to keep it longer.\n\n` +
    `7️⃣ How We Keep Your Data Safe 🛡️\n` +
    `Your privacy matters! We use:\n` +
    `🔐 End-to-end encryption\n` +
    `🖥️ Secure cloud servers\n` +
    `🧑‍💻 Staff access control\n` +
    `🧾 Regular security checks\n\n` +
    `8️⃣ Under 16? 👶\n` +
    `This bot is for users 16+ only.\n` +
    `👨‍👩‍👧 If you're a parent, you may use the bot for your child — but we don't knowingly collect data from minors.\n\n` +
    `9️⃣ Policy Updates 🔄\n` +
    `We may update this policy over time.\n` +
    `⏱️ Check the latest version anytime with the command: /privacy\n\n` +
    `🔟 Contact Us 📬\n` +
    `MBOSS.US e.K.\n` +
    `🏢 Wilhelminenstr. 20, 64283 Darmstadt, Germany\n` +
    `📧 Get in Touch: https://www.mboss.us/pages/customer-service`,
    { disable_web_page_preview: true }
  )
}

function replyTrack(ctx) {
  return ctx.reply(
    `📦 *Track Your Order*\n\nChoose an option below:`,
    { parse_mode: 'Markdown', ...trackKeyboard }
  )
}

function replyReturns(ctx) {
  return ctx.reply(
    `🔄 *Return & Refund Policy*\n\nRead our full policy at the link below.`,
    { parse_mode: 'Markdown', ...returnsKeyboard }
  )
}

function replyMenu(ctx) {
  return ctx.reply(
    `🗂 *MBOSS.US Menu*\n\n` +
    `🛍️ *Shop* — Browse our full collection in the Mini App\n` +
    `🛒 *Cart* — View your cart inside the Mini App\n` +
    `💳 *Checkout* — Complete your purchase on MBOSS.US\n` +
    `📦 *Track My Order* — Check your delivery status\n` +
    `🔄 *Return & Refund Policy* — Read our returns policy\n` +
    `🌐 *Visit MBOSS.US* — Open the full website\n` +
    `🔐 *Privacy Policy* — Read our privacy policy`,
    { parse_mode: 'Markdown', ...homeKeyboard(isPrivate(ctx)) }
  )
}

function replyHelp(ctx) {
  return ctx.reply(
    `📋 MBOSS.US Bot Commands:\n\n` +
    `/start — Subscribe to Support\n` +
    `/join — Join the Chatbot-News\n` +
    `/welcome — Welcome Message\n` +
    `/unsubscribe — Opt Out Messages\n` +
    `/stop — Support Reset\n` +
    `/help — List of commands`
  )
}

bot.command('join',        ctx => replyJoin(ctx))
bot.command('welcome',     ctx => replyWelcome(ctx))
bot.command('stop',        ctx => replyStop(ctx))
bot.command('unsubscribe', ctx => replyUnsubscribe(ctx))
bot.command('privacy',     ctx => replyPrivacy(ctx))
bot.command('menu',        ctx => replyMenu(ctx))
bot.command('help',        ctx => replyHelp(ctx))

// ── Callback buttons ──────────────────────────────────────────────────────────

bot.action('track_order', ctx => { ctx.answerCbQuery(); replyTrack(ctx) })
bot.action('returns',     ctx => { ctx.answerCbQuery(); replyReturns(ctx) })

bot.action('back_home', ctx => {
  ctx.answerCbQuery()
  ctx.reply(
    `What would you like to do?`,
    { ...homeKeyboard(isPrivate(ctx)) }
  )
})

// ── Retention: feedback reason → tailored offer ───────────────────────────────

Object.entries(retentionOffers).forEach(([key, offer]) => {
  bot.action(key, ctx => {
    ctx.answerCbQuery()
    ctx.reply(offer.message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([
        [Markup.button.callback(offer.stayLabel,  'confirm_stay')],
        [Markup.button.callback(offer.leaveLabel, 'confirm_leave')],
      ]),
    })
  })
})

bot.action('confirm_stay', ctx => {
  ctx.answerCbQuery('Welcome back! 🎉')
  ctx.reply(
    `🎉 Welcome back — we're so glad you stayed!\n\n` +
    `You're still part of our 🎓 Insider Member community.\n` +
    `We promise to keep it relevant and valuable for you. 💌\n\n` +
    `Type /welcome anytime to see what's available, or /menu to start shopping.`
  )
})

bot.action('confirm_leave', ctx => {
  ctx.answerCbQuery()
  ctx.reply(
    `👋 You've been unsubscribed.\n\n` +
    `We respect your decision and have removed you from our updates.\n\n` +
    `If you ever change your mind, just send /start and you're back in — no questions asked. 🤗\n\n` +
    `Take care, and thank you for being part of MBOSS.US! 🛍️`
  )
})

// ── Contact handler — receives phone number from contact share button ─────────

bot.on('contact', ctx => {
  if (!isPrivate(ctx)) return
  const session = sessions.get(ctx.from.id)
  if (session?.step !== 'awaiting_phone') return

  const phone = ctx.message.contact.phone_number
  upsertUser(ctx.from.id, {
    telegramId:  ctx.from.id,
    username:    ctx.from.username || null,
    firstName:   ctx.from.first_name || null,
    phone,
  })
  askForEmail(ctx)
})

// ── Fallback (private chat only) — also handles email input ──────────────────

bot.on('message', ctx => {
  if (!isPrivate(ctx)) return

  const session = sessions.get(ctx.from.id)

  // Email collection step
  if (session?.step === 'awaiting_email' && ctx.message.text) {
    const email = ctx.message.text.trim()
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailValid) {
      return ctx.reply(`⚠️ That doesn't look like a valid email address. Please try again:`)
    }
    upsertUser(ctx.from.id, { email })
    sessions.delete(ctx.from.id)
    return replyJoinSuccess(ctx)
  }

  // Default fallback
  ctx.reply(
    `Tap a button below to get started 👇`,
    { ...homeKeyboard(true) }
  )
})

// ── Launch ────────────────────────────────────────────────────────────────────

bot.telegram.setMyCommands([
  { command: 'start',       description: 'Subscribe to Support' },
  { command: 'join',        description: 'Join MBOSS.US Chatbot 💌' },
  { command: 'welcome',     description: 'Info & intro 👋' },
  { command: 'menu',        description: 'Start Shopping 🛍️' },
  { command: 'unsubscribe', description: 'Opt-Out Messages 🧭' },
  { command: 'stop',        description: 'Reset support ❌' },
  { command: 'privacy',     description: 'Read privacy policy 🔐' },
  { command: 'help',        description: 'See all again 🤖' },
]).then(() => console.log('✅ Commands registered'))
  .catch(err => console.error('Commands error:', err.message))

bot.launch()
console.log('🤖 @MBOSSUSbot is running...')

process.once('SIGINT',  () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
