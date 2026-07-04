// ─── CONFIG ─────────────────────────────────────────────
const DEPLOYED_API_BASE = 'https://dr-9dfd56ca90d448ed9551f88cb5aae645.ecs.ap-southeast-2.on.aws';
const API_BASE = /^localhost$|^127\.0\.0\.1$/.test(location.hostname)
  ? 'http://localhost:8080'
  : DEPLOYED_API_BASE;
const SESSION_ID = crypto.randomUUID();

// ─── DOM ────────────────────────────────────────────────
const drawCanvas     = document.getElementById('drawing-canvas');
const blinkCanvas    = document.getElementById('blink-canvas');
const hintEyes       = document.getElementById('hint-eyes');
const eyeLeft        = document.getElementById('eye-left');
const eyeRight       = document.getElementById('eye-right');
const drawCtx        = drawCanvas.getContext('2d');
const blinkCtx       = blinkCanvas.getContext('2d');
const colorHint      = document.getElementById('color-hint');
const toolbar        = document.getElementById('toolbar');
const colorInput     = document.getElementById('color-input');
const colorBtn       = document.getElementById('color-btn');
const undoBtn        = document.getElementById('undo-btn');
const penBtn         = document.getElementById('pen-btn');
const eraserBtn      = document.getElementById('eraser-btn');
const penPopup       = document.getElementById('pen-popup');
const eraserPopup    = document.getElementById('eraser-popup');
const penSlider      = document.getElementById('pen-slider');
const eraserSlider   = document.getElementById('eraser-slider');
const completeBtn    = document.getElementById('complete-btn');
const chatDialog     = document.getElementById('chat-dialog');
const closeChatBtn   = document.getElementById('close-chat-btn');
const chatMsgs       = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const sendBtn        = document.getElementById('send-btn');
const songBtn        = document.getElementById('song-btn');
const cityReveal     = document.getElementById('city-reveal');
const cityRevealImg     = document.getElementById('city-reveal-img');
const cityRevealReason  = document.getElementById('city-reveal-reason');
const cityRevealName    = document.getElementById('city-reveal-name');
const cityRevealWeather = document.getElementById('city-reveal-weather');
const drawHintEl        = document.getElementById('draw-hint');

// ─── STATIC UI STRINGS (by browser language) ────────────
const UI_STRINGS = {
  en: { tagline: 'Draw your current mood! I\'ll pick a song to match it!',
        drawHintMouse: 'Go ahead! draw with your mouse',
        drawHintTouch: 'Go ahead! draw with your finger',
        tapToLock: 'Tap to lock in your color', completed: 'Completed ✓',
        typeHere: 'Type here…', differentVibe: 'Want a different vibe? Tell me…',
        somethingDifferent: 'Want something different? Tell me…',
        rateLabel: 'Rate this pick:',
        playlistIntro: 'Here are 3 playlists — pick whichever vibe fits 🎵',
        readingDrawing: 'Reading your drawing...' },
  'en-US': { tagline: 'Draw your current mood! I\'ll pick a song to match it!',
        drawHintMouse: 'Go ahead! draw with your mouse',
        drawHintTouch: 'Go ahead! draw with your finger',
        tapToLock: 'Tap to lock in your color', completed: 'Completed ✓',
        typeHere: 'Type here…', differentVibe: 'Want a different vibe? Tell me…',
        somethingDifferent: 'Want something different? Tell me…',
        rateLabel: 'Rate this pick:',
        playlistIntro: 'Here are 3 playlists — pick whichever vibe fits 🎵',
        readingDrawing: 'Reading your drawing...' },
  'en-AU': { tagline: 'Draw how you\'re feeling — I\'ll pick a song to match!',
        drawHintMouse: 'Go on! draw with your mouse',
        drawHintTouch: 'Go on! draw with your finger',
        tapToLock: 'Tap to lock in your colour', completed: 'Done ✓',
        typeHere: 'Type here…', differentVibe: 'Want a different vibe? Tell me…',
        somethingDifferent: 'Want something different? Tell me…',
        rateLabel: 'Rate this pick:',
        playlistIntro: 'Here are 3 playlists — pick whichever vibe fits 🎵',
        readingDrawing: 'Reading your drawing...' },
  'zh-TW': { tagline: '畫現在的心情，我挑一首適合的歌給你！',
        drawHintMouse: '試試用滑鼠畫畫看吧',
        drawHintTouch: '試試用手指畫畫看吧',
        tapToLock: '點擊畫面來鎖定顏色', completed: '畫完了~',
        typeHere: '在這裡輸入…', differentVibe: '想換個風格？告訴我…',
        somethingDifferent: '想聽點不一樣的？告訴我…',
        rateLabel: '為我的推薦評分：',
        playlistIntro: '這裡有 3 個歌單，挑個合你心情的吧~ 🎵',
        readingDrawing: '讀取畫作中...' },
  'zh-CN': { tagline: '画下现在的心情，我挑一首合适的歌给你！',
        drawHintMouse: '试试用鼠标画画看吧',
        drawHintTouch: '试试用手指画画看吧',
        tapToLock: '点击画面来锁定颜色', completed: '完成 ✓',
        typeHere: '在这里输入…', differentVibe: '想换个风格？告诉我…',
        somethingDifferent: '想听点不一样的？告诉我…',
        rateLabel: '为我的推荐评分：',
        playlistIntro: '这里有 3 个歌单，挑个合你心情的吧~ 🎵',
        readingDrawing: '读取画作中...' },
  ja: { tagline: '今の気分を描いてね、ぴったりの一曲を選んであげる！',
        drawHintMouse: 'マウスで描いてみてね',
        drawHintTouch: '指で描いてみてね',
        tapToLock: 'タップして色を決定', completed: '完成 ✓',
        typeHere: 'ここに入力…', differentVibe: '違う雰囲気がいい？教えてね…',
        somethingDifferent: '他のも聴きたい？教えてね…',
        rateLabel: 'この曲を評価：',
        playlistIntro: 'プレイリストを3つ用意したよ——好きなのを選んでね 🎵',
        readingDrawing: '作品を読み取っています...' },
  ko: { tagline: '지금 기분을 그려봐요, 어울리는 노래 하나 골라줄게요!',
        drawHintMouse: '마우스로 그려 보세요',
        drawHintTouch: '손가락으로 그려 보세요',
        tapToLock: '탭해서 색을 고정하세요', completed: '완료 ✓',
        typeHere: '여기에 입력…', differentVibe: '다른 분위기를 원해요? 알려주세요…',
        somethingDifferent: '다른 걸 원해요? 알려주세요…',
        rateLabel: '이 곡 평가:',
        playlistIntro: '플레이리스트 3개를 준비했어요 — 마음에 드는 걸 골라보세요 🎵',
        readingDrawing: '그림을 읽는 중...' },
  es: { tagline: 'Dibuja cómo te sientes — te elijo la canción perfecta',
        drawHintMouse: 'Adelante — dibuja con el ratón',
        drawHintTouch: 'Adelante — dibuja con el dedo',
        tapToLock: 'Toca para fijar tu color', completed: 'Listo ✓',
        typeHere: 'Escribe aquí…', differentVibe: '¿Otro rollo? Cuéntame…',
        somethingDifferent: '¿Algo diferente? Cuéntame…',
        rateLabel: 'Valora esta canción:',
        playlistIntro: 'Aquí tienes 3 playlists — elige la que más te guste 🎵',
        readingDrawing: 'Leyendo tu dibujo...' },
  de: { tagline: 'Zeichne deine Stimmung — ich such dir den passenden Song aus!',
        drawHintMouse: 'Los geht\'s — zeichne mit der Maus',
        drawHintTouch: 'Los geht\'s — zeichne mit dem Finger',
        tapToLock: 'Tippen, um deine Farbe festzulegen', completed: 'Fertig ✓',
        typeHere: 'Hier tippen…', differentVibe: 'Lust auf einen anderen Vibe? Sag’s mir…',
        somethingDifferent: 'Etwas anderes? Sag’s mir…',
        rateLabel: 'Bewerte diesen Song:',
        playlistIntro: 'Hier sind 3 Playlists — such dir einen Vibe aus 🎵',
        readingDrawing: 'Deine Zeichnung wird gelesen...' },
  ar: { tagline: 'ارسم مزاجك الآن — سأختار لك أغنية تناسبه!',
        drawHintMouse: 'تفضّل — ارسم بالفأرة',
        drawHintTouch: 'تفضّل — ارسم بإصبعك',
        tapToLock: 'انقر لتثبيت لونك', completed: 'تم ✓',
        typeHere: 'اكتب هنا…', differentVibe: 'تريد أجواء مختلفة؟ أخبرني…',
        somethingDifferent: 'تريد شيئًا مختلفًا؟ أخبرني…',
        rateLabel: 'قيّم هذه الأغنية:',
        playlistIntro: 'إليك 3 قوائم تشغيل — اختر ما يناسب مزاجك 🎵',
        readingDrawing: 'جارٍ قراءة رسمتك...' },
};

