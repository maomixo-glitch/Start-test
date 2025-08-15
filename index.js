// LINE Bot：今日運勢 + 心理測驗（無次數限制）
// Node.js + Express + @line/bot-sdk
// 指令：/運勢、/測驗、/help
// 事件：message(text)、postback
// 作者：智援｜給 Mao 的群組機器人

'use strict'

const express = require('express')
const line = require('@line/bot-sdk')
const crypto = require('crypto')

// === 環境變數 ===
// 必填：CHANNEL_ACCESS_TOKEN, CHANNEL_SECRET
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

if (!config.channelAccessToken || !config.channelSecret) {
  console.error('請在環境變數設定 CHANNEL_ACCESS_TOKEN 與 CHANNEL_SECRET')
  process.exit(1)
}

const app = express()

// === 中介層：驗證簽名 ===
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || []
    await Promise.all(events.map(handleEvent))
    res.status(200).send('OK')
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).end()
  }
})

// === 健康檢查 ===
app.get('/', (_req, res) => res.send('LINE bot running.'))

// === 資料：運勢詞庫（組合式，隨機每次都能玩） ===
const fortuneStars = [1, 2, 3, 4, 5]
const fortuneArchetypes = [
  '流星型', '羅盤型', '晨曦型', '火焰型', '海風型', '山嵐型', '星塵型', '月光型'
]
const fortuneAdvises = [
  '先處理最小的一步，會意外順利。',
  '把話說清楚一點，誤會會少一半。',
  '別逞強，一通電話就能解決的事就打。',
  '今天適合整理與丟掉，留下重點就好。',
  '凡事留 10% 餘裕，會有好事鑽進來。',
  '換個座位/角度思考，靈感會出現。',
  '收起比較心，專注手上的事就贏一半。',
  '先吃飽再做決定（真的）。'
]
const fortuneAreas = ['整體', '工作', '感情', '財運']
const luckyColors = ['天藍', '葡萄紫', '薄荷綠', '日落橘', '蒔光黃', '霧灰', '奶茶棕', '櫻花粉']
const luckyItems = ['黑色髮圈', '硬幣', '便條紙', '水瓶', '口香糖', '簽字筆', '耳機', '鑰匙圈']

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function buildFortune() {
  const star = randomPick(fortuneStars)
  const arche = randomPick(fortuneArchetypes)
  const areaMsgs = fortuneAreas.map(a => `【${a}】${randomPick(fortuneAdvises)}`)
  const color = randomPick(luckyColors)
  const item = randomPick(luckyItems)
  const emoji = ['✨','⭐','🌟','💫','🌙','🔥','🌈'][randomInt(0,6)]

  const title = `${emoji} 今日你是「${arche}運勢」`
  const desc = `幸運指數：${'★'.repeat(star)}${'☆'.repeat(5-star)}\n` +
               areaMsgs.join('\n') + `\n幸運色：${color}｜幸運物：${item}`

  return { star, arche, color, item, areaMsgs, emoji, title, desc }
}

function fortuneFlex(f) {
  return {
    type: 'flex', altText: '今日運勢', contents: {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#111111', paddingAll: '16px', contents: [
          { type: 'text', text: '今日運勢', weight: 'bold', size: 'lg', color: '#FFFFFF' },
          { type: 'text', text: f.title, size: 'sm', color: '#BBBBBB', margin: 'sm' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: '幸運指數', weight: 'bold', size: 'sm' },
          { type: 'text', text: `${'★'.repeat(f.star)}${'☆'.repeat(5-f.star)}`, size: 'xl' },
          { type: 'separator' },
          ...f.areaMsgs.map(msg => ({ type: 'text', text: msg, wrap: true, size: 'sm' })),
          { type: 'separator' },
          { type: 'text', text: `幸運色：${f.color}｜幸運物：${f.item}`, size: 'sm', color: '#555555' }
        ]
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'md', contents: [
          { type: 'button', style: 'primary', color: '#4F46E5', action: { type: 'message', label: '再抽一次', text: '/運勢' } },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '玩心理測驗', text: '/測驗' } }
        ]
      }
    }
  }
}

