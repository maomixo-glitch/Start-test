// LINE Bot：今日運勢 + 心理測驗 + 今天吃什麼
// 極簡文字版、只回指令、無次數限制（CommonJS）

'use strict';

const express = require('express');
const line = require('@line/bot-sdk');

// ---- ENV ----
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
if (!config.channelAccessToken || !config.channelSecret) {
  console.error('Missing CHANNEL_ACCESS_TOKEN or CHANNEL_SECRET');
  process.exit(1);
}

const app = express();
const client = new line.Client(config);

// ---- Healthcheck ----
app.get('/', (_req, res) => res.send('LINE bot running.'));

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

// ---- Utils ----
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---- Fortune dictionary (no emoji or special punctuation) ----
const FORTUNE = {
  stars: [1, 2, 3, 4, 5],
  arche: ['流星型','羅盤型','晨曦型','火焰型','海風型','山嵐型','星塵型','月光型'],
  advises: [
    '先處理最小的一步, 會意外順利。',
    '把話說清楚一點, 誤會會少一半。',
    '別逞強, 一通電話就能解決的事就打。',
    '今天適合整理與丟掉, 留下重點就好。',
    '留 10% 餘裕, 會有好事進來。',
    '換個角度思考, 靈感就出現。',
    '收起比較心, 專注手上的事就贏一半。',
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

  // 用 ASCII 星等顯示, 避免任何特殊字元
  const starsBar = '[' + '*'.repeat(star) + '.'.repeat(5 - star) + '] ' + star + '/5';

  const areaMsgs = FORTUNE.areas.map(function (a) {
    return '[' + a + '] ' + rand(FORTUNE.advises);
  });

  let text = '';
  text += '今日運勢類型: ' + arche + '\n';
  text += '幸運指數: ' + starsBar + '\n';
  text += areaMsgs.join('\n') + '\n';
  text += '幸運色: ' + color + ' | 幸運物: ' + item;
  return text;
}

// ---- Quiz (text + postback) ----
const QUIZ = [
  { id: 'q_window', title: '選一扇窗的風景', question: '直覺選一扇你想打開的窗:',
    options: [
      { key: 'A', label: 'A. 海邊夕陽', result: '你最近需要放下執念, 先補充能量。先把心情養好。' },
      { key: 'B', label: 'B. 山林晨霧', result: '你走在對的方向, 但節奏偏快。放慢 10%, 品質會提升。' },
      { key: 'C', label: 'C. 城市夜景', result: '社交運上升, 主動出擊會有驚喜; 把作品丟出去。' },
      { key: 'D', label: 'D. 書房暖燈', result: '需要專注力的時期, 固定儀式很有效。' }
    ]},
  { id: 'q_key', title: '挑一把鑰匙', question: '直覺選一把最能打開你世界的鑰匙:',
    options: [
      { key: 'A', label: 'A. 古銅色花紋鑰匙', result: '你在整理價值觀, 先把自己的原則寫下。' },
      { key: 'B', label: 'B. 透明水晶鑰匙', result: '溝通是王牌。把需求說白, 更被尊重。' },
      { key: 'C', label: 'C. 黑色極簡鑰匙', result: '你需要極簡與界線。關閉三件不重要的事。' }
    ]},
  { id: 'q_coffee', title: '選一杯咖啡香', question: '哪一種當下最吸引你?',
    options: [
      { key: 'A', label: 'A. 濃黑', result: '你準備迎接挑戰, 直接面對卡關會有收穫。' },
      { key: 'B', label: 'B. 杏仁可頌香', result: '你需要美與儀式感, 佈置生活會回復動力。' },
      { key: 'C', label: 'C. 花生烘香', result: '先盤整金錢與時間, 步伐更穩。' }
    ]},
  { id: 'q_door', title: '推開一扇門', question: '你會先推開哪扇門?',
    options: [
      { key: 'A', label: 'A. 白色拱門', result: '新合作將出現。保持彈性, 會遇到合拍夥伴。' },
      { key: 'B', label: 'B. 深色木門', result: '需要長期主題。選一個 90 天專案全力以赴。' },
      { key: 'C', label: 'C. 玻璃旋轉門', result: '別再原地打轉。砍掉一個反覆猶豫的選項。' }
    ]},
  { id: 'q_star', title: '撿起一顆星', question: '你想撿起哪一顆?',
    options: [
      { key: 'A', label: 'A. 小星星', result: '日常在累積改變; 先守住睡眠與運動。' },
      { key: 'B', label: 'B. 大星星', result: '野心被點燃, 提出企劃或加薪, 準備數據。' },
      { key: 'C', label: 'C. 雲星',  result: '別怕慢, 感受力恢復時靈感就長出來。' }
    ]}
];

// ---- What to eat (many options, tarot-inspired reasons; no tarot names shown) ----
const EAT_LIST = [
  ['義大利麵', '今天需要溫柔交流的氛圍, 適合慢慢聊慢慢吃。'],
  ['火鍋', '聚會與溫暖能量會讓你充電, 適合一起分享。'],
  ['漢堡', '需要快速又有能量的選擇, 幫你全力衝刺。'],
  ['燒肉', '今天適合大口滿足, 讓自己感到豐盛有力。'],
  ['壽司', '講求平衡與專注, 細緻的節奏讓你更穩。'],
  ['沙拉', '清爽的開始, 幫你整理思緒並保持輕盈。'],
  ['燉飯', '慢慢醞釀的味道, 呼應你需要的耐心。'],
  ['拉麵', '需要集中精神, 熱度能喚醒你的專注。'],
  ['炒飯', '活力滿滿的基礎款, 今天要穩穩推進。'],
  ['牛排', '今天要定調氣勢, 補足行動力與決斷。'],
  ['咖哩飯', '多層次的香料讓你打開靈感與好奇。'],
  ['生魚片', '回到本質與純粹, 幫你切掉雜訊。'],
  ['鍋貼', '小而扎實的能量, 靈活應對零碎任務。'],
  ['餛飩湯', '柔和的溫度保護你的一天, 慢慢補充。'],
  ['貝果', '一點嚼勁讓你更專注, 節奏穩。'],
  ['雞湯', '先照顧自己, 恢復元氣再出發。'],
  ['水餃', '包起來的安全感, 今天需要穩定。'],
  ['烤魚', '低調卻有深度, 適合沉著處理事情。'],
  ['章魚燒', '小小幸福感, 替今天增加好心情。'],
  ['炸雞', '犒賞努力, 允許自己放鬆一下。'],
  ['炸物拼盤', '不必克制, 今天允許一點放肆。'],
  ['涼麵', '保持清爽的頭腦, 輕盈面對挑戰。'],
  ['羊肉爐', '需要暖意與守護, 補充底氣。'],
  ['牛肉麵', '穩重踏實的能量, 陪你撐過長任務。'],
  ['三明治', '維持效率, 移動中也能補充戰力。'],
  ['雞排便當', '簡單直接補充卡路里, 專注在重點。'],
  ['韓式拌飯', '把元素拌在一起, 整合資源的好日子。'],
  ['越南河粉', '清爽又有層次, 保持彈性與流動。'],
  ['泰式打拋豬', '需要一點刺激, 激活行動力。'],
  ['墨西哥捲餅', '機動性高的一天, 邊走邊吃也方便。'],
  ['印度咖哩', '濃郁厚實, 給你堅定的內在力量。'],
  ['土耳其烤肉', '冒險精神被喚醒, 換個風格試試。'],
  ['港式燒臘', '務實的飽足感, 效率至上。'],
  ['港式點心', '小而多變, 適合需要彈性的節奏。'],
  ['抹茶甜點', '需要療癒與小確幸, 放鬆一下。'],
  ['熱可可', '安撫情緒的補給, 溫柔面對變動。'],
  ['豆花', '柔軟的甜味帶來穩定感。'],
  ['水果優格', '清新補給, 照顧身體也照顧心情。'],
  ['手搖飲', '為今天加點有趣的配方, 保持好奇。'],
  ['冷泡茶+小點', '放慢半拍, 留白讓答案浮現。'],
  ['燒餅油條', '傳統穩定的力量, 踏實開始。'],
  ['蘿蔔糕', '平凡中的小驚喜, 讓步調更順。'],
  ['鰻魚飯', '補充持久力, 面對長期戰。'],
  ['披薩', '分享與團隊合作的能量被點亮。'],
  ['早午餐', '彈性安排, 給自己一點掌控感。'],
  ['蛋包飯', '被好好包住的安心感, 今天值得。']
];

function buildEatSuggestion() {
  const pick = rand(EAT_LIST);
  return '今天吃: ' + pick[0] + '\n原因: ' + pick[1];
}

// ---- Quick Reply ----
function qrBase() {
  return {
    items: [
      { type: 'action', action: { type: 'message', label: '運勢', text: '/運勢' } },
      { type: 'action', action: { type: 'message', label: '心理測驗', text: '/測驗' } },
      { type: 'action', action: { type: 'message', label: '吃什麼', text: '/吃什麼' } },
      { type: 'action', action: { type: 'message', label: '幫助', text: '/help' } }
    ]
  };
}

function qrForQuiz(q) {
  const btns = q.options.map(function (o) {
    return { type: 'action', action: { type: 'postback', label: o.label, data: 'quiz=' + q.id + '&opt=' + o.key } };
  });
  btns.push({ type: 'action', action: { type: 'message', label: '換一題', text: '/測驗' } });
  btns.push({ type: 'action', action: { type: 'message', label: '抽運勢', text: '/運勢' } });
  btns.push({ type: 'action', action: { type: 'message', label: '再抽餐點', text: '/吃什麼' } });
  return { items: btns };
}

// ---- Event handlers ----
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
    return client.replyMessage(event.replyToken, { type: 'text', text: result });
  }

  if (text === '/測驗' || lower === 'quiz') {
    const q = rand(QUIZ);
    const body = '[心理測驗] ' + q.title + '\n' + q.question;
    return client.replyMessage(event.replyToken, { type: 'text', text: body});
  }

  if (text === '/吃什麼' || lower === 'eat') {
    const msg = buildEatSuggestion();
    return client.replyMessage(event.replyToken, { type: 'text', text: msg });
  }

  if (text === '/help' || text === '幫助') {
    const help = '指令:\n/運勢 -> 抽今日運勢\n/測驗 -> 玩心理測驗\n/吃什麼 -> 今天吃什麼建議\n/help -> 看說明';
    return client.replyMessage(event.replyToken, { type: 'text', text: help });
  }

  // 非指令: 不回覆
  return Promise.resolve();
}

async function handlePostback(event) {
  const params = new URLSearchParams(event.postback.data || '');
  const qid = params.get('quiz');
  const opt = (params.get('opt') || '').toUpperCase();

  const q = QUIZ.find(function (x) { return x.id === qid; });
  const chosen = q && q.options.find(function (o) { return o.key === opt; });

  if (!q || !chosen) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '這題走丟了, 輸入 /測驗 換一題吧!', quickReply: qrBase() });
  }

  const msg = '[心理測驗結果] ' + q.title + '\n你的選擇: ' + chosen.label + '\n--\n' + chosen.result;
  return client.replyMessage(event.replyToken, { type: 'text', text: msg, quickReply: qrBase() });
}

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot is running on port ' + PORT));