function pickUiStrings() {
  const lang = (navigator.language || 'en').toLowerCase();
  if (UI_STRINGS[lang]) return UI_STRINGS[lang];
  if (lang.startsWith('zh')) {
    return /cn|sg|hans/.test(lang) ? UI_STRINGS['zh-CN'] : UI_STRINGS['zh-TW'];
  }
  return UI_STRINGS[lang.split('-')[0]] || UI_STRINGS.en;
}
const UI = pickUiStrings();

document.getElementById('landing-tagline').textContent = UI.tagline;
document.getElementById('landing-tap').textContent     = UI.tapToLock;
completeBtn.textContent = UI.completed;
chatInput.placeholder   = UI.typeHere;

// ─── LANDING EMOJI MARQUEE ──────────────────────────────
const emojiMarquee = document.getElementById('emoji-marquee');

function buildEmojiMarquee() {
  const EMOJI_N = 24;
  emojiMarquee.innerHTML = '';
  const size = Math.round(Math.max(88, Math.min(150, window.innerHeight * 0.14)));
  const gap  = Math.round(size * 0.9);
  const bleedTop    = Math.round(size * 0.45);
  const bleedBottom = Math.round(size * 0.45);
  emojiMarquee.style.setProperty('--bleed-top',    bleedTop + 'px');
  emojiMarquee.style.setProperty('--bleed-bottom', bleedBottom + 'px');
  const span = window.innerHeight + bleedTop + bleedBottom;
  const rows = Math.max(3, Math.round(span / (size * 1.56)));
  const perStrip = Math.ceil(window.innerWidth / (size + gap)) + 2;

  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'emoji-row';
    row.style.setProperty('--dur', (56 + Math.random() * 10).toFixed(1) + 's');
    row.style.animationDelay = (-Math.random() * 60).toFixed(1) + 's';
    const order = [...Array(EMOJI_N).keys()].sort(() => Math.random() - 0.5);
    for (let half = 0; half < 2; half++) {
      const strip = document.createElement('div');
      strip.className = 'emoji-strip';
      strip.style.gap = gap + 'px';
      strip.style.paddingRight = gap + 'px';
      for (let i = 0; i < perStrip; i++) {
        strip.insertAdjacentHTML('beforeend',
          `<svg width="${size}" height="${size}"><use href="emoji-symbols.svg#emoji-${order[i % EMOJI_N] + 1}"/></svg>`);
      }
      row.appendChild(strip);
    }
    emojiMarquee.appendChild(row);
  }
}
buildEmojiMarquee();

function fadeOutEmojiMarquee() {
  emojiMarquee.style.opacity = '0';
  setTimeout(() => { emojiMarquee.style.display = 'none'; }, 750);
}

// ─── LIQUID GLASS REFRACTION (Chromium only) ────────────
// Displacement map: R = x-shift, G = y-shift → #lg-refract backdrop-filter.
(function initLiquidRefraction() {
  const chromium = 'chrome' in window &&
    (CSS.supports('backdrop-filter', 'url(#lg-refract)') ||
     CSS.supports('-webkit-backdrop-filter', 'url(#lg-refract)'));
  if (!chromium) return;
  const W = 480, H = 240;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      img.data[i]     = Math.round(255 * x / (W - 1)); // R → horizontal shift
      img.data[i + 1] = Math.round(255 * y / (H - 1)); // G → vertical shift
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  document.getElementById('lg-map').setAttribute('href', c.toDataURL());
  document.getElementById('landing-card').classList.add('lg-refract');
})();

// ─── CANVAS — reference space + view transform ──────────
// Strokes live in fixed REF_W×REF_H coords; view transform maps them to the window bitmap.
const REF_W = window.innerWidth;
const REF_H = window.innerHeight;
const view  = { s: 1, ox: 0, oy: 0 };

function applyViewTransform(ctx) {
  ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy);
}

function resizeCanvasToWindow() {
  [drawCanvas, blinkCanvas].forEach(c => {
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  });
  view.s  = Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H);
  view.ox = (window.innerWidth  - REF_W * view.s) / 2;
  view.oy = (window.innerHeight - REF_H * view.s) / 2;
  applyViewTransform(drawCtx);
  applyViewTransform(blinkCtx);
}
resizeCanvasToWindow();