// === 資料：心理測驗題庫（無次數限制，隨機抽題） ===
// 每題：id, title, question, options: [{key, label, result}]
const quizBank = [
  {
    id: 'q_window',
    title: '選一扇窗的風景',
    question: '直覺選一扇你想打開的窗：',
    options: [
      { key: 'A', label: 'A. 海邊夕陽', result: '你最近需要放下執念，先補充能量。把效率放一邊，先把心情養好。' },
      { key: 'B', label: 'B. 山林晨霧', result: '你正走在對的方向，但節奏偏快。放慢 10%，品質會明顯提升。' },
      { key: 'C', label: 'C. 城市夜景', result: '社交運上升，主動出擊會有驚喜；把作品丟出去。' },
      { key: 'D', label: 'D. 書房暖燈', result: '需要專注力的時期，建立固定儀式（同一杯飲料、同一首歌）會有效。' }
    ]
  },
  {
    id: 'q_key',
    title: '挑一把鑰匙',
    question: '直覺選一把最能打開你世界的鑰匙：',
    options: [
      { key: 'A', label: 'A. 古銅色花紋鑰匙', result: '你在整理價值觀，別急著選邊站；先把自己的原則寫下來。' },
      { key: 'B', label: 'B. 透明水晶鑰匙', result: '溝通是接下來的王牌。把需求說白，反而更被尊重。' },
      { key: 'C', label: 'C. 黑色極簡鑰匙', result: '你需要極簡與界線。關閉三件不重要的事，才能讓一件重要的事長大。' }
    ]
  },
  {
    id: 'q_coffee',
    title: '選一杯咖啡香',
    question: '哪一種當下最吸引你？',
    options: [
      { key: 'A', label: 'A. 濃黑', result: '你準備迎接挑戰，適合直接面對卡關議題，收穫會超出預期。' },
      { key: 'B', label: 'B. 杏仁可頌香', result: '你需要美與儀式感。把生活佈置一下，創作力會回來。' },
      { key: 'C', label: 'C. 花生烘香', result: '你在建立安全感。先把金錢與時間盤整，步伐會更穩。' }
    ]
  },
  {
    id: 'q_door',
    title: '推開一扇門',
    question: '你會先推開哪扇門？',
    options: [
      { key: 'A', label: 'A. 白色拱門', result: '新合作將出現。保持彈性，願意試用期，會遇到合拍夥伴。' },
      { key: 'B', label: 'B. 深色木門', result: '需要長期主題。選一個 90 天專案，全力以赴，回報會很實在。' },
      { key: 'C', label: 'C. 玻璃旋轉門', result: '別再原地打轉。砍掉一個反覆猶豫的選項，立刻體感變好。' }
    ]
  },
  {
    id: 'q_star',
    title: '撿起一顆星',
    question: '你想撿起哪一顆？',
    options: [
      { key: 'A', label: 'A. 發光的小星星', result: '微小但穩定的日常，正在累積改變；先守住睡眠與運動。' },
      { key: 'B', label: 'B. 尖尖的大星星', result: '野心被點燃，適合大膽提出企劃或加薪，論點要有數據。' },
      { key: 'C', label: 'C. 毛茸茸的雲星', result: '別怕慢。你正在恢復感受力，創作和靈感會在鬆開時長出來。' }
    ]
  }
]

