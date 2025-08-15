// LINE Bot：今日運勢 + 心理測驗（極簡文字版｜只回指令｜無次數限制）
// Node.js + Express + @line/bot-sdk（CommonJS）
// 指令：/運勢、/測驗、/help
// 互動：純文字回覆 + Quick Reply 小按鈕（不使用 Flex、氣泡更小更清爽）
// 作者：智援｜給 Mao 的群組機器人

'use strict'

const express = require('express')
const line = require('@line/bot-sdk')

// === 環境變數 ===
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}
if (!config.channelAccessToken || !config.channelSecret) {
  console.error('請在環境變數設定 CHANNEL_ACCESS_TOKEN 與 CHANNEL_SECRET')
  process.exit(1)
}

const app = express()
const client = new line.Client(config)

// === Webhook ===
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || []
    await Promise.all(events.map(handleEvent))
    res.status(200).send('OK')
  } catch (e) {
    console.error('Webhook error:', e)
    res.status(500).end()
  }
})

// 健康檢查
app.get('/', (_req, res) => res.send('LINE bot running.'))

// === 小工具 ===
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

// === 運勢詞庫（組合式） ===
const FORTUNE = {
  stars: [1, 2, 3, 4, 5],
  arche: ['流星型','羅盤型','晨曦型','火焰型','海風型','山嵐型','星塵型','月光型'],
  advises: [
    '先處理最小的一步，會意外順利。',
    '把話說清楚一點，誤會會少一半。',
    '別逞強，一通電話就能解決的事就打。',
    '今天適合整理與丟掉，留下重點就好。',
    '留 10% 餘裕，會有好事鑽進來。',
    '換個角度思考，靈感就出現。',
    '收起比較心，專注手上的事就贏一半。',
    '先吃飽再做決定（真的）。'
  ],
  areas: ['整體','工作','感情','財運'],
  colors: ['天藍','葡萄紫','薄荷綠','日落橘','蒔光黃','霧灰','奶茶棕','櫻花粉'],
  items: ['黑色髮圈','硬幣','便條紙','水瓶','口香糖','簽字筆','耳機','鑰匙圈'],
  emoji: ['✨','⭐','🌟','💫','🌙','🔥','🌈']
}