// CSS px → reference coords (accounts for chat-open scale + view transform)
function eventToRef(cssX, cssY) {
  const r  = drawCanvas.getBoundingClientRect();
  const px = cssX * (drawCanvas.width  / r.width);
  const py = cssY * (drawCanvas.height / r.height);
  return { x: (px - view.ox) / view.s, y: (py - view.oy) / view.s };
}

// Shrink canvas into the area beside/above the chat dialog.
function layoutMiniCanvas() {
  const portrait = window.innerHeight > window.innerWidth;
  const area = portrait
    ? { w: window.innerWidth,       h: window.innerHeight * 0.35 }
    : { w: window.innerWidth * 0.5, h: window.innerHeight };
  const pad  = 10;
  const cssW = drawCanvas.width, cssH = drawCanvas.height;
  const s    = Math.min((area.w - pad * 2) / cssW, (area.h - pad * 2) / cssH);
  const tx = (area.w - cssW * s) / 2;
  const ty = (area.h - cssH * s) / 2;
  const t  = `translate(${tx}px, ${ty}px) scale(${s})`;
  drawCanvas.style.transform  = t;
  blinkCanvas.style.transform = t;
}

function restoreCanvasLayout() {
  drawCanvas.style.transform  = '';
  blinkCanvas.style.transform = '';
}

// ─── STATE ──────────────────────────────────────────────
let phase        = 'color-select';
let animHue      = Math.random() * 360;
let currentHue   = animHue;
let bgConfirmed  = false;
let penColor     = '#fff';
let isDrawing    = false;
let isErasing    = false;
let lastPoint    = null;
let lastMid      = null;
let idleTimer    = null;
let hasDrawn     = false;
let drawingDataURL = null;
let bgRafId      = null;
let currentBgHex = null;

let chatCount         = 0;
let totalDialogOpens  = 0;
let cityRevealed      = false;
let userResponseCount = 0;

let drawingPhaseStart    = null;
let drawingAccumMs       = 0;
let chatPhaseStart       = null;
let chatAccumMs          = 0;
let dbSessionId          = null;
let lastSongData         = null;

// ─── BEHAVIORAL TELEMETRY ───────────────────────────────
const _bgStartTime = Date.now();
let _lastStrokeEndTime  = null;
let _strokeDrawMs       = 0;
let _strokeStartTime    = null;

const telemetry = {
  colorLockTime:    null,
  colorAdjustments: 0,
  penSizeChanges:   0,
  drawDurationSec:  0,
  totalStrokes:     0,
  undoCount:        0,
  eraserStrokes:    0,
  drawingCoverage:  0,
  idleGaps:         0,
  sessionOpenCount: 0,
  browserLanguage:  navigator.language || null,
};

// ─── PEN / ERASER SIZE ──────────────────────────────────
function calcBasePenWidth() {
  return Math.max(4, Math.min(REF_W, REF_H) / 50);
}
let basePenWidth = calcBasePenWidth();

const SIZE_MIN = 0.3, SIZE_MAX = 5.0;
let penSizeRaw    = 1.0;
let eraserSizeRaw = 2.0;

function penWidth()    { return Math.max(1, basePenWidth * penSizeRaw); }
function eraserWidth() { return Math.max(4, basePenWidth * eraserSizeRaw); }
function rawToSlider(r) { return Math.round((r - SIZE_MIN) / (SIZE_MAX - SIZE_MIN) * 100); }
function sliderToRaw(v) { return SIZE_MIN + (v / 100) * (SIZE_MAX - SIZE_MIN); }

penSlider.value    = rawToSlider(penSizeRaw);
eraserSlider.value = rawToSlider(eraserSizeRaw);

// ─── STROKE HISTORY ─────────────────────────────────────
let strokes       = [];
let currentStroke = null;
const MAX_UNDO    = 10;
const undoStack   = [];

let eyeDrawnLeftLen  = 0;
let eyeDrawnRightLen = 0;

// ─── RENDER ─────────────────────────────────────────────
function setupLineCtx(color, width) {
  drawCtx.globalCompositeOperation = 'source-over';
  drawCtx.strokeStyle = color;
  drawCtx.fillStyle   = color;
  drawCtx.lineWidth   = width;
  drawCtx.lineCap     = 'round';
  drawCtx.lineJoin    = 'round';
}

function renderStroke(s) {
  if (s.type === 'eraser') {
    drawCtx.globalCompositeOperation = 'destination-out';
    drawCtx.strokeStyle = 'rgba(0,0,0,1)';
    drawCtx.fillStyle   = 'rgba(0,0,0,1)';
    drawCtx.lineWidth   = s.width;
    drawCtx.lineCap = 'round'; drawCtx.lineJoin = 'round';
  } else {
    setupLineCtx(penColor, penWidth());
  }
  const pts = s.points;
  if (!pts || pts.length === 0) return;
  if (pts.length === 1) {
    drawCtx.beginPath();
    drawCtx.arc(pts[0].x, pts[0].y, drawCtx.lineWidth / 2, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.globalCompositeOperation = 'source-over';
    return;
  }
  drawCtx.beginPath();
  drawCtx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mid = { x: (pts[i].x + pts[i+1].x) / 2, y: (pts[i].y + pts[i+1].y) / 2 };
    drawCtx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
  }
  drawCtx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  drawCtx.stroke();
  drawCtx.globalCompositeOperation = 'source-over';
}

function redrawAll() {
  drawCtx.setTransform(1, 0, 0, 1, 0, 0);
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  applyViewTransform(drawCtx);
  if (eyeDrawnLeftLen > 0 || eyeDrawnRightLen > 0) {
    setupLineCtx(penColor, penWidth());
    drawEyeFull(eyeLeft,  eyeDrawnLeftLen);
    drawEyeFull(eyeRight, eyeDrawnRightLen);
  }
  for (const s of strokes) renderStroke(s);
  drawCtx.globalCompositeOperation = 'source-over';
}

window.addEventListener('resize', () => {
  stopHintAnimation();
  if (phase === 'color-select') buildEmojiMarquee();
  if (document.body.classList.contains('chat-open')) {
    layoutMiniCanvas();
  } else {
    resizeCanvasToWindow();
  }
  closeAllPopups();
  redrawAll();
});

