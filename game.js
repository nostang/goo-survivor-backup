(() => {
  'use strict';

  // Semantic versions: major redesign / new features / small fixes. Update asset URLs together.
  const RELEASE = {
    version: 'v1.3.0', date: '2026-10-15',
    changes: [
      ['v1.3.0', '新增完整離線快取、圖片載入檢查與重試畫面，提供獨立備援網站；新版不會中斷正在進行的遊戲。'],
      ['v1.2.1', '放慢新手教學：實際移動累積 4 秒，持續攻擊練習至少 4 秒後擊倒怪物；新增練習進度。'],
      ['v1.2.0', '第一關新增逐步實作教學：移動、攻擊、撿經驗、選技能、土地公祝福；可略過或重玩，教學期間暫停首領倒數。'],
      ['v1.1.2', '首領新增移動彈幕與更強召喚；收假老屁孩三階段全場轟炸。補上一週目徽章與專屬沙發結局。'],
      ['v1.0.0', '正式版本起點：土地公賜福、七關操作引導與像素介面。之後以三段版本號區分大改版、功能更新與小修正。'],
      ['v66', '開場改為路邊土地公賜福，拉遠距離並取消吸附；七關引導依領祝福、選擇與嘎叫操作推進，加入各關專屬提醒。'],
      ['v65', '修正河濱無限紫罐：全路線共用 45 秒補給冷卻，新增路段不能繞過限制；同步更新補給指引；開場可返回選關，重繪背包按鈕，首次升級改為土地公伯伯的祝福。'],
      ['v64', '七關完整自動操作實測後縮短河濱與週日首領耐久；已領寶箱改為開蓋像素圖，新增城市逃跑背景，校正補給提示。'],
      ['v63', '全介面統一像素冒險風格；新增關卡出沒時間表與技能成長說明，重整怪潮節奏，升級保留既有裝備與進化搭配選項。'],
      ['v62', '校正七關故事、任務與攻略：統一擊敗首領通關，標明登場時間，移除舊收集與出口指示，更新第二階段招式說明。'],
      ['v61', '修正第一關開場故事與今日任務，移除舊通勤章指示，明確標示首領於 5 分鐘後登場。'],
      ['v60', '第六關道路加寬並無限延伸，紫罐沿路重複補給；Boss 新增第二階段與連續追擊、轟炸、召喚。'],
      ['v59', '失敗結算改為完整句子：被小勞鼠擊倒了。'],
      ['v58', '結算勝敗圖恢復大張置中；通關使用去字的 Come on Goo 圖。'],
      ['v57', '結算優先顯示故事、寶箱與完整紀錄；回到首頁選下一關，移除直接下一關。'],
      ['v56', '技能圖案精修：純閃電、金色羽毛、無眉毛鵝、衝刺 Goo、啞鈴、多坨便便與爆發鵝鳴；長脖子改名伸長脖子。'],
      ['v55', '六種武器與組合技重製：羽毛子彈、長頸啄擊、鵝便便、羽毛球飛彈、減速怒吼；同步更新全部圖案與配方。'],
      ['v54', '重製人行道、辦公室、河濱道路與室內羽球館；紅瓶回血、藍瓶 EXP、紫罐雙補給。'],
      ['v53', 'Boss 血量提高至 10 倍；隨機補血瓶間隔 30 秒，固定補給點 45 秒再生。'],
      ['v52', '防止戰鬥中雙擊、雙指手勢誤放大；保留選單捲動與閱讀縮放。'],
      ['v51', '修正 LV.20 後無法升級能力：固定三選一，技能優先、空位補強；每 20 秒附近隨機補血瓶，擊敗精英立即滿血。'],
      ['v50', '補血瓶回復最大生命 25%，拾取後 30 秒在原處再生，持續提供 EXP。'],
      ['v49', '路標改為紅色補血瓶：拾取回血與 EXP，移除路標編號與收集任務提示。'],
      ['v48', '擊敗首領即通關，立即保存進度；新增首領退場、自動結算，修復擊殺瞬間卡住。'],
      ['v47', '首頁與設定顯示版本；確認第一關後段可持續升級補強。'],
      ['v46', 'LV.21 起三選一：回血 30%、攻擊 +5%、速度 +2%（最多 +10%）。速度選滿改為生命上限 +5。'],
      ['v44', '修復追加音波傷害、四級鵝蛋蛋液；加強五級怒吼擊退與羽毛進化。']
    ]
  };


  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const gooSprite = new Image();
  gooSprite.src = 'assets/goo-idle.png?v=1';
  const blessingSprite = new Image();
  blessingSprite.src = 'assets/ui/earth-god-v1.svg';
  const enemySprites = new Map();
  const enemyImages = {};
  ['rat', 'myna', 'rooster', 'boar', 'kid'].forEach(family => {
    for (let tier = 1; tier <= 3; tier++) {
      const key = `${family}${tier}`;
      const image = new Image();
      image.src = `assets/enemies/${key}.png?v=2`;
      enemyImages[key] = image;
    }
  });
  const $ = (selector) => document.querySelector(selector);
  const TAU = Math.PI * 2;
  const RUN_DURATION = 8 * 60; // Legacy save migration only.
  const WORLD = window.GooWorld;
  const GooAudio = window.GooAudio;
  const TEST_FAMILY_DURATION = 18;
  const TEST_DURATION = TEST_FAMILY_DURATION * 5;
  const LOW_POWER_MODE = matchMedia('(pointer: coarse)').matches || innerWidth <= 700;
  const TARGET_FRAME_MS = 1000 / (LOW_POWER_MODE ? 30 : 60);
  const MAX_ACTIVE_ENEMIES = LOW_POWER_MODE ? 150 : 320;
  const MAX_ACTIVE_PROJECTILES = LOW_POWER_MODE ? 170 : 360;
  const MAX_ACTIVE_PARTICLES = LOW_POWER_MODE ? 120 : 280;
  const MAX_ACTIVE_GEMS = LOW_POWER_MODE ? 180 : 420;

  const STORE_BOUNDS = { left: -720, right: 720, top: -720, bottom: 720 };
  const STORE_OBSTACLES = [
    { kind: 'shelf', label: '飯糰・便當', x: -535, y: -385, w: 300, h: 360, color: '#ef9a39' },
    { kind: 'shelf', label: '零食・泡麵', x: -105, y: -385, w: 300, h: 360, color: '#55b96b' },
    { kind: 'shelf', label: '飲料・牛奶', x: -535, y: 80, w: 300, h: 270, color: '#53a9d8' },
    { kind: 'checkout', label: '結帳櫃檯', x: 285, y: 250, w: 315, h: 170, color: '#ef8e35' },
    { kind: 'fridge', label: '冷藏櫃', x: 360, y: -520, w: 235, h: 440, color: '#62b7da' }
  ];

  const DIFFICULTIES = {
    easy:   { label: '悠閒', hp: .78, damage: .64, speed: .88, spawn: .78, xp: 1.35, options: 4, revive: true },
    normal: { label: '標準', hp: 1, damage: 1, speed: 1, spawn: 1, xp: 1, options: 3, revive: false },
    hell:   { label: '鵝獄', hp: 1.65, damage: 1.42, speed: 1.2, spawn: 1.48, xp: .95, options: 3, revive: false }
  };

  const ENEMY_TYPES = {
    rat: {
      name: '通勤勞署', hp: 18, speed: 66, damage: 8, radius: 13, color: '#8b715e', xp: 4,
      first: '00:00', danger: 1, drop: '小經驗晶片', status: '待重畫', needsRedraw: true,
      lore: '每天第一個衝出捷運出口，嘴裡永遠還咬著沒吃完的早餐。',
      behavior: '沿最短路線追著 Goo 跑；單隻不強，但很會揪團卡住通勤路。'
    },
    crow: {
      name: '黑羽烏鴉', hp: 14, speed: 106, damage: 7, radius: 11, color: '#31343f', xp: 5,
      first: '00:36', danger: 2, drop: '小經驗晶片', status: '像素草稿',
      lore: '盤旋在便利商店外，專門等待社畜手上的早餐掉到地上。',
      behavior: '速度最快，飛行節奏忽快忽慢，容易從敵群縫隙偷襲。'
    },
    rooster: {
      name: '暴躁公雞', hp: 46, speed: 78, damage: 12, radius: 17, color: '#db5145', xp: 8,
      first: '01:30', danger: 3, drop: '中經驗晶片', status: '像素草稿',
      lore: '把每一個路口都當成自己的晨間伸展場，紅燈也攔不住牠。',
      behavior: '平時追擊，抓到節奏後會突然加速衝刺，逼 Goo 臨時變換路線。'
    },
    boar: {
      name: '衝撞野豬', hp: 105, speed: 48, damage: 18, radius: 23, color: '#6f453a', xp: 13,
      first: '03:00', danger: 3, drop: '大經驗晶片', status: '像素草稿',
      lore: '不知道從哪座山下來，堅信忠孝東路就是牠家的跑道。',
      behavior: '移動慢，但生命與碰撞傷害很高；成群靠近時會形成厚重肉牆。'
    },
    scarecrow: {
      name: '加班稻草人', hp: 76, speed: 57, damage: 15, radius: 20, color: '#bd8a35', xp: 11,
      first: '05:00', danger: 3, drop: '大經驗晶片', status: '像素草稿',
      lore: '穿著公司發的背心，站在辦公大樓前散發「今晚留下來」的氣場。',
      behavior: '速度不快但持續施壓，會和高速敵人一起壓縮 Goo 的走位空間。'
    },
    elite: {
      name: '加班信封怪', hp: 820, speed: 54, damage: 24, radius: 34, color: '#ae52e8', xp: 75,
      first: '01:30／04:00／06:00', danger: 4, drop: '進化寶箱', status: '像素草稿',
      lore: '標題寫著「小事情」，附件卻有四十七頁，還會追著人跑。',
      behavior: '高生命菁英敵人；每局固定出現三次，擊敗後掉落可觸發進化的寶箱。'
    },
    boss: {
      name: '星期一鬧鐘王', hp: 5200, speed: 50, damage: 32, radius: 56, color: '#ff5c43', xp: 500,
      first: '08:00', danger: 5, drop: '準時打卡', status: '像素草稿',
      lore: '集合所有貪睡、塞車與未讀訊息而成的巨大星期一意志。',
      behavior: '追擊同時週期性發射八方向環狀彈幕，是第一關最後的走位考驗。'
    }
  };

  const TEST_ENEMY_TYPES = {
    rat1: {
      name: '小勞鼠', family: 'rat', tier: 0, hp: 14, speed: 82, damage: 5, radius: 11, color: '#9b8175', xp: 3,
      behavior: '沿最短路線追趕 Goo，體型小、數量多，會從四周慢慢包圍。'
    },
    rat2: {
      name: '大勞鼠', family: 'rat', tier: 1, hp: 44, speed: 72, damage: 9, radius: 17, color: '#7f665c', xp: 7,
      behavior: '比小勞鼠更耐打，靠近後會黏著 Goo，形成擁擠的通勤鼠潮。'
    },
    rat3: {
      name: '勞鼠王', family: 'rat', tier: 2, hp: 210, speed: 58, damage: 16, radius: 27, color: '#5f4943', xp: 25,
      behavior: '首領追擊時會蓄力射擊，再召喚鼠潮並射出扇形彈幕；血量低於 60% 時加強召喚與彈幕。靠近嘎叫可打斷，金色光圈是反擊時間。'
    },
    myna1: {
      name: '早餐八哥', family: 'myna', tier: 0, hp: 12, speed: 108, damage: 5, radius: 11, color: '#343744', xp: 4,
      behavior: '飛行速度忽快忽慢，會從怪群的空隙鑽進來搶走早餐。'
    },
    myna2: {
      name: '搶食惡八哥', family: 'myna', tier: 1, hp: 36, speed: 122, damage: 8, radius: 16, color: '#2c303c', xp: 8,
      behavior: '高速追擊，飛行速度忽快忽慢。提早拉開距離，留意牠從怪群縫隙穿入。'
    },
    myna3: {
      name: '便利商店王八哥', family: 'myna', tier: 2, hp: 180, speed: 94, damage: 15, radius: 27, color: '#222630', xp: 28,
      behavior: '首領追擊時蓄力射擊，再連續俯衝 2 次，第二階段增為 3 次；最後追加彈幕、召喚八哥並引爆落點。嘎叫能打斷並搶回被奪走的晶幣。'
    },
    rooster1: {
      name: '趕路雞', family: 'rooster', tier: 0, hp: 20, speed: 88, damage: 6, radius: 12, color: '#b76537', xp: 4,
      behavior: '持續追趕 Goo，以碰撞造成傷害；小型趕路雞不會蓄力衝刺。'
    },
    rooster2: {
      name: '暴躁公雞', family: 'rooster', tier: 1, hp: 54, speed: 82, damage: 11, radius: 18, color: '#a85431', xp: 9,
      behavior: '跺腳蓄力後直線衝刺，撞到時會造成比一般怪更高的傷害。'
    },
    rooster3: {
      name: '紅燈不等雞王', family: 'rooster', tier: 2, hp: 240, speed: 106, damage: 18, radius: 29, color: '#914329', xp: 30,
      behavior: '首領追擊時會蓄力射擊，再連續衝刺 2 次，第二階段增為 3 次；最後發射彈幕並召喚小雞。等連招結束、金色光圈出現再反擊。'
    },
    boar1: {
      name: '迷路小山豬', family: 'boar', tier: 0, hp: 38, speed: 62, damage: 8, radius: 14, color: '#9a5a34', xp: 5,
      behavior: '圓滾滾地靠近 Goo，速度不快，但生命比同級小怪更厚。'
    },
    boar2: {
      name: '衝撞野豬', family: 'boar', tier: 1, hp: 112, speed: 68, damage: 15, radius: 22, color: '#7d472e', xp: 12,
      behavior: '低頭蓄力後高速衝撞，衝刺期間很難靠一般走位甩開。'
    },
    boar3: {
      name: '陽明山豬王', family: 'boar', tier: 2, hp: 390, speed: 58, damage: 23, radius: 32, color: '#60372d', xp: 36,
      behavior: '首領追擊時蓄力射擊，再連續衝撞 2 次，第二階段增為 3 次，每次停下會留下震爆紅圈，最後追加彈幕與野豬群。側移躲開，嘎叫可打斷連招。'
    },
    kid1: {
      name: '小屁孩', family: 'kid', tier: 0, hp: 22, speed: 96, damage: 6, radius: 13, color: '#f0b72f', xp: 5,
      behavior: '拿著棒棒糖蛇行亂跑，路線左右飄動，很難用直線攻擊瞄準。'
    },
    kid2: {
      name: '死屁孩', family: 'kid', tier: 1, hp: 60, speed: 128, damage: 10, radius: 18, color: '#df3f39', xp: 10,
      behavior: '騎滑板車高速切入，靠近時會突然提速，水球則是牠的辨識標誌。'
    },
    kid3: {
      name: '老屁孩', family: 'kid', tier: 2, hp: 280, speed: 74, damage: 19, radius: 31, color: '#b92f35', xp: 34,
      behavior: '週四首領橫移射擊、音浪與落點轟炸。週日收假老屁孩有三階段，60% 與 30% 血量加強全場轟炸、擴散彈幕與混合召喚。紅圈有預警，靠近嘎叫可打斷。'
    }
  };

  Object.assign(ENEMY_TYPES, TEST_ENEMY_TYPES);

  const TEST_FAMILIES = [
    { label: '勞鼠族', types: ['rat1', 'rat2', 'rat3'] },
    { label: '八哥族', types: ['myna1', 'myna2', 'myna3'] },
    { label: '公雞族', types: ['rooster1', 'rooster2', 'rooster3'] },
    { label: '野豬族', types: ['boar1', 'boar2', 'boar3'] },
    { label: '小屁孩族', types: ['kid1', 'kid2', 'kid3'] }
  ];
  const BESTIARY_ORDER = TEST_FAMILIES.flatMap(family => family.types);
  const ENEMY_ART_ALIASES = {
    rat: { family: 'rat', tier: 0 },
    crow: { family: 'myna', tier: 0 },
    rooster: { family: 'rooster', tier: 1 },
    boar: { family: 'boar', tier: 1 }
  };

  const CHAPTERS = [
    {
      day: '一', english: 'MONDAY', title: '逃出通勤地獄', short: '台北街區・星期一', mapType: 'infinite',
      description: '穿過台北街區，準時趕到公司打卡。',
      story: '住在台北的社畜 Goo 今天又睡過頭了！為了準時打卡，只好衝進混亂的通勤鼠潮。撐過這個星期一，晚上還要去打羽球呢！',
      roster: '勞鼠族、八哥族、公雞族', objective: '在鼠潮中存活，擊敗勞鼠王！',
      waves: [['rat1', 'myna1'], ['rat1', 'rat2', 'myna1', 'rooster1'], ['rat2', 'myna2', 'rooster2']],
      elites: ['rat2', 'myna2', 'rooster2'], boss: 'rat3', bossName: '勞鼠王',
      reward: '鵝便便＋飛毛鵝腿',
      theme: { ground: '#2b4b49', road: '#18383a', edge: '#4a6965', accent: 'rgba(240,218,125,.24)' }
    },
    {
      day: '二', english: 'TUESDAY', title: '早餐保衛戰', short: '便利商店・星期二', mapType: 'store',
      description: '白色磁磚與貨架之間，早餐保衛戰開打。',
      story: 'Goo 好不容易買到早餐，自動門卻被最難纏的搶食集團堵住了。',
      roster: '八哥族、勞鼠族、小屁孩', objective: '在店內閃避怪群，擊敗便利商店王八哥！',
      waves: [['myna1', 'rat1'], ['myna1', 'myna2', 'rat2', 'kid1'], ['myna2', 'rat2', 'kid1', 'kid2']],
      elites: ['myna2', 'rat2', 'kid2'], boss: 'myna3', bossName: '便利商店王八哥',
      balance: { hp: 1.18, speed: 1.08, damage: 1.12, spawn: 1.28, extraChance: .22, bossHp: 1.28, bossShots: 10, bossCooldown: 1.75 },
      reward: '餅乾屑飛彈＋點心雷達',
      theme: { ground: '#395047', road: '#213a3b', edge: '#5e7166', accent: 'rgba(255,198,91,.25)' }
    },
    {
      day: '三', english: 'WEDNESDAY', title: '圓環大暴走', short: '台北・星期三', mapType: 'ring',
      description: '紅燈只是參考，圓環裡每一隻雞都有路權。',
      story: '午休時間只剩四十分鐘，Goo 卻被困在一座永遠繞不出去的圓環。',
      roster: '公雞族、野豬族', objective: '沿環道閃避追擊，擊敗紅燈不等雞王！',
      waves: [['rooster1', 'boar1'], ['rooster1', 'rooster2', 'boar1'], ['rooster2', 'boar1', 'boar2']],
      elites: ['rooster2', 'boar2', 'rooster2'], boss: 'rooster3', bossName: '紅燈不等雞王',
      reward: '羽毛球飛彈＋結實翅膀',
      theme: { ground: '#3e4a46', road: '#263437', edge: '#6b6c5c', accent: 'rgba(255,224,98,.26)' }
    },
    {
      day: '四', english: 'THURSDAY', title: '便利商店攻防戰', short: '台北・星期四', mapType: 'vertical',
      description: '下班前的最後一杯咖啡，引來最吵的一群人。',
      story: 'Goo 只是想安靜買杯咖啡，門口卻被八哥和小屁孩全面占領。',
      roster: '小屁孩族、八哥族、大勞鼠', objective: '繞過人行道障礙，擊敗老屁孩！',
      waves: [['kid1', 'myna1'], ['kid1', 'kid2', 'myna2', 'rat2'], ['kid2', 'myna2', 'rat2']],
      elites: ['kid2', 'myna2', 'rat2'], boss: 'kid3', bossName: '老屁孩',
      reward: '嘎嘎怒吼＋厚實羽絨',
      theme: { ground: '#334a45', road: '#203638', edge: '#587068', accent: 'rgba(116,221,174,.23)' }
    },
    {
      day: '五', english: 'FRIDAY', title: '準時下班大逃亡', short: '台北・星期五', mapType: 'horizontal',
      description: '下班時間一到，整間辦公室都想留下 Goo。',
      story: '球友已經在群組催了三次，加班勞鼠王卻帶著怪群堵住走道。Goo 握緊球拍，今晚說什麼都要準時赴約！',
      roster: '五族中型怪物', objective: '穿梭辦公室走道，擊敗加班勞鼠王！',
      waves: [['rat2', 'myna2'], ['rat2', 'rooster2', 'kid2'], ['rat2', 'myna2', 'rooster2', 'boar2', 'kid2']],
      elites: ['boar2', 'kid2', 'rooster2'], boss: 'rat3', bossName: '加班勞鼠王',
      reward: '永久增加 1 次刷新',
      theme: { ground: '#3a4148', road: '#252f39', edge: '#5a6270', accent: 'rgba(255,126,112,.25)' }
    },
    {
      day: '六', english: 'SATURDAY', title: '衝去打羽球', short: '台北・星期六', mapType: 'route',
      description: '河濱路上怪群擋道，打球的約定可不能遲到。',
      story: '今天不用打卡，Goo 沿著河濱趕去打羽球，卻遇上陽明山豬王帶隊攔路。先把這群不速之客趕走，再去球場和大家會合！',
      roster: '野豬族、公雞族、小屁孩族', objective: '在河濱道路迎戰，擊敗陽明山豬王！',
      waves: [['boar1', 'rooster1'], ['boar1', 'boar2', 'kid1', 'rooster2'], ['boar2', 'kid2', 'rooster2']],
      elites: ['boar2', 'kid2', 'rooster2'], boss: 'boar3', bossName: '陽明山豬王',
      reward: '永久生命上限 +10',
      theme: { ground: '#315249', road: '#203c3a', edge: '#5c7a68', accent: 'rgba(174,245,104,.24)' }
    },
    {
      day: '日', english: 'SUNDAY', title: '台北全員出沒', short: '台北・星期日', mapType: 'arena',
      description: '收假前最後一場球，五大家族全擠進了羽球館。',
      story: 'Goo 想用一場羽球替週末收尾，五大家族卻把球館擠得水洩不通，連落下的羽球都會爆炸。打敗收假老屁孩，讓這一週好好結束吧！',
      roster: '五大家族全員', objective: '避開羽球榴彈，擊敗收假老屁孩！',
      waves: [['rat1', 'myna1', 'rooster1', 'boar1', 'kid1'], ['rat2', 'myna2', 'rooster2', 'boar2', 'kid2'], ['rat2', 'myna2', 'rooster2', 'boar2', 'kid2']],
      elites: ['rat3', 'myna3', 'rooster3'], boss: 'kid3', bossName: '收假老屁孩',
      reward: '一週目完成徽章',
      theme: { ground: '#3d4c44', road: '#2b3537', edge: '#6d7265', accent: 'rgba(255,211,75,.27)' }
    }
  ];

  function chapterSchedule(index = selectedChapter) {
    const duration = WORLD.specs[index].duration;
    const at = fraction => Math.round(duration * fraction);
    return { waves: [0, at(.30), at(.65)], elites: [.22,.50,.78].map(at), surges: [.16,.40,.65,.90].map(at), boss: duration };
  }
  function waveStage(index = selectedChapter, time = elapsed) {
    const schedule = chapterSchedule(index);
    return time < schedule.waves[1] ? 0 : time < schedule.waves[2] ? 1 : 2;
  }
  function chapterTimeline(index) {
    const chapter = CHAPTERS[index], schedule = chapterSchedule(index);
    const events = schedule.waves.map((time,i) => ({time,kind:'wave',title:['暖身','混合怪群','高壓怪群'][i],detail:chapter.waves[i].map(id=>ENEMY_TYPES[id].name).join('、')}));
    schedule.elites.forEach((time,i)=>events.push({time,kind:'elite',title:`精英 ${i+1}`,detail:ENEMY_TYPES[chapter.elites[i]].name+' · 擊敗回滿生命並掉落寶箱'}));
    schedule.surges.forEach((time,i)=>events.push({time,kind:'surge',title:`怪物潮 ${i+1}`,detail:'額外怪群集結；接著短暫減緩一般出怪'}));
    events.push({time:schedule.boss,kind:'boss',title:chapter.bossName,detail:'首領登場 · 擊敗即可通關'});
    return events.sort((a,b)=>a.time-b.time);
  }
  function renderTimeline(index) {
    $('#chapter-timeline').innerHTML = chapterTimeline(index).map(e=>`<li class="timeline-${e.kind}"><time>${formatTime(e.time)}</time><div><strong>${e.title}</strong><small>${e.detail}</small></div></li>`).join('');
  }
  function enemyAppearances(id) {
    const appearances = [];
    CHAPTERS.forEach((chapter,index)=>{
      const schedule=chapterSchedule(index), first=chapter.waves.findIndex(pool=>pool.includes(id));
      if(first>=0)appearances.push(`週${chapter.day} ${formatTime(schedule.waves[first])} 起隨機出沒`);
      chapter.elites.forEach((type,i)=>{if(type===id)appearances.push(`週${chapter.day} ${formatTime(schedule.elites[i])} 精英`);});
      if(chapter.boss===id)appearances.push(`週${chapter.day} ${formatTime(schedule.boss)} 首領${chapter.bossName!==ENEMY_TYPES[id].name?'：'+chapter.bossName:''}`);
    });
    const summoners = {rat1:['rat3'],rat2:['rat3'],myna1:['myna3'],rooster1:['rooster3'],kid1:['kid3']}[id] || [];
    CHAPTERS.forEach((chapter,index)=>{if(summoners.includes(chapter.boss))appearances.push(`週${chapter.day} 首領戰可被召喚${['rat2','kid1'].includes(id)?'（第二階段）':''}`);});
    return appearances;
  }

  const WEAPON_UNLOCK_CHAPTER = { peck: 0, feather: 0, egg: 1, bread: 2, wind: 3, honk: 4 };
  const PASSIVE_UNLOCK_CHAPTER = { range: 0, haste: 0, power: 3, magnet: 2, speed: 1, vitality: 4 };
  const PROGRESS_KEY = 'goo-survivor-progress-v1';

  const CHAPTER_PRESENTATION = [
    {art:'assets/chapters/monday-commute-v1.jpg',map:'通勤十字路口',feature:'東西與南北每 12 秒輪流通行；路口嘎叫可開放行人 4 秒。紫罐回復生命並提供 EXP，拾取後 45 秒再生。',tip:'鼠王邊追擊邊蓄力射擊，召喚更多鼠潮與扇形彈幕；血量低於 60% 時攻勢加強。避開瞄準線，靠近嘎叫可打斷，金色光圈出現時反擊。'},
    {art:'assets/chapters/tuesday-breakfast-v1.jpg',map:'便利商店',feature:'貨架與櫃檯會阻擋移動，利用轉角甩開怪群。紅瓶回血、藍瓶補 EXP，紫罐兩者都有。',tip:'王八哥追擊時蓄力射擊，連續俯衝 2 次，第二階段增為 3 次；最後發射扇形彈幕、召喚八哥並引爆落點。側移避開，靠近嘎叫可打斷並搶回晶幣。'},
    {art:'assets/chapters/wednesday-roundabout-v1.jpg',map:'城市圓環',feature:'中央花圃與外側護欄不可穿越。沿環道移動，利用紫罐補充生命與 EXP。',tip:'雞王邊追擊邊蓄力射擊；連續衝刺 2 次，第二階段增為 3 次，最後發射更寬的彈幕並召喚雞群。持續側移，等金色光圈出現再反擊。'},
    {art:'assets/chapters/thursday-coffee-v2.jpg',map:'店外人行道',feature:'在人行道與騎樓穿梭，繞過攤販、停放機車與貨物；留意退路與紫罐補給。',tip:'老屁孩邊橫移邊發射扇形彈幕，並放音浪、轟炸你先前的位置；第二階段增加兩側爆炸與更多小屁孩。離開紅圈，或靠近嘎叫打斷首領招式。'},
    {art:'assets/chapters/friday-overtime-v1.jpg',map:'辦公室',feature:'在固定範圍的辦公桌區、茶水間與廁所迎戰；利用隔間走道閃避怪群、尋找補給。',tip:'加班勞鼠王追擊時會蓄力射擊，再召喚鼠潮與扇形彈幕，第二階段數量增加。保持走道暢通，靠近嘎叫打斷，趁金色光圈反擊。'},
    {art:'assets/chapters/saturday-badminton-v1.jpg',map:'無限河濱道路',feature:'道路上下無限延伸，兩側是河流與草地；自行車與補給站沿路分布；紫罐全路線共用 45 秒冷卻，跑到新路段也不能連續領取。沒有需要抵達的終點。',tip:'山豬王追擊時蓄力射擊，連續衝撞 2 次，第二階段增為 3 次；停下留下震爆紅圈，最後追加彈幕與野豬群。避開衝撞與紅圈，等連招結束再反擊。'},
    {art:'assets/chapters/sunday-all-families-v1.jpg',map:'室內羽球館',feature:'首領登場前，每 10 秒出現一輪羽球榴彈，警示 2 秒後爆炸；首領戰改由老屁孩發動全場轟炸。',tip:'收假老屁孩有三階段：60% 血量加強，30% 使出全力。會橫移射擊、發散彈幕、隨機全場落點轟炸與混合召喚；先避開紅圈，靠近嘎叫可取消尚未爆炸的落點，金色光圈時反擊。'}
  ];

  const PASSIVES = {
    power:    { name: '結實翅膀', art: 'assets/skills-v4/passives-power.svg', desc: '所有傷害 +8%', apply: p => p.damage *= 1.08 },
    haste:    { name: '急性子', art: 'assets/skills-v4/passives-haste.svg', desc: '攻擊冷卻 -5%', apply: p => p.cooldown *= .95 },
    range:    { name: '伸長脖子', art: 'assets/skills-v4/passives-range.svg', desc: '攻擊範圍 +7%', apply: p => p.range *= 1.07 },
    speed:    { name: '飛毛鵝腿', art: 'assets/skills-v4/passives-speed.svg', desc: '移動速度 +4.5%', apply: p => p.speed *= 1.045 },
    magnet:   { name: '點心雷達', art: 'assets/skills-v4/passives-magnet.svg', desc: '拾取範圍 +14%', apply: p => p.pickup *= 1.14 },
    vitality: { name: '厚實羽絨', art: 'assets/skills-v4/passives-vitality.svg', desc: '生命上限 +10 並回復生命', apply: p => { p.maxHp += 10; p.hp = Math.min(p.maxHp, p.hp + 14); } }
  };

  const WEAPONS = {
    peck: {
      name: '羽毛子彈', art: 'assets/skills-v4/weapons-peck.svg', passive: 'haste', evo: '羽毛彈幕', evoArt: 'assets/skills-v4/evolutions-peck.svg', distance: '中距離', power: '中威力',
      desc: ['射出羽毛子彈', '傷害與攻速提升', '每發可命中 2 隻', '傷害與攻速提升', '雙發穿透羽毛'],
      evoDesc: '快速射出三道羽毛，每發最多穿透 4 隻敵人。'
    },
    feather: {
      name: '長頸啄擊', art: 'assets/skills-v4/weapons-feather.svg', passive: 'range', evo: '暴走長頸鵝', evoArt: 'assets/skills-v4/evolutions-feather.svg', distance: '近距離', power: '中威力',
      desc: ['伸頸咬擊近敵並推開', '連咬 2 隻敵人', '伸頸距離與傷害提升', '連咬 3 隻敵人', '伸頸更遠、咬得更快'],
      evoDesc: '朝周圍最多 5 隻敵人高速伸頸連咬，距離與推力提升。'
    },
    egg: {
      name: '鵝便便', art: 'assets/skills-v4/weapons-egg.svg', passive: 'speed', evo: '便地開花', evoArt: 'assets/skills-v4/evolutions-egg.svg', distance: '沿路陷阱', power: '持續傷害',
      desc: ['移動時留下便便，踩到減速', '陷阱更大、存續更久', '持續傷害與範圍提升', '更快留下便便', '傷害、範圍與存續提升'],
      evoDesc: '留下更大的減速便便區，敵人在其中倒下會向附近濺散。'
    },
    bread: {
      name: '餅乾屑飛彈', art: 'assets/skills-v4/weapons-crumb.svg', passive: 'magnet', evo: '無限下午茶', evoArt: 'assets/skills-v4/evolutions-bread.svg', distance: '遠距離', power: '低威力',
      desc: ['發射追蹤餅乾', '額外發射 1 片', '追蹤速度與傷害提升', '額外發射 1 片', '傷害提升、冷卻縮短'],
      evoDesc: '無窮無盡的餅乾屑會自行尋找敵人。'
    },
    wind: {
      name: '羽毛球飛彈', art: 'assets/skills-v4/weapons-wind.svg', passive: 'power', evo: '全場殺球', evoArt: 'assets/skills-v4/evolutions-wind.svg', distance: '彈射掃場', power: '中威力',
      desc: ['射出會撞牆反彈的羽毛球', '飛速與穿透提升', '同時射出 2 顆', '飛得更快、存在更久', '同時射出 3 顆'],
      evoDesc: '同時發射 4 顆高速羽毛球，命中加速、穿透與存續提升。'
    },
    honk: {
      name: '嘎嘎怒吼', art: 'assets/skills-v4/weapons-honk.svg', passive: 'vitality', evo: '末日鵝鳴', evoArt: 'assets/skills-v4/evolutions-honk.svg', distance: '中距離', power: '高威力',
      desc: ['音波傷害，減速 30% 持續 2 秒', '音波範圍與傷害提升', '連續釋放 2 道', '音波傷害提升', '範圍與傷害進一步提升'],
      evoDesc: '連續 3 道音波，減速 45% 持續 3 秒；Boss 減速幅度減半。'
    }
  };

  function weaponArt(id, className = '') {
    return `<span class="weapon-art-wrap ${className}"><img class="weapon-art" src="${WEAPONS[id].art}" alt="" /></span>`;
  }

  function gameArt(src, className = '') {
    return `<span class="game-art ${className}"><img src="${src}" alt="" /></span>`;
  }

  function passiveArt(id, className = '') {
    return gameArt(PASSIVES[id].art, className);
  }

  function evolutionArt(id, className = '') {
    return gameArt(WEAPONS[id].evoArt, className);
  }

  const dom = {
    menu: $('#menu'), hud: $('#hud'), chapterIntro: $('#chapter-intro'), chapterInfo: $('#chapter-info'), upgrade: $('#upgrade'), evolution: $('#evolution'), comboBook: $('#combo-book'), bestiary: $('#bestiary'), pause: $('#pause'), result: $('#result'),
    timer: $('#timer'), healthBar: $('#health-bar'), healthText: $('#health-text'), xpBar: $('#xp-bar'), levelText: $('#level-text'),
    dock: $('#weapon-dock'), bossWrap: $('#boss-wrap'), bossBar: $('#boss-bar'), bossName: $('#boss-name'), joystick: $('#joystick'),
    toast: $('#toast'), bestTime: $('#best-time'), stageName: $('#stage-name'), difficultyLabel: $('#difficulty-label')
  };

  function loadProgress() {
    try {
      const saved = JSON.parse(storageRead(PROGRESS_KEY) || 'null');
      if (saved) return {
        unlockedChapter: Math.max(0, Math.min(6, Number(saved.unlockedChapter) || 0)),
        cleared: Array.isArray(saved.cleared) ? saved.cleared.filter(index => Number.isInteger(index) && index >= 0 && index <= 6) : [],
        bestTimes: saved.bestTimes && typeof saved.bestTimes === 'object' ? saved.bestTimes : {},
        claimedRewards: Array.isArray(saved.claimedRewards) ? [...new Set(saved.claimedRewards.filter(i => Number.isInteger(i) && i >= 0 && i <= 6 && Array.isArray(saved.cleared) && saved.cleared.includes(i)))] : [],
        weaponSetVersion:55,
        legacyPassives: [...new Set([...(Array.isArray(saved.legacyPassives)?saved.legacyPassives.filter(id=>['power','speed'].includes(id)):[]),...(Number(saved.weaponSetVersion||0)<55?[(saved.cleared||[]).includes(0)&&(saved.claimedRewards||[]).includes(0)?'power':null,(saved.cleared||[]).includes(2)&&(saved.claimedRewards||[]).includes(2)?'speed':null].filter(Boolean):[])])],
        weekComplete: !!saved.weekComplete || (Array.isArray(saved.cleared)&&saved.cleared.includes(6))
      };
    } catch (error) {
      console.warn('Unable to load Goo progress', error);
    }
    const oldBest = Number(storageRead('goo-best') || 0);
    return {
      unlockedChapter: oldBest >= RUN_DURATION ? 1 : 0,
      cleared: oldBest >= RUN_DURATION ? [0] : [],
      bestTimes: oldBest ? { 0: oldBest } : {},
      claimedRewards: [],
      weaponSetVersion:55, legacyPassives:[], weekComplete: false
    };
  }

  function saveProgress() {
    storageWrite(PROGRESS_KEY, JSON.stringify(progress));
  }

  let storageWarned = false;
  let settings = loadSettings(), settingsBack = 'menu';
  let adventure = {};
  let replayTraining = false;
  let trainingStatus = storageRead('goo-onboarding-v1', '');
  let runSerial = 0, pendingChests = 0, lootReturnScreen='menu';
  let progress = loadProgress();
  if ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') && new URLSearchParams(location.search).get('preview') === 'tuesday-store') {
    progress.unlockedChapter = Math.max(progress.unlockedChapter, 1);
  }
  let selectedChapter = Math.min(progress.unlockedChapter, 6);

  let width = innerWidth;
  let height = innerHeight;
  let dpr = 1;
  let camera = { x: 0, y: 0 };
  let selectedDifficulty = 'normal';
  let runMode = 'chapter';
  let state = 'menu';
  let last = performance.now();
  let elapsed = 0;
  let spawnClock = 0;
  let eliteFlags = [false, false, false];
  let surgeFlags = [false, false, false, false];
  let bossSpawned = false;
  let boss = null;
  let kills = 0;
  let rerolls = 3;
  let pendingLevels = 0;
  let reviveUsed = false;
  let testFamilyIndex = -1;
  let testTierIndex = -1;
  let toastTimer = 0;
  let shake = 0;
  let audio = null;
  let enemies = [];
  let projectiles = [];
  let gems = [];
  let particles = [];
  let effects = [];
  let pools = [];
  const keys = new Set();
  const joystick = { active: false, id: null, x: 0, y: 0, originX: 0, originY: 0 };

  let player = createPlayer();

  function createPlayer() {
    const bonusHp = progress.claimedRewards.includes(5) ? 10 : 0;
    return {
      x: 0, y: 0, radius: 21, hp: 100 + bonusHp, maxHp: 100 + bonusHp, speed: 215, damage: 1.21, cooldown: 1, range: 1, pickup: 92,
      xp: 0, nextXp: 24, level: 1, boostDamage: 0, boostSpeed: 0, maxed: false, invuln: 0, flash: 0,
      moving: false,
      weapons: { peck: { level: 1, evolved: false, cd: 0 } },
      passives: {}, facing: 1
    };
  }

  function resize() {
    // Frame-rate throttling stays independent of pixel density.
    dpr = Math.min(devicePixelRatio || 1, settings.effects === 'low' ? 2 : 3);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function currentChapter() {
    return CHAPTERS[selectedChapter];
  }

  function activeMapType() {
    return runMode === 'chapter' ? currentChapter().mapType : 'infinite';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function circleHitsRect(entity, rect) {
    const nearestX = clamp(entity.x, rect.x, rect.x + rect.w);
    const nearestY = clamp(entity.y, rect.y, rect.y + rect.h);
    const dx = entity.x - nearestX;
    const dy = entity.y - nearestY;
    return dx * dx + dy * dy < entity.radius * entity.radius;
  }

  function keepInsideStore(entity) {
    const bounds = STORE_BOUNDS;
    const pad = entity.radius + 22;
    entity.x = clamp(entity.x, bounds.left + pad, bounds.right - pad);
    entity.y = clamp(entity.y, bounds.top + pad, bounds.bottom - pad);
  }

  function moveEntity(entity,dx,dy,isEnemy=false) {
    if(runMode==='test'){entity.x+=dx;entity.y+=dy;return;}
    const ox=entity.x,oy=entity.y;
    WORLD.move(selectedChapter,entity,dx,dy,elapsed,adventure.grace||0,mapExtra());
    if(isEnemy && Math.hypot(entity.x-ox,entity.y-oy)<Math.hypot(dx,dy)*.3) {
      const side=Math.sin(entity.phase||0)>=0?1:-1;
      WORLD.move(selectedChapter,entity,-dy*side,dx*side,elapsed,adventure.grace||0,mapExtra());
    }
  }

  function updateCamera() {
    if(runMode==='test'){camera.x=player.x;camera.y=player.y;return;}
    const b=WORLD.localBounds(selectedChapter,player.y);
    camera.x=b[2]-b[0]<=width?(b[0]+b[2])/2:clamp(player.x,b[0]+width/2,b[2]-width/2);
    camera.y=selectedChapter===5?player.y:b[3]-b[1]<=height?(b[1]+b[3])/2:clamp(player.y,b[1]+height/2,b[3]-height/2);
  }

  function storeSpawnPosition() {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: -110 + Math.random() * 220, y: STORE_BOUNDS.bottom - 54 };
    if (side === 1) return { x: 395 + Math.random() * 170, y: STORE_BOUNDS.top + 54 };
    if (side === 2) return { x: STORE_BOUNDS.left + 54, y: 420 + Math.random() * 170 };
    return { x: STORE_BOUNDS.right - 54, y: -10 + Math.random() * 190 };
  }

  function skillUnlocked(kind, id) {
    const chapter = (kind === 'weapon' ? WEAPON_UNLOCK_CHAPTER : PASSIVE_UNLOCK_CHAPTER)[id] ?? 0;
    return chapter === 0 || progress.claimedRewards.includes(chapter - 1) || (kind==='passive'&&(progress.legacyPassives||[]).includes(id));
  }
  function rewardItems(index) {
    const items = [];
    if(index===6)return [{name:'一週目完成徽章',art:'assets/ui/week-badge-v1.svg',desc:'七日生還紀念 · 已展示在首頁'}];
    for (const [id, chapter] of Object.entries(WEAPON_UNLOCK_CHAPTER)) if (chapter === index + 1) items.push({name:WEAPONS[id].name,art:WEAPONS[id].art,desc:WEAPONS[id].desc[0]});
    for (const [id, chapter] of Object.entries(PASSIVE_UNLOCK_CHAPTER)) if (chapter === index + 1) items.push({name:PASSIVES[id].name,art:PASSIVES[id].art,desc:PASSIVES[id].desc});
    if (!items.length) items.push({name:CHAPTERS[index].reward,art:'assets/ui/chest-pixel-v3.svg',desc:index===4?'之後每局增加一次刷新':index===5?'之後每局生命上限增加 10':'一週目完成紀念'});
    return items;
  }
  function claimChapterReward() {
    if(selectedChapter===6)return false;
    if (!['menu','result'].includes(state) || !progress.cleared.includes(selectedChapter) || progress.claimedRewards.includes(selectedChapter)) return false;
    lootReturnScreen=state;
    progress.claimedRewards.push(selectedChapter);
    saveProgress();
    $('#loot-items').innerHTML = rewardItems(selectedChapter).map(item => `<article class="loot-item"><img src="${item.art}" alt="" /><strong>${item.name}</strong><small>${item.desc}</small></article>`).join('');
    initAudio(); GooAudio.cue('upgrade');
    $('#result-unlock').classList.add('hidden');
    renderChapterMenu(); setScreen('chapter-loot');
    return true;
  }
  function renderSkills(category = 'weapons') {
    for (const tab of ['weapons','passives','evolutions']) $('#skills-'+tab).setAttribute('aria-pressed', String(tab === category));
    const passive = category === 'passives', evolved = category === 'evolutions';
    const entries = Object.entries(passive ? PASSIVES : WEAPONS);
    $('#skills-list').innerHTML = entries.map(([id, item]) => {
      const unlocked = skillUnlocked(passive?'passive':'weapon',id);
      const source = (passive ? PASSIVE_UNLOCK_CHAPTER : WEAPON_UNLOCK_CHAPTER)[id];
      const status = source === 0 ? '初始技能' : unlocked ? '已解鎖' : `星期${CHAPTERS[source-1].day}寶箱解鎖`;
      const name = evolved ? item.evo : item.name, art = evolved ? item.evoArt : item.art;
      const description = passive ? `每升 1 級：${item.desc}` : evolved ? item.evoDesc : item.desc[0];
      const growth = !passive && !evolved ? `<details class="skill-growth"><summary>查看 LV.1—5 成長</summary><ol>${item.desc.map((text,i)=>`<li><b>LV.${i+1}</b> ${text}</li>`).join('')}</ol></details>` : '';
      const recipe = evolved ? `<small class="skill-recipe">${item.name} LV.5 ＋ ${PASSIVES[item.passive].name} LV.1</small>` : '';
      return `<article class="skill-entry ${unlocked?'':'locked'}"><img src="${art}" alt="" /><div><strong>${name}</strong><p>${description}</p>${recipe}${growth}<small class="skill-status">${evolved&&unlocked?'升級達成配方即進化；精英寶箱也會檢查配方':status}</small></div></article>`;
    }).join('');
  }

  function weekBadgeEarned(){return progress.weekComplete||CHAPTERS.every((_,i)=>progress.cleared.includes(i));}
  function renderChapterMenu() {
    $('#week-badge').classList.toggle('hidden',!weekBadgeEarned());
    const chapter = currentChapter();
    const isCleared = progress.cleared.includes(selectedChapter);
    const presentation = CHAPTER_PRESENTATION[selectedChapter];
    $('#chapter-title').textContent = chapter.title;
    $('#chapter-description').textContent = chapter.description;
    const claimed = progress.claimedRewards.includes(selectedChapter);
    const chest = $('#chapter-chest');
    const lockedChapter = selectedChapter > progress.unlockedChapter;
    $('.chapter-preview').classList.toggle('is-locked', lockedChapter);
    $('#chapter-lock').classList.toggle('hidden', !lockedChapter);
    chest.classList.toggle('hidden',selectedChapter===6);
    chest.disabled = !isCleared || claimed;
    chest.classList.toggle('claimable', isCleared && !claimed);
    chest.classList.toggle('claimed', claimed);
    chest.classList.toggle('sealed', !isCleared);
    $('#chest-status').textContent = !claimed && isCleared ? '!' : '';
    $('#chest-art').src = claimed ? 'assets/ui/chest-open-pixel.svg' : 'assets/ui/chest-pixel-v3.svg';
    chest.setAttribute('aria-label', claimed ? '通關寶箱，已領取' : isCleared ? `開啟星期${chapter.day}通關寶箱` : '通關後才能開啟寶箱');
    $('#chapter-art').src = presentation.art;
    $('#chapter-art').alt = `星期${chapter.day}：${chapter.title}故事插畫`;
    $('#chapter-stamp').classList.toggle('hidden', !isCleared);
    $('#chapter-info-title').textContent = `星期${chapter.day}攻略`;
    $('#chapter-info-map').textContent = presentation.map;
    $('#chapter-info-feature').textContent = `${presentation.feature} 首領於 ${WORLD.specs[selectedChapter].duration / 60} 分鐘後登場，擊敗即可通關。`;
    $('#chapter-info-enemies').textContent = chapter.roster;
    $('#chapter-info-boss').textContent = chapter.bossName;
    $('#chapter-info-tip').textContent = presentation.tip;
    renderTimeline(selectedChapter);
    document.querySelectorAll('.week-progress button').forEach(button => {
      const index = Number(button.dataset.chapter);
      button.classList.toggle('current', index === selectedChapter);
      if (index === selectedChapter) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      button.classList.toggle('cleared', progress.cleared.includes(index));
      button.classList.toggle('locked', index > progress.unlockedChapter);
      button.setAttribute('aria-label', `星期${CHAPTERS[index].day}${index > progress.unlockedChapter ? '，尚未解鎖' : progress.cleared.includes(index) ? '，已通關' : '，可遊玩'}`);
    });
    const locked = selectedChapter > progress.unlockedChapter;
    const startButton = $('#start-btn');
    startButton.disabled = locked;
    startButton.innerHTML = locked ? '尚未解鎖' : '開始遊戲 <span>→</span>';
    dom.bestTime.textContent = formatTime(Number(progress.bestTimes[selectedChapter] || 0));
  }

  function initAudio() { GooAudio.init(); GooAudio.setSettings(settings); }
  function sound(freq=400,duration=.06,type='sine',volume=.035) { GooAudio.tone(freq,duration,type,Math.min(.35,volume*3)); }

  function setScreen(next) {
    state = next;
    renderTrainingUI();
    $('#app').classList.toggle('combat-touch',next==='playing');
    $('#honk-btn').disabled=next!=='playing'||(adventure.honkCd||0)>0;
    $('#settings').classList.toggle('hidden', next !== 'settings');
    $('#skills').classList.toggle('hidden', next !== 'skills');
    $('#chapter-loot').classList.toggle('hidden', next !== 'chapter-loot');
    GooAudio.setScene(next==='playing' ? (boss?'boss':'playing') : ['paused','settings','upgrade','evolution','combo','intro','chapter-info','training'].includes(next)?'paused':next==='result'?'result':'menu',selectedChapter);
    dom.menu.classList.toggle('visible', next === 'menu');
    dom.menu.classList.toggle('hidden', next !== 'menu');
    dom.chapterIntro.classList.toggle('hidden', next !== 'intro');
    dom.chapterInfo.classList.toggle('hidden', next !== 'chapter-info');
    dom.hud.classList.toggle('hidden', !['playing', 'upgrade', 'evolution', 'combo', 'paused'].includes(next));
    dom.upgrade.classList.toggle('hidden', next !== 'upgrade');
    dom.evolution.classList.toggle('hidden', next !== 'evolution');
    dom.comboBook.classList.toggle('hidden', next !== 'combo');
    dom.bestiary.classList.toggle('hidden', next !== 'bestiary');
    dom.pause.classList.toggle('hidden', next !== 'paused');
    dom.result.classList.toggle('hidden', next !== 'result');
    resetTouchControl();
    if(next==='menu'||next==='result'){clearTimeout(toastTimer);dom.toast.classList.remove('show');}
  }

  function startGame(mode = 'chapter') {
    if (mode === 'chapter' && selectedChapter > progress.unlockedChapter) return;
    initAudio();
    runSerial++; pendingChests=0;
    runMode = mode;
    player = createPlayer();
    if (runMode === 'test') {
      player.maxHp = 260;
      player.hp = 260;
      player.speed = 225;
      player.damage *= 1.45;
      player.cooldown = .86;
    }
    enemies = []; projectiles = []; gems = []; particles = []; effects = []; pools = [];
    elapsed = 0; spawnClock = .4; eliteFlags = [false, false, false]; surgeFlags = [false, false, false, false]; bossSpawned = false; boss = null; kills = 0; rerolls = 3 + (progress.claimedRewards.includes(4) ? 1 : 0); pendingLevels = 0; reviveUsed = false;
    testFamilyIndex = -1; testTierIndex = -1;
    const isTestRun = runMode === 'test';
    const chapter = currentChapter();
    if (!isTestRun && chapter.mapType === 'store') {
      player.x = 0;
      player.y = STORE_BOUNDS.bottom - 180;
    }
    resetAdventure();
    camera.x = player.x;
    camera.y = player.y;
    updateCamera();
    dom.stageName.textContent = isTestRun ? '怪物測試場' : chapter.short;
    dom.difficultyLabel.textContent = isTestRun ? '01 / 15' : LOW_POWER_MODE ? '省電 30FPS' : '';
    dom.difficultyLabel.classList.toggle('hidden', !isTestRun && !LOW_POWER_MODE);
    if (!isTestRun) {
      $('#intro-kicker').textContent = `CHAPTER ${String(selectedChapter + 1).padStart(2, '0')} · ${chapter.english}`;
      $('#intro-title').textContent = `星期${chapter.day}，${chapter.title}`;
      $('#intro-story').textContent = chapter.story;
      $('#intro-objective').textContent = chapter.objective;
    }
    setScreen(isTestRun ? 'playing' : 'intro');
    updateHud();
    if (runMode !== 'test') {
      $('#intro-objective').textContent = `${chapter.objective}\n首領將於 ${runDuration() / 60} 分鐘後登場，擊敗即可通關`;
    }
    if (runMode === 'test') showToast('測試開始：每 6 秒切換一種怪物！');
    sound(520, .09, 'triangle', .05);
  }

  function endGame(won) {
    if(state==='result')return;
    adventure.won=won;
    setScreen('result');
    pendingChests=0;
    GooAudio.setScene(won?'win':'result',selectedChapter);GooAudio.cue(won?'win':'lose');
    const survived = elapsed;
    const oldBest = Number(storageRead('goo-best') || 0);
    if (runMode !== 'test' && survived > oldBest) storageWrite('goo-best', survived);
    const chapter = currentChapter();
    const firstClear = runMode !== 'test' && won && !progress.cleared.includes(selectedChapter);
    if (runMode !== 'test') {
      progress.bestTimes[selectedChapter] = Math.max(Number(progress.bestTimes[selectedChapter] || 0), survived);
      if (won) {
        if (firstClear) progress.cleared.push(selectedChapter);
        if (selectedChapter === progress.unlockedChapter && selectedChapter < 6) progress.unlockedChapter++;
        if (selectedChapter === 6) {progress.weekComplete = true;if(!progress.claimedRewards.includes(6))progress.claimedRewards.push(6);}
      }
      saveProgress();
    }
    $('#result-eyebrow').textContent = runMode === 'test' ? 'FIELD TEST' : won ? 'CHAPTER CLEAR' : 'RUN OVER';
    $('.result-card').scrollTop=0;
    $('#result-title').textContent = runMode === 'test' ? won ? '15 隻怪物測試完成！' : '測試中途結束' : won ? `星期${chapter.day}通關！` : '今天可能要請假了';
    $('#result-goose').classList.toggle('defeated', !won);
    const weekEnding=runMode!=='test'&&won&&selectedChapter===6;
    $('#result-ending-note').classList.toggle('hidden',!weekEnding);
    $('#result-week-badge').classList.toggle('hidden',!weekEnding||!weekBadgeEarned());
    $('#result-goose').classList.toggle('week-ending',weekEnding);
    $('#result-goose').innerHTML = `<img src="${weekEnding?'assets/goo-week-ending-v1.png':won?'assets/goo-winner-v1.png':'assets/goo-defeated-v1.png'}" alt="${weekEnding?'一週冒險結束，Goo 在沙發上休息':won?'悠閒躺著的 Goo':'趴著流淚的 Goo'}" class="${won ? 'winner' : ''}" />`;
    if(weekEnding)$('#result-title').textContent='一周目完成';
    $('#result-time').textContent = formatTime(survived);
    $('#result-kills').textContent = kills.toLocaleString();
    $('#result-level').textContent = player.level;
    $('#result-evolutions').textContent = Object.values(player.weapons).filter(w => w.evolved).length;
    const hasNext = runMode !== 'test' && won && selectedChapter < 6;
    $('#result-next-note').classList.toggle('hidden',!hasNext);
    $('#result-next-note').textContent=hasNext?`星期${CHAPTERS[selectedChapter+1].day}已解鎖`:'';
    showRunFeedback(won);
    const unlockPanel = $('#result-unlock');
    const rewardReady = runMode !== 'test' && won && selectedChapter!==6 && !progress.claimedRewards.includes(selectedChapter);
    unlockPanel.classList.toggle('hidden', !rewardReady);
    unlockPanel.textContent = rewardReady ? '開啟通關寶箱' : '';
    if (runMode !== 'test') dom.bestTime.textContent = formatTime(progress.bestTimes[selectedChapter]);
    sound(won ? 720 : 130, won ? .5 : .35, won ? 'triangle' : 'sawtooth', .06);
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2100);
  }

  function randomEdgePosition(distance = 90) {
    if (activeMapType() === 'store') return storeSpawnPosition();
    const pad = distance;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: player.x - width / 2 - pad, y: player.y + (Math.random() - .5) * height * 1.3 };
    if (side === 1) return { x: player.x + width / 2 + pad, y: player.y + (Math.random() - .5) * height * 1.3 };
    if (side === 2) return { x: player.x + (Math.random() - .5) * width * 1.3, y: player.y - height / 2 - pad };
    return { x: player.x + (Math.random() - .5) * width * 1.3, y: player.y + height / 2 + pad };
  }

  function pickEnemyType() {
    if (runMode === 'test') return 'rat1';
    const pool = currentChapter().waves[waveStage()];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnEnemy(type = pickEnemyType(), elite = false, asBoss = false) {
    let pos = randomEdgePosition(elite ? 130 : 75);
    if(runMode!=='test')for(let i=0;i<20;i++){
      const angle=Math.random()*TAU,distance=260+Math.random()*220;
      const candidate=WORLD.project(selectedChapter,player.x+Math.cos(angle)*distance,player.y+Math.sin(angle)*distance,asBoss?48:30,elapsed,adventure.grace||0,mapExtra());
      if(Math.hypot(candidate.x-player.x,candidate.y-player.y)>220){pos=candidate;break;}
    }
    const minute = elapsed / Math.max(1,runDuration()) * 8;
    const d = DIFFICULTIES[selectedDifficulty];
    const base = ENEMY_TYPES[type];
    const chapterBalance = runMode === 'chapter' ? currentChapter().balance || {} : {};
    const chapterScale = runMode === 'chapter' ? 1 + selectedChapter * .12 : 1;
    const hpScale = (1 + minute * .19 + minute * minute * .018) * d.hp * chapterScale * (chapterBalance.hp || 1);
    const isBoss = asBoss || type === 'boss';
    const bossEndurance = selectedChapter === 5 ? .25 : selectedChapter === 6 ? .65 : 1;
    const bossScale = asBoss && type !== 'boss' ? 5.8 * (chapterBalance.bossHp || 1) * bossEndurance : elite ? 4.2 : 1;
    const radiusScale = isBoss ? 1.55 : elite ? 1.15 : 1;
    const enemy = {
      ...pos, type, elite: elite || type === 'elite' || isBoss, boss: isBoss, radius: base.radius * radiusScale, color: base.color,
      hp: base.hp * hpScale * bossScale * (isBoss ? 10 : 1), maxHp: base.hp * hpScale * bossScale * (isBoss ? 10 : 1),
      speed: base.speed * d.speed * (1 + Math.min(.2, minute * .022)) * (runMode === 'chapter' ? 1 + selectedChapter * .025 : 1) * (chapterBalance.speed || 1), damage: base.damage * d.damage * (runMode === 'chapter' ? 1 + selectedChapter * .08 : 1) * (chapterBalance.damage || 1),
      xp: base.xp * d.xp * (isBoss ? 8 : 1), family: base.family || null, tier: base.tier ?? null,
      hitCd: 0, orbitCd: 0, flash: 0, phase: Math.random() * TAU, specialCd: 2.4, facing: 1, stun: 0, aiPhase:'stalk', aiTime:2.5, stolen:0
    };
    if(runMode!=='test')Object.assign(enemy,WORLD.project(selectedChapter,enemy.x,enemy.y,enemy.radius,elapsed,adventure.grace||0,mapExtra()));
    enemies.push(enemy);
    if (isBoss) {
      boss = enemy;GooAudio.setScene('boss',selectedChapter);
      dom.bossWrap.classList.remove('hidden');
      const bossName = runMode === 'chapter' ? currentChapter().bossName : base.name;
      dom.bossName.textContent = bossName;
      showToast(`${bossName}現身！`);
      shake = 12;
      sound(90, .7, 'sawtooth', .08);
    }
    return enemy;
  }

  function spawnTestWave(dt) {
    if (elapsed >= TEST_DURATION) {
      enemies = [];
      projectiles = [];
      endGame(true);
      return;
    }

    const familyIndex = Math.min(TEST_FAMILIES.length - 1, Math.floor(elapsed / TEST_FAMILY_DURATION));
    const family = TEST_FAMILIES[familyIndex];
    const familyElapsed = elapsed - familyIndex * TEST_FAMILY_DURATION;
    const tierIndex = Math.min(2, Math.floor(familyElapsed / (TEST_FAMILY_DURATION / 3)));
    const archiveIndex = familyIndex * 3 + tierIndex + 1;

    if (familyIndex !== testFamilyIndex || tierIndex !== testTierIndex) {
      enemies = [];
      projectiles = projectiles.filter(projectile => projectile.type !== 'enemy');
      testFamilyIndex = familyIndex;
      testTierIndex = tierIndex;
      spawnClock = .12;
      player.hp = player.maxHp;
      const type = family.types[tierIndex];
      dom.stageName.textContent = `測試場・${family.label}`;
      dom.difficultyLabel.textContent = `${String(archiveIndex).padStart(2, '0')} / 15`;
      dom.difficultyLabel.classList.remove('hidden');
      showToast(`${ENEMY_TYPES[type].name}：${tierIndex === 0 ? '小型' : tierIndex === 1 ? '中型' : '首領'}測試`);
      updateHud();
    }

    spawnClock -= dt;
    if (spawnClock > 0) return;
    const type = family.types[tierIndex];
    if (tierIndex === 0) {
      spawnClock = .72;
      for (let i = 0; i < 2 && enemies.length < 22; i++) spawnEnemy(type);
    } else if (tierIndex === 1) {
      spawnClock = 1.05;
      spawnEnemy(type);
      if (Math.random() < .55 && enemies.length < 16) spawnEnemy(family.types[0]);
    } else {
      spawnClock = 2.2;
      if (!enemies.some(enemy => enemy.type === type)) spawnEnemy(type);
      if (enemies.length < 8) spawnEnemy(family.types[1]);
    }
  }

  function spawnWave(dt) {
    if (runMode === 'test') {
      spawnTestWave(dt);
      return;
    }
    if(adventure.bossDefeated)return;
    const d = DIFFICULTIES[selectedDifficulty];
    const chapterBalance = currentChapter().balance || {};
    const schedule = chapterSchedule();
    spawnClock -= dt;
    if (spawnClock <= 0 && !bossSpawned) {
      const stage = waveStage();
      const breathing = schedule.surges.some(t=>elapsed>=t && elapsed<t+7);
      const interval = [.85,.60,.42][stage] / d.spawn / (chapterBalance.spawn || 1);
      spawnClock = interval * (breathing ? 2 : 1) * (selectedChapter===0 && elapsed<45 ? 1.3 : 1);
      let count = breathing ? 1 : [1,2,3][stage];
      if (selectedDifficulty === 'hell' && Math.random() < .28) count++;
      if (Math.random() < (chapterBalance.extraChance || 0)) count++;
      for (let i = 0; i < count && enemies.length < MAX_ACTIVE_ENEMIES; i++) spawnEnemy();
    }

    const eliteTimes = schedule.elites;
    if (!eliteFlags[0] && elapsed >= eliteTimes[0]) {
      eliteFlags[0] = true; spawnEnemy(currentChapter().elites[0], true); showToast('菁英怪帶著強化寶箱來了！');
    }
    if (!eliteFlags[1] && elapsed >= eliteTimes[1]) {
      eliteFlags[1] = true; spawnEnemy(currentChapter().elites[1], true); showToast('第二隻菁英怪出現！');
    }
    if (!eliteFlags[2] && elapsed >= eliteTimes[2]) {
      eliteFlags[2] = true; spawnEnemy(currentChapter().elites[2], true); showToast('最終菁英帶著大寶箱出現！');
    }

    const surgeTimes = schedule.surges;
    for (let index = 0; index < surgeTimes.length; index++) {
      if (surgeFlags[index] || elapsed < surgeTimes[index] || bossSpawned) continue;
      surgeFlags[index] = true;
      const surgeCount = 5 + selectedChapter + index * 2;
      for (let i = 0; i < surgeCount && enemies.length < MAX_ACTIVE_ENEMIES; i++) spawnEnemy();
      showToast(selectedChapter === 1 ? `第 ${index + 1} 波搶食潮！` : `第 ${index + 1} 波怪物潮！`);
      shake = Math.max(shake, 8);
      sound(125, .38, 'sawtooth', .055);
    }
    if (!bossSpawned && elapsed >= runDuration()) {
      bossSpawned = true;
      enemies = enemies.filter(e => e.elite);
      spawnEnemy(currentChapter().boss, false, true);
    }
  }

  function getMoveVector() {
    let x = joystick.x, y = joystick.y;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  function nearestEnemy(maxDistance = Infinity, fromX = player.x, fromY = player.y) {
    let best = null, bestDist = maxDistance;
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - fromX, enemy.y - fromY);
      if (dist < bestDist) { bestDist = dist; best = enemy; }
    }
    return best;
  }

  function combatTargetRange(baseRange) {
    // Auto-attacks should meet enemies near the visible play area, not erase them far off-screen.
    const screenLimit = Math.max(360, Math.min(560, Math.min(width, height) * 1.05));
    return Math.min(baseRange * player.range, screenLimit);
  }

  function fireProjectile(type, angle, speed, damage, radius, life, extra = {}) {
    if (projectiles.length >= MAX_ACTIVE_PROJECTILES) return;
    projectiles.push({ type, x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage, radius, life, ...extra });
  }

  function updateWeapons(dt) {
    for (const [id, owned] of Object.entries(player.weapons)) {
      owned.cd -= dt;
      const level = owned.level;
      if (id === 'feather') continue;
      if (owned.cd > 0) continue;

      if (id === 'peck') {
        const target = nearestEnemy(combatTargetRange(390));
        if (target) {
          const angle = Math.atan2(target.y - player.y, target.x - player.x);
          const momentum=adventure.style==='runner'&&adventure.moving>1.2;
          const count = owned.evolved ? 3 : level >= 5 ? 2 : 1;
          for (let i = 0; i < count; i++) fireProjectile('peck', angle + (i - (count - 1) / 2) * .1, owned.evolved ? 930 : 780, (16 + level * 5) * player.damage * (momentum?1.4:1) * (owned.evolved ? 1.18 : 1), owned.evolved ? 8 : 6, 1, { pierce: (owned.evolved ? 4 : level >= 3 ? 2 : 1)+(momentum?1:0), color: owned.evolved ? '#fff15e' : '#fff7dc' });
          owned.cd = (owned.evolved ? .48 : Math.max(.58, .9 - level * .055)) * player.cooldown;
          sound(owned.evolved ? 680 : 460, .035, 'triangle', .018);
        }
      }

      if (id === 'egg') {
        if(!player.moving){owned.cd=.12;continue;}
        if(owned.lastDrop&&Math.hypot(player.x-owned.lastDrop.x,player.y-owned.lastDrop.y)<28){owned.cd=.12;continue;}
        const anchor=runMode==='test'?{x:player.x-player.facing*18,y:player.y+12}:WORLD.project(selectedChapter,player.x-player.facing*18,player.y+12,4,elapsed,adventure.grace,mapExtra());
        addPoopPool({...anchor,radius:(owned.evolved?75:22+level*6)*player.range,life:owned.evolved?7:2.5+level*.5,damage:(9+level*3)*player.damage*(owned.evolved?1.2:1),slow:owned.evolved?.4:.25,evolved:owned.evolved});
        owned.lastDrop={x:player.x,y:player.y};owned.cd=(owned.evolved?.65:level>=4?.95:1.4)*player.cooldown;
      }

      if (id === 'bread') {
        const count = owned.evolved ? 4 : 1 + Math.floor(level / 2);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU;
          fireProjectile('bread', angle, 250 + level * 16, (10 + level * 4) * player.damage * (owned.evolved ? 1.12 : 1), 7, 2.35, { homing: true });
        }
        owned.cd = (owned.evolved ? .65 : Math.max(.95, 1.65 - level * .12)) * player.cooldown;
      }

      if (id === 'wind') {
        const target=nearestEnemy(combatTargetRange(650));
        if(target){
          const angle=Math.atan2(target.y-player.y,target.x-player.x),count=owned.evolved?4:level>=5?3:level>=3?2:1;
          for(let i=0;i<count;i++)fireProjectile('shuttle',angle+(i-(count-1)/2)*.28,owned.evolved?500:280+level*24,(14+level*4)*player.damage*(owned.evolved?1.15:1),8,owned.evolved?6:2.5+level*.5,{pierce:owned.evolved?12:1+level,hitTimes:new Map(),evolved:owned.evolved});
          owned.cd=(owned.evolved?1.2:2.6-level*.2)*player.cooldown;
        }
      }

      if (id === 'honk') {
        const waves = owned.evolved ? 3 : level >= 3 ? 2 : 1;
        for (let i = 0; i < waves; i++) effects.push({ type: 'honk', x: player.x, y: player.y, radius: 10, maxRadius: (120 + level * 12) * player.range, life: .55, delay: i * .18, maxLife: .55, damage: (13 + level * 5) * player.damage * (owned.evolved ? 1.15 : 1), slow:owned.evolved?.45:.3,slowDuration:owned.evolved?3:2,applied:false });
        owned.cd = (owned.evolved ? 2.6 : 3.6) * player.cooldown;
        sound(145, .18, 'square', .035);
      }
    }
  }

  function updateOrbit(dt) {
    const owned=player.weapons.feather;if(!owned||owned.cd>0)return;
    const reach=(owned.evolved?180:70+owned.level*14)*player.range,count=owned.evolved?5:owned.level>=4?3:owned.level>=2?2:1;
    const targets=enemies.filter(e=>Math.hypot(e.x-player.x,e.y-player.y)<reach+e.radius).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y)).slice(0,count);
    if(!targets.length)return;
    targets.forEach((enemy,i)=>{
      if(state==='victory'||state==='result')return;
      const angle=Math.atan2(enemy.y-player.y,enemy.x-player.x),length=Math.min(reach,Math.hypot(enemy.x-player.x,enemy.y-player.y));
      effects.push({type:'bite',x:player.x,y:player.y,angle,length,delay:i*.07,life:.25,maxLife:.25,evolved:owned.evolved});
      damageEnemy(enemy,(15+owned.level*5)*player.damage*(owned.evolved?1.2:1));
      if(enemy.hp>0){const resistance=enemy.boss?.2:enemy.elite?.55:Math.min(1,16/enemy.radius),push=(owned.evolved?24:14)*resistance;moveEntity(enemy,Math.cos(angle)*push,Math.sin(angle)*push,true);}
    });
    owned.cd=(owned.evolved?.42:1.25-owned.level*.12)*player.cooldown;
  }

  function applySlow(enemy,amount,duration,source='honk') {
    if(enemy.hp<=0)return;
    enemy.slows ||= {};
    enemy.slows[source]={amount:amount*(enemy.boss?.5:1),until:elapsed+duration};
  }
  function enemyMoveMultiplier(enemy) {
    let amount=0;for(const slow of Object.values(enemy.slows||{}))if(slow.until>elapsed)amount=Math.max(amount,slow.amount);
    return 1-amount;
  }
  function addPoopPool(pool) {
    const limit=LOW_POWER_MODE?48:72;
    if(pools.length>=limit)pools.shift();
    pools.push({type:'poop',tick:0,...pool});
  }

  function moveShuttle(p,dt) {
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(p.vx*dt),Math.abs(p.vy*dt))/8));
    const valid=(x,y)=>runMode==='test'?Math.abs(x)<900-p.radius&&Math.abs(y)<900-p.radius:WORLD.inside(selectedChapter,x,y,p.radius,elapsed,adventure.grace,mapExtra());
    for(let i=0;i<steps;i++){
      const nx=p.x+p.vx*dt/steps;if(valid(nx,p.y))p.x=nx;else p.vx=-p.vx;
      const ny=p.y+p.vy*dt/steps;if(valid(p.x,ny))p.y=ny;else p.vy=-p.vy;
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (p.type === 'enemy') continue;
      p.life -= dt;
      if (p.homing) {
        const target = nearestEnemy(combatTargetRange(460), p.x, p.y);
        if (target) {
          const desired = Math.atan2(target.y - p.y, target.x - p.x);
          const current = Math.atan2(p.vy, p.vx);
          let diff = ((desired - current + Math.PI * 3) % TAU) - Math.PI;
          const angle = current + Math.max(-3.8 * dt, Math.min(3.8 * dt, diff));
          const speed = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        }
      }
      if(p.type==='shuttle')moveShuttle(p,dt);else {p.x+=p.vx*dt;p.y+=p.vy*dt;}
      let removed = false;
      for (const enemy of enemies) {
        if ((p.type==='shuttle'?(p.hitTimes.get(enemy)??-Infinity)<=elapsed:!p.hit?.has(enemy)) && Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + p.radius) {
          if(p.type==='shuttle'){p.hitTimes.set(enemy,elapsed+.35);if(p.evolved){const speed=Math.hypot(p.vx,p.vy);if(speed>0){const scale=Math.min(600,speed*1.04)/speed;p.vx*=scale;p.vy*=scale;}}}else (p.hit ||= new Set()).add(enemy);
          damageEnemy(enemy, p.damage);
          if(state==='victory')return;
          p.pierce = (p.pierce || 1) - 1;
          if (p.pierce <= 0) { removed = true; break; }
        }
      }
      if (p.life <= 0 || removed) projectiles.splice(i, 1);
    }
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      let activeDt = dt;
      if (e.delay > 0) {
        activeDt = Math.max(0, dt - e.delay);
        e.delay = Math.max(0, e.delay - dt);
        if (e.delay > 0) continue;
      }
      e.life -= activeDt;
      if(Number.isFinite(e.maxRadius))e.radius += (e.maxRadius - e.radius) * Math.min(1, dt * 9);
      if (e.type === 'honk' && !e.applied) {
        e.applied = true;
        for (const enemy of [...enemies]) {
          const dist = Math.hypot(enemy.x - e.x, enemy.y - e.y);
          if (dist < e.maxRadius + enemy.radius) {
            damageEnemy(enemy, e.damage);
            applySlow(enemy,e.slow,e.slowDuration,'honk');
            if(state==='victory')return;
          }
        }
      }
      if(e.type==='bossZone'&&e.life<=0&&e.owner.hp>0&&!adventure.bossDefeated){
        if(Math.hypot(player.x-e.x,player.y-e.y)<e.maxRadius+player.radius)hurtPlayer(e.damage,'首領落點轟炸');
        for(let n=0;n<8;n++)addParticle(e.x,e.y,'#ff9470',160);
      }
      if (e.life <= 0) effects.splice(i, 1);
    }
    for (let i = pools.length - 1; i >= 0; i--) {
      const p=pools[i];p.life-=dt;p.tick-=dt;
      if(p.tick<=0){
        p.tick=.55;
        for(const enemy of [...enemies])if(Math.hypot(enemy.x-p.x,enemy.y-p.y)<p.radius+enemy.radius){
          applySlow(enemy,p.slow||.25,.8,'poop');
          if(p.evolved)enemy.poopSplash={until:elapsed+.6,damage:p.damage*.6,radius:p.radius*.65};
          damageEnemy(enemy,p.damage);
          if(state==='victory')return;
        }
      }
      if(p.life<=0)pools.splice(i,1);
    }
  }

  function damageEnemy(enemy, amount) {
    if (enemy.hp <= 0 || state==='victory' || state==='result') return;
    if(enemy.training&&adventure.training?.step==='attack'){
      adventure.training.lastHitAgo=0;
      if(adventure.training.attackTime<4)amount=Math.min(amount,Math.max(0,enemy.hp-1));
    }
    amount *= enemy.boss&&enemy.aiPhase==='recover'?1.4:1;
    enemy.hp -= amount;
    enemy.flash = .08;
    if (Math.random() < .35) floatingText(enemy.x, enemy.y - enemy.radius, Math.round(amount), '#fff3b0');
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index < 0) return;
    enemies.splice(index, 1);
    kills++;
    if(enemy.training){
      const pos=trainingSpot(160);
      gems.push({...pos,value:player.nextXp-player.xp,radius:8,tier:'gold',bob:0,training:true});
      projectiles=[];effects=[];setTrainingStep('xp');return;
    }
    if(!enemy.boss&&enemy.poopSplash?.until>elapsed){const splash=enemy.poopSplash;addPoopPool({x:enemy.x,y:enemy.y,radius:splash.radius,life:2,damage:splash.damage,slow:.3,evolved:false});}
    const gemCount = enemy.boss ? 12 : enemy.elite ? 7 : 1;
    const gemTier = enemy.boss || enemy.elite || enemy.xp > 8 ? 'gold' : enemy.xp >= 8 ? 'silver' : 'bronze';
    const gemRadius = gemTier === 'gold' ? 8 : gemTier === 'silver' ? 6 : 4;
    for (let i = 0; i < gemCount; i++) {
      const value = enemy.xp / gemCount;
      if (gems.length >= MAX_ACTIVE_GEMS && gems.length) gems[gems.length - 1].value += value;
      else gems.push({ x: enemy.x + (Math.random() - .5) * 34, y: enemy.y + (Math.random() - .5) * 34, value, radius: gemRadius, tier: gemTier, bob: Math.random() * TAU });
    }
    for (let i = 0; i < (enemy.elite ? 20 : 5); i++) addParticle(enemy.x, enemy.y, enemy.color, enemy.elite ? 170 : 90);
    if(enemy.stolen>0)gems.push({x:enemy.x,y:enemy.y,value:enemy.stolen,radius:8,tier:'gold',bob:0});
    if (enemy.elite && !enemy.boss) {
      pendingChests++;player.hp=player.maxHp;updateHud();GooAudio.cue('pickup');
      floatingText(player.x,player.y-38,'HP MAX','#bdf78d');showToast('精英擊敗！生命全滿');
    }
    if (enemy.boss) {
      dom.bossWrap.classList.add('hidden');
      boss = null;
      adventure.bossDefeated=true;
      enemies=[];
      player.invuln=3;
      if(runMode!=='test') {
        adventure.defeatedBoss={...enemy,flash:0,elite:false,boss:false,aiPhase:'defeated'};
        adventure.victoryTime=0;
        pendingLevels=0;
        endGame(true); // Persist the earned win before the visual transition.
        setScreen('victory');
        GooAudio.setScene('win',selectedChapter);
      }
    }
  }

  function updateEnemies(dt) {
    player.invuln=Math.max(0,player.invuln-dt);player.flash=Math.max(0,player.flash-dt);
    for(const enemy of [...enemies]){
      enemy.flash=Math.max(0,enemy.flash-dt);enemy.hitCd=Math.max(0,enemy.hitCd-dt);enemy.stun=Math.max(0,(enemy.stun||0)-dt);enemy.phase+=dt*2;
      if(Math.abs(player.x-enemy.x)>2)enemy.facing=Math.sign(player.x-enemy.x);
      if(enemy.boss)updateBoss(enemy,dt);else updateRegularEnemy(enemy,dt);
      const dist=Math.hypot(enemy.x-player.x,enemy.y-player.y);
      if(dist<player.radius+enemy.radius&&enemy.hitCd<=0&&player.invuln<=0&&enemy.stun<=0&&enemy.aiPhase!=='recover'){
        hurtPlayer(enemy.damage,enemy.boss?`首領：${currentChapter().bossName}`:ENEMY_TYPES[enemy.type].name);enemy.hitCd=.7;
        if(state!=='playing')return;
      }
    }
    for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];if(p.type!=='enemy')continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(Math.hypot(p.x-player.x,p.y-player.y)<p.radius+player.radius){hurtPlayer(p.damage,p.source||'首領彈幕');projectiles.splice(i,1);}else if(p.life<=0)projectiles.splice(i,1);
    }
  }

  function hurtPlayer(amount,source='怪群碰撞') {
    if (adventure.training || player.invuln > 0 || state !== 'playing') return;
    adventure.lastSource=source;
    adventure.damageBy[source]=(adventure.damageBy[source]||0)+amount;
    if(adventure.shield){adventure.shield=0;player.invuln=.65;showToast('護盾擋下了這次攻擊');GooAudio.cue('honk');return;}
    player.hp -= amount;
    player.invuln = .55;
    player.flash = .2;
    shake = 8;
    GooAudio.cue('hit');
    if(settings.haptics&&navigator.vibrate)navigator.vibrate(25);
    updateHud();
    if (player.hp <= 0) {
      if (runMode === 'test') {
        player.hp = player.maxHp;
        player.invuln = 2;
        updateHud();
        showToast('測試場保護：補滿生命，繼續觀察！');
        return;
      }
      if (DIFFICULTIES[selectedDifficulty].revive && !reviveUsed) {
        reviveUsed = true; player.hp = player.maxHp * .55; player.invuln = 2.5;
        showToast('Goo 爬起來了！悠閒模式免費復活');
      } else endGame(false);
    }
  }

  function updateGems(dt) {
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.bob += dt * 4;
      const dx = player.x - g.x, dy = player.y - g.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < (g.training ? 42 : player.pickup * 1.7)) {
        const speed = 250 + Math.max(0, player.pickup * 1.7 - dist) * 5;
        g.x += dx / dist * speed * dt; g.y += dy / dist * speed * dt;
      }
      if (dist < player.radius + 9) {
        if(!adventure.firstGem){adventure.firstGem=true;GooAudio.cue('pickup');}
        if(g.training&&adventure.training)adventure.training.step='upgrade';
        gainXp(g.value); gems.splice(i, 1);
      }
    }
  }

  let boostChoiceSerial = 0;
  function renderBoostOptions(count=3,append=false) {
    const serial = append ? boostChoiceSerial : ++boostChoiceSerial;
    if(!append){
    $('#upgrade-hint').textContent = '選擇一項補強';
    $('#reroll-btn').classList.add('hidden');
    $('#reroll-btn').disabled = true;
    }
    const capped = player.boostSpeed >= 5;
    const choices = [
      {id:'heal',name:'回復生命',art:'vitality',desc:'回復最大生命 30%',note:player.hp >= player.maxHp ? '生命已滿' : '立即回復',disabled:player.hp >= player.maxHp},
      {id:'damage',name:'攻擊強化',art:'power',desc:'本局傷害 +5%',note:`已加成 ${player.boostDamage * 5}%`},
      capped ? {id:'health',name:'生命強化',art:'vitality',desc:'生命上限 +5',note:'並回復 5 點生命'} : {id:'speed',name:'輕快步伐',art:'speed',desc:'本局移速 +2%',note:`${player.boostSpeed}/5 · 上限 +10%`}
    ];
    const box = $('#upgrade-options');if(!append)box.innerHTML = '';
    const available=count<3?choices.filter(c=>!c.disabled):choices;
    const selected=[];
    while(selected.length<count&&available.length){const i=count===3?0:Math.floor(Math.random()*available.length);selected.push(available.splice(i,1)[0]);}
    for (const c of selected) {
      const b=document.createElement('button');b.className='upgrade-option boost-option';b.disabled=!!c.disabled;
      b.innerHTML=`${passiveArt(c.art,'up-icon')}<h3>${c.name}</h3><p>${c.desc}</p><footer>${c.note}</footer>`;
      b.addEventListener('click',()=>chooseBoost(c.id,serial));box.appendChild(b);
    }
  }
  function chooseBoost(id, serial) {
    if(state!=='upgrade' || pendingLevels<=0 || serial!==boostChoiceSerial) return;
    if(id==='heal') {
      if(player.hp>=player.maxHp)return;
      player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.3);
    } else if(id==='damage') {
      const old=1+player.boostDamage*.05;player.boostDamage++;player.damage*= (1+player.boostDamage*.05)/old;
    } else if(id==='speed') {
      if(player.boostSpeed>=5)return;
      const old=1+player.boostSpeed*.02;player.boostSpeed++;player.speed*=(1+player.boostSpeed*.02)/old;
    } else if(id==='health' && player.boostSpeed>=5) {
      player.maxHp+=5;player.hp=Math.min(player.maxHp,player.hp+5);
    } else return;
    boostChoiceSerial++;pendingLevels--;updateHud();sound(760,.08,'triangle',.04);
    if(pendingLevels>0)renderUpgradeOptions();else setScreen('playing');
  }

  function gainXp(amount) {
    if (runMode === 'test' || state==='victory' || state==='result') return;
    player.xp += amount;
    while (player.xp >= player.nextXp) {
      player.xp -= player.nextXp;
      player.level++;
      player.nextXp = Math.round(24 + player.level * 11 + player.level * player.level * .42);
      pendingLevels++;
    }
    updateHud();
    if (pendingLevels > 0 && state === 'playing') openUpgrade();
  }

  function makeUpgradePool() {
    const pool = [];
    for (const [id, data] of Object.entries(WEAPONS)) {
      if (!skillUnlocked('weapon', id)) continue;
      const owned = player.weapons[id];
      if (owned && owned.level < 5) pool.push({ kind: 'weapon', id, level: owned.level + 1, ...data });
      else if (!owned && Object.keys(player.weapons).length < 5) pool.push({ kind: 'weapon', id, level: 1, ...data });
    }
    for (const [id, data] of Object.entries(PASSIVES)) {
      if (!skillUnlocked('passive', id)) continue;
      const level = player.passives[id] || 0;
      if ((level > 0 && level < 5) || (level === 0 && Object.keys(player.passives).length < 5)) pool.push({ kind: 'passive', id, level: level + 1, ...data });
    }
    return pool;
  }

  function chapterLevelCap() {
    const weaponCount = Math.min(5, Object.keys(WEAPONS).filter(id => skillUnlocked('weapon', id)).length);
    const passiveCount = Math.min(5, Object.keys(PASSIVES).filter(id => skillUnlocked('passive', id)).length);
    return (weaponCount + passiveCount) * 5 + 1; // Reserve one level for the opening playstyle choice.
  }

  function openUpgrade() {
    setScreen('upgrade');
    $('#reroll-count').textContent = rerolls;
    renderUpgradeOptions();
    sound(610,.12,'triangle',.04);
  }

  function renderUpgradeOptions() {
    const serial=++boostChoiceSerial;
    $('#upgrade-title').textContent='Goo 變強了！';
    $('#upgrade-hint').textContent=adventure.training?.step==='upgrade'?'撿到經驗值 → 升級！點選一個技能，選完才會繼續。':'選擇一項能力';
    if(adventure.blessingClaimed&&!adventure.style){renderStyleOptions();return;}
    $('#reroll-btn').classList.remove('hidden');
    const pool = makeUpgradePool();
    if (!pool.length) {
      renderBoostOptions();
      return;
    }
    const count = Math.min(3, pool.length);
    const choices = [];
    const chooseFrom = candidates => {
      if (!candidates.length || choices.length >= count) return;
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      choices.push(picked); pool.splice(pool.indexOf(picked), 1);
    };
    chooseFrom(pool.filter(c => c.kind==='weapon' ? !!player.weapons[c.id] : !!player.passives[c.id]));
    chooseFrom(pool.filter(c => c.kind==='passive' && !player.passives[c.id] && Object.entries(player.weapons).some(([id,w])=>WEAPONS[id].passive===c.id && w.level>=3 && !w.evolved)));
    while (choices.length < count && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    $('#reroll-btn').disabled=rerolls<=0;
    const box = $('#upgrade-options');
    box.innerHTML = '';
    choices.forEach(choice => {
      const current = choice.kind === 'weapon' ? player.weapons[choice.id]?.level || 0 : player.passives[choice.id] || 0;
      const combo = isComboChoice(choice);
      const btn = document.createElement('button');
      btn.className = 'upgrade-option';
      const description = choice.kind === 'weapon' ? choice.desc[choice.level - 1] : choice.desc;
      const tag = combo ? '<span class="new-tag combo-tag">可組合</span>' : current === 0 ? '<span class="new-tag">NEW</span>' : '';
      const recipe = choice.kind === 'weapon' ? `搭配 ${PASSIVES[choice.passive].name}` : comboWeaponForPassive(choice.id);
      const icon = choice.kind === 'weapon' ? weaponArt(choice.id, 'up-icon') : passiveArt(choice.id, 'up-icon');
      const profile = choice.kind === 'weapon' ? `<span class="weapon-profile">${choice.distance} · ${choice.power}</span>` : '';
      btn.innerHTML = `${icon}${tag}<h3>${choice.name}</h3>${profile}<p>${description}</p><footer>${choice.kind === 'weapon' ? '武器' : '能力'} · LV.${current} → ${choice.level}<small>${recipe || '每級效果累積'}</small></footer>`;
      btn.addEventListener('click', () => {if(serial===boostChoiceSerial)chooseUpgrade(choice);});
      box.appendChild(btn);
    });
    if(choices.length<3)renderBoostOptions(3-choices.length,true);
  }

  function isComboChoice(choice) {
    if (choice.kind === 'weapon') return !!player.passives[choice.passive] || (player.weapons[choice.id]?.level || 0) >= 1;
    return Object.entries(player.weapons).some(([weaponId, weapon]) => WEAPONS[weaponId].passive === choice.id && weapon.level >= 1 && !weapon.evolved);
  }

  function comboWeaponForPassive(passiveId) {
    const match = Object.entries(player.weapons).find(([weaponId, weapon]) => WEAPONS[weaponId].passive === passiveId && !weapon.evolved);
    return match ? `搭配 ${WEAPONS[match[0]].name}` : '';
  }

  function chooseUpgrade(choice) {
    if(state!=='upgrade'||pendingLevels<=0||!makeUpgradePool().some(c=>c.kind===choice.kind&&c.id===choice.id&&c.level===choice.level))return;
    boostChoiceSerial++;
    if (choice.kind === 'weapon') {
      if (!player.weapons[choice.id]) player.weapons[choice.id] = { level: 1, evolved: false, cd: .15 };
      else player.weapons[choice.id].level++;
    } else {
      player.passives[choice.id] = (player.passives[choice.id] || 0) + 1;
      PASSIVES[choice.id].apply(player);
    }
    pendingLevels=Math.max(0,pendingLevels-1);
    updateHud();
    sound(760, .08, 'triangle', .04);
    if (tryEvolution()) return;
    if (pendingLevels > 0) renderUpgradeOptions();
    else {setScreen('playing');if(adventure.training?.step==='upgrade')setTrainingStep('blessing');}
  }

  function tryEvolution() {
    const match = Object.entries(player.weapons).find(([id, weapon]) => weapon.level >= 5 && !weapon.evolved && player.passives[WEAPONS[id].passive]);
    if (!match) return false;
    const [id, owned] = match;
    owned.evolved = true;
    const data = WEAPONS[id];
    $('#evolution-icon').innerHTML = evolutionArt(id, 'evolution-art');
    $('#evolution-name').textContent = data.evo;
    $('#evolution-description').textContent = `${data.evoDesc}（配方：${data.name} LV.5 ＋ ${PASSIVES[data.passive].name} LV.1）`;
    setScreen('evolution');
    updateHud();
    sound(880, .3, 'triangle', .055);
    return true;
  }

  function openEliteChest() {
    if (state !== 'playing') return;
    if (tryEvolution()) return;
    player.hp = Math.min(player.maxHp, player.hp + 28);
    gainXp(player.nextXp * .55);
    showToast('寶箱：回復生命並獲得大量經驗');
  }

  function renderComboBook() {
    const weapons = Object.entries(player.weapons);
    const passives = Object.entries(player.passives);
    $('#weapon-slot-count').textContent = `${weapons.length} / 5`;
    $('#passive-slot-count').textContent = `${passives.length} / 5`;

    const weaponCards = weapons.map(([id, weapon]) => {
      const data = WEAPONS[id];
      return `<div class="loadout-item ${weapon.evolved ? 'evolved' : ''}">
        ${weapon.evolved ? evolutionArt(id, 'loadout-art') : weaponArt(id, 'loadout-art')}
        <strong>${weapon.evolved ? data.evo : data.name}</strong><small>${weapon.evolved ? '進化完成' : `LV.${weapon.level}`}</small>
      </div>`;
    });
    while (weaponCards.length < 5) weaponCards.push('<div class="loadout-item empty" aria-label="空武器格">+</div>');
    $('#loadout-weapons').innerHTML = weaponCards.join('');

    const passiveCards = passives.map(([id, level]) => {
      const data = PASSIVES[id];
      return `<div class="loadout-item">
        ${passiveArt(id, 'loadout-art')}<strong>${data.name}</strong><small>LV.${level}</small>
      </div>`;
    });
    while (passiveCards.length < 5) passiveCards.push('<div class="loadout-item empty" aria-label="空能力格">+</div>');
    $('#loadout-passives').innerHTML = passiveCards.join('');

  }

  function updateHud() {
    adventureHud();
    dom.timer.textContent = formatTime(elapsed);
    dom.healthBar.style.width = `${Math.max(0, player.hp / player.maxHp * 100)}%`;
    dom.healthText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${Math.ceil(player.maxHp)}`;
    dom.xpBar.style.width = player.maxed ? '100%' : `${player.xp / player.nextXp * 100}%`;
    dom.levelText.textContent = player.maxed ? `MAX · LV.${player.level}` : `LV. ${player.level}`;
    dom.dock.innerHTML = Object.entries(player.weapons).map(([id, w]) => `<div class="weapon-chip ${w.evolved ? 'evolved' : ''}"><b>${w.evolved ? evolutionArt(id) : weaponArt(id)}</b><span>${w.evolved ? WEAPONS[id].evo : WEAPONS[id].name} ${w.evolved ? 'MAX' : `Lv.${w.level}`}</span><small>${WEAPONS[id].distance} · ${WEAPONS[id].power}${w.evolved ? ' · 進化完成' : ''}</small></div>`).join('');
    if (boss) dom.bossBar.style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`;
  }

  function addParticle(x, y, color, speed = 100) {
    if (particles.length >= (settings.effects==='low'?40:MAX_ACTIVE_PARTICLES)) return;
    const a = Math.random() * TAU;
    particles.push({ x, y, vx: Math.cos(a) * Math.random() * speed, vy: Math.sin(a) * Math.random() * speed, color, radius: 2 + Math.random() * 4, life: .25 + Math.random() * .35 });
  }

  function floatingText(x, y, text, color) {
    if(settings.effects==='low'||particles.length>=MAX_ACTIVE_PARTICLES)return;
    particles.push({ x, y, vx: (Math.random() - .5) * 16, vy: -38, color, text: String(text), radius: 0, life: .52 });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function update(dt) {
    if(state==='victory') {
      projectiles=[];effects=[];pools=[];
      adventure.victoryTime+=dt;updateParticles(dt);
      if(adventure.victoryTime>=1.4)setScreen('result');
      return;
    }
    if (state !== 'playing') return;
    if(adventure.training){updateTraining(dt);return;}
    elapsed += dt;
    const move = getMoveVector();
    player.moving = Math.hypot(move.x, move.y) > .05;
    moveEntity(player, move.x * player.speed * dt * (adventure.sprint>0?1.65:1), move.y * player.speed * dt * (adventure.sprint>0?1.65:1));
    if (Math.abs(move.x) > .05) player.facing = Math.sign(move.x);
    updateAdventure(dt,move);
    if(state!=='playing')return;
    updateCamera();
    spawnWave(dt);
    if (state !== 'playing') return;
    updateWeapons(dt);
    if(state!=='playing')return;
    updateOrbit(dt);
    if(state!=='playing')return;
    updateProjectiles(dt);
    if(state!=='playing')return;
    updateEffects(dt);
    if(state!=='playing')return;
    updateEnemies(dt);
    updateGems(dt);
    updateParticles(dt);
    if (Math.floor(elapsed * 4) !== Math.floor((elapsed - dt) * 4)) updateHud();
    shake *= .88;
  }

  function worldToScreen(x, y) {
    const sx = x - camera.x + width / 2;
    const sy = y - camera.y + height / 2;
    return { x: sx, y: sy };
  }

  function drawStoreFixture(rect) {
    const s = worldToScreen(rect.x, rect.y);
    const x = s.x, y = s.y;
    ctx.save();
    ctx.fillStyle = 'rgba(20,42,41,.2)';
    ctx.beginPath(); ctx.roundRect(x + 8, y + 10, rect.w, rect.h, 12); ctx.fill();

    if (rect.kind === 'fridge') {
      ctx.fillStyle = '#dceff0'; ctx.strokeStyle = '#294b4d'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.roundRect(x, y, rect.w, rect.h, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rect.color; ctx.fillRect(x + 7, y + 7, rect.w - 14, 30);
      ctx.strokeStyle = 'rgba(36,77,80,.45)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + rect.w / 2, y + 38); ctx.lineTo(x + rect.w / 2, y + rect.h - 7); ctx.stroke();
      for (let row = 0; row < 4; row++) {
        const shelfY = y + 78 + row * 82;
        ctx.fillStyle = 'rgba(83,169,206,.18)'; ctx.fillRect(x + 13, shelfY - 29, rect.w - 26, 58);
        ctx.fillStyle = row % 2 ? '#f0bd4e' : '#75b783';
        for (let col = 0; col < 5; col++) ctx.fillRect(x + 22 + col * 39, shelfY - 17, 20, 35);
      }
    } else if (rect.kind === 'checkout') {
      ctx.fillStyle = '#f4efe3'; ctx.strokeStyle = '#294b4d'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.roundRect(x, y, rect.w, rect.h, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#58b96c'; ctx.fillRect(x + 7, y + 7, rect.w - 14, 25);
      ctx.fillStyle = '#ef9139'; ctx.fillRect(x + 7, y + 32, rect.w - 14, 12);
      ctx.fillStyle = '#273b3c'; ctx.beginPath(); ctx.roundRect(x + 34, y + 58, 83, 63, 7); ctx.fill();
      ctx.fillStyle = '#a9e4d6'; ctx.fillRect(x + 45, y + 68, 61, 27);
      ctx.fillStyle = '#526769'; ctx.fillRect(x + 155, y + 68, 120, 18);
      ctx.fillStyle = '#efbb45'; ctx.fillRect(x + 180, y + 102, 67, 35);
    } else {
      ctx.fillStyle = '#f7f0df'; ctx.strokeStyle = '#294b4d'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.roundRect(x, y, rect.w, rect.h, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rect.color; ctx.fillRect(x + 7, y + 7, rect.w - 14, 31);
      const productRows = LOW_POWER_MODE ? 3 : 5;
      const rowGap = (rect.h - 64) / productRows;
      for (let row = 0; row < productRows; row++) {
        const shelfY = y + 56 + row * rowGap;
        ctx.fillStyle = '#71837c'; ctx.fillRect(x + 13, shelfY + 23, rect.w - 26, 6);
        const colors = ['#f4c64f', '#e87c59', '#6eb785', '#6aa9d1'];
        for (let col = 0; col < 8; col++) {
          ctx.fillStyle = colors[(row + col) % colors.length];
          ctx.fillRect(x + 20 + col * 34, shelfY, 20, 22);
        }
      }
    }

    ctx.fillStyle = '#163d38'; ctx.font = '900 14px ui-rounded, system-ui'; ctx.textAlign = 'center';
    ctx.fillText(rect.label, x + rect.w / 2, y + rect.h - 13);
    ctx.restore();
  }

  function drawConvenienceStore() {
    const bounds = STORE_BOUNDS;
    const room = worldToScreen(bounds.left, bounds.top);
    const roomWidth = bounds.right - bounds.left;
    const roomHeight = bounds.bottom - bounds.top;

    ctx.fillStyle = '#142625';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath(); ctx.rect(room.x, room.y, roomWidth, roomHeight); ctx.clip();
    ctx.fillStyle = '#f3f0e7';
    ctx.fillRect(room.x, room.y, roomWidth, roomHeight);

    // Large white tiles keep the shop readable and are cheap to render on phones.
    ctx.strokeStyle = 'rgba(74,104,101,.13)'; ctx.lineWidth = 2;
    const tile = 88;
    for (let wx = bounds.left; wx <= bounds.right; wx += tile) {
      const sx = worldToScreen(wx, 0).x;
      ctx.beginPath(); ctx.moveTo(sx, room.y); ctx.lineTo(sx, room.y + roomHeight); ctx.stroke();
    }
    for (let wy = bounds.top; wy <= bounds.bottom; wy += tile) {
      const sy = worldToScreen(0, wy).y;
      ctx.beginPath(); ctx.moveTo(room.x, sy); ctx.lineTo(room.x + roomWidth, sy); ctx.stroke();
    }

    // Brand stripe, floor arrows and doors establish the convenience-store setting.
    ctx.fillStyle = '#4fb568'; ctx.fillRect(room.x, room.y + 22, roomWidth, 20);
    ctx.fillStyle = '#f5efe0'; ctx.fillRect(room.x, room.y + 42, roomWidth, 9);
    ctx.fillStyle = '#ef9139'; ctx.fillRect(room.x, room.y + 51, roomWidth, 13);
    ctx.fillStyle = '#20453f'; ctx.font = '950 25px ui-rounded, system-ui'; ctx.textAlign = 'left';
    ctx.fillText('GOO MART · 24H', room.x + 55, room.y + 104);

    const entrance = worldToScreen(-130, bounds.bottom - 45);
    ctx.fillStyle = 'rgba(94,190,210,.24)'; ctx.strokeStyle = '#397f86'; ctx.lineWidth = 5;
    ctx.fillRect(entrance.x, entrance.y - 65, 260, 72); ctx.strokeRect(entrance.x, entrance.y - 65, 260, 72);
    ctx.beginPath(); ctx.moveTo(entrance.x + 130, entrance.y - 65); ctx.lineTo(entrance.x + 130, entrance.y + 7); ctx.stroke();
    ctx.fillStyle = '#2e6869'; ctx.font = '900 13px ui-rounded, system-ui'; ctx.textAlign = 'center';
    ctx.fillText('自動門', entrance.x + 130, entrance.y - 18);

    const stockDoor = worldToScreen(382, bounds.top + 35);
    ctx.fillStyle = '#516866'; ctx.fillRect(stockDoor.x, stockDoor.y, 200, 79);
    ctx.fillStyle = '#eef2e7'; ctx.font = '900 14px ui-rounded, system-ui';
    ctx.fillText('倉庫 STAFF ONLY', stockDoor.x + 100, stockDoor.y + 46);

    const arrow = worldToScreen(40, 405);
    ctx.fillStyle = 'rgba(53,137,118,.17)';
    ctx.beginPath(); ctx.moveTo(arrow.x, arrow.y - 50); ctx.lineTo(arrow.x + 54, arrow.y + 5); ctx.lineTo(arrow.x + 22, arrow.y + 5); ctx.lineTo(arrow.x + 22, arrow.y + 65); ctx.lineTo(arrow.x - 22, arrow.y + 65); ctx.lineTo(arrow.x - 22, arrow.y + 5); ctx.lineTo(arrow.x - 54, arrow.y + 5); ctx.closePath(); ctx.fill();

    STORE_OBSTACLES.forEach(drawStoreFixture);

    const coffee = worldToScreen(265, -565);
    ctx.fillStyle = '#263f40'; ctx.beginPath(); ctx.roundRect(coffee.x, coffee.y, 80, 100, 9); ctx.fill();
    ctx.fillStyle = '#eef1e7'; ctx.fillRect(coffee.x + 17, coffee.y + 18, 46, 29);
    ctx.fillStyle = '#ed9a3d'; ctx.beginPath(); ctx.arc(coffee.x + 40, coffee.y + 72, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#315e57'; ctx.font = '900 12px ui-rounded, system-ui'; ctx.textAlign = 'center';
    ctx.fillText('現磨咖啡', coffee.x + 40, coffee.y + 119);
    ctx.restore();

    // Thick walls make the playable rectangle unmistakable.
    ctx.strokeStyle = '#264845'; ctx.lineWidth = 24;
    ctx.strokeRect(room.x, room.y, roomWidth, roomHeight);
    ctx.strokeStyle = 'rgba(162,213,190,.45)'; ctx.lineWidth = 4;
    ctx.strokeRect(room.x + 14, room.y + 14, roomWidth - 28, roomHeight - 28);

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .24, width / 2, height / 2, Math.max(width, height) * .82);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(7,29,27,.25)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  }

  function drawWorld() {
    if(runMode!=='test'&&selectedChapter!==1){drawStageGeometry();return;}
    if (activeMapType() === 'store') {
      drawConvenienceStore();
      return;
    }
    const theme = runMode === 'chapter' ? currentChapter().theme : CHAPTERS[0].theme;
    const spacing = 560;
    const roadWidth = 140;
    const viewLeft = camera.x - width / 2;
    const viewRight = camera.x + width / 2;
    const viewTop = camera.y - height / 2;
    const viewBottom = camera.y + height / 2;
    const hashAt = (gx, gy) => Math.abs((gx * 928371 + gy * 1237 + gx * gy * 97) % 997);

    // Concrete and sidewalks.
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, 0, width, height);

    // Broad Taipei-style roads. They are scenery only and never block movement.
    const firstRoadX = Math.floor((viewLeft - roadWidth) / spacing) * spacing;
    const firstRoadY = Math.floor((viewTop - roadWidth) / spacing) * spacing;
    ctx.fillStyle = theme.road;
    for (let wx = firstRoadX; wx <= viewRight + roadWidth; wx += spacing) {
      const sx = wx - camera.x + width / 2;
      ctx.fillRect(sx - roadWidth / 2, 0, roadWidth, height);
      ctx.fillStyle = theme.edge;
      ctx.fillRect(sx - roadWidth / 2, 0, 5, height);
      ctx.fillRect(sx + roadWidth / 2 - 5, 0, 5, height);
      ctx.fillStyle = theme.road;
    }
    for (let wy = firstRoadY; wy <= viewBottom + roadWidth; wy += spacing) {
      const sy = wy - camera.y + height / 2;
      ctx.fillRect(0, sy - roadWidth / 2, width, roadWidth);
      ctx.fillStyle = theme.edge;
      ctx.fillRect(0, sy - roadWidth / 2, width, 5);
      ctx.fillRect(0, sy + roadWidth / 2 - 5, width, 5);
      ctx.fillStyle = theme.road;
    }

    // Lane markings scroll with world space.
    ctx.fillStyle = theme.accent;
    const dash = 72;
    const firstDashY = Math.floor(viewTop / dash) * dash;
    const firstDashX = Math.floor(viewLeft / dash) * dash;
    for (let wx = firstRoadX; wx <= viewRight + roadWidth; wx += spacing) {
      const sx = wx - camera.x + width / 2;
      for (let wy = firstDashY; wy <= viewBottom + dash; wy += dash) ctx.fillRect(sx - 2, wy - camera.y + height / 2, 4, 30);
    }
    for (let wy = firstRoadY; wy <= viewBottom + roadWidth; wy += spacing) {
      const sy = wy - camera.y + height / 2;
      for (let wx = firstDashX; wx <= viewRight + dash; wx += dash) ctx.fillRect(wx - camera.x + width / 2, sy - 2, 30, 4);
    }

    // Rooftops and recognizable neighborhood landmarks inside each block.
    const startGX = Math.floor(viewLeft / spacing) - 1;
    const endGX = Math.ceil(viewRight / spacing) + 1;
    const startGY = Math.floor(viewTop / spacing) - 1;
    const endGY = Math.ceil(viewBottom / spacing) + 1;
    const drawBuilding = (x, y, w, h, accent, label = '') => {
      ctx.fillStyle = 'rgba(10,34,35,.54)';
      ctx.strokeStyle = 'rgba(124,158,151,.42)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent; ctx.fillRect(x + 8, y + 8, w - 16, 7);
      ctx.fillStyle = 'rgba(190,226,211,.14)';
      const windowStep = LOW_POWER_MODE ? 44 : 22;
      for (let ix = x + 13; ix < x + w - 12; ix += windowStep) for (let iy = y + 27; iy < y + h - 10; iy += windowStep) ctx.fillRect(ix, iy, 8, 8);
      if (label) {
        ctx.fillStyle = 'rgba(236,248,229,.55)'; ctx.font = '900 10px ui-rounded, system-ui'; ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + h - 9);
      }
    };

    for (let gx = startGX; gx <= endGX; gx++) for (let gy = startGY; gy <= endGY; gy++) {
      const blockLeft = gx * spacing + roadWidth / 2 + 28;
      const blockTop = gy * spacing + roadWidth / 2 + 28;
      const blockSize = spacing - roadWidth - 56;
      const sx = blockLeft - camera.x + width / 2;
      const sy = blockTop - camera.y + height / 2;
      if (sx > width + 40 || sy > height + 40 || sx + blockSize < -40 || sy + blockSize < -40) continue;
      const hash = hashAt(gx, gy);

      drawBuilding(sx + 12, sy + 12, blockSize * .58, 92 + hash % 48, hash % 2 ? '#4c8d82' : '#6f817b', hash % 3 ? 'OFFICE' : 'TAIPEI');
      drawBuilding(sx + blockSize * .66, sy + blockSize * .57, blockSize * .30, blockSize * .34, '#517b72');

      if (hash % 4 === 0) {
        // MRT entrance sign and stairs.
        const mx = sx + blockSize - 54, my = sy + 52;
        ctx.fillStyle = '#58b7d7'; ctx.beginPath(); ctx.arc(mx, my, 21, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f4fff8'; ctx.font = '950 12px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.fillText('MRT', mx, my + 4);
        ctx.fillStyle = 'rgba(7,27,29,.7)';
        for (let i = 0; i < 4; i++) ctx.fillRect(mx - 24 + i * 5, my + 25 + i * 4, 28 - i * 5, 3);
      } else if (hash % 4 === 1) {
        // Familiar green-and-orange convenience-store canopy.
        const cx = sx + blockSize - 116, cy = sy + 45;
        ctx.fillStyle = 'rgba(10,32,33,.82)'; ctx.fillRect(cx, cy, 92, 58);
        ctx.fillStyle = '#55b868'; ctx.fillRect(cx, cy, 92, 8);
        ctx.fillStyle = '#f3f3de'; ctx.fillRect(cx, cy + 8, 92, 5);
        ctx.fillStyle = '#f09635'; ctx.fillRect(cx, cy + 13, 92, 6);
        ctx.fillStyle = '#f5f3d8'; ctx.font = '950 16px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.fillText('24', cx + 46, cy + 44);
      }
    }

    // Crosswalks, traffic lights, and occasional roundabouts at intersections.
    for (let wx = firstRoadX; wx <= viewRight + roadWidth; wx += spacing) for (let wy = firstRoadY; wy <= viewBottom + roadWidth; wy += spacing) {
      const sx = wx - camera.x + width / 2;
      const sy = wy - camera.y + height / 2;
      const hash = hashAt(Math.round(wx / spacing), Math.round(wy / spacing));
      if (hash % 5 === 0) {
        ctx.fillStyle = '#203f40'; ctx.strokeStyle = '#6e8b83'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(sx, sy, 58, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#416b5d'; ctx.beginPath(); ctx.arc(sx, sy, 25, 0, TAU); ctx.fill();
        ctx.fillStyle = '#86b865'; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(232,240,221,.32)';
        for (let i = -4; i <= 4; i++) {
          ctx.fillRect(sx + i * 15 - 5, sy - 69, 9, 30);
          ctx.fillRect(sx + i * 15 - 5, sy + 39, 9, 30);
          ctx.fillRect(sx - 69, sy + i * 15 - 5, 30, 9);
          ctx.fillRect(sx + 39, sy + i * 15 - 5, 30, 9);
        }
      }
      ctx.fillStyle = '#121f20'; ctx.fillRect(sx + 70, sy + 61, 10, 25);
      ctx.fillStyle = '#ff5964'; ctx.fillRect(sx + 72, sy + 64, 6, 5);
      ctx.fillStyle = '#ffd24b'; ctx.fillRect(sx + 72, sy + 71, 6, 5);
      ctx.fillStyle = '#79e36b'; ctx.fillRect(sx + 72, sy + 78, 6, 5);
    }

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .2, width / 2, height / 2, Math.max(width, height) * .72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,15,13,.34)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  }

  function drawPool(pool) {
    const s=worldToScreen(pool.x,pool.y);ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=Math.min(1,pool.life);
    ctx.fillStyle=pool.evolved?'rgba(126,177,65,.28)':'rgba(135,106,60,.22)';ctx.beginPath();ctx.ellipse(0,0,pool.radius,pool.radius*.65,0,0,TAU);ctx.fill();
    const scale=Math.max(.6,pool.radius/44);ctx.scale(scale,scale);
    ctx.fillStyle='#27352b';ctx.beginPath();ctx.ellipse(0,3,21,11,0,0,TAU);ctx.fill();ctx.fillStyle='#ac8050';ctx.beginPath();ctx.ellipse(0,0,18,9,0,0,TAU);ctx.fill();
    ctx.fillStyle='#c29865';ctx.beginPath();ctx.ellipse(-2,-7,13,7,0,0,TAU);ctx.fill();ctx.fillStyle='#dec18a';ctx.beginPath();ctx.moveTo(-9,-10);ctx.lineTo(2,-22);ctx.lineTo(8,-9);ctx.fill();ctx.fillStyle='#fff6d7';ctx.fillRect(-8,-6,8,3);
    ctx.restore();
  }

  function drawGem(g) {
    const s = worldToScreen(g.x, g.y + Math.sin(g.bob) * 3);
    const palette = {
      bronze: { dark: '#6f4028', base: '#a9693f', light: '#e2a36a', glow: 'rgba(191,108,57,.65)' },
      silver: { dark: '#657478', base: '#aebfc0', light: '#f4fbf3', glow: 'rgba(205,235,231,.72)' },
      gold:   { dark: '#8b5b12', base: '#e0a91f', light: '#fff07a', glow: 'rgba(255,211,55,.82)' }
    }[g.tier || 'bronze'];
    ctx.save(); ctx.translate(s.x, s.y);
    if (!LOW_POWER_MODE && settings.effects!=='low') { ctx.shadowColor = palette.glow; ctx.shadowBlur = 7 + g.radius; }
    const shine = ctx.createRadialGradient(-g.radius * .35, -g.radius * .4, 1, 0, 0, g.radius);
    shine.addColorStop(0, palette.light); shine.addColorStop(.42, palette.base); shine.addColorStop(1, palette.dark);
    ctx.fillStyle = shine; ctx.strokeStyle = '#263432'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, g.radius, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath(); ctx.arc(-g.radius * .3, -g.radius * .34, Math.max(1, g.radius * .19), 0, TAU); ctx.fill();
    ctx.restore();
  }

  function getEnemyArt(type) {
    const enemy = ENEMY_TYPES[type];
    if (enemy?.family && Number.isInteger(enemy.tier)) return { family: enemy.family, tier: enemy.tier };
    return ENEMY_ART_ALIASES[type] || null;
  }

  function getEnemyImage(type) {
    const art = getEnemyArt(type);
    return art ? enemyImages[`${art.family}${art.tier + 1}`] : null;
  }

  function drawEnemyImage(target, type, x, y, size) {
    const image = getEnemyImage(type);
    if (!image?.complete || !image.naturalWidth) return false;
    target.imageSmoothingEnabled = false;
    target.drawImage(image, x, y, size, size);
    return true;
  }

  function getEnemySprite(type) {
    if (enemySprites.has(type)) return enemySprites.get(type);
    const size = type === 'boss' ? 48 : type === 'rat' ? 18 : 36;
    const sprite = document.createElement('canvas');
    sprite.width = size; sprite.height = size;
    const p = sprite.getContext('2d');
    p.imageSmoothingEnabled = false;
    p.lineWidth = 2;
    p.lineJoin = 'round';
    p.lineCap = 'round';
    const ink = '#1b2929';
    const cream = '#fff6df';
    const shape = (fill, path) => { p.fillStyle = fill; p.strokeStyle = ink; p.beginPath(); path(); p.fill(); p.stroke(); };
    const ellipse = (x, y, rx, ry, fill) => shape(fill, () => p.ellipse(x, y, rx, ry, 0, 0, TAU));
    const rect = (x, y, w, h, fill) => { p.fillStyle = fill; p.strokeStyle = ink; p.beginPath(); p.roundRect(x, y, w, h, 2); p.fill(); p.stroke(); };
    const dot = (x, y, r = 1.5, fill = ink) => { p.fillStyle = fill; p.beginPath(); p.arc(x, y, r, 0, TAU); p.fill(); };
    const poly = (fill, points) => shape(fill, () => { p.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(q => p.lineTo(q[0], q[1])); p.closePath(); });

    if (type === 'rat') {
      // Deliberately drawn on an 18px grid so scaling stays chunky and readable.
      const px = (x, y, w, h, color) => { p.fillStyle = color; p.fillRect(x, y, w, h); };
      const fur = '#9b8175';
      const furLight = '#b79b89';
      const pink = '#e39aa5';

      // Curled tail.
      px(0, 9, 1, 4, ink); px(1, 12, 4, 1, ink); px(0, 9, 1, 3, pink); px(1, 11, 3, 1, pink);
      px(1, 7, 1, 2, ink); px(2, 6, 2, 1, ink); px(3, 7, 1, 2, ink);
      px(2, 7, 1, 1, pink);

      // Bean-shaped body with a square pixel outline.
      px(3, 8, 2, 6, ink); px(5, 7, 7, 8, ink); px(3, 10, 1, 3, ink);
      px(5, 8, 7, 6, fur); px(4, 10, 2, 3, fur); px(6, 8, 3, 1, furLight);

      // Big friendly ear and short snout.
      px(9, 4, 5, 5, ink); px(10, 5, 3, 3, pink); px(11, 6, 2, 2, '#f1bdc2');
      px(11, 7, 5, 7, ink); px(12, 8, 4, 5, furLight); px(15, 9, 2, 4, ink);
      px(16, 10, 2, 2, '#332a2a');

      // Bead eye, cheek, feet and one tiny tooth.
      px(13, 8, 2, 2, cream); px(14, 8, 1, 1, ink); px(13, 11, 1, 1, pink);
      px(14, 13, 2, 2, ink); px(14, 13, 1, 1, cream);
      px(5, 14, 4, 1, pink); px(11, 14, 3, 1, pink);
    } else if (type === 'crow') {
      poly('#26333e', [[7,21],[3,14],[13,17],[19,11],[28,14],[30,26],[18,31],[9,27]]);
      ellipse(21, 18, 9, 9, '#303d4a'); poly('#405a68', [[10,20],[20,18],[17,29],[7,27]]);
      poly('#efb94d', [[28,17],[35,20],[28,22]]); dot(24, 16, 2, cream); dot(25,16,1);
      p.fillStyle = '#d8504e'; p.fillRect(18, 25, 11, 3);
    } else if (type === 'rooster') {
      poly('#31575a', [[8,20],[2,14],[12,16],[5,8],[16,14],[18,27]]);
      ellipse(21, 21, 10, 10, '#b96845'); ellipse(26, 13, 7, 8, '#d8894b');
      poly('#e7ad39', [[31,13],[36,16],[31,18]]); ellipse(27, 5, 3, 3, '#d94b45'); ellipse(23, 6, 3, 3, '#d94b45'); dot(28, 12);
      p.strokeStyle = '#e7ad39'; p.lineWidth = 2; p.beginPath(); p.moveTo(19,29); p.lineTo(18,34); p.moveTo(25,29); p.lineTo(26,34); p.stroke();
    } else if (type === 'boar') {
      ellipse(18, 21, 14, 10, '#6f554c'); p.fillStyle = '#493b39'; for (let i = 0; i < 5; i++) p.fillRect(7 + i * 5, 10 + (i % 2), 3, 5);
      ellipse(28, 22, 7, 6, '#9b7362'); dot(30, 20); dot(33, 23, 1);
      poly(cream, [[29,25],[33,30],[27,28]]); poly(cream, [[23,25],[20,30],[26,28]]);
      p.fillStyle = '#493b39'; p.fillRect(9,28,4,6); p.fillRect(22,28,4,6);
    } else if (type === 'scarecrow') {
      p.strokeStyle = '#c99a42'; p.lineWidth = 4; p.beginPath(); p.moveTo(18,13); p.lineTo(18,34); p.moveTo(5,19); p.lineTo(31,19); p.stroke();
      rect(11,16,15,17,'#477b72'); rect(12,8,13,11,'#c79445');
      p.fillStyle = '#604734'; p.fillRect(8,6,20,4); p.fillRect(12,2,12,6);
      dot(16,12,1.4); dot(22,12,1.4); p.strokeStyle = ink; p.lineWidth = 1.5; p.beginPath(); p.moveTo(16,16); p.lineTo(22,16); p.stroke();
      p.fillStyle = '#e2bb55'; p.fillRect(3,17,5,2); p.fillRect(29,17,5,2);
    } else if (type === 'elite') {
      rect(5,9,26,20,'#f2e8d7'); p.strokeStyle = '#8d5bc2'; p.lineWidth = 3; p.beginPath(); p.moveTo(6,11); p.lineTo(18,21); p.lineTo(30,11); p.stroke();
      ellipse(18,25,9,6,'#8d5bc2'); dot(14,24,1.6,cream); dot(22,24,1.6,cream); dot(14,24); dot(22,24);
      p.fillStyle = '#ffc857'; p.fillRect(27,5,5,8); dot(29.5,15,1.5,'#ffc857');
    } else {
      p.strokeStyle = ink; p.lineWidth = 3; p.beginPath(); p.moveTo(13,10); p.lineTo(8,4); p.moveTo(35,10); p.lineTo(40,4); p.stroke();
      ellipse(11,7,6,4,'#f06a55'); ellipse(37,7,6,4,'#f06a55');
      ellipse(24,25,18,17,'#d6534d'); ellipse(24,25,13,12,cream);
      p.strokeStyle = ink; p.lineWidth = 2; p.beginPath(); p.moveTo(24,25); p.lineTo(24,15); p.moveTo(24,25); p.lineTo(31,29); p.stroke();
      dot(13,26,2,'#ffcf54'); dot(35,26,2,'#ffcf54');
      p.fillStyle = '#7b403b'; p.fillRect(11,39,8,5); p.fillRect(29,39,8,5);
    }
    enemySprites.set(type, sprite);
    return sprite;
  }

  function renderBestiary() {
    const list = $('#bestiary-list');
    list.innerHTML = BESTIARY_ORDER.map((id, index) => {
      const enemy = ENEMY_TYPES[id];
      return `
      <article class="bestiary-entry">
        <div class="bestiary-art">
          <canvas width="128" height="128" data-enemy="${id}" aria-label="${enemy.name}目前像素造型"></canvas>
        </div>
        <div class="bestiary-copy">
          <header class="bestiary-heading">
            <span>NO.${String(index + 1).padStart(2, '0')}</span>
            <h3>${enemy.name}</h3>
          </header>
          <div class="attack-mode"><span>${enemy.tier===2?'首領招式':'移動與攻擊'}</span><p>${enemy.behavior}</p></div><details class="enemy-times"><summary>出沒關卡與時間</summary><ul>${enemyAppearances(id).map(text=>`<li>${text}</li>`).join('')}</ul></details>
        </div>
      </article>
    `;
    }).join('');

    list.querySelectorAll('canvas[data-enemy]').forEach(preview => {
      const type = preview.dataset.enemy;
      const previewCtx = preview.getContext('2d');
      const paint = () => {
        previewCtx.imageSmoothingEnabled = false;
        previewCtx.clearRect(0, 0, preview.width, preview.height);
        previewCtx.fillStyle = 'rgba(0,0,0,.18)';
        previewCtx.beginPath();
        previewCtx.ellipse(64, 105, 31, 8, 0, 0, TAU);
        previewCtx.fill();
        const tier = getEnemyArt(type)?.tier ?? 0;
        const size = [90, 108, 124][tier];
        drawEnemyImage(previewCtx, type, (128 - size) / 2, 110 - size, size);
      };
      paint();
      const image = getEnemyImage(type);
      if (image && !image.complete) image.addEventListener('load', paint, { once: true });
    });
  }

  function drawEnemy(e) {
    const s = worldToScreen(e.x, e.y);
    if (s.x < -100 || s.x > width + 100 || s.y < -100 || s.y > height + 100) return;
    const spriteType = getEnemyArt(e.type) ? e.type : e.boss ? 'boss' : e.elite ? 'elite' : e.type;
    const enemyImage = getEnemyImage(spriteType);
    const sprite = enemyImage ? null : getEnemySprite(spriteType);
    const drawSize = enemyImage ? e.radius * 3.45 : e.boss ? e.radius * 2.45 : e.elite ? e.radius * 2.15 : e.radius * 2.65;
    const bob = Math.sin(e.phase * 2.4) * (e.type === 'crow' ? 3 : 1.2);
    ctx.save(); ctx.translate(s.x, s.y + bob); ctx.scale(e.facing || 1, 1);
    if(e.aiPhase==='windup'||e.chargePhase==='warn')ctx.scale(1.08,.9);
    else if(e.stun>0)ctx.rotate(.08*Math.sin(e.phase*8));
    if (e.flash) ctx.globalAlpha = .7;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, drawSize * .37, drawSize * .28, drawSize * .09, 0, 0, TAU); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    if (enemyImage) {
      if (!drawEnemyImage(ctx, spriteType, -drawSize / 2, -drawSize / 2, drawSize)) {
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, TAU); ctx.fill();
      }
    } else ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    if (e.elite) {
      ctx.strokeStyle = e.boss ? '#ffcf45' : '#d995ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.radius + 7 + Math.sin(elapsed * 5) * 2, 0, TAU); ctx.stroke();
    }
    if (e.elite && !e.boss) {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-e.radius, -e.radius - 16, e.radius * 2, 5);
      ctx.fillStyle = '#d987ff'; ctx.fillRect(-e.radius, -e.radius - 16, e.radius * 2 * Math.max(0, e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }

  function drawGoose() {
    const screen = worldToScreen(player.x, player.y);
    const snap = value => Math.round(value * dpr) / dpr;
    const x = snap(screen.x), y = snap(screen.y);
    const waddle = player.moving ? Math.round(Math.sin(elapsed * 13)) : 0;
    const bob = player.moving ? Math.abs(Math.sin(elapsed * 13)) * 3 : Math.sin(elapsed * 2.4) * 1.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.24)';
    ctx.beginPath(); ctx.ellipse(0, 21, 25, 8, 0, 0, TAU); ctx.fill();
    // Pixel-aligned stepping avoids resampling the silhouette through rotation.
    ctx.translate(waddle, snap(-19 - bob));
    if(adventure.honkFlash>0)ctx.scale(1.1,.94);
    ctx.scale(-player.facing, 1);
    if (player.flash && Math.floor(player.flash * 30) % 2) ctx.globalAlpha = .28;
    ctx.imageSmoothingEnabled = false;
    if (gooSprite.complete && gooSprite.naturalWidth) ctx.drawImage(gooSprite, -48, -48, 96, 96);
    ctx.restore();
    if(adventure.shield){ctx.strokeStyle='#c8f568';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,37,0,TAU);ctx.stroke();}

  }

  function drawProjectile(p) {
    const s = worldToScreen(p.x, p.y);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(p.vy, p.vx));
    if(p.type==='peck'){
      ctx.fillStyle=p.color||'#fff5d9';ctx.beginPath();ctx.moveTo(-17,0);ctx.lineTo(-10,-7);ctx.lineTo(3,-6);ctx.lineTo(16,0);ctx.lineTo(3,6);ctx.lineTo(-10,7);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#9aa48b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-21,0);ctx.lineTo(13,0);ctx.stroke();
    }else if(p.type==='shuttle'){
      ctx.fillStyle=p.evolved?'#fff1a6':'#fff6e4';ctx.beginPath();ctx.moveTo(-19,-12);ctx.lineTo(-19,12);ctx.lineTo(1,5);ctx.lineTo(1,-5);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#abbaa2';ctx.lineWidth=1;for(const dy of [-8,0,8]){ctx.beginPath();ctx.moveTo(-18,dy);ctx.lineTo(1,0);ctx.stroke();}
      ctx.fillStyle='#377d65';ctx.fillRect(-2,-5,4,10);ctx.fillStyle='#d6ad73';ctx.beginPath();ctx.arc(6,0,6,0,TAU);ctx.fill();
    }
    else if (p.type === 'bread') { ctx.fillStyle = '#d69a4b'; ctx.beginPath(); ctx.roundRect(-9, -6, 18, 12, 4); ctx.fill(); ctx.fillStyle = '#f4cb7b'; ctx.fillRect(-6, -3, 12, 6); }
    else if (p.type === 'enemy') { ctx.fillStyle = '#ff594f'; if (!LOW_POWER_MODE && settings.effects!=='low') { ctx.shadowColor = '#ff594f'; ctx.shadowBlur = 12; } ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = p.color || '#fff'; ctx.lineWidth = p.radius; ctx.lineCap = 'round'; if (!LOW_POWER_MODE && settings.effects!=='low') { ctx.shadowColor = p.color || '#fff'; ctx.shadowBlur = 10; } ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke(); }
    ctx.restore();
  }

  function drawEffect(e) {
    if (e.delay > 0) return;
    const s = worldToScreen(e.x, e.y);
    if(e.type==='bossZone'){
      ctx.save();ctx.fillStyle='rgba(255,109,75,.13)';ctx.strokeStyle='#ff9072';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,e.maxRadius,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#ffe1c1';ctx.textAlign='center';ctx.font='bold 13px sans-serif';ctx.fillText('即將轟炸',s.x,s.y);ctx.restore();return;
    }
    if(e.type==='bite'){
      const length=e.length*Math.sin(Math.PI*clamp(e.life/e.maxLife,0,1));
      ctx.save();ctx.translate(s.x,s.y-13);ctx.rotate(e.angle);
      ctx.fillStyle='#233d34';ctx.fillRect(8,-9,length+11,18);ctx.fillStyle=e.evolved?'#fff0a2':'#fff4dd';ctx.fillRect(8,-6,length+9,12);
      ctx.beginPath();ctx.ellipse(length+16,-2,15,12,0,0,TAU);ctx.fill();ctx.fillStyle='#ed8a2e';ctx.fillRect(length+25,-2,13,6);ctx.fillStyle='#142e27';ctx.fillRect(length+18,-6,3,3);ctx.restore();return;
    }
    ctx.save(); ctx.globalAlpha = Math.max(0, e.life / e.maxLife) * .8; ctx.lineWidth = e.type === 'honk' ? 7 : 4;
    ctx.strokeStyle = ['honk','active'].includes(e.type) ? '#baf972' : e.type === 'explosion' ? '#ffd444' : e.type === 'bossPulse' ? '#ff525f' : '#b6f5e5';
    ctx.beginPath(); ctx.arc(s.x, s.y, e.radius, 0, TAU); ctx.stroke(); ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      const s = worldToScreen(p.x, p.y); ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 3);
      if (p.text) { ctx.fillStyle = p.color; ctx.font = '900 13px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.text, s.x, s.y); }
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(s.x, s.y, p.radius, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawMenuBackdrop(now) {
    ctx.fillStyle = '#163c32'; ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 36; i++) {
      const x = (i * 137 + now * .012 * (1 + i % 3)) % (width + 100) - 50;
      const y = (i * 83) % height;
      ctx.fillStyle = i % 4 ? 'rgba(144,210,106,.09)' : 'rgba(255,210,75,.12)';
      ctx.beginPath(); ctx.arc(x, y, 3 + i % 7, 0, TAU); ctx.fill();
    }
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (['menu','bestiary','skills','chapter-loot'].includes(state) || state==='settings'&&settingsBack==='menu') { drawMenuBackdrop(now); return; }
    ctx.save();
    if (settings.shake && shake > .2) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawWorld();
    drawAdventure();
    pools.forEach(drawPool);
    gems.forEach(drawGem);
    enemies.forEach(drawEnemy);
    projectiles.forEach(drawProjectile);
    effects.forEach(drawEffect);
    drawGoose();
    if(state==='victory') {
      const t=Math.min(1,adventure.victoryTime/1.4),dead=adventure.defeatedBoss;
      if(dead){const q=worldToScreen(dead.x,dead.y);ctx.save();ctx.globalAlpha=1-t;ctx.translate(q.x,q.y);ctx.rotate(t*1.2);ctx.scale(1-t*.4,1-t*.4);ctx.translate(-q.x,-q.y);drawEnemy(dead);ctx.restore();}
      ctx.save();ctx.fillStyle='rgba(4,23,18,.5)';ctx.fillRect(0,height*.32,width,110);ctx.textAlign='center';ctx.fillStyle='#d6ff8e';ctx.font='bold 28px sans-serif';ctx.fillText('首領擊敗！',width/2,height*.32+46);ctx.fillStyle='#fff5df';ctx.font='16px sans-serif';ctx.fillText('通關成功',width/2,height*.32+80);ctx.restore();
    }
    drawParticles();
    drawTrainingTarget();
    ctx.restore();
  }

  function loop(now) {
    if (now - last < TARGET_FRAME_MS - 1) {
      requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(LOW_POWER_MODE ? .05 : .034, (now - last) / 1000 || 0);
    last = now;
    if(!document.hidden)GooAudio.update(dt);
    update(dt);
    if(state==='playing'&&pendingChests>0){pendingChests--;openEliteChest();}
    draw(now);
    requestAnimationFrame(loop);
  }

  document.querySelectorAll('.week-progress button').forEach(button => button.addEventListener('click', () => {
    selectedChapter = Number(button.dataset.chapter);
    renderChapterMenu();
  }));
  function returnFromIntro(){if(state!=='intro')return;keys.clear();renderChapterMenu();setScreen('menu');}
  $('#chapter-back').addEventListener('click',returnFromIntro);
  $('#start-btn').addEventListener('click', () => startGame('chapter'));
  $('#chapter-info-btn').addEventListener('click', () => setScreen('chapter-info'));
  $('#chapter-info-close').addEventListener('click', () => setScreen('menu'));
  $('#skills-btn').addEventListener('click', () => { renderSkills('weapons'); setScreen('skills'); });
  $('#skills-close').addEventListener('click', () => { renderChapterMenu(); setScreen('menu'); });
  for (const category of ['weapons','passives','evolutions']) $('#skills-'+category).addEventListener('click', () => renderSkills(category));
  $('#chapter-chest').addEventListener('click', claimChapterReward);
  $('#result-unlock').addEventListener('click', claimChapterReward);
  $('#loot-close').addEventListener('click', () => { renderChapterMenu(); setScreen(lootReturnScreen); });
  $('#bestiary-btn').addEventListener('click', () => { renderBestiary(); setScreen('bestiary'); });
  $('#bestiary-close').addEventListener('click', () => { renderChapterMenu(); setScreen('menu'); });
  $('#retry-btn').addEventListener('click', () => startGame(runMode));
  $('#chapter-start').addEventListener('click', () => { initAudio();setScreen('playing');if(!beginTraining())showToast(currentChapter().objective); });
  $('#home-btn').addEventListener('click', () => {
    if(state==='result'&&adventure.won&&runMode!=='test'&&selectedChapter<6)selectedChapter++;
    renderChapterMenu();setScreen('menu');
  });
  $('#pause-btn').addEventListener('click', () => { if (state === 'playing') setScreen('paused'); });
  $('#combo-btn').addEventListener('click', () => { if (state === 'playing') { renderComboBook(); setScreen('combo'); } });
  $('#combo-close').addEventListener('click', () => setScreen('playing'));
  $('#resume-btn').addEventListener('click', () => {initAudio();setScreen('playing');});
  $('#quit-btn').addEventListener('click', () => { renderChapterMenu(); setScreen('menu'); });
  $('#evolution-continue').addEventListener('click', () => { if (pendingLevels > 0) openUpgrade(); else setScreen('playing'); });
  $('#reroll-btn').addEventListener('click', () => { if (rerolls > 0) { rerolls--; $('#reroll-count').textContent = rerolls; $('#reroll-btn').disabled = rerolls <= 0; renderUpgradeOptions(); sound(310, .08, 'triangle', .03); } });

  addEventListener('keydown', e => {
    if (state==='playing'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if(state==='intro'&&e.code==='Escape'){e.preventDefault();returnFromIntro();return;}
    if(state!=='playing'&&state!=='paused')return;
    keys.add(e.code);
    if(e.code==='Space'&&!e.repeat)doHonk();
    if (e.code === 'Escape') {
      if (state === 'playing') setScreen('paused'); else if (state === 'paused') {initAudio();setScreen('playing');}
    }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('resize', resize);
  addEventListener('blur', () => { if (state === 'playing') setScreen('paused'); keys.clear(); });
  addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') setScreen('paused');
    if(document.hidden)GooAudio.setScene('paused',selectedChapter);
    else if(['menu','bestiary','skills','chapter-loot','result'].includes(state))GooAudio.setScene(state==='result'?(adventure.won?'win':'result'):'menu',selectedChapter);
    last = performance.now();
  });

  function setTouchControl(e) {
    const touch = [...e.touches].find(t => t.identifier === joystick.id);
    if (!touch) return;
    const dx = touch.clientX - joystick.originX;
    const dy = touch.clientY - joystick.originY;
    const len = Math.hypot(dx, dy) || 1;
    const max = 38;
    joystick.x = Math.max(-1, Math.min(1, dx / max)); joystick.y = Math.max(-1, Math.min(1, dy / max));
    if (len > max) { joystick.x = dx / len; joystick.y = dy / len; }
    dom.joystick.querySelector('i').style.transform = `translate(calc(-50% + ${joystick.x * max}px), calc(-50% + ${joystick.y * max}px))`;
  }

  function resetTouchControl() {
    joystick.active = false; joystick.id = null; joystick.x = 0; joystick.y = 0;
    dom.joystick.classList.add('hidden');
    dom.joystick.querySelector('i').style.transform = 'translate(-50%,-50%)';
  }

  // Scope gesture suppression to combat; menus retain scrolling and pinch zoom.
  const touchSurface=$('#app');
  const stopCombatZoom=e=>{if(state==='playing'&&e.cancelable)e.preventDefault();};
  for(const event of ['gesturestart','gesturechange','dblclick'])touchSurface.addEventListener(event,stopCombatZoom,{passive:false});
  for(const event of ['touchstart','touchmove'])touchSurface.addEventListener(event,e=>{
    if(e.touches.length>1)stopCombatZoom(e);
  },{passive:false});

  canvas.addEventListener('touchstart', e => {
    if (state !== 'playing') return;
    e.preventDefault();
    if (joystick.active) return;
    const touch = e.changedTouches[0];
    joystick.active = true; joystick.id = touch.identifier; joystick.originX = touch.clientX; joystick.originY = touch.clientY;
    dom.joystick.style.left = `${touch.clientX}px`; dom.joystick.style.top = `${touch.clientY}px`;
    dom.joystick.classList.remove('hidden');
  }, { passive: false });
  canvas.addEventListener('touchmove', e => { if (joystick.active) { e.preventDefault(); setTouchControl(e); } }, { passive: false });
  canvas.addEventListener('touchend', e => { if ([...e.changedTouches].some(t => t.identifier === joystick.id)) { e.preventDefault(); resetTouchControl(); } }, { passive: false });
  canvas.addEventListener('touchcancel', e => { if ([...e.changedTouches].some(t => t.identifier === joystick.id)) resetTouchControl(); }, { passive: false });

  function runDuration() { return runMode === 'test' ? TEST_DURATION : WORLD.specs[selectedChapter].duration; }
  function mapExtra() { return selectedChapter===1 ? STORE_OBSTACLES : []; }
  function storageRead(key,fallback=null) { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } }
  function storageWrite(key,value) { try { localStorage.setItem(key,value); } catch (_) { if(!storageWarned){storageWarned=true;showToast('此瀏覽器無法儲存；本次仍可遊玩');} } }
  function loadSettings() {
    const base={music:.3,sfx:.65,shake:!matchMedia('(prefers-reduced-motion: reduce)').matches,effects:'standard',haptics:false,tutorial:true};
    try { const s=JSON.parse(storageRead('goo-settings-v1','{}'));return {...base,music:clamp(Number.isFinite(s.music)?s.music:base.music,0,1),sfx:clamp(Number.isFinite(s.sfx)?s.sfx:base.sfx,0,1),shake:typeof s.shake==='boolean'?s.shake:base.shake,effects:s.effects==='low'?'low':'standard',haptics:s.haptics===true,tutorial:s.tutorial!==false}; }catch(_){return base;}
  }
  function openSettings() {
    settingsBack=['playing','paused'].includes(state)?'paused':'menu';
    setScreen('settings');
    for(const k of ['music','sfx']) { $('#setting-'+k).value=Math.round(settings[k]*100);$('#value-'+k).textContent=Math.round(settings[k]*100)+'%'; }
    for(const k of ['shake','haptics','tutorial']) { const b=$('#setting-'+k);b.setAttribute('aria-pressed',String(settings[k]));b.textContent=settings[k]?'開啟':'關閉'; }
    $('#setting-effects').textContent=settings.effects==='low'?'精簡':'標準';
  }
  function resetAdventure() {
    adventure={stamps:[],supplyReadyAt:[],routeSupplyReadyAt:0,supplyCount:0,randomSupplies:[],nextSupplyAt:30,nextGrenadeAt:10,bossDefeated:false,grace:0,honkCd:0,honkFlash:0,honkCount:0,interrupts:0,style:null,moving:0,still:0,shield:0,shieldCd:0,decoy:null,lastSource:'',damageBy:{},tutorialSteps:new Set(),distance:0,routeReward:false,alertClock:0,hazard:null,exitHint:false,firstGem:false,blessing:null,blessingClaimed:false,guideStage:null,guideSince:0};
    if(runMode!=='test') {
      const s=WORLD.specs[selectedChapter].start;player.x=s[0];player.y=s[1];
      if(selectedChapter===5)player.y=WORLD.routeCenter(player.x);
      const p=WORLD.project(selectedChapter,player.x,player.y,player.radius,0,0,mapExtra());Object.assign(player,p);
      const spots=[[0,220],[0,120],[420,540],[0,380],[-780,60],[0,-420],[0,-120]];
      const [x,y]=spots[selectedChapter];
      adventure.blessing=WORLD.project(selectedChapter,x,y,30,0,0,mapExtra());
    }
    $('#boss-phase').textContent='';$('#lesson').textContent='';$('#lesson').classList.add('hidden');
  }
  // Onboarding is a separate, action-gated simulation: no wave/hazard clocks run here.
  const TRAINING_STEPS = ['move','attack','xp','upgrade','blessing'];
  function trainingCopy(step) {
    const mobile=innerWidth<=700||LOW_POWER_MODE||matchMedia('(pointer: coarse)').matches;
    return {
      move:['先帶 Goo 走幾步',mobile?'在空白戰場按住並拖曳，就能移動。實際走動累積 4 秒，熟悉方向！':'按 WASD 或方向鍵移動，實際走動累積 4 秒，熟悉方向！'],
      attack:['不用按攻擊鍵', 'Goo 會自動攻擊附近的敵人。靠近練習小勞鼠，持續攻擊練習 4 秒，再打倒牠！'],
      xp:['撿經驗，才會變強', '看到標著「經驗值」的掉落物了嗎？走過去撿起來，填滿上方經驗條就能升級。'],
      upgrade:['第一次升級', '選一個技能，讓 Goo 更強！'],
      blessing:['找土地公領祝福', '跟著「祝福」箭頭靠近土地公，再從三個祝福選一個。本局都會有效！']
    }[step];
  }
  function beginTraining(force=false) {
    const requested=force||replayTraining;replayTraining=false;
    if(runMode!=='chapter'||selectedChapter!==0||(!requested&&(!settings.tutorial||trainingStatus||progress.cleared.includes(0))))return false;
    adventure.training={step:'move',distance:0,moveTime:0,attackTime:0,lastHitAgo:Infinity,briefing:true};
    setTrainingStep('move');return true;
  }
  function setTrainingStep(step) {
    if(!adventure.training)return;
    adventure.training.step=step;adventure.training.briefing=true;
    keys.clear();resetTouchControl();
    $('#lesson').classList.add('hidden');
    setScreen('training');
  }
  function renderTrainingUI() {
    const t=adventure.training;
    $('#app').classList.toggle('is-training',!!t);
    const visible=!!t&&['training','playing','upgrade'].includes(state);
    $('#training-panel').classList.toggle('hidden',!visible);
    if(!visible)return;
    const [title,copy]=trainingCopy(t.step);
    $('#training-panel').classList.toggle('briefing',state==='training');
    $('#training-panel').classList.toggle('choosing',state==='upgrade');
    $('#training-progress').textContent=`新手教學 ${TRAINING_STEPS.indexOf(t.step)+1} / 5 · 首領倒數暫停`;
    $('#training-title').textContent=title;$('#training-copy').textContent=copy;
    updateTrainingMeter();
    $('#training-practice').classList.toggle('hidden',state!=='training');
    $('#training-practice').textContent='開始練習';
    $('#honk-btn').disabled=true;
  }
  function updateTrainingMeter() {
    const t=adventure.training,visible=t&&state==='playing'&&['move','attack'].includes(t.step);
    $('#training-meter').classList.toggle('hidden',!visible);
    if(visible){const value=t.step==='move'?t.moveTime:t.attackTime;$('#training-meter').textContent=value>=4?'練習完成，打倒小勞鼠就能繼續！':`${t.step==='move'?'走動練習':'持續命中練習'} ${Math.min(4,value).toFixed(1)} / 4 秒`;}
  }
  function trainingSpot(distance) {
    // Place on walkable ground away from Goo, including when the player explored first.
    for(const angle of [-Math.PI/2,Math.PI/2,0,Math.PI]){
      const p=WORLD.project(0,player.x+Math.cos(angle)*distance,player.y+Math.sin(angle)*distance,30,0,4);
      if(Math.hypot(p.x-player.x,p.y-player.y)>=distance*.8)return p;
    }
    return {x:0,y:640};
  }
  function practiceTraining() {
    const t=adventure.training;if(!t||state!=='training')return;
    t.briefing=false;
    if(t.step==='attack'&&!enemies.some(e=>e.training)){
      const e=spawnEnemy('rat1');Object.assign(e,trainingSpot(170),{training:true,hp:12,maxHp:12,speed:25,damage:0});
    }
    setScreen('playing');
  }
  function finishTraining(skipped) {
    if(!adventure.training)return;
    const wasBriefing=state==='training';
    adventure.training=null;
    trainingStatus=skipped?'skipped':'completed';storageWrite('goo-onboarding-v1',trainingStatus);
    enemies=enemies.filter(e=>!e.training);gems=gems.filter(g=>!g.training);projectiles=[];effects=[];pools=[];
    adventure.grace=0;keys.clear();resetTouchControl();
    if(wasBriefing)setScreen('playing');else renderTrainingUI();
    updateHud();updateGuide();
    showToast(skipped?'已略過教學，設定裡可以重新練習。':'學會了！邊閃怪、邊撿經驗，讓 Goo 越打越強。');
  }
  function updateTraining(dt) {
    const t=adventure.training;if(!t)return;
    const move=getMoveVector(),oldX=player.x,oldY=player.y;
    adventure.grace=4;
    player.moving=Math.hypot(move.x,move.y)>.05;
    moveEntity(player,move.x*player.speed*dt,move.y*player.speed*dt);
    if(Math.abs(move.x)>.05)player.facing=Math.sign(move.x);
    updateCamera();
    if(t.step==='move'){
      const distance=Math.hypot(player.x-oldX,player.y-oldY);
      t.distance+=distance;
      t.moveTime+=Math.min(dt,distance/player.speed);
      if(t.moveTime>=4)setTrainingStep('attack');
    } else if(t.step==='attack'){
      // Only count time while attacks are connecting; waiting far away does not count.
      t.attackTime+=Math.min(dt,Math.max(0,1.5-t.lastHitAgo));
      t.lastHitAgo+=dt;
      updateWeapons(dt);if(state!=='playing')return;
      updateOrbit(dt);if(state!=='playing')return;
      updateProjectiles(dt);if(state!=='playing')return;
      updateEffects(dt);if(state!=='playing')return;
      updateEnemies(dt);
    } else if(t.step==='xp')updateGems(dt);
    else if(t.step==='blessing'&&Math.hypot(player.x-adventure.blessing.x,player.y-adventure.blessing.y)<64)claimBlessing();
    updateTrainingMeter();updateParticles(dt);updateHud();
  }
  function drawTrainingTarget() {
    const t=adventure.training;if(!t||!['playing','training'].includes(state))return;
    const target=t.step==='xp'?gems.find(g=>g.training):t.step==='attack'?enemies.find(e=>e.training):null;
    if(!target)return;
    const q=worldToScreen(target.x,target.y),x=clamp(q.x,45,width-45),y=clamp(q.y,180,height-200);
    ctx.save();ctx.strokeStyle='#f4cb76';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,25,0,TAU);ctx.stroke();
    ctx.fillStyle='#16352f';ctx.fillRect(x-43,y-55,86,24);ctx.fillStyle='#fff2cf';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(t.step==='xp'?'經驗值':'練習小勞鼠',x,y-38);
    ctx.beginPath();ctx.moveTo(x-7,y-30);ctx.lineTo(x+7,y-30);ctx.lineTo(x,y-20);ctx.fill();ctx.restore();
  }
  $('#training-practice').addEventListener('click',practiceTraining);
  $('#training-skip').addEventListener('click',()=>finishTraining(true));
  $('#training-replay').addEventListener('click',()=>{replayTraining=true;selectedChapter=0;startGame('chapter');});

  const CHAPTER_GUIDES = [
    '路口紅綠燈會輪流放行；嘎叫可爭取 4 秒行人通行。',
    '貨架不能穿越。繞過轉角，別讓怪群堵住走道。',
    '沿著圓環移動，中央花圃不能穿越；留意公雞衝刺。',
    '攤販與機車會擋路，先看好空隙再穿過人行道。',
    '辦公桌與隔間會擋路，沿走道移動，別被堵在角落。',
    '河濱沒有終點。紫罐全路線共用 45 秒冷卻，往前跑也不會重置。',
    '羽球落點會先出現警示圈；爆炸前趕快離開圈內。'
  ];
  function guideMessage(stage,text) {
    if(adventure.guideStage!==stage){adventure.guideStage=stage;adventure.guideSince=elapsed;}
    adventure.guideText=text;$('#lesson').textContent=text;$('#lesson').classList.remove('hidden');
  }
  function updateGuide() {
    const lesson=$('#lesson');
    if(adventure.training||!settings.tutorial||runMode==='test'||state!=='playing'){lesson.textContent='';lesson.classList.add('hidden');return;}
    if(!adventure.blessingClaimed){
      guideMessage(adventure.distance<48?'move':'blessing',adventure.distance<48
        ?(LOW_POWER_MODE?'拖曳空白戰場移動，去找土地公伯伯領祝福。':'WASD／方向鍵移動，去找土地公伯伯領祝福。')
        :'跟著「祝福」指引，靠近土地公伯伯，領取本局祝福。');return;
    }
    if(!adventure.style){lesson.textContent='';lesson.classList.add('hidden');return;}
    if(['honk','map','supply','boss'].includes(adventure.guideStage)){lesson.textContent=adventure.guideText;lesson.classList.remove('hidden');}
    if(['move','blessing',null].includes(adventure.guideStage))guideMessage('honk',LOW_POWER_MODE?'祝福到手！試試右下角「嘎！」，能推開怪群、打斷首領。':'祝福到手！按空白鍵「嘎！」，能推開怪群、打斷首領。');
    if(adventure.guideStage==='honk'&&(adventure.honkCount>0||elapsed-adventure.guideSince>=12))guideMessage('map',CHAPTER_GUIDES[selectedChapter]);
    else if(adventure.guideStage==='map'&&elapsed-adventure.guideSince>=10){adventure.guideSupplyCount=adventure.supplyCount;guideMessage('supply',selectedChapter===5?'紅瓶回血、藍瓶補 EXP；紫罐兩者都有，全路線共用冷卻。':'紅瓶回血、藍瓶補 EXP；紫罐兩者都有，每站 45 秒再生。');}
    else if(adventure.guideStage==='supply'&&(adventure.supplyCount>adventure.guideSupplyCount||elapsed-adventure.guideSince>=12))guideMessage('boss',`首領於 ${runDuration()/60} 分鐘登場，擊敗${currentChapter().bossName}即可通關。`);
    else if(adventure.guideStage==='boss'&&elapsed-adventure.guideSince>=10){adventure.guideStage='done';lesson.textContent='';lesson.classList.add('hidden');}
  }
  function claimBlessing() {
    if(adventure.blessingClaimed||state!=='playing')return;
    adventure.blessingClaimed=true;
    $('#lesson').textContent='';$('#lesson').classList.add('hidden');
    gainXp(Math.max(1,player.nextXp-player.xp));
    if(state!=='upgrade'){pendingLevels++;openUpgrade();}
    GooAudio.cue('pickup');
  }
  function doHonk() {
    if(adventure.training||state!=='playing'||adventure.honkCd>0)return;
    const style=adventure.style;adventure.honkCd=style==='runner'?7:10;adventure.honkFlash=.35;adventure.honkCount++;
    GooAudio.cue('honk');
    if(settings.haptics && navigator.vibrate)navigator.vibrate(20);
    const range=style==='guardian'?240:200;
    effects.push({type:'active',x:player.x,y:player.y,radius:8,maxRadius:range,life:.5,maxLife:.5});
    if(style==='runner'){player.invuln=Math.max(player.invuln,.6);adventure.sprint=.9;}
    if(style==='trickster')adventure.decoy={x:player.x,y:player.y,life:3.5};
    for(const enemy of [...enemies])if(Math.hypot(enemy.x-player.x,enemy.y-player.y)<range+enemy.radius) {
      enemy.stun=enemy.boss? .65:1.4;
      const a=Math.atan2(enemy.y-player.y,enemy.x-player.x);
      moveEntity(enemy,Math.cos(a)*(enemy.boss?24:style==='guardian'?130:85),Math.sin(a)*(enemy.boss?24:style==='guardian'?130:85),true);
      if(enemy.boss && (['windup','attack'].includes(enemy.aiPhase)||enemy.volleyWindup>0||effects.some(e=>e.type==='bossZone'&&e.owner===enemy))) {enemy.aiPhase='recover';enemy.aiTime=2.6;enemy.comboLeft=0;enemy.volleyWindup=0;enemy.volleyCd=1.2;effects=effects.filter(e=>e.type!=='bossZone'||e.owner!==enemy);adventure.interrupts++;showToast('嘎！打斷成功，趁現在反擊');}
      if(enemy.stolen>0){gems.push({x:enemy.x,y:enemy.y,value:enemy.stolen,radius:8,tier:'gold',bob:0});enemy.stolen=0;showToast('搶回晶幣了！');}
      damageEnemy(enemy,12*player.damage);
    }
    // Honking near the crossing requests a brief all-walk phase, rather than damaging cars.
    if(selectedChapter===0&&Math.abs(player.x)<410&&Math.abs(player.y)<410){adventure.grace=4;showToast('行人優先：路口開放 4 秒');}
    updateGuide();
    updateHud();
  }
  function updateRandomSupplies() {
    adventure.randomSupplies=adventure.randomSupplies.filter(p=>p.expires>elapsed);
    if(elapsed>=adventure.nextSupplyAt){
      adventure.nextSupplyAt=elapsed+1; // Retry shortly if nearby walkable space is blocked.
      for(let attempt=0;attempt<32;attempt++){
        const angle=Math.random()*TAU,distance=140+Math.random()*100;
        const x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;
        let reachable=true;
        for(let t=1;t<=12;t++)if(!WORLD.inside(selectedChapter,player.x+(x-player.x)*t/12,player.y+(y-player.y)*t/12,player.radius,elapsed,adventure.grace,mapExtra())){reachable=false;break;}
        if(!reachable)continue;
        if(adventure.randomSupplies.length>=3)adventure.randomSupplies.shift();
        adventure.randomSupplies.push({x,y,kind:Math.random()<.6?'heal':'xp',expires:elapsed+60});adventure.nextSupplyAt=elapsed+30;break;
      }
    }
    for(let i=adventure.randomSupplies.length-1;i>=0;i--){
      const p=adventure.randomSupplies[i];if(Math.hypot(player.x-p.x,player.y-p.y)>=55||(p.kind!=='xp'&&player.hp>=player.maxHp))continue;
      const healed=p.kind==='xp'?0:Math.min(player.maxHp*.25,player.maxHp-player.hp);player.hp+=healed;
      if(p.kind==='xp')gainXp(player.nextXp*.35);
      adventure.randomSupplies.splice(i,1);adventure.supplyCount++;GooAudio.cue('pickup');
      const reward=p.kind==='xp'?'EXP +':`回血 +${Math.round(healed)}`;
      floatingText(player.x,player.y-38,reward,p.kind==='xp'?'#9fe0ff':'#bdf78d');showToast(reward);
    }
  }

  // An endless route must not grant a fresh reward for each new world segment.
  function supplyReadyTime(key) {
    return selectedChapter===5 ? adventure.routeSupplyReadyAt : (adventure.supplyReadyAt[key]||0);
  }

  function updateAdventure(dt,move) {
    adventure.honkCd=Math.max(0,adventure.honkCd-dt);adventure.honkFlash=Math.max(0,adventure.honkFlash-dt);
    adventure.grace=Math.max(0,adventure.grace-dt);adventure.sprint=Math.max(0,(adventure.sprint||0)-dt);
    const moving=Math.hypot(move.x,move.y)>.05;
    adventure.moving=moving?adventure.moving+dt:0;adventure.still=moving?0:adventure.still+dt;
    adventure.distance+=moving?player.speed*dt:0;
    adventure.shieldCd=Math.max(0,adventure.shieldCd-dt);
    if(adventure.style==='guardian'&&adventure.still>.8&&adventure.shieldCd===0){adventure.shield=1;adventure.shieldCd=8;}
    if(adventure.decoy){adventure.decoy.life-=dt;if(adventure.decoy.life<=0)adventure.decoy=null;}
    if(runMode==='test')return;
    const spec=WORLD.specs[selectedChapter];
    adventure.navClock=(adventure.navClock||0)-dt;
    if(adventure.navClock<=0){
      if(selectedChapter===5){
        enemies=enemies.filter(e=>e.boss||e.elite||Math.abs(e.y-player.y)<1800);
        for(const e of enemies)if((e.boss||e.elite)&&Math.abs(e.y-player.y)>1400){Object.assign(e,WORLD.project(5,player.x+(Math.random()-.5)*200,player.y+650,e.radius,elapsed));e.aiPhase='stalk';e.aiTime=1.5;}
        gems=gems.filter(g=>Math.abs(g.y-player.y)<2000);
        for(const [key,until] of Object.entries(adventure.supplyReadyAt))if(until<=elapsed)delete adventure.supplyReadyAt[key];
      }
      adventure.nav=WORLD.navigation(selectedChapter,adventure.decoy||player,elapsed,adventure.grace,mapExtra());adventure.navClock=.7;}
    // Resolve a gate closing on an entity without leaving it embedded in geometry.
    for(const entity of [player,...enemies])if(!WORLD.inside(selectedChapter,entity.x,entity.y,entity.radius,elapsed,adventure.grace,mapExtra()))Object.assign(entity,WORLD.project(selectedChapter,entity.x,entity.y,entity.radius,elapsed,adventure.grace,mapExtra()));
    if(!adventure.blessingClaimed&&adventure.blessing&&Math.hypot(player.x-adventure.blessing.x,player.y-adventure.blessing.y)<64){claimBlessing();return;}
    updateRandomSupplies();
    WORLD.supplies(selectedChapter,player.y).forEach(({x,y,key:i})=>{
      const p=[x,y];
      if(supplyReadyTime(i)<=elapsed&&Math.hypot(player.x-p[0],player.y-p[1])<72){
        const healed=Math.min(player.maxHp*.25,player.maxHp-player.hp),xp=player.nextXp*.35;
        if(selectedChapter!==5&&!adventure.stamps.includes(i))adventure.stamps.push(i);
        if(selectedChapter===5)adventure.routeSupplyReadyAt=elapsed+45;
        else adventure.supplyReadyAt[i]=elapsed+45;
        adventure.supplyCount++;player.hp+=healed;gainXp(xp);GooAudio.cue('pickup');
        const reward=healed>0?`回血 +${Math.round(healed)} · EXP +`:'EXP + · 生命已滿';
        floatingText(player.x,player.y-38,reward,'#bdf78d');showToast(reward);
      }
    });
    if(selectedChapter===6&&!bossSpawned){
      if(elapsed>=adventure.nextGrenadeAt&&!adventure.hazard){adventure.hazard={x:player.x,y:player.y,start:elapsed};adventure.nextGrenadeAt=elapsed+10;}
      if(adventure.hazard){const h=adventure.hazard,age=elapsed-h.start;if(age>=2&&!h.exploded){h.exploded=true;if(Math.hypot(player.x-h.x,player.y-h.y)<130)hurtPlayer(12,'羽毛球榴彈');for(let i=0;i<12;i++)addParticle(h.x,h.y,'#fff2d3',160);}if(age>=2.5)adventure.hazard=null;}
    }
    if(selectedChapter===6&&bossSpawned)adventure.hazard=null;
    if(adventure.bossDefeated){endGame(true);return;}
    updateGuide();
  }
  function summonBossMinions(e,type,count,radius=260) {
    for(let i=0;i<count&&enemies.length<MAX_ACTIVE_ENEMIES;i++){
      const angle=e.angle+.5+(TAU-1)*i/Math.max(1,count-1),n=spawnEnemy(type);
      Object.assign(n,WORLD.project(selectedChapter,e.tx+Math.cos(angle)*radius,e.ty+Math.sin(angle)*radius,n.radius,elapsed,adventure.grace,mapExtra()));n.stun=.9;
    }
  }
  function bossFan(e,count,aim=e.angle) {
    for(let i=0;i<count&&projectiles.length<MAX_ACTIVE_PROJECTILES;i++){
      const angle=aim+(i-(count-1)/2)*.22,speed=e.attackRage?240:210;
      projectiles.push({type:'enemy',owner:e,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius:7,damage:e.damage*.45,life:3.5,source:`${currentChapter().bossName}的彈幕`});
    }
  }
  function bossZone(e,x,y,radius,delay=0,warning=.95) {
    if(effects.filter(v=>v.type==='bossZone').length>=28)return;
    effects.push({type:'bossZone',owner:e,x,y,radius,maxRadius:radius,life:warning,maxLife:warning,delay,damage:e.damage*.55});
  }
  function isFinalBoss(e){return selectedChapter===6&&e.family==='kid'&&e.boss;}
  function bossMovingVolley(e,dt){
    if(e.volleyWindup>0){
      e.volleyWindup-=dt;
      if(e.volleyWindup<=0){bossFan(e,e.rage?5:3,e.volleyAngle);e.volleyCd=1.6;}
    }else{
      e.volleyCd=(e.volleyCd??.55)-dt;
      if(e.volleyCd<=0){e.volleyAngle=Math.atan2(player.y-e.y,player.x-e.x);e.volleyWindup=.9;GooAudio.cue('warn');}
    }
  }
  function bossRing(e,count){
    const gap=Math.atan2(player.y-e.y,player.x-e.x);
    for(let i=1;i<count-1&&projectiles.length<MAX_ACTIVE_PROJECTILES;i++){
      const angle=gap+i*TAU/count;
      projectiles.push({type:'enemy',owner:e,x:e.x,y:e.y,vx:Math.cos(angle)*185,vy:Math.sin(angle)*185,radius:7,damage:e.damage*.4,life:4,source:'收假老屁孩的擴散彈幕'});
    }
  }
  function bossBarrage(e,count){
    const bounds=WORLD.localBounds(selectedChapter,player.y),radius=78;
    const safe=WORLD.project(selectedChapter,player.x+Math.cos(e.angle+Math.PI/2)*210,player.y+Math.sin(e.angle+Math.PI/2)*210,32,elapsed,adventure.grace,mapExtra());
    e.barrageSafe=safe;
    let placed=0;
    for(let attempt=0;attempt<count*20&&placed<count;attempt++){
      const near=placed%3===0,angle=Math.random()*TAU,distance=160+Math.random()*350;
      const x=near?player.x+Math.cos(angle)*distance:bounds[0]+80+Math.random()*(bounds[2]-bounds[0]-160);
      const y=near?player.y+Math.sin(angle)*distance:bounds[1]+80+Math.random()*(bounds[3]-bounds[1]-160);
      if(!WORLD.inside(selectedChapter,x,y,32,elapsed,adventure.grace,mapExtra())||Math.hypot(x-safe.x,y-safe.y)<radius+95)continue;
      if(effects.some(z=>z.type==='bossZone'&&Math.hypot(z.x-x,z.y-y)<radius*1.7))continue;
      bossZone(e,x,y,radius,Math.floor(placed/4)*.3,1.5);placed++;
    }
  }
  function finalBossAssault(e){
    const phase=e.finalPhase||1;
    bossBarrage(e,[0,6,10,14][phase]);bossRing(e,[0,14,18,22][phase]);
    summonBossMinions(e,'kid1',[0,4,6,8][phase],320);
    if(phase>=2)summonBossMinions(e,phase===3?'myna2':'rat2',phase===3?6:4,400);
    e.finalVolleyCd=.7;
  }

  function beginBossAttack(e,followup=false) {
    e.attackRage=!!e.rage;e.attackFamily=e.family||'rat';
    if(!followup)e.comboLeft=['rooster','boar','myna'].includes(e.attackFamily)?(e.attackRage?3:2):1;
    e.volleyWindup=0;
    e.aiPhase='windup';e.aiTime=isFinalBoss(e)?1.6:followup?.95:e.attackFamily==='boar'?1.5:1.3;
    e.ax=e.x;e.ay=e.y;e.tx=player.x;e.ty=player.y;e.angle=Math.atan2(e.ty-e.y,e.tx-e.x);
    e.attackRadius=e.attackFamily==='kid'?(e.attackRage?320:280):e.radius;
    e.attackLabel={rat:'鼠潮包圍＋彈幕 · 找空檔',myna:`連續俯衝 ${e.comboLeft} 次 · 側移`,rooster:`連續衝刺 ${e.comboLeft} 次 · 側移`,boar:`連續衝撞 ${e.comboLeft} 次 · 留意震波`,kid:'擴散音浪＋落點轟炸 · 離開紅圈'}[e.attackFamily];
    if(isFinalBoss(e))e.attackLabel=`第 ${e.finalPhase||1} 階段 · 全場落點＋擴散彈幕＋召喚`;
    GooAudio.cue('warn');
  }
  function updateBoss(e,dt) {
    if(!e.rage&&e.hp<e.maxHp*.6){e.rage=true;dom.bossName.textContent=`${currentChapter().bossName} · 第二階段`;showToast(`${currentChapter().bossName}進入第二階段！`);GooAudio.cue('warn');}
    if(isFinalBoss(e)){const phase=e.hp<e.maxHp*.3?3:e.hp<e.maxHp*.6?2:1;if(phase!==(e.finalPhase||1)){showToast(phase===3?'收假老屁孩使出全力！':'收假老屁孩加強攻勢！');GooAudio.cue('warn');}e.finalPhase=phase;dom.bossName.textContent=`收假老屁孩 · 第 ${phase} 階段`; }
    if(e.stun>0)return;
    e.aiTime-=dt;
    if(e.aiPhase==='stalk'){
      if(e.aiTime<=0){beginBossAttack(e);return;}
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,speed=e.speed*(e.rage?.9:.75)*enemyMoveMultiplier(e);
      const side=Math.sin(elapsed*.8+e.phase)*.45;moveEntity(e,(dx/d-dy/d*side)*speed*dt,(dy/d+dx/d*side)*speed*dt,true);
      bossMovingVolley(e,dt);
    }else if(e.aiPhase==='windup'&&e.aiTime<=0){
      e.aiPhase='attack';e.aiTime=isFinalBoss(e)?(e.finalPhase===3?3.2:2.4):['rooster','boar','myna'].includes(e.attackFamily)?.65:e.attackFamily==='kid'?1.8:.25;
      if(e.attackFamily==='rat'){
        summonBossMinions(e,'rat1',e.attackRage?26:16);if(e.attackRage)summonBossMinions(e,'rat2',4,330);bossFan(e,e.attackRage?5:3);
      }
      if(e.attackFamily==='kid'&&isFinalBoss(e))finalBossAssault(e);
      if(e.attackFamily==='kid'&&!isFinalBoss(e)){
        effects.push({type:'bossPulse',x:e.ax,y:e.ay,radius:10,maxRadius:e.attackRadius,life:.55,maxLife:.55});
        if(Math.hypot(player.x-e.ax,player.y-e.ay)<e.attackRadius+player.radius)hurtPlayer(e.damage*.85,'首領音浪');
        const point=WORLD.project(selectedChapter,e.tx,e.ty,0,elapsed,adventure.grace,mapExtra());bossZone(e,point.x,point.y,e.attackRage?170:145);
        if(e.attackRage){for(const side of [-1,1]){const q=WORLD.project(selectedChapter,e.tx+side*210,e.ty+160,0,elapsed,adventure.grace,mapExtra());bossZone(e,q.x,q.y,110,.4);}summonBossMinions(e,'kid1',8,320);}
      }
      if(e.attackFamily==='myna'){
        e.stolen=e.stolen||0;gems=gems.filter(g=>{if(Math.hypot(g.x-e.tx,g.y-e.ty)<260){e.stolen+=g.value;return false;}return true;});
        if(e.stolen>0)showToast('王八哥搶走晶幣！靠近嘎叫可搶回');
      }
    }else if(e.aiPhase==='attack'){
      if(e.attackFamily==='kid'){
        const angle=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/2;
        moveEntity(e,Math.cos(angle)*e.speed*.75*dt,Math.sin(angle)*e.speed*.75*dt,true);
        e.finalVolleyCd=(e.finalVolleyCd??.6)-dt;
        if(e.finalVolleyCd<=0){bossFan(e,isFinalBoss(e)?(e.finalPhase===3?9:7):5,Math.atan2(player.y-e.y,player.x-e.x));e.finalVolleyCd=.85;}
      }
      if(['rooster','boar','myna'].includes(e.attackFamily)){
        const ox=e.x,oy=e.y,speed=(e.attackFamily==='boar'?680:760)*enemyMoveMultiplier(e);
        moveEntity(e,Math.cos(e.angle)*speed*dt,Math.sin(e.angle)*speed*dt,true);
        if(Math.hypot(e.x-ox,e.y-oy)<speed*dt*.15)e.aiTime=0;
      }
      if(e.aiTime<=0){
        if(e.attackFamily==='boar'){bossZone(e,e.x,e.y,e.attackRage?150:110);if(e.comboLeft===1){bossFan(e,e.attackRage?7:5);summonBossMinions(e,'boar1',e.attackRage?6:3,340);}}
        if(e.attackFamily==='myna'&&e.comboLeft===1){bossFan(e,e.attackRage?7:5);summonBossMinions(e,'myna1',e.attackRage?10:6,300);bossZone(e,e.tx,e.ty,e.attackRage?130:95);}
        if(e.attackFamily==='rooster'&&e.comboLeft===1){bossFan(e,e.attackRage?9:5);summonBossMinions(e,'rooster1',e.attackRage?10:6,300);}
        e.comboLeft=Math.max(0,(e.comboLeft||1)-1);
        if(e.comboLeft>0)beginBossAttack(e,true);else {e.aiPhase='recover';e.aiTime=2.6;e.attackLabel='破綻！現在反擊';}
      }
    }else if(e.aiPhase==='recover'&&e.aiTime<=0){e.aiPhase='stalk';e.aiTime=e.rage?1.7:2.8;e.volleyCd=.2;}
  }
  function updateRegularEnemy(e,dt) {
    if(e.stun>0)return;
    let target=adventure.decoy||player;
    if(runMode!=='test'){
      const length=Math.hypot(target.x-e.x,target.y-e.y),steps=Math.max(1,Math.ceil(length/32));
      let clear=true;
      for(let i=1;i<steps;i++)if(!WORLD.inside(selectedChapter,e.x+(target.x-e.x)*i/steps,e.y+(target.y-e.y)*i/steps,e.radius,elapsed,adventure.grace,mapExtra())){clear=false;break;}
      if(!clear)target=WORLD.waypoint(adventure.nav,e,target);
    }
    const dx=target.x-e.x,dy=target.y-e.y,dist=Math.hypot(dx,dy)||1;
    if(['boar','rooster'].includes(e.family)&&e.tier>=1){
      e.chargeCd=(e.chargeCd??3)-dt;
      if(e.chargePhase==='warn') {e.chargeClock-=dt;if(e.chargeClock<=0){e.chargePhase='dash';e.chargeClock=.45;}return;}
      if(e.chargePhase==='dash'){moveEntity(e,Math.cos(e.chargeAngle)*e.speed*enemyMoveMultiplier(e)*3*dt,Math.sin(e.chargeAngle)*e.speed*enemyMoveMultiplier(e)*3*dt,true);e.chargeClock-=dt;if(e.chargeClock<=0){e.chargePhase=null;e.chargeCd=3.5;}return;}
      if(e.chargeCd<=0&&dist<480){e.chargePhase='warn';e.chargeClock=.8;e.chargeAngle=Math.atan2(dy,dx);return;}
    }
    let speed=e.speed*enemyMoveMultiplier(e);
    if(e.family==='myna')speed*=1+Math.sin(e.phase*3.2)*.16;
    if(e.family==='kid'&&e.tier===1)speed*=1+Math.max(0,Math.sin(e.phase*2.4))*.4;
    let mx=dx/dist*speed*dt,my=dy/dist*speed*dt;
    if(e.family==='kid'&&e.tier===0){mx+=-dy/dist*Math.sin(e.phase*3.4)*34*dt*enemyMoveMultiplier(e);my+=dx/dist*Math.sin(e.phase*3.4)*34*dt*enemyMoveMultiplier(e);}
    moveEntity(e,mx,my,true);
  }
  function adventureHud() {
    const btn=$('#honk-btn'),cd=Math.ceil(adventure.honkCd);
    btn.disabled=!!adventure.training||state!=='playing'||cd>0;$('#honk-cooldown').textContent=cd?`${cd}秒`:'準備好了';
    btn.setAttribute('aria-label',cd?`主動嘎叫，冷卻 ${cd} 秒`:'主動嘎叫');
    $('#honk-fill').style.height=`${Math.min(100,adventure.honkCd/10*100)}%`;
    const spec=WORLD.specs[selectedChapter];
    let message=runMode==='test'?'試試空白鍵／右下角嘎叫':adventure.bossDefeated?'首領擊敗，通關成功！':bossSpawned?'首領戰 · 擊敗即可通關':`${['暖身','混合怪群','高壓怪群'][waveStage()]} · 首領倒數 ${formatTime(Math.max(0,runDuration()-elapsed))}`;
    if(runMode!=='test'&&selectedChapter===0&&elapsed>18&&!adventure.bossDefeated)message+=adventure.grace>0?' · 行人通行':` · ${Math.floor((elapsed-18)/12)%2===0?'南北':'東西'}通行 ${Math.ceil(12-(elapsed-18)%12)}`;
    $('#route-status').textContent=adventure.training?'練習中 · 首領倒數暫停':message;
    $('#boss-phase').textContent=boss?(boss.aiPhase==='recover'?'破綻！傷害提升，現在反擊':boss.aiPhase==='windup'?boss.attackLabel:boss.aiPhase==='attack'?(isFinalBoss(boss)?'全力攻勢！避開紅圈與彈幕':'攻擊中！避開路徑'):boss.volleyWindup>0?'移動射擊蓄力 · 側移避開':'保持距離，觀察蓄力'):'';
  }
  function showRunFeedback(won) {
    $('#result-style').textContent=STYLES[adventure.style]?.name||'自由探索';
    $('#result-build').innerHTML=Object.entries(player.weapons).map(([id,w])=>`<li>${w.evolved?evolutionArt(id,'result-skill-art'):weaponArt(id,'result-skill-art')}<strong>${w.evolved?WEAPONS[id].evo:WEAPONS[id].name}</strong><small>${w.evolved?'進化':`LV.${w.level}`}</small></li>`).join('');
    const passives=Object.entries(player.passives).map(([id,level])=>`${PASSIVES[id].name} LV.${level}`);
    $('#result-passives').textContent=passives.length?`能力：${passives.join(' · ')}`:'';
    $('#result-passives').classList.toggle('hidden',!passives.length);
    $('#result-story').textContent=won?WORLD.specs[selectedChapter].ending:`被${(adventure.lastSource||'怪群').replace('怪群碰撞','怪群').replace(/^首領：(.+)$/,'首領「$1」')}擊倒了。`;
    const advice=adventure.honkCount===0?'下次試試主動嘎叫，能推開怪群與打斷首領蓄力。':adventure.stamps.length<3?'受傷時找紅瓶回血；藍瓶補 EXP，紫罐兩者都有。':adventure.lastSource.includes('首領')?'首領蓄力時先閃避，金色破綻期間再靠近輸出。':'下次試試另一種祝福：健步如飛、平安護身或金蟬脫殼。';
    $('#result-advice').textContent=won?`補給 ${adventure.supplyCount} · 主動嘎叫 ${adventure.honkCount} · 打斷 ${adventure.interrupts}`:advice;
  }

  const STYLES = {
    runner:{name:'健步如飛',art:'assets/skills-v4/passives-speed.svg',desc:'持續移動蓄勢，羽毛子彈增加穿透與傷害。嘎叫後短暫衝刺並避傷。',tip:'邊走邊打，穿過怪群缺口。'},
    guardian:{name:'平安護身',art:'assets/skills-v4/passives-vitality.svg',desc:'站穩 0.8 秒獲得一次護盾，每 8 秒可再生。嘎叫推得更遠。',tip:'找空檔站穩，再靠護盾突圍。'},
    trickster:{name:'金蟬脫殼',art:'assets/skills-v4/weapons-crumb.svg',desc:'嘎叫留下 3.5 秒紙鵝誘餌，吸引普通敵人。趁機繞路拾取。',tip:'引開怪群，換一條路。'}
  };
  function renderStyleOptions() {
    $('#upgrade-title').textContent='土地公伯伯的祝福';
    $('#upgrade-hint').textContent='三選一，保庇 Goo 這趟平安！祝福只在本局生效。';
    $('#reroll-btn').classList.add('hidden');
    $('#reroll-btn').disabled=true;
    const box=$('#upgrade-options');box.innerHTML='';
    Object.entries(STYLES).forEach(([id,s])=>{
      const b=document.createElement('button');b.className='upgrade-option style-option';
      const brief={runner:'移動強化羽毛子彈<br>嘎叫後衝刺避傷',guardian:'站穩 0.8 秒獲得護盾<br>每 8 秒再生',trickster:'嘎叫留下 3.5 秒誘餌<br>吸引敵人'};
      b.setAttribute('aria-label',s.name+'：'+s.desc);
      b.innerHTML=`${gameArt(s.art,'up-icon')}<h3>${s.name}</h3><p>${brief[id]}</p>`;
      b.addEventListener('click',()=>{adventure.style=id;pendingLevels=Math.max(0,pendingLevels-1);GooAudio.cue('upgrade');$('#upgrade-hint').textContent='選擇一項能力';if(pendingLevels>0)renderUpgradeOptions();else setScreen('playing');if(adventure.training?.step==='blessing')finishTraining(false);updateGuide();showToast(s.tip);updateHud();});
      box.appendChild(b);
    });
  }
  function drawSceneObstacle(o) {
    const {x,y,w,h,kind}=o;
    const r=(a,b,c,d,color)=>{ctx.fillStyle=color;ctx.fillRect(a,b,c,d);};
    r(x+6,y+8,w,h,'rgba(8,24,22,.3)');
    if(kind==='stall'){
      r(x,y,w,h,'#423d2c');r(x+8,y+30,w-16,h-38,'#ae8656');
      for(let i=0;i<6;i++)r(x+i*w/6,y,w/6,32,i%2?'#efddb2':'#558c78');
      for(let i=0;i<5;i++){r(x+18+i*45,y+52,32,24,'#e8bd65');r(x+22+i*45,y+57,24,8,'#8ba556');}
    }else if(kind==='scooter'||kind==='bike'){
      const cy=y+h/2;ctx.strokeStyle='#152b2a';ctx.lineWidth=8;
      for(const cx of [x+23,x+w-23]){ctx.beginPath();ctx.arc(cx,cy,20,0,TAU);ctx.stroke();}
      ctx.strokeStyle=kind==='bike'?'#e3be64':'#8bb6a5';ctx.lineWidth=kind==='bike'?5:17;ctx.beginPath();ctx.moveTo(x+23,cy);ctx.lineTo(x+w/2,cy-18);ctx.lineTo(x+w-23,cy);ctx.lineTo(x+w/2,cy+14);ctx.closePath();ctx.stroke();
      r(x+w/2-21,cy-29,42,12,'#243b3b');r(x+w-30,cy-34,7,30,'#e0d6af');r(x+w-44,cy-38,31,6,'#293c36');
    }else if(kind==='cargo'){
      r(x,y,w,h,'#79613d');for(let j=0;j<2;j++)for(let i=0;i<2;i++){r(x+5+i*w/2,y+5+j*h/2,w/2-10,h/2-10,'#c2975d');r(x+w/4-3+i*w/2,y+5+j*h/2,8,h/2-10,'#efd19b');}
    }else if(kind==='desk'){
      r(x,y,w,h,'#394e4a');r(x+5,y+5,w-10,h-15,'#c6a87b');
      for(let i=0;i<2;i++){r(x+22+i*115,y+18,70,44,'#253c3e');r(x+28+i*115,y+23,58,30,'#7ab1b2');r(x+48+i*115,y+63,16,12,'#405251');r(x+30+i*115,y+82,58,18,'#eee3bd');}
      r(x+114,y+5,6,h-15,'#7b8f84');
    }else if(kind==='counter'){
      r(x,y,w,h,'#57776c');r(x+5,y+5,w-10,h-12,'#e0d7b7');r(x+18,y+13,68,50,'#719699');r(x+100,y+13,46,50,'#384c49');r(x+109,y+25,28,23,'#c8af79');r(x+w-72,y+13,53,49,'#899c8e');
    }else if(kind==='toilet'){
      r(x,y,w,h,'#d3e0d1');r(x+12,y+9,w-24,28,'#eef0dc');ctx.fillStyle='#f6f5e7';ctx.beginPath();ctx.ellipse(x+w/2,y+72,30,29,0,0,TAU);ctx.fill();ctx.fillStyle='#88b4ad';ctx.beginPath();ctx.ellipse(x+w/2,y+72,17,18,0,0,TAU);ctx.fill();
    }else {r(x,y,w,h,'#d1d2bd');r(x+4,y+4,Math.max(3,w-8),Math.max(3,h-8),'#8da199');}
  }

  function drawStageGeometry() {
    const index=selectedChapter,spec=WORLD.specs[index],b=WORLD.localBounds(index,camera.y);
    ctx.fillStyle='#102b2a';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.translate(-camera.x+width/2,-camera.y+height/2);
    ctx.fillStyle=currentChapter().theme.ground;ctx.fillRect(b[0],b[1],b[2]-b[0],b[3]-b[1]);
    if(index===0){
      ctx.fillStyle='#29464a';ctx.fillRect(-860,-220,1720,440);ctx.fillRect(-220,-860,440,1720);
      ctx.fillStyle='#deead5';
      for(let i=-4;i<=4;i++) {ctx.fillRect(i*38-10,-360,20,110);ctx.fillRect(i*38-10,250,20,110);ctx.fillRect(-360,i*38-10,110,20);ctx.fillRect(250,i*38-10,110,20);}
    } else if(index===2){
      ctx.fillStyle='#344c4d';ctx.beginPath();ctx.arc(0,0,740,0,TAU);ctx.fill();
      ctx.strokeStyle='#d8cb80';ctx.lineWidth=4;ctx.setLineDash([28,28]);ctx.beginPath();ctx.arc(0,0,530,0,TAU);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#254934';ctx.beginPath();ctx.arc(0,0,320,0,TAU);ctx.fill();ctx.strokeStyle='#769362';ctx.lineWidth=10;ctx.stroke();
      for(let i=0;i<12;i++){const a=i*TAU/12;ctx.fillStyle=i%2?'#416647':'#547c51';ctx.fillRect(Math.cos(a)*240-24,Math.sin(a)*240-24,48,48);}
    } else if(index===3){
      ctx.fillStyle='#697063';ctx.fillRect(-300,-1000,600,2000);
      for(let y=-1000;y<1000;y+=64)for(let x=-300;x<300;x+=64){ctx.fillStyle=((y+1000)/64+Math.floor((x+300)/64))%2?'#858875':'#92937f';ctx.fillRect(x+2,y+2,60,60);}
      ctx.fillStyle='#d5c795';ctx.fillRect(274,-1000,26,2000);
      for(let y=-980;y<1000;y+=280){
        ctx.fillStyle='#163b37';ctx.fillRect(-340,y,55,230);ctx.fillStyle='#dcce9b';ctx.fillRect(-337,y+10,43,150);
        ctx.fillStyle='#ed9b55';ctx.fillRect(-337,y+175,43,22);ctx.fillStyle='#58967b';ctx.fillRect(-337,y+202,43,14);
      }
    } else if(index===4){
      ctx.fillStyle='#647574';ctx.fillRect(...[b[0],b[1],1900,1400]);
      for(let y=-700;y<700;y+=80)for(let x=-950;x<950;x+=80){ctx.fillStyle=((x+950)/80+(y+700)/80)%2?'#6c7d7c':'#728280';ctx.fillRect(x+1,y+1,78,78);}
      ctx.fillStyle='#c0b89a';ctx.fillRect(-950,-700,450,460);ctx.fillStyle='#97b8b0';ctx.fillRect(454,-700,496,440);
      ctx.strokeStyle='#d2d2bd';ctx.lineWidth=14;ctx.strokeRect(-950,-700,1900,1400);
      ctx.fillStyle='#213e36';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText('茶水間',-730,-310);ctx.fillText('廁所',700,-325);
      ctx.fillStyle='#d4ebba';ctx.fillRect(750,-706,120,20);ctx.fillStyle='#213e36';ctx.fillText('EXIT',810,-653);
    } else if(index===5){
      const top=camera.y-height/2-80,bottom=camera.y+height/2+80;
      ctx.fillStyle='#285d73';ctx.fillRect(-700,top,400,bottom-top);
      for(let y=Math.floor(top/120)*120;y<bottom;y+=120){ctx.fillStyle='#4e8190';ctx.fillRect(-600,y,160,4);ctx.fillRect(-395,y+48,60,3);}
      ctx.fillStyle='#577a43';ctx.fillRect(300,top,400,bottom-top);
      for(let y=Math.floor(top/110)*110;y<bottom;y+=110){ctx.fillStyle='#8d9e55';ctx.fillRect(340,y,9,14);ctx.fillRect(560,y+50,12,12);}
      ctx.fillStyle='#48575b';ctx.fillRect(-300,top,600,bottom-top);ctx.fillStyle='#c9c6a0';ctx.fillRect(-306,top,8,bottom-top);ctx.fillRect(298,top,8,bottom-top);
      for(let y=Math.floor(top/100)*100;y<bottom;y+=100)ctx.fillRect(-3,y,6,42);
    } else if(index===6){
      ctx.fillStyle='#aa8054';ctx.fillRect(-760,-760,1520,1520);
      ctx.strokeStyle='#8f6945';ctx.lineWidth=2;for(let y=-750;y<760;y+=36){ctx.beginPath();ctx.moveTo(-760,y);ctx.lineTo(760,y);ctx.stroke();}
      ctx.fillStyle='#347366';ctx.fillRect(-550,-650,1100,1300);ctx.strokeStyle='#f3edd6';ctx.lineWidth=5;
      ctx.strokeRect(-550,-650,1100,1300);ctx.strokeRect(-465,-650,930,1300);ctx.strokeRect(-550,-540,1100,1080);
      for(const y of [-210,0,210]){ctx.beginPath();ctx.moveTo(-550,y);ctx.lineTo(550,y);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(0,-650);ctx.lineTo(0,-210);ctx.moveTo(0,210);ctx.lineTo(0,650);ctx.stroke();
      ctx.fillStyle='#203b3b';ctx.fillRect(-720,-720,1440,20);ctx.fillRect(-720,700,1440,20);
    }
    for(const o of WORLD.obstacles(index,elapsed,adventure.grace||0,camera.y)){
      if(o.kind){drawSceneObstacle(o);continue;}
      const gate=o.w<35||o.h<35;
      ctx.fillStyle=gate?'#c97049':'#183e39';ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.strokeStyle=gate?'#ffda88':'#719380';ctx.lineWidth=3;ctx.strokeRect(o.x,o.y,o.w,o.h);
      if(!gate){ctx.fillStyle='#d7bc74';const rows=Math.min(6,Math.floor(o.h/80)),cols=Math.min(6,Math.floor(o.w/90));for(let i=0;i<rows;i++)for(let j=0;j<cols;j++)ctx.fillRect(o.x+25+j*90,o.y+22+i*80,25,24);}
    }
    if(index===0){
      const vertical=Math.floor(Math.max(0,elapsed-18)/12)%2===0;
      const open=adventure.grace>0||elapsed<18;
      for(const [x,y,isVertical] of [[-208,-208,true],[208,208,true],[-208,208,false],[208,-208,false]]){
        ctx.fillStyle='#09201c';ctx.fillRect(x-12,y-28,24,56);ctx.fillStyle=open||(isVertical===vertical)?'#bafb77':'#ff725d';ctx.fillRect(x-7,y-19,14,14);
        ctx.fillStyle='#f4edcf';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(open?'GO':isVertical===vertical?'↑':'×',x,y+16);
      }
    }
    ctx.restore();
  }
  // Crisp pixel bottle, shared with the world's existing canvas art.
  function drawSupplyBottle(x,y,phase=0,kind='heal') {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,22,19,6,0,0,TAU);ctx.fill();
    ctx.translate(0,Math.round(Math.sin(elapsed*2+phase)*3));
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    // Dark silhouette, amber stopper, pale glass, and ruby liquid.
    r(-9,-27,18,16,'#142e29');r(-15,-13,30,5,'#142e29');r(-21,-8,42,28,'#142e29');r(-16,20,32,5,'#142e29');
    r(-6,-24,12,7,'#c8995e');r(-6,-24,9,3,'#f0d398');r(-6,-16,12,8,'#d9eee2');
    r(-12,-9,24,4,'#d9eee2');r(-17,-5,34,23,'#b9d8ca');r(-13,18,26,3,'#87b8a5');
    const colors=kind==='xp'?['#225aa4','#499eee','#a0e7ff']:kind==='both'?['#714093','#ae70d2','#e6b4f5']:['#b83145','#ed5961','#ff9b8d'];
    r(-14,0,28,16,colors[0]);r(-14,0,24,11,colors[1]);r(-10,1,6,5,colors[2]);
    r(-14,-5,4,8,'#f7fff1');
    if(kind==='xp'){ctx.fillStyle='#fff3d9';ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(7,8);ctx.lineTo(0,16);ctx.lineTo(-7,8);ctx.fill();}
    else {r(-3,3,6,11,'#fff3d9');r(-7,6,14,5,'#fff3d9');if(kind==='both'){r(-13,-29,26,6,'#dcbce7');r(11,12,4,4,'#fff3d9');}}
    ctx.restore();
  }

  function drawBlessing() {
    if(adventure.training&&adventure.training.step!=='blessing')return;
    if(!adventure.blessing||adventure.blessingClaimed)return;
    const q=worldToScreen(adventure.blessing.x,adventure.blessing.y);
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#18372e';ctx.fillRect(q.x-26,q.y+12,52,12);
    if(blessingSprite.complete&&blessingSprite.naturalWidth)ctx.drawImage(blessingSprite,q.x-40,q.y-70,80,88);
    ctx.fillStyle='#18372eef';ctx.fillRect(q.x-45,q.y-96,90,21);ctx.fillRect(q.x-40,q.y+26,80,19);
    ctx.textAlign='center';ctx.font='bold 13px sans-serif';ctx.fillStyle='#f3d185';ctx.fillText('土地公伯伯',q.x,q.y-81);
    ctx.font='bold 11px sans-serif';ctx.fillStyle='#fff2cf';ctx.fillText('靠近領祝福',q.x,q.y+39);
    if(q.x<45||q.x>width-45||q.y<190||q.y>height-145){
      const x=clamp(q.x,52,width-52),y=clamp(q.y,200,height-155),angle=Math.atan2(q.y-height/2,q.x-width/2);
      ctx.translate(x,y);ctx.save();ctx.rotate(angle);ctx.fillStyle='#f3d185';ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();ctx.fillText('祝福',0,24);
    }
    ctx.restore();
  }
  function drawAdventure() {
    if(runMode!=='test') {
      const spec=WORLD.specs[selectedChapter];
      drawBlessing();
      const stations=WORLD.supplies(selectedChapter,player.y);
      stations.forEach(({x,y,key:i})=>{
        const v=worldToScreen(x,y),remaining=supplyReadyTime(i)-elapsed;
        if(remaining>0){
          ctx.strokeStyle='#506d62';ctx.lineWidth=3;ctx.beginPath();ctx.arc(v.x,v.y,16,0,TAU);ctx.stroke();
          ctx.strokeStyle='#a7d59d';ctx.beginPath();ctx.arc(v.x,v.y,16,-Math.PI/2,-Math.PI/2+TAU*(1-remaining/45));ctx.stroke();
          if(selectedChapter===5){ctx.fillStyle='#a7b9ac';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(`補給 ${Math.ceil(remaining)}s`,v.x,v.y+32);}
          return;
        }
        drawSupplyBottle(v.x,v.y,typeof i==='number'?i:y/600,'both');
      });
      for(const p of adventure.randomSupplies){const v=worldToScreen(p.x,p.y);drawSupplyBottle(v.x,v.y,0,p.kind);}
      const supplies=[...stations.filter(p=>supplyReadyTime(p.key)<=elapsed).map(p=>[p.x,p.y]),...adventure.randomSupplies.map(p=>[p.x,p.y])];
      supplies.sort((a,b)=>Math.hypot(a[0]-player.x,a[1]-player.y)-Math.hypot(b[0]-player.x,b[1]-player.y));
      const goal=supplies[0];
      if(goal){const q=worldToScreen(...goal);if(q.x<40||q.x>width-40||q.y<120||q.y>height-130){
        const x=clamp(q.x,32,width-32),y=clamp(q.y,140,height-145),a=Math.atan2(q.y-height/2,q.x-width/2);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#ffe3a0';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-7,-9);ctx.lineTo(-7,9);ctx.closePath();ctx.fill();ctx.restore();
      }}
      if(adventure.hazard){const h=adventure.hazard,q=worldToScreen(h.x,h.y),warn=elapsed-h.start<2;ctx.fillStyle=warn?'rgba(255,211,98,.12)':'rgba(255,91,73,.35)';ctx.strokeStyle=warn?'#ffd761':'#ff735e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(q.x,q.y,130,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#fff2ce';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText(warn?'羽球落點！':'爆發！',q.x,q.y+45);ctx.fillStyle='#fff0cf';ctx.beginPath();ctx.moveTo(q.x-16,q.y-28);ctx.lineTo(q.x+16,q.y-28);ctx.lineTo(q.x+6,q.y);ctx.lineTo(q.x-6,q.y);ctx.fill();ctx.fillStyle='#e1a151';ctx.fillRect(q.x-6,q.y,12,8);}
    }
    if(adventure.decoy){const d=adventure.decoy,q=worldToScreen(d.x,d.y);ctx.save();ctx.globalAlpha=.65;ctx.drawImage(gooSprite,q.x-32,q.y-50,64,64);ctx.restore();ctx.fillStyle='#d7f593';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('紙鵝',q.x,q.y+23);}
    for(const e of enemies){
      const q=worldToScreen(e.x,e.y);
      if(enemyMoveMultiplier(e)<1){ctx.strokeStyle='#8ed8e6';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y+e.radius*.5,e.radius+4,6,0,0,TAU);ctx.stroke();}
      if(e.aiPhase==='recover'&&e.boss){ctx.strokeStyle='#ffe085';ctx.lineWidth=4;ctx.beginPath();ctx.arc(q.x,q.y,e.radius+12,0,TAU);ctx.stroke();}
      if(e.boss&&e.volleyWindup>0&&e.aiPhase==='stalk'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(e.volleyAngle);ctx.strokeStyle='#ffd58b';ctx.lineWidth=3;ctx.setLineDash([9,7]);ctx.beginPath();ctx.moveTo(e.radius,0);ctx.lineTo(400,0);ctx.stroke();ctx.restore();}
      if(e.aiPhase==='windup'&&e.boss){
        ctx.save();ctx.translate(q.x,q.y);ctx.strokeStyle='#ff9876';ctx.fillStyle='rgba(255,106,83,.24)';ctx.lineWidth=3;
        if(['rooster','boar','myna'].includes(e.attackFamily)){ctx.rotate(e.angle);ctx.fillRect(0,-e.radius,520,e.radius*2);ctx.strokeRect(0,-e.radius,520,e.radius*2);ctx.fillStyle='#ffddb8';ctx.beginPath();ctx.moveTo(500,0);ctx.lineTo(465,-18);ctx.lineTo(465,18);ctx.fill();}
        else if(e.attackFamily==='kid'){ctx.beginPath();ctx.arc(0,0,e.attackRadius||280,0,TAU);ctx.fill();ctx.stroke();}
        else {
          ctx.save();ctx.rotate(e.angle);ctx.setLineDash([10,8]);
          const count=e.attackRage?5:3;for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.22;ctx.beginPath();ctx.moveTo(Math.cos(a)*e.radius,Math.sin(a)*e.radius);ctx.lineTo(Math.cos(a)*380,Math.sin(a)*380);ctx.stroke();}
          ctx.restore();ctx.fillStyle='#ffbc8c';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('鼠潮包圍＋彈幕',0,-e.radius-25);
        }
        ctx.restore();
      } else if(e.chargePhase==='warn'){
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(e.chargeAngle);ctx.strokeStyle='#ffbd7b';ctx.lineWidth=4;ctx.setLineDash([10,7]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(220,0);ctx.stroke();ctx.restore();
      }
      if(e.stun>0){ctx.fillStyle='#f9e7a5';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('!',q.x,q.y-e.radius-12);}
    }
  }
  $('#honk-btn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();doHonk();});
  $('#honk-btn').addEventListener('click',e=>{if(e.detail===0)doHonk();});
  $('#settings-btn').addEventListener('click',openSettings);
  $('#build-version').textContent=RELEASE.version;
  $('#settings-version').textContent=`${RELEASE.version} · ${RELEASE.date}`;
  $('#release-notes').innerHTML=RELEASE.changes.map(([version,note])=>`${version==='v66'?'<h3>早期開發更新</h3>':''}<p><strong>${version}</strong> ${note}</p>`).join('');
  $('#build-version').addEventListener('click',()=>{openSettings();$('.release-notes').open=true;});

  $('#pause-settings-btn').addEventListener('click',openSettings);
  $('#settings-close').addEventListener('click',()=>setScreen(settingsBack));
  for(const k of ['music','sfx'])$('#setting-'+k).addEventListener('input',()=>{settings[k]=Number($('#setting-'+k).value)/100;$('#value-'+k).textContent=Math.round(settings[k]*100)+'%';initAudio();GooAudio.setSettings(settings);storageWrite('goo-settings-v1',JSON.stringify(settings));});
  for(const k of ['shake','haptics','tutorial'])$('#setting-'+k).addEventListener('click',()=>{settings[k]=!settings[k];$('#setting-'+k).setAttribute('aria-pressed',String(settings[k]));$('#setting-'+k).textContent=settings[k]?'開啟':'關閉';storageWrite('goo-settings-v1',JSON.stringify(settings));});
  $('#setting-effects').addEventListener('click',()=>{settings.effects=settings.effects==='low'?'standard':'low';resize();$('#setting-effects').textContent=settings.effects==='low'?'精簡':'標準';storageWrite('goo-settings-v1',JSON.stringify(settings));});

  resetAdventure();
  renderChapterMenu();
  resize();
  requestAnimationFrame(loop);
  window.GooBootReady=true;
})();