function buildFortune() {
  const star = rand(FORTUNE.stars)
  const arche = rand(FORTUNE.arche)
  const areaMsgs = FORTUNE.areas.map(a => `【${a}】${rand(FORTUNE.advises)}`)
  const color = rand(FORTUNE.colors)
  const item = rand(FORTUNE.items)
  const emoji = rand(FORTUNE.emoji)
  const stars = '★'.repeat(star) + '☆'.repeat(5 - star)

  // 用陣列逐行組字串，避免某些環境遇到 ArrayLiteral.join 的解析怪問題
  const lines = []
  lines.push(`${emoji} 今日你是「${arche}運勢」`)
  lines.push(`幸運指數：${stars}`)
  areaMsgs.forEach(m => lines.push(m))
  lines.push(`幸運色：${color}｜幸運物：${item}`)

  return lines.join('
')
}

// === 心理測驗題庫（文字版） ===
const QUIZ = [
  { id: 'q_window', title: '選一扇窗的風景', question: '直覺選一扇你想打開的窗：',
    options: [
      { key: 'A', label: 'A. 海邊夕陽', result: '你最近需要放下執念，先補充能量。把效率放一邊，先把心情養好。' },
      { key: 'B', label: 'B. 山林晨霧', result: '你正走在對的方向，但節奏偏快。放慢 10%，品質會明顯提升。' },
      { key: 'C', label: 'C. 城市夜景', result: '社交運上升，主動出擊會有驚喜；把作品丟出去。' },
      { key: 'D', label: 'D. 書房暖燈', result: '需要專注力的時期，固定儀式會有效（同一杯飲料、同一首歌）。' }
    ]},
  { id: 'q_key', title: '挑一把鑰匙', question: '直覺選一把最能打開你世界的鑰匙：',
    options: [
      { key: 'A', label: 'A. 古銅色花紋鑰匙', result: '你在整理價值觀，別急著選邊站；先把自己的原則寫下來。' },
      { key: 'B', label: 'B. 透明水晶鑰匙', result: '溝通是接下來的王牌。把需求說白，反而更被尊重。' },
      { key: 'C', label: 'C. 黑色極簡鑰匙', result: '你需要極簡與界線。關閉三件不重要的事，讓一件重要的事長大。' }
    ]},
  { id: 'q_coffee', title: '選一杯咖啡香', question: '哪一種當下最吸引你？',
    options: [
      { key: 'A', label: 'A. 濃黑', result: '你準備迎接挑戰，適合直接面對卡關議題，收穫會超出預期。' },
      { key: 'B', label: 'B. 杏仁可頌香', result: '你需要美與儀式感。把生活佈置一下，創作力會回來。' },
      { key: 'C', label: 'C. 花生烘香', result: '你在建立安全感。先把金錢與時間盤整，步伐會更穩。' }
    ]},
  { id: 'q_door', title: '推開一扇門', question: '你會先推開哪扇門？',
    options: [
      { key: 'A', label: 'A. 白色拱門', result: '新合作將出現。保持彈性，願意試用期，會遇到合拍夥伴。' },
      { key: 'B', label: 'B. 深色木門', result: '需要長期主題。選一個 90 天專案，全力以赴，回報會很實在。' },
      { key: 'C', label: 'C. 玻璃旋轉門', result: '別再原地打轉。砍掉一個反覆猶豫的選項，立刻體感變好。' }
    ]},
  { id: 'q_star', title: '撿起一顆星', question: '你想撿起哪一顆？',
    options: [
      { key: 'A', label: 'A. 發光的小星星', result: '微小但穩定的日常，正在累積改變；先守住睡眠與運動。' },
      { key: 'B', label: 'B. 尖尖的大星星', result: '野心被點燃，適合大膽提出企劃或加薪，論點要有數據。' },
      { key: 'C', label: 'C. 毛茸茸的雲星', result: '別怕慢。你正在恢復感受力，靈感會在鬆開時長出來。' }
    ]}
]

// === Quick Reply 工具 ===
function qrBase() {
  return {
    items: [
      { type: 'action', action: { type: 'message', label: '運勢', text: '/運勢' } },
      { type: 'action', action: { type: 'message', label: '心理測驗', text: '/測驗' } },
      { type: 'action', action: { type: 'message', label: '幫助', text: '/help' } }
    ]
  }
}

function qrForQuiz(q) {
  return {
    items: q.options.map(o => ({
      type: 'action',
      action: { type: 'postback', label: o.label, data: `quiz=${q.id}&opt=${o.key}` }
    })).concat([
      { type: 'action', action: { type: 'message', label: '換一題', text: '/測驗' } },
      { type: 'action', action: { type: 'message', label: '抽運勢', text: '/運勢' } }
    ])
  }
}

// === 事件處理 ===
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') return handleText(event)
  if (event.type === 'postback') return handlePostback(event)
  return Promise.resolve()
}

async function handleText(event) {
  const text = (event.message.text || '').trim()
  const lower = text.toLowerCase()

  if (text === '/運勢' || lower === 'fortune') {
    const result = buildFortune()
    return client.replyMessage(event.replyToken, { type: 'text', text: result, quickReply: qrBase() })
  }

  if (text === '/測驗' || lower === 'quiz') {
    const q = rand(QUIZ)
    const body = `【心理測驗】${q.title}
${q.question}`
    return client.replyMessage(event.replyToken, { type: 'text', text: body, quickReply: qrForQuiz(q) })
  }

  if (text === '/help' || text === '幫助') {
    const help = '指令：
/運勢 → 抽今日運勢
/測驗 → 玩心理測驗
/help → 看說明'
    return client.replyMessage(event.replyToken, { type: 'text', text: help, quickReply: qrBase() })
  }

  // 非指令：不回覆
  return Promise.resolve()
}

async function handlePostback(event) {
  const params = new URLSearchParams(event.postback.data || '')
  const qid = params.get('quiz')
  const opt = (params.get('opt') || '').toUpperCase()
  const q = QUIZ.find(x => x.id === qid)
  const chosen = q && q.options.find(o => o.key === opt)

  if (!q || !chosen) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '這題走丟了，輸入 /測驗 換一題吧！', quickReply: qrBase() })
  }

  const msg = `【心理測驗結果】${q.title}
你的選擇：${chosen.label}
——
${chosen.result}`
  return client.replyMessage(event.replyToken, { type: 'text', text: msg, quickReply: qrBase() })
}

// === 啟動 ===
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`))