// ─── COLOUR UTILITIES ───────────────────────────────────
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0)*255, f(8)*255, f(4)*255];
}
function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s * 100, l * 100];
}
function getLuminance(r, g, b) {
  return [r,g,b].reduce((s,c,i) => {
    const v = c/255, lin = v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    return s + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function updatePenFromRgb(r, g, b) {
  const isDark   = getLuminance(r,g,b) <= 0.25;
  const newColor = isDark ? '#fff' : '#000';

  document.body.style.setProperty('--pen-color',        newColor);
  document.body.style.setProperty('--bubble-bg',        isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)');
  document.body.style.setProperty('--bubble-bg-strong', isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.18)');
  document.body.style.setProperty('--pen-color-faint',  isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)');

  if (newColor !== penColor) {
    penColor = newColor;
    if (phase === 'drawing') redrawAll();
  }
}

// ─── BACKGROUND ─────────────────────────────────────────
let bgStops = ['#888', '#888'];

function setBackground(c1, c2) {
  bgStops = [c1, c2];
  const bg = `linear-gradient(135deg, ${c1}, ${c2})`;
  document.body.style.background = bg;
  document.documentElement.style.background = bg;
}

function applyHueBg(h) {
  const h2 = (h + 55) % 360;
  setBackground(`hsl(${h},65%,50%)`, `hsl(${h2},65%,44%)`);
  updatePenFromRgb(...hslToRgb(h, 65, 50));
}
function startBgAnimation() {
  function tick() {
    if (bgConfirmed) return;
    animHue = (animHue + 1.1) % 360;
    currentHue = animHue;
    applyHueBg(animHue);
    bgRafId = requestAnimationFrame(tick);
  }
  tick();
}
startBgAnimation();

// ─── PHASE 1: CONFIRM COLOUR ────────────────────────────
document.body.addEventListener('click', e => {
  if (phase !== 'color-select') return;
  bgConfirmed = true;
  telemetry.colorLockTime = Math.round((Date.now() - _bgStartTime) / 100) / 10;
  cancelAnimationFrame(bgRafId);
  phase = 'drawing';
  drawingPhaseStart = Date.now();
  colorHint.style.opacity = '0';
  setTimeout(() => { colorHint.style.display = 'none'; }, 400);
  fadeOutEmojiMarquee();
  toolbar.style.display = 'flex';
  setTimeout(startHintAnimation, 350);
});

colorInput.addEventListener('input', e => {
  currentBgHex = e.target.value;
  const [h, s, l] = hexToHsl(currentBgHex);
  const c2 = `hsl(${Math.round((h + 30) % 360)}, ${Math.round(s)}%, ${Math.round(Math.max(0, l - 8))}%)`;
  setBackground(currentBgHex, c2);
  updatePenFromRgb(...hexToRgb(currentBgHex));
  if (phase === 'drawing') telemetry.colorAdjustments++;
});

// ─── EYE HINT ───────────────────────────────────────────
let eyeAnimId    = null;
let eyeAnimFrame = 0;
const EYE_FRAMES = 40;
const EYE_GAP    = 5;

// SVG point → reference coords via getScreenCTM()
function svgPtToCanvas(pt) {
  const sp = hintEyes.createSVGPoint();
  sp.x = pt.x; sp.y = pt.y;
  const vp   = sp.matrixTransform(hintEyes.getScreenCTM());
  const rect = drawCanvas.getBoundingClientRect();
  return eventToRef(vp.x - rect.left, vp.y - rect.top);
}

function drawEyeFull(pathEl, totalLen) {
  if (totalLen <= 0) return;
  const samples = Math.ceil(totalLen / 3);
  const step    = totalLen / samples;
  drawCtx.beginPath();
  const p0 = svgPtToCanvas(pathEl.getPointAtLength(0));
  drawCtx.moveTo(p0.x, p0.y);
  for (let i = 1; i <= samples; i++) {
    const p = svgPtToCanvas(pathEl.getPointAtLength(Math.min(i * step, totalLen)));
    drawCtx.lineTo(p.x, p.y);
  }
  drawCtx.stroke();
}

// Sample SVG path into a pen stroke in reference coords
function bakeEyeStroke(pathEl, totalLen) {
  if (totalLen <= 0) return null;
  const samples = Math.ceil(totalLen / 3);
  const step    = totalLen / samples;
  const points  = [];
  for (let i = 0; i <= samples; i++) {
    points.push(svgPtToCanvas(pathEl.getPointAtLength(Math.min(i * step, totalLen))));
  }
  return { type: 'pen', points };
}

function drawPathSegment(pathEl, fromLen, toLen) {
  if (toLen - fromLen < 0.5) return;
  const samples = Math.ceil((toLen - fromLen) / 3);
  const step    = (toLen - fromLen) / samples;
  drawCtx.beginPath();
  const p0 = svgPtToCanvas(pathEl.getPointAtLength(fromLen));
  drawCtx.moveTo(p0.x, p0.y);
  for (let i = 1; i <= samples; i++) {
    const p = svgPtToCanvas(pathEl.getPointAtLength(fromLen + i * step));
    drawCtx.lineTo(p.x, p.y);
  }
  drawCtx.stroke();
}

function animateEyeOnCanvas() {
  const leftLen     = eyeLeft.getTotalLength();
  const rightLen    = eyeRight.getTotalLength();
  const rightStart  = EYE_FRAMES + EYE_GAP;
  const totalFrames = rightStart + EYE_FRAMES;

  setupLineCtx(penColor, penWidth());

  if (eyeAnimFrame <= EYE_FRAMES) {
    const newLen = leftLen * (eyeAnimFrame / EYE_FRAMES);
    drawPathSegment(eyeLeft, eyeDrawnLeftLen, newLen);
    eyeDrawnLeftLen = newLen;
  }
  if (eyeAnimFrame >= rightStart) {
    const rightFrame = eyeAnimFrame - rightStart;
    const newLen = rightLen * (rightFrame / EYE_FRAMES);
    drawPathSegment(eyeRight, eyeDrawnRightLen, newLen);
    eyeDrawnRightLen = newLen;
  }

  if (eyeAnimFrame < totalFrames) {
    eyeAnimFrame++;
    eyeAnimId = requestAnimationFrame(animateEyeOnCanvas);
  } else {
    eyeAnimId = null;
    saveUndo();
    const ls = bakeEyeStroke(eyeLeft,  eyeDrawnLeftLen);
    const rs = bakeEyeStroke(eyeRight, eyeDrawnRightLen);
    if (ls) strokes.push(ls);
    if (rs) strokes.push(rs);
    eyeDrawnLeftLen = 0; eyeDrawnRightLen = 0;
    eyeStrokes = [ls, rs].filter(Boolean);
    schedulePostEyeSequence();
  }
}

function startHintAnimation() {
  eyeAnimFrame = 0; eyeDrawnLeftLen = 0; eyeDrawnRightLen = 0;
  eyeAnimId = requestAnimationFrame(animateEyeOnCanvas);
}

function stopHintAnimation() {
  if (eyeAnimId) {
    cancelAnimationFrame(eyeAnimId); eyeAnimId = null;
    if (eyeDrawnLeftLen > 0 || eyeDrawnRightLen > 0) {
      const ls = bakeEyeStroke(eyeLeft,  eyeDrawnLeftLen);
      const rs = bakeEyeStroke(eyeRight, eyeDrawnRightLen);
      if (ls) strokes.push(ls);
      if (rs) strokes.push(rs);
      eyeDrawnLeftLen = 0; eyeDrawnRightLen = 0;
    }
  }
}

// ─── DRAW HINT + BLINK ──────────────────────────────────
const DRAW_HINT_DELAY_MS   = 1500;
const FIRST_BLINK_DELAY_MS = 3000;
const BLINK_INTERVAL_MIN   = 2000;
const BLINK_INTERVAL_MAX   = 4000;

let drawHintTimer  = null;
let firstBlinkTimer = null;

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function showDrawHint() {
  if (hasDrawn || phase !== 'drawing') return;
  drawHintEl.textContent = isTouchDevice() ? UI.drawHintTouch : UI.drawHintMouse;
  drawHintEl.style.visibility = 'visible';
  drawHintEl.style.opacity = '1';
}

function fadeOutDrawHint() {
  drawHintEl.style.opacity = '0';
  setTimeout(() => {
    if (drawHintEl.style.opacity === '0') drawHintEl.style.visibility = 'hidden';
  }, 400);
}

function clearDrawHintTimers(hideHint = true) {
  clearTimeout(drawHintTimer);  drawHintTimer  = null;
  clearTimeout(firstBlinkTimer); firstBlinkTimer = null;
  if (hideHint) fadeOutDrawHint();
}

function schedulePostEyeSequence() {
  if (hasDrawn || phase !== 'drawing') return;
  clearDrawHintTimers(false);
  drawHintTimer = setTimeout(showDrawHint, DRAW_HINT_DELAY_MS);
  firstBlinkTimer = setTimeout(() => {
    firstBlinkTimer = null;
    if (hasDrawn || phase !== 'drawing' || eyeStrokes.length === 0) return;
    blinkEyes();
  }, FIRST_BLINK_DELAY_MS);
}

// ─── BLINK ──────────────────────────────────────────────
// Squash eye strokes vertically: 100% → 30% → 100% (double cycle via |sin(2πt)|).
let blinkTimer  = null;
let blinkRafId  = null;
let eyeStrokes  = [];

function blinkEyes() {
  if (hasDrawn || phase !== 'drawing' || eyeStrokes.length === 0) return;
  const centers = eyeStrokes.map(s => {
    let minY = Infinity, maxY = -Infinity;
    for (const p of s.points) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return (minY + maxY) / 2;
  });
  const DUR   = 600;
  const start = performance.now();

  const step = now => {
    const t = Math.min(1, (now - start) / DUR);
    const k = 1 - 0.7 * Math.abs(Math.sin(2 * Math.PI * t));
    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    applyViewTransform(drawCtx);
    for (const s of strokes) {
      const i = eyeStrokes.indexOf(s);
      if (i === -1) { renderStroke(s); continue; }
      const cy = centers[i];
      renderStroke({ ...s, points: s.points.map(p => ({ x: p.x, y: cy + (p.y - cy) * k })) });
    }
    if (t < 1) {
      blinkRafId = requestAnimationFrame(step);
    } else {
      blinkRafId = null;
      scheduleBlink();
    }
  };
  blinkRafId = requestAnimationFrame(step);
}

function scheduleBlink() {
  if (hasDrawn || phase !== 'drawing') return;
  blinkTimer = setTimeout(blinkEyes,
    BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN));
}

function stopBlink() {
  clearTimeout(blinkTimer); blinkTimer = null;
  clearDrawHintTimers();
  if (blinkRafId) {
    cancelAnimationFrame(blinkRafId); blinkRafId = null;
    redrawAll();
  }
}

// ─── TOOLBAR ────────────────────────────────────────────
function closeAllPopups() {
  penPopup.style.display = 'none';
  eraserPopup.style.display = 'none';
}

function positionPopup(popup, btn) {
  const rect = btn.getBoundingClientRect();
  const isLandscape = window.innerWidth >= window.innerHeight;
  if (isLandscape) {
    popup.style.top    = Math.round(rect.top + rect.height / 2 - 18) + 'px';
    popup.style.left   = Math.round(rect.left - 172) + 'px';
    popup.style.bottom = 'auto';
  } else {
    popup.style.bottom = Math.round(window.innerHeight - rect.top + 12) + 'px';
    popup.style.left   = Math.round(rect.left + rect.width / 2 - 80) + 'px';
    popup.style.top    = 'auto';
  }
}

function togglePopup(popup, btn) {
  const open = popup.style.display === 'flex';
  closeAllPopups();
  if (!open) { popup.style.display = 'flex'; positionPopup(popup, btn); }
}

colorBtn.addEventListener('click', e => { e.stopPropagation(); closeAllPopups(); });
undoBtn.addEventListener('click',  e => { e.stopPropagation(); closeAllPopups(); undo(); });

penBtn.addEventListener('click', e => {
  e.stopPropagation();
  isErasing = false;
  eraserBtn.classList.remove('active'); penBtn.classList.add('active');
  togglePopup(penPopup, penBtn);
});

eraserBtn.addEventListener('click', e => {
  e.stopPropagation();
  isErasing = true;
  penBtn.classList.remove('active'); eraserBtn.classList.add('active');
  togglePopup(eraserPopup, eraserBtn);
});

document.addEventListener('click', () => closeAllPopups());
penPopup.addEventListener('click',    e => e.stopPropagation());
eraserPopup.addEventListener('click', e => e.stopPropagation());

// ─── SIZE SLIDERS ───────────────────────────────────────
penSlider.addEventListener('input', () => {
  penSizeRaw = sliderToRaw(parseInt(penSlider.value));
  telemetry.penSizeChanges++;
  redrawAll();
});

eraserSlider.addEventListener('input', () => {
  eraserSizeRaw = sliderToRaw(parseInt(eraserSlider.value));
});

// ─── UNDO ───────────────────────────────────────────────
function saveUndo() {
  undoStack.push(strokes.map(s => ({ ...s, points: [...s.points] })));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}
function undo() {
  if (!undoStack.length) return;
  strokes = undoStack.pop();
  telemetry.undoCount++;
  redrawAll();
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

// ─── DRAWING ────────────────────────────────────────────
function getPos(e) {
  if (e.touches && e.touches.length > 0) {
    const rect = drawCanvas.getBoundingClientRect();
    return eventToRef(e.touches[0].clientX - rect.left,
                      e.touches[0].clientY - rect.top);
  }
  return eventToRef(e.offsetX, e.offsetY);
}

function pointerDown(e) {
  if (phase !== 'drawing') return;
  closeAllPopups(); stopBlink();
  saveUndo();
  stopHintAnimation();
  hideCompleteBtn();

  if (_lastStrokeEndTime && (Date.now() - _lastStrokeEndTime) > 5000) {
    telemetry.idleGaps++;
  }
  _strokeStartTime = Date.now();

  const pos = getPos(e);
  currentStroke = {
    type: isErasing ? 'eraser' : 'pen',
    points: [{ x: pos.x, y: pos.y }],
    width: isErasing ? eraserWidth() : 0,
  };

  const w = isErasing ? eraserWidth() : penWidth();
  drawCtx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
  drawCtx.fillStyle = isErasing ? 'rgba(0,0,0,1)' : penColor;
  drawCtx.lineWidth = w; drawCtx.lineCap = 'round';
  drawCtx.beginPath();
  drawCtx.arc(pos.x, pos.y, w / 2, 0, Math.PI * 2);
  drawCtx.fill();
  drawCtx.globalCompositeOperation = 'source-over';

  isDrawing = true; lastPoint = pos; lastMid = null;
  e.preventDefault();
}

function pointerMove(e) {
  if (!isDrawing || phase !== 'drawing') return;
  const cur = getPos(e);
  currentStroke.points.push({ x: cur.x, y: cur.y });

  const mid = { x: (lastPoint.x + cur.x) / 2, y: (lastPoint.y + cur.y) / 2 };
  const w   = isErasing ? eraserWidth() : penWidth();

  drawCtx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
  drawCtx.strokeStyle = isErasing ? 'rgba(0,0,0,1)' : penColor;
  drawCtx.lineWidth = w; drawCtx.lineCap = 'round'; drawCtx.lineJoin = 'round';
  drawCtx.beginPath();
  drawCtx.moveTo(lastMid ? lastMid.x : lastPoint.x, lastMid ? lastMid.y : lastPoint.y);
  drawCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
  drawCtx.stroke();
  drawCtx.globalCompositeOperation = 'source-over';

  lastMid = mid; lastPoint = cur;
  e.preventDefault();
}

function pointerUp(e) {
  if (!isDrawing) return;
  if (currentStroke) { strokes.push(currentStroke); currentStroke = null; }
  drawCtx.globalCompositeOperation = 'source-over';
  isDrawing = false; lastPoint = null; lastMid = null;
  hasDrawn = true;

  if (_strokeStartTime) {
    _strokeDrawMs += Date.now() - _strokeStartTime;
    _strokeStartTime = null;
  }
  _lastStrokeEndTime = Date.now();
  telemetry.totalStrokes++;
  if (isErasing) telemetry.eraserStrokes++;

  resetIdleTimer();
  e.preventDefault();
}

drawCanvas.addEventListener('mousedown',  pointerDown);
drawCanvas.addEventListener('mousemove',  pointerMove);
drawCanvas.addEventListener('mouseup',    pointerUp);
drawCanvas.addEventListener('mouseleave', pointerUp);
drawCanvas.addEventListener('touchstart', pointerDown, { passive: false });
drawCanvas.addEventListener('touchmove',  pointerMove, { passive: false });
drawCanvas.addEventListener('touchend',   pointerUp,   { passive: false });

// ─── IDLE TIMER ─────────────────────────────────────────
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (phase === 'drawing' && hasDrawn) showCompleteBtn();
  }, 1500);
}
function showCompleteBtn() { completeBtn.style.display = 'block'; }
function hideCompleteBtn() { clearTimeout(idleTimer); completeBtn.style.display = 'none'; }