function quizFlex(q) {
  return {
    type: 'flex', altText: `心理測驗｜${q.title}` , contents: {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0F172A', paddingAll: '16px', contents: [
          { type: 'text', text: '心理測驗', weight: 'bold', size: 'lg', color: '#FFFFFF' },
          { type: 'text', text: q.title, size: 'sm', color: '#93C5FD', margin: 'sm' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: q.question, wrap: true, size: 'md' },
          { type: 'separator' },
          ...q.options.map(o => ({
            type: 'button', style: 'primary', color: '#334155', margin: 'sm',
            action: { type: 'postback', label: o.label, data: `quiz=${q.id}&opt=${o.key}` }
          }))
        ]
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'md', contents: [
          { type: 'button', style: 'secondary', action: { type: 'message', label: '換一題', text: '/測驗' } },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '抽運勢', text: '/運勢' } }
        ]
      }
    }
  }
}

function quizAnswerFlex(q, optKey) {
  const opt = q.options.find(o => o.key === optKey)
  const label = opt ? opt.label : '（無）'
  const result = opt ? opt.result : '找不到此選項，請重新來一題～'
  return {
    type: 'flex', altText: '心理測驗結果', contents: {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#111827', paddingAll: '16px', contents: [
          { type: 'text', text: '心理測驗・結果', weight: 'bold', size: 'lg', color: '#FFFFFF' },
          { type: 'text', text: q.title, size: 'sm', color: '#9CA3AF', margin: 'sm' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: `你的選擇：${label}`, wrap: true },
          { type: 'separator' },
          { type: 'text', text: result, wrap: true }
        ]
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'md', contents: [
          { type: 'button', style: 'primary', color: '#4F46E5', action: { type: 'message', label: '再玩一題', text: '/測驗' } },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '抽運勢', text: '/運勢' } }
        ]
      }
    }
  }
}

// === 事件處理 ===
const client = new line.Client(config)

async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return handleText(event)
  }
  if (event.type === 'postback') {
    return handlePostback(event)
  }
  // 其他事件直接 200 OK
  return Promise.resolve(null)
}

async function handleText(event) {
  const text = (event.message.text || '').trim()
  const lower = text.toLowerCase()

  // 指令 Quick Reply
  const quick = {
    items: [
      { type: 'action', action: { type: 'message', label: '運勢', text: '/運勢' } },
      { type: 'action', action: { type: 'message', label: '心理測驗', text: '/測驗' } },
      { type: 'action', action: { type: 'message', label: '幫助', text: '/help' } }
    ]
  }

  if (text === '/運勢' || lower === 'fortune') {
    const f = buildFortune()
    return client.replyMessage(event.replyToken, fortuneFlex(f))
  }

  if (text === '/測驗' || lower === 'quiz') {
    const q = randomPick(quizBank)
    return client.replyMessage(event.replyToken, quizFlex(q))
  }

  if (text === '/help' || text === '幫助') {
    return client.replyMessage(event.replyToken, [
      { type: 'text', text: '嗨，我是群組小占卜！\n指令：\n/運勢 → 抽今日運勢\n/測驗 → 玩心理測驗\n/help → 看說明', quickReply: quick }
    ])
  }

if (text === '/運勢' || lower === 'fortune') {
  const f = buildFortune()
  return client.replyMessage(event.replyToken, fortuneFlex(f))
}

if (text === '/測驗' || lower === 'quiz') {
  const q = randomPick(quizBank)
  return client.replyMessage(event.replyToken, quizFlex(q))
}

if (text === '/help' || text === '幫助') {
  return client.replyMessage(event.replyToken, [
    { type: 'text', text: '嗨，我是群組小占卜！\n指令：\n/運勢 → 抽今日運勢\n/測驗 → 玩心理測驗\n/help → 看說明', quickReply: quick }
  ])
}

// 非指令：不回覆
return Promise.resolve()
  
async function handlePostback(event) {
  // 解析 postback data: quiz=qid&opt=A
  const data = Object.fromEntries(new URLSearchParams(event.postback.data))
  const q = quizBank.find(x => x.id === data.quiz)
  const opt = (data.opt || '').toUpperCase()

  if (!q) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '這題走丟了，再來一題吧～ /測驗' })
  }
  return client.replyMessage(event.replyToken, quizAnswerFlex(q, opt))
}

// === 啟動 ===
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`))
