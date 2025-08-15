// LINE Bot：今日運勢 + 心理測驗（極簡文字版｜只回指令｜無次數限制）
// Node.js + Express + @line/bot-sdk（CommonJS）

'use strict';

const express = require('express');
const line = require('@line/bot-sdk');

// ---- 環境變數 ----
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
if (!config.channelAccessToken || !config.channelSecret) {
  console.error('缺少 CHANNEL_ACCESS_TOKEN 或 CHANNEL_SECRET');
  process.exit(1);
}

const app = express();
const client = new line.Client(config);

// ---- Webhook ----
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    await Promise.all(events.map(handleEvent));
    res.status(200).send('OK');
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).end();
  }
});

// 健康檢查
app.get('/', (_req, res) => res.send('LINE bot running.'));

// ---- 小工具 ----
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---- 運勢詞庫（組合式，移除 emoji 與特殊符號）----
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
    '先吃飽再做決定。'
  ],
  areas: ['整體','工作','感情','財運'],
  colors: ['天藍','葡萄紫','薄荷綠','日落橘','蒔光黃','霧灰','奶茶棕','櫻花粉'],
  items: ['髮圈','硬幣','便條紙','水瓶','口香糖','簽字筆','耳機','鑰匙圈']
};

function buildFortune() {
  const star = rand(FORTUNE.stars);
  const arche = rand(FORTUNE.arche);
  const color = rand(FORTUNE.colors);
  const item  = rand(FORTUNE.items);
  const stars = '★'.repeat(star) + '☆'.repeat(5 - star);

  const areaMsgs = FORTUNE.areas.map(function(a) {
    return '【' + a + '】' + rand(FORTUNE.advises);
  });

  // 全部用 \n 串接，避免任何隱藏字元
  let text = '';
  text += '今日你是「' + arche + '運勢」' + '\n';
  text += '幸運指數：' + stars + '\n';
  text += areaMsgs.join('\n') + '\n';
  text += '幸運色：' + color + '｜幸運物：' + item;
  return text;
}

// ---- 心理測驗（純文字＋postback）----
const QUIZ = [
  { id: 'q_window', title: '選一扇窗的風景', question: '直覺選一扇你想打開的窗：',
    options: [
      { key: 'A', label: 'A. 海邊夕陽', result: '你最近需要放下執念，先補充能量。先把心情養好。' },
      { key: 'B', label: 'B. 山林晨霧', result: '你走在對的方向，但節奏偏快。放慢 10%，品質會提升。' },
      { key: 'C', label: 'C. 城市夜景', result: '社交運上升，主動出擊會有驚喜；把作品丟出去。' },
      { key: 'D', label: 'D. 書房暖燈', result: '需要專注力的時期，固定儀式很有效。' }
    ]},
  { id: 'q_key', title: '挑一把鑰匙', question: '直覺選一把最能打開你世界的鑰匙：',
    options: [
      { key: 'A', label: 'A. 古銅色花紋鑰匙', result: '你在整理價值觀，先把自己的原則寫下。' },
      { key: 'B', label: 'B. 透明水晶鑰匙', result: '溝通是王牌。把需求說白，更被尊重。' },
      { key: 'C', label: 'C. 黑色極簡鑰匙', result: '你需要極簡與界線。關閉三件不重要的事。' }
    ]},
  { id: 'q_coffee', title: '選一杯咖啡香', question: '哪一種當下最吸引你？',
    options: [
      { key: 'A', label: 'A. 濃黑', result: '你準備迎接挑戰，直接面對卡關會有收穫。' },
      { key: 'B', label: 'B. 杏仁可頌香', result: '你需要美與儀式感，佈置生活會回復動力。' },
      { key: 'C', label: 'C. 花生烘香', result: '先盤整金錢與時間，步伐更穩。' }
    ]},
  { id: 'q_door', title: '推開一扇門', question: '你會先推開哪扇門？',
    options: [
      { key: 'A', label: 'A. 白色拱門', result: '新合作將出現。保持彈性，會遇到合拍夥伴。' },
      { key: 'B', label: 'B. 深色木門', result: '需要長期主題。選一個 90 天專案全力以赴。' },
      { key: 'C', label: 'C. 玻璃旋轉門', result: '別再原地打轉。砍掉一個反覆猶豫的選項。' }
    ]},
  { id: 'q_star', title: '撿起一顆星', question: '你想撿起哪一顆？',
    options: [
      { key: 'A', label: 'A. 小星星', result: '日常在累積改變；先守住睡眠與運動。' },
      { key: 'B', label: 'B. 大星星', result: '野心被點燃，提出企劃或加薪，準備數據。' },
      { key: 'C', label: 'C. 雲星',  result: '別怕慢，感受力恢復時靈感就長出來。' }
    ]}
];

// ---- Quick Reply ----
function qrBase() {
  return {
    items: [
      { type: 'action', action: { type: 'message', label: '運勢', text: '/運勢' } },
      { type: 'action', action: { type: 'message', label: '心理測驗', text: '/測驗' } },
      { type: 'action', action: { type: 'message', label: '幫助', text: '/help' } }
    ]
  };
}

function qrForQuiz(q) {
  const btns = q.options.map(function(o) {
    return { type: 'action', action: { type: 'postback', label: o.label, data: 'quiz=' + q.id + '&opt=' + o.key } };
  });
  btns.push({ type: 'action', action: { type: 'message', label: '換一題', text: '/測驗' } });
  btns.push({ type: 'action', action: { type: 'message', label: '抽運勢', text: '/運勢' } });
  return { items: btns };
}

// ---- 事件處理 ----
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') return handleText(event);
  if (event.type === 'postback') return handlePostback(event);
  return Promise.resolve();
}

async function handleText(event) {
  const text = (event.message.text || '').trim();
  const lower = text.toLowerCase();

  if (text === '/運勢' || lower === 'fortune') {
    const result = buildFortune();
    return client.replyMessage(event.replyToken, { type: 'text', text: result, quickReply: qrBase() });
  }

  if (text === '/測驗' || lower === 'quiz') {
    const q = rand(QUIZ);
    const body = '【心理測驗】' + q.title + '\n' + q.question;
    return client.replyMessage(event.replyToken, { type: 'text', text: body, quickReply: qrForQuiz(q) });
  }

  if (text === '/help' || text === '幫助') {
    const help = '指令：\n/運勢 → 抽今日運勢\n/測驗 → 玩心理測驗\n/help → 看說明';
    return client.replyMessage(event.replyToken, { type: 'text', text: help, quickReply: qrBase() });
  }

  // 非指令：不回覆
  return Promise.resolve();
}

async function handlePostback(event) {
  const params = new URLSearchParams(event.postback.data || '');
  const qid = params.get('quiz');
  const opt = (params.get('opt') || '').toUpperCase();

  const q = QUIZ.find(function(x) { return x.id === qid; });
  const chosen = q && q.options.find(function(o) { return o.key === opt; });

  if (!q || !chosen) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '這題走丟了，輸入 /測驗 換一題吧！', quickReply: qrBase() });
  }

  const msg = '【心理測驗結果】' + q.title + '\n你的選擇：' + chosen.label + '\n——\n' + chosen.result;
  return client.replyMessage(event.replyToken, { type: 'text', text: msg, quickReply: qrBase() });
}

// ---- 啟動 ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot is running on port ' + PORT));