completeBtn.addEventListener('click', e => {
  e.stopPropagation(); clearTimeout(idleTimer);
  openChat();
});

// ─── OPEN CHAT ──────────────────────────────────────────
function captureMergedCanvas() {
  const merged = document.createElement('canvas');
  merged.width = drawCanvas.width; merged.height = drawCanvas.height;
  const mCtx = merged.getContext('2d');
  const grad = mCtx.createLinearGradient(0, 0, merged.width, merged.height);
  grad.addColorStop(0, bgStops[0]);
  grad.addColorStop(1, bgStops[1]);
  mCtx.fillStyle = grad; mCtx.fillRect(0, 0, merged.width, merged.height);
  mCtx.drawImage(drawCanvas, 0, 0);
  return merged.toDataURL('image/jpeg', 0.85);
}

// Sampled pixel coverage estimate (step=8 for speed)
function computeDrawingCoverage() {
  try {
    const W = drawCanvas.width, H = drawCanvas.height;
    const step = 8;
    const data = drawCtx.getImageData(0, 0, W, H).data;
    let covered = 0, total = 0;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const alpha = data[(y * W + x) * 4 + 3];
        if (alpha > 10) covered++;
        total++;
      }
    }
    return Math.round((covered / total) * 100) / 100;
  } catch { return 0; }
}

async function openChat() {
  if (cityRevealed) return;
  phase = 'chat';
  totalDialogOpens++;
  if (drawingPhaseStart) { drawingAccumMs += Date.now() - drawingPhaseStart; drawingPhaseStart = null; }
  chatPhaseStart = Date.now();
  chatCount = 0;

  stopBlink(); stopHintAnimation(); hideCompleteBtn(); closeAllPopups();

  drawingDataURL = captureMergedCanvas();

  toolbar.style.display = 'none';
  document.body.classList.add('chat-open');
  layoutMiniCanvas();
  requestAnimationFrame(() => {
    chatDialog.classList.add('open');
    chatInput.focus();
  });

  const initMsg = totalDialogOpens > 1
    ? 'I updated my drawing — take a look at what I added.'
    : 'analyze_drawing';

  const payload = { message: initMsg, session_id: SESSION_ID, image: drawingDataURL };
  if (totalDialogOpens === 1) {
    telemetry.drawDurationSec  = Math.round(_strokeDrawMs / 100) / 10;
    telemetry.drawingCoverage  = computeDrawingCoverage();
    telemetry.sessionOpenCount = totalDialogOpens;
    const t = { ...telemetry };
    t.undoRatio   = t.totalStrokes > 0 ? Math.round(t.undoCount   / t.totalStrokes * 100) / 100 : 0;
    t.eraserRatio = t.totalStrokes > 0 ? Math.round(t.eraserStrokes / t.totalStrokes * 100) / 100 : 0;
    delete t.undoCount; delete t.eraserStrokes; delete t.totalStrokes;
    payload.telemetry = t;
  }

  const typing = addMsg('ai', '', true);
  startReadingWaitAnimation(typing, UI.readingDrawing);
  try {
    const res  = await fetch(`${API_BASE}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    finishWaitMessage(typing, data.reply);
    chatCount++;
    const bridgingPhrases = /on it|searching now|let me find|i'll find|give me a (second|moment)|let me pull|let me grab a.*track|grab a.*track|pulling it up/i;
    const impliedReady = !data.ready && !data.playlist && bridgingPhrases.test(data.reply);
    if (data.playlist && userResponseCount >= 1) {
      setTimeout(fetchPlaylists, 600);
    } else if ((data.ready || impliedReady || chatCount >= 4) && userResponseCount >= 1) {
      setTimeout(fetchSong, 600);
    }
  } catch (err) {
    finishWaitMessage(typing, 'Could not reach the server.');
    console.error(err);
  }
}

// ─── CLOSE CHAT ─────────────────────────────────────────
closeChatBtn.addEventListener('click', () => {
  stopWaitAnimation();
  chatDialog.classList.remove('open');
  document.body.classList.remove('chat-open');
  phase = 'drawing';
  restoreCanvasLayout();
  resizeCanvasToWindow();
  redrawAll();
  toolbar.style.display = 'flex';
  resetIdleTimer();
  if (chatPhaseStart) { chatAccumMs += Date.now() - chatPhaseStart; chatPhaseStart = null; }
  drawingPhaseStart = Date.now();
});

// ─── CHAT ───────────────────────────────────────────────
async function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg || phase !== 'chat') return;
  chatInput.value = '';
  userResponseCount++;
  songBtn.classList.add('ready');
  addMsg('user', msg);
  const typing = addMsg('ai', '', true);
  startDotsWaitAnimation(typing);
  try {
    const res  = await fetch(`${API_BASE}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, session_id: SESSION_ID }),
    });
    const data = await res.json();
    finishWaitMessage(typing, data.reply);
    chatCount++;
    const bridgingPhrases = /on it|searching now|let me find|i'll find|give me a (second|moment)|let me pull|let me grab a.*track|grab a.*track|pulling it up/i;
    const impliedReady = !data.ready && !data.playlist && bridgingPhrases.test(data.reply);
    if (data.playlist && userResponseCount >= 1) {
      setTimeout(fetchPlaylists, 600);
    } else if ((data.ready || impliedReady || chatCount >= 4) && userResponseCount >= 1) {
      setTimeout(fetchSong, 600);
    }
  } catch (err) {
    finishWaitMessage(typing, 'Error — is the backend running?');
    console.error(err);
  }
}

// Pin page and pad dialog bottom so only the input row lifts above the keyboard.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const onVVChange = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height));
    chatDialog.style.paddingBottom = kb > 0 ? kb + 'px' : '';
    if (kb > 0) {
      window.scrollTo(0, 0);
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
  };
  vv.addEventListener('resize', onVVChange);
  vv.addEventListener('scroll', onVVChange);
}

sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e => {
  // Ignore Enter during IME composition (CJK input)
  if (e.key === 'Enter' && !e.isComposing) sendChat();
});

songBtn.addEventListener('click', () => {
  if (cityRevealed) return;
  fetchSong();
});

// ─── SESSION COMPLETE ───────────────────────────────────
async function saveSession(songData) {
  try {
    const t = { ...telemetry };
    t.undoRatio   = t.totalStrokes > 0 ? Math.round(t.undoCount   / t.totalStrokes * 100) / 100 : 0;
    t.eraserRatio = t.totalStrokes > 0 ? Math.round(t.eraserStrokes / t.totalStrokes * 100) / 100 : 0;
    t.sessionOpenCount = totalDialogOpens;
    delete t.undoCount; delete t.eraserStrokes; delete t.totalStrokes;

    const finalChatMs = chatAccumMs + (chatPhaseStart ? Date.now() - chatPhaseStart : 0);

    const payload = {
      session_id:               SESSION_ID,
      drawing_duration_sec:      Math.round(drawingAccumMs / 1000),
      conversation_duration_sec: Math.round(finalChatMs / 1000),
      device_type:               /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      user_timezone:             Intl.DateTimeFormat().resolvedOptions().timeZone,
      bg_color:             bgStops[0],
      canvas_width:         REF_W,
      canvas_height:        REF_H,
      strokes:              strokes,
      telemetry:            t,
      chat_count:           chatCount,
      spotify_query:        songData.spotify_query || null,
      recommended_song:     songData.song || null,
      recommended_artist:   songData.artist || null,
      ai_reason:            songData.reason || null,
      spotify_url:          songData.spotify_url || null,
    };

    const res  = await fetch(`${API_BASE}/session-complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.db_session_id) throw new Error('Missing db_session_id');
    dbSessionId = data.db_session_id;
    console.log('[DB] session saved:', dbSessionId);
    return true;
  } catch (err) {
    console.warn('[DB] session save failed:', err);
    return false;
  }
}

// ─── STAR RATING ────────────────────────────────────────
function addStarRating() {
  const wrapper = document.createElement('div');
  wrapper.className = 'star-rating';
  wrapper.innerHTML = `
    <span class="star-label">${UI.rateLabel}</span>
    ${[1,2,3,4,5].map(n => `<span class="star" data-score="${n}">★</span>`).join('')}`;

  wrapper.querySelectorAll('.star').forEach(star => {
    star.addEventListener('mouseenter', () => {
      const n = +star.dataset.score;
      wrapper.querySelectorAll('.star').forEach(s => s.classList.toggle('hover', +s.dataset.score <= n));
    });
    star.addEventListener('mouseleave', () => {
      wrapper.querySelectorAll('.star').forEach(s => s.classList.remove('hover'));
    });
    star.addEventListener('click', async () => {
      if (!dbSessionId) return;
      const score = +star.dataset.score;
      wrapper.querySelectorAll('.star').forEach(s => s.classList.toggle('selected', +s.dataset.score <= score));
      wrapper.querySelectorAll('.star').forEach(s => s.style.pointerEvents = 'none');
      try {
        await fetch(`${API_BASE}/rate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: SESSION_ID,
            db_session_id: dbSessionId,
            score,
            song:   lastSongData?.song   || null,
            artist: lastSongData?.artist || null,
          }),
        });
      } catch (err) { console.warn('[DB] rate failed:', err); }
    });
  });

  chatMsgs.appendChild(wrapper);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

// ─── SONG REVEAL ────────────────────────────────────────
async function fetchSong() {
  if (cityRevealed) return;
  cityRevealed = true;

  const typing = addMsg('ai', '', true);
  startDotsWaitAnimation(typing);
  try {
    const res  = await fetch(`${API_BASE}/song-result`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'reveal', session_id: SESSION_ID }),
    });
    const data = await res.json();
    stopWaitAnimation();
    typing.remove();

    if (data.error || (!data.song && !data.spotify_url)) {
      console.warn('[song] result error:', data.error, data.raw);
      addMsg('ai', "Hmm, I couldn't lock in a song — ask me again in a sec?");
      cityRevealed = false;
      return;
    }

    const card = buildSongCard(data);

    const spotifyLink = card.querySelector('.city-card-spotify-link');
    if (spotifyLink) {
      spotifyLink.style.cursor = 'pointer';
      spotifyLink.addEventListener('click', async () => {
        if (dbSessionId) {
          try {
            await fetch(`${API_BASE}/spotify-opened`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: SESSION_ID, db_session_id: dbSessionId }),
            });
          } catch (e) { /* non-blocking */ }
        }
        window.open(spotifyLink.href, '_blank', 'noopener');
      });
    }

    const imgWrap = card.querySelector('.city-card-img-wrap');
    if (imgWrap && data.spotify_url) {
      imgWrap.style.cursor = 'pointer';
      imgWrap.addEventListener('click', () => spotifyLink && spotifyLink.click());
    }

    chatMsgs.appendChild(card);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    lastSongData = data;
    const saved = await saveSession(data);
    if (saved) addStarRating();

    cityRevealed = false;
    chatCount    = 0;
    chatInput.placeholder = UI.differentVibe;

  } catch (err) {
    stopWaitAnimation();
    const typing2 = document.querySelector('.msg.typing');
    if (typing2) finishWaitMessage(typing2, 'Could not load song result.');
    else addMsg('ai', 'Could not load song result.');
    cityRevealed = false;
    console.error(err);
  }
}

// ─── PLAYLIST OPTIONS ───────────────────────────────────
async function fetchPlaylists() {
  const typing = addMsg('ai', '', true);
  startDotsWaitAnimation(typing);
  try {
    const res  = await fetch(`${API_BASE}/playlist-result`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'playlist', session_id: SESSION_ID }),
    });
    const data = await res.json();
    stopWaitAnimation();
    typing.remove();

    if (!data.playlists?.length) {
      addMsg('ai', 'Couldn\'t find playlists right now — try asking again?');
      return;
    }

    addMsg('ai', UI.playlistIntro);

    const container = document.createElement('div');
    container.className = 'playlist-options';
    data.playlists.forEach(pl => {
      const card = buildPlaylistCard(pl);
      const playlistUrl = safeHttpUrl(pl.spotify_url);
      if (playlistUrl) {
        card.addEventListener('click', () => window.open(playlistUrl, '_blank', 'noopener'));
      }
      container.appendChild(card);
    });
    chatMsgs.appendChild(container);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    chatInput.placeholder = UI.somethingDifferent;
  } catch (err) {
    stopWaitAnimation();
    const t = document.querySelector('.msg.typing');
    if (t) finishWaitMessage(t, 'Could not load playlists.');
    else addMsg('ai', 'Could not load playlists.');
    console.error(err);
  }
}

// ─── HELPERS ────────────────────────────────────────────
function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function buildSongCard(data) {
  const card = document.createElement('div');
  card.className = 'msg ai city-card';

  const trackLabel = `${data.song || 'Your song'}${data.artist ? ` · ${data.artist}` : ''}`;
  const imageUrl = safeHttpUrl(data.image);
  const spotifyUrl = safeHttpUrl(data.spotify_url);

  if (imageUrl) {
    const imgWrap = document.createElement('a');
    imgWrap.className = 'city-card-img-wrap';

    const img = document.createElement('img');
    img.className = 'city-card-img';
    img.src = imageUrl;
    img.alt = trackLabel;

    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
  }

  const body = document.createElement('div');
  body.className = 'city-card-body';

  const name = document.createElement('div');
  name.className = 'city-card-name';
  name.textContent = data.song || '';

  const artist = document.createElement('div');
  artist.className = 'city-card-artist';
  artist.textContent = data.artist || '';

  const reason = document.createElement('div');
  reason.className = 'city-card-reason';
  reason.textContent = data.reason || '';

  body.append(name, artist, reason);

  if (spotifyUrl) {
    const link = document.createElement('a');
    link.className = 'city-card-spotify city-card-spotify-link';
    link.href = spotifyUrl;
    link.textContent = '▶ Open in Spotify';
    body.appendChild(link);
  }

  card.appendChild(body);
  return card;
}

function buildPlaylistCard(pl) {
  const card = document.createElement('div');
  card.className = 'playlist-option';

  const imageUrl = safeHttpUrl(pl.image);
  if (imageUrl) {
    const img = document.createElement('img');
    img.className = 'playlist-option-img';
    img.src = imageUrl;
    img.alt = pl.name || '';
    card.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'playlist-option-body';

  const name = document.createElement('div');
  name.className = 'playlist-option-name';
  name.textContent = pl.name || '';

  const meta = document.createElement('div');
  meta.className = 'playlist-option-meta';
  meta.textContent = `${pl.tracks ?? 0} songs · ${pl.owner || ''}`;

  body.append(name, meta);
  card.appendChild(body);
  return card;
}

function addMsg(role, text, isTyping = false) {
  const div = document.createElement('div');
  div.className = `msg ${role}${isTyping ? ' typing' : ''}`;
  div.textContent = text;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
  return div;
}

const DOT_SUFFIX_CYCLE = ['.', '..', '...'];
const WAIT_TYPE_MS = 42;
const WAIT_DOT_MS = 420;
let _waitAnimToken = 0;

function scrollChatToEnd() {
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function stopWaitAnimation() {
  _waitAnimToken++;
}

function readingPhraseBase(phrase) {
  return phrase.replace(/[.。…]+\s*$/, '');
}

function startDotsWaitAnimation(el) {
  const token = ++_waitAnimToken;
  let i = 0;
  const tick = () => {
    if (token !== _waitAnimToken) return;
    el.textContent = DOT_SUFFIX_CYCLE[i % DOT_SUFFIX_CYCLE.length];
    scrollChatToEnd();
    i++;
    setTimeout(tick, WAIT_DOT_MS);
  };
  tick();
}

function startReadingWaitAnimation(el, phrase) {
  const token = ++_waitAnimToken;
  const base = readingPhraseBase(phrase);
  const full = base + '...';
  el.classList.add('reading-wait');
  let n = 0;
  const typeTick = () => {
    if (token !== _waitAnimToken) return;
    el.textContent = full.slice(0, n);
    scrollChatToEnd();
    n++;
    if (n <= full.length) {
      setTimeout(typeTick, WAIT_TYPE_MS);
    } else {
      let i = 0;
      const dotTick = () => {
        if (token !== _waitAnimToken) return;
        el.textContent = base + DOT_SUFFIX_CYCLE[i % DOT_SUFFIX_CYCLE.length];
        scrollChatToEnd();
        i++;
        setTimeout(dotTick, WAIT_DOT_MS);
      };
      dotTick();
    }
  };
  typeTick();
}

function finishWaitMessage(el, text) {
  stopWaitAnimation();
  el.classList.remove('typing', 'reading-wait');
  el.textContent = text;
  scrollChatToEnd();
}
