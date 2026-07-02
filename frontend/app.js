// ─── CONFIG ─────────────────────────────────────────────
const API_BASE   = 'https://dr-9dfd56ca90d448ed9551f88cb5aae645.ecs.ap-southeast-2.on.aws';
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
const cityBtn        = document.getElementById('city-btn');
const cityReveal     = document.getElementById('city-reveal');
const cityRevealImg     = document.getElementById('city-reveal-img');
const cityRevealReason  = document.getElementById('city-reveal-reason');
const cityRevealName    = document.getElementById('city-reveal-name');
const cityRevealWeather = document.getElementById('city-reveal-weather');

// ─── STATIC UI STRINGS (by browser language) ────────────
// The AI conversation follows browserLanguage on its own; this map covers
// the fixed UI labels for frequent languages. Default: English.
const UI_STRINGS = {
  en: { tapToLock: 'Tap to lock in your color', completed: 'Completed ✓',
        typeHere: 'Type here…', differentVibe: 'Want a different vibe? Tell me…',
        somethingDifferent: 'Want something different? Tell me…',
        rateLabel: 'Rate this pick:',
        playlistIntro: 'Here are 3 playlists — pick whichever vibe fits 🎵' },
  'zh-TW': { tapToLock: '點擊畫面來鎖定顏色', completed: '完成 ✓',
        typeHere: '在這裡輸入…', differentVibe: '想換個風格？告訴我…',
        somethingDifferent: '想聽點不一樣的？告訴我…',
        rateLabel: '為這首歌評分：',
        playlistIntro: '這裡有 3 個歌單——挑個合你心情的 🎵' },
  'zh-CN': { tapToLock: '点击画面来锁定颜色', completed: '完成 ✓',
        typeHere: '在这里输入…', differentVibe: '想换个风格？告诉我…',
        somethingDifferent: '想听点不一样的？告诉我…',
        rateLabel: '为这首歌评分：',
        playlistIntro: '这里有 3 个歌单——挑个合你心情的 🎵' },
  ja: { tapToLock: 'タップして色を決定', completed: '完成 ✓',
        typeHere: 'ここに入力…', differentVibe: '違う雰囲気がいい？教えてね…',
        somethingDifferent: '他のも聴きたい？教えてね…',
        rateLabel: 'この曲を評価：',
        playlistIntro: 'プレイリストを3つ用意したよ——好きなのを選んでね 🎵' },
  ko: { tapToLock: '탭해서 색을 고정하세요', completed: '완료 ✓',
        typeHere: '여기에 입력…', differentVibe: '다른 분위기를 원해요? 알려주세요…',
        somethingDifferent: '다른 걸 원해요? 알려주세요…',
        rateLabel: '이 곡 평가:',
        playlistIntro: '플레이리스트 3개를 준비했어요 — 마음에 드는 걸 골라보세요 🎵' },
  es: { tapToLock: 'Toca para fijar tu color', completed: 'Listo ✓',
        typeHere: 'Escribe aquí…', differentVibe: '¿Otro rollo? Cuéntame…',
        somethingDifferent: '¿Algo diferente? Cuéntame…',
        rateLabel: 'Valora esta canción:',
        playlistIntro: 'Aquí tienes 3 playlists — elige la que más te guste 🎵' },
  de: { tapToLock: 'Tippen, um deine Farbe festzulegen', completed: 'Fertig ✓',
        typeHere: 'Hier tippen…', differentVibe: 'Lust auf einen anderen Vibe? Sag’s mir…',
        somethingDifferent: 'Etwas anderes? Sag’s mir…',
        rateLabel: 'Bewerte diesen Song:',
        playlistIntro: 'Hier sind 3 Playlists — such dir einen Vibe aus 🎵' },
  ar: { tapToLock: 'انقر لتثبيت لونك', completed: 'تم ✓',
        typeHere: 'اكتب هنا…', differentVibe: 'تريد أجواء مختلفة؟ أخبرني…',
        somethingDifferent: 'تريد شيئًا مختلفًا؟ أخبرني…',
        rateLabel: 'قيّم هذه الأغنية:',
        playlistIntro: 'إليك 3 قوائم تشغيل — اختر ما يناسب مزاجك 🎵' },
};

function pickUiStrings() {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('zh')) {
    return /cn|sg|hans/.test(lang) ? UI_STRINGS['zh-CN'] : UI_STRINGS['zh-TW'];
  }
  return UI_STRINGS[lang.split('-')[0]] || UI_STRINGS.en;
}
const UI = pickUiStrings();

// Apply to static elements
colorHint.querySelector('p').textContent = UI.tapToLock;
completeBtn.textContent = UI.completed;
chatInput.placeholder   = UI.typeHere;

// ─── CANVAS INIT — vector strokes + view transform ─────
// Strokes are VECTOR data in a fixed REFERENCE space (the window size at
// first load). The canvas bitmap is only a VIEW: it always fills the
// window, and a uniform view transform (scale + centering) maps reference
// coords → screen. The drawing never stretches, and the whole screen is
// always drawable. Pixels only matter for display and the JPEG sent to
// the AI — everything else (undo, erase, save) operates on vectors.
const REF_W = window.innerWidth;
const REF_H = window.innerHeight;
const view  = { s: 1, ox: 0, oy: 0 };

function applyViewTransform(ctx) {
  ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy);
}

// Bitmap = window size; view maps reference space into it, centered.
function resizeCanvasToWindow() {
  [drawCanvas, blinkCanvas].forEach(c => {
    c.width  = window.innerWidth;   // also clears bitmap + resets transform
    c.height = window.innerHeight;
  });
  view.s  = Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H);
  view.ox = (window.innerWidth  - REF_W * view.s) / 2;
  view.oy = (window.innerHeight - REF_H * view.s) / 2;
  applyViewTransform(drawCtx);
  applyViewTransform(blinkCtx);
}
resizeCanvasToWindow();

// Element-relative CSS px → reference-space coords (handles the chat-open
// CSS scaling of the element AND the view transform)
function eventToRef(cssX, cssY) {
  const r  = drawCanvas.getBoundingClientRect();
  const px = cssX * (drawCanvas.width  / r.width);
  const py = cssY * (drawCanvas.height / r.height);
  return { x: (px - view.ox) / view.s, y: (py - view.oy) / view.s };
}

// Chat-open: shrink canvas into the area not covered by the dialog
// (landscape → left 50%; portrait → top 35%), centered, aspect kept.
// Computed from the canvas's ACTUAL current rect, so it works after resizes.
function layoutMiniCanvas() {
  const portrait = window.innerHeight > window.innerWidth;
  const area = portrait
    ? { w: window.innerWidth,       h: window.innerHeight * 0.35 }
    : { w: window.innerWidth * 0.5, h: window.innerHeight };
  const pad  = 10;
  const cssW = drawCanvas.width, cssH = drawCanvas.height; // element = bitmap size
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

// Chat session tracking
let chatCount         = 0;
let totalDialogOpens  = 0;
let cityRevealed      = false;
let userResponseCount = 0;  // user must reply ≥1 time before auto-reveal fires

// Session save tracking
let drawingPhaseStart    = null;  // timestamp when current drawing phase began
let drawingAccumMs       = 0;     // cumulative ms spent drawing (across all drawing phases)
let chatPhaseStart       = null;  // timestamp when current chat phase began
let chatAccumMs          = 0;     // cumulative ms spent in chat (across all chat phases)
let dbSessionId          = null;  // returned from /session-complete, used for /spotify-opened + /rate
let lastSongData         = null;  // stores most recent song result for /session-complete payload

// ─── BEHAVIORAL TELEMETRY ───────────────────────────────
const _bgStartTime = Date.now();
let _lastStrokeEndTime  = null;
let _strokeDrawMs       = 0;   // cumulative ms actively drawing
let _strokeStartTime    = null;

const telemetry = {
  colorLockTime:    null,  // seconds: how long to confirm background
  colorAdjustments: 0,     // # of color-picker changes after locking bg
  penSizeChanges:   0,     // # of pen slider adjustments
  drawDurationSec:  0,     // total seconds of active drawing
  totalStrokes:     0,     // pen + eraser strokes
  undoCount:        0,     // # of undo actions
  eraserStrokes:    0,     // # of eraser strokes
  drawingCoverage:  0,     // fraction of canvas with non-bg pixels (computed at open)
  idleGaps:         0,     // pauses > 5s between strokes
  sessionOpenCount: 0,     // how many times chat opened (filled at open time)
  browserLanguage:  navigator.language || null,  // e.g. "zh-TW", "en-US", "ko-KR"
};

// ─── PEN / ERASER SIZE ──────────────────────────────────
// Pen width lives in REFERENCE units (the view transform scales it on
// screen). Scale off the shorter dimension; 4px floor for phones.
function calcBasePenWidth() {
  return Math.max(4, Math.min(REF_W, REF_H) / 160);
}
let basePenWidth = calcBasePenWidth();

const SIZE_MIN = 0.3, SIZE_MAX = 5.0;
let penSizeRaw    = parseFloat(localStorage.getItem('penSizeRaw')    ?? '1.0');
let eraserSizeRaw = parseFloat(localStorage.getItem('eraserSizeRaw') ?? '2.0');
penSizeRaw    = Math.min(SIZE_MAX, Math.max(SIZE_MIN, penSizeRaw));
eraserSizeRaw = Math.min(SIZE_MAX, Math.max(SIZE_MIN, eraserSizeRaw));

function penWidth()    { return Math.max(1, basePenWidth * penSizeRaw); }
function eraserWidth() { return Math.max(4, basePenWidth * eraserSizeRaw); }
function rawToSlider(r) { return Math.round((r - SIZE_MIN) / (SIZE_MAX - SIZE_MIN) * 100); }
function sliderToRaw(v) { return SIZE_MIN + (v / 100) * (SIZE_MAX - SIZE_MIN); }

penSlider.value    = rawToSlider(penSizeRaw);
eraserSlider.value = rawToSlider(eraserSizeRaw);

// ─── STROKE HISTORY ─────────────────────────────────────
// All coordinates are in canvas-internal pixels (stable — canvas never resizes).
// Pen strokes: no color/width stored → always render at current penColor +
// penWidth(). ONE uniform pen width on screen by design: moving the slider
// resizes existing strokes along with future ones.
// Eraser strokes: width stored in canvas pixels.
let strokes       = [];
let currentStroke = null;
const MAX_UNDO    = 10;
const undoStack   = [];

// Eye animation progress
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
  // Eye animation in progress — draw directly from SVG (no CSS transform active during anim)
  if (eyeDrawnLeftLen > 0 || eyeDrawnRightLen > 0) {
    setupLineCtx(penColor, penWidth());
    drawEyeFull(eyeLeft,  eyeDrawnLeftLen);
    drawEyeFull(eyeRight, eyeDrawnRightLen);
  }
  // All strokes (eyes baked in as regular strokes)
  for (const s of strokes) renderStroke(s);
  drawCtx.globalCompositeOperation = 'source-over';
}

// ─── WINDOW RESIZE ──────────────────────────────────────
// Canvas resolution is FIXED. Only CSS scaling changes on resize.
// basePenWidth recalculates so pen/eraser feel the same relative to window.
window.addEventListener('resize', () => {
  stopHintAnimation();
  if (document.body.classList.contains('chat-open')) {
    layoutMiniCanvas();       // keep mini canvas in place
  } else {
    resizeCanvasToWindow();   // bitmap follows window; strokes re-render below
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

// ─── BACKGROUND ANIMATION ───────────────────────────────
// Current gradient stops — single source of truth for body/html background
// AND the merged JPEG sent to the AI
let bgStops = ['#888', '#888'];

function setBackground(c1, c2) {
  bgStops = [c1, c2];
  const bg = `linear-gradient(135deg, ${c1}, ${c2})`;
  document.body.style.background = bg;
  // Paint the root too — fills under iOS status bar / home indicator and
  // overscroll areas, so no white or repeated-gradient strips appear
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
  telemetry.colorLockTime = Math.round((Date.now() - _bgStartTime) / 100) / 10; // 1 decimal
  cancelAnimationFrame(bgRafId);
  phase = 'drawing';
  drawingPhaseStart = Date.now(); // start drawing timer
  colorHint.style.opacity = '0';
  setTimeout(() => { colorHint.style.display = 'none'; }, 400);
  toolbar.style.display = 'flex';
  setTimeout(startHintAnimation, 350);
});

colorInput.addEventListener('input', e => {
  currentBgHex = e.target.value;
  // Manual pick → same gradient feel as the auto background: pair the
  // chosen colour with a similar one (hue +30°, slightly darker)
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

// Convert SVG-space point → reference-space coords.
function svgPtToCanvas(pt) {
  const sp = hintEyes.createSVGPoint();
  sp.x = pt.x; sp.y = pt.y;
  const vp   = sp.matrixTransform(hintEyes.getScreenCTM()); // viewport coords
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

// Bake a completed eye path into absolute canvas-internal coords
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
    // Bake eye paths into strokes[] — treated as regular user strokes from here on
    saveUndo(); // allow undoing the eye hint as a unit
    const ls = bakeEyeStroke(eyeLeft,  eyeDrawnLeftLen);
    const rs = bakeEyeStroke(eyeRight, eyeDrawnRightLen);
    if (ls) strokes.push(ls);
    if (rs) strokes.push(rs);
    eyeDrawnLeftLen = 0; eyeDrawnRightLen = 0;
    eyeStrokes = [ls, rs].filter(Boolean);
    scheduleBlink();
  }
}

function startHintAnimation() {
  eyeAnimFrame = 0; eyeDrawnLeftLen = 0; eyeDrawnRightLen = 0;
  eyeAnimId = requestAnimationFrame(animateEyeOnCanvas);
}

function stopHintAnimation() {
  if (eyeAnimId) {
    cancelAnimationFrame(eyeAnimId); eyeAnimId = null;
    // Bake whatever was drawn before stop into strokes[] like a regular stroke
    if (eyeDrawnLeftLen > 0 || eyeDrawnRightLen > 0) {
      const ls = bakeEyeStroke(eyeLeft,  eyeDrawnLeftLen);
      const rs = bakeEyeStroke(eyeRight, eyeDrawnRightLen);
      if (ls) strokes.push(ls);
      if (rs) strokes.push(rs);
      eyeDrawnLeftLen = 0; eyeDrawnRightLen = 0;
    }
  }
}

// ─── BLINK — squash the eye strokes vertically ──────────
// A real blink: eye height 100% → 30% → 100%, width fixed.
// Works directly on the baked vector strokes, no overlay drawing.
let blinkTimer  = null;
let blinkRafId  = null;
let eyeStrokes  = [];   // references to the baked eye strokes

function blinkEyes() {
  if (hasDrawn || phase !== 'drawing' || eyeStrokes.length === 0) return;
  // Vertical center of each eye (reference space)
  const centers = eyeStrokes.map(s => {
    let minY = Infinity, maxY = -Infinity;
    for (const p of s.points) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return (minY + maxY) / 2;
  });
  const DUR   = 600;  // ms: double blink (two close-reopen cycles)
  const start = performance.now();

  const step = now => {
    const t = Math.min(1, (now - start) / DUR);
    // |sin(2πt)| gives two full cycles: 100% → 30% → 100% → 30% → 100%
    const k = 1 - 0.7 * Math.abs(Math.sin(2 * Math.PI * t));
    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    applyViewTransform(drawCtx);
    for (const s of strokes) {
      const i = eyeStrokes.indexOf(s);
      if (i === -1) { renderStroke(s); continue; }
      const cy = centers[i];
      // Squash y about the eye's own center — x (width) stays fixed
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
  blinkTimer = setTimeout(blinkEyes, 2000 + Math.random() * 2000);
}

function stopBlink() {
  clearTimeout(blinkTimer); blinkTimer = null;
  if (blinkRafId) {
    cancelAnimationFrame(blinkRafId); blinkRafId = null;
    redrawAll(); // restore eyes fully open
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
  localStorage.setItem('penSizeRaw', penSizeRaw);
  telemetry.penSizeChanges++;
  redrawAll(); // one uniform width on screen — resize existing strokes too
});

eraserSlider.addEventListener('input', () => {
  eraserSizeRaw = sliderToRaw(parseInt(eraserSlider.value));
  localStorage.setItem('eraserSizeRaw', eraserSizeRaw);
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
// getPos converts event coords → reference-space coords
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
  saveUndo();          // snapshot before eye strokes (if mid-animation) land in strokes[]
  stopHintAnimation(); // stop & bake any partial eye into strokes[]
  hideCompleteBtn();

  // Telemetry: detect idle gap > 5s between strokes
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

  // Telemetry: accumulate drawing time + stroke counts
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
  // Same gradient the user sees (auto hue or manually picked pair)
  const grad = mCtx.createLinearGradient(0, 0, merged.width, merged.height);
  grad.addColorStop(0, bgStops[0]);
  grad.addColorStop(1, bgStops[1]);
  mCtx.fillStyle = grad; mCtx.fillRect(0, 0, merged.width, merged.height);
  mCtx.drawImage(drawCanvas, 0, 0);
  return merged.toDataURL('image/jpeg', 0.85);
}

// Estimate fraction of canvas covered by non-transparent pixels (sampled for speed)
function computeDrawingCoverage() {
  try {
    const W = drawCanvas.width, H = drawCanvas.height;
    const step = 8; // sample every 8th pixel
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
  // Pause drawing timer, start chat timer
  if (drawingPhaseStart) { drawingAccumMs += Date.now() - drawingPhaseStart; drawingPhaseStart = null; }
  chatPhaseStart = Date.now();
  chatCount = 0;

  stopBlink(); stopHintAnimation(); hideCompleteBtn(); closeAllPopups();

  drawingDataURL = captureMergedCanvas();

  toolbar.style.display = 'none';
  document.body.classList.add('chat-open');
  layoutMiniCanvas();
  requestAnimationFrame(() => chatDialog.classList.add('open'));

  const initMsg = totalDialogOpens > 1
    ? 'I updated my drawing — take a look at what I added.'
    : 'analyze_drawing';

  // Finalize telemetry snapshot on first open
  const payload = { message: initMsg, session_id: SESSION_ID, image: drawingDataURL };
  if (totalDialogOpens === 1) {
    telemetry.drawDurationSec  = Math.round(_strokeDrawMs / 100) / 10;
    telemetry.drawingCoverage  = computeDrawingCoverage();
    telemetry.sessionOpenCount = totalDialogOpens;
    // Derived ratios (rounded to 2dp)
    const t = { ...telemetry };
    t.undoRatio   = t.totalStrokes > 0 ? Math.round(t.undoCount   / t.totalStrokes * 100) / 100 : 0;
    t.eraserRatio = t.totalStrokes > 0 ? Math.round(t.eraserStrokes / t.totalStrokes * 100) / 100 : 0;
    delete t.undoCount; delete t.eraserStrokes; delete t.totalStrokes;
    payload.telemetry = t;
  }

  const typing = addMsg('ai', '…', true);
  try {
    const res  = await fetch(`${API_BASE}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    typing.classList.remove('typing');
    typing.textContent = data.reply;
    chatCount++;
    const bridgingPhrases = /on it|searching now|let me find|i'll find|give me a (second|moment)|let me pull|let me grab a.*track|grab a.*track|pulling it up/i;
    const impliedReady = !data.ready && !data.playlist && bridgingPhrases.test(data.reply);
    // Auto-reveal only after user has replied at least once
    if (data.playlist && userResponseCount >= 1) {
      setTimeout(fetchPlaylists, 600);
    } else if ((data.ready || impliedReady || chatCount >= 4) && userResponseCount >= 1) {
      setTimeout(fetchSong, 600);
    }
  } catch (err) {
    typing.textContent = 'Could not reach the server.';
    console.error(err);
  }
}

// ─── CLOSE CHAT → BACK TO DRAWING ───────────────────────
closeChatBtn.addEventListener('click', () => {
  chatDialog.classList.remove('open');
  document.body.classList.remove('chat-open');
  phase = 'drawing';
  restoreCanvasLayout();
  resizeCanvasToWindow(); // window may have resized while chat was open
  redrawAll();
  toolbar.style.display = 'flex';
  resetIdleTimer();
  // Pause chat timer, resume drawing timer
  if (chatPhaseStart) { chatAccumMs += Date.now() - chatPhaseStart; chatPhaseStart = null; }
  drawingPhaseStart = Date.now();
});

// ─── CHAT ───────────────────────────────────────────────
async function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg || phase !== 'chat') return;
  chatInput.value = '';
  userResponseCount++;
  cityBtn.classList.add('ready'); // light up city button after first reply
  addMsg('user', msg);
  const typing = addMsg('ai', '…', true);
  try {
    const res  = await fetch(`${API_BASE}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, session_id: SESSION_ID }),
    });
    const data = await res.json();
    typing.classList.remove('typing');
    typing.textContent = data.reply;
    chatCount++;
    // Detect if AI said bridging phrase but forgot READY:true (model reliability fallback)
    const bridgingPhrases = /on it|searching now|let me find|i'll find|give me a (second|moment)|let me pull|let me grab a.*track|grab a.*track|pulling it up/i;
    const impliedReady = !data.ready && !data.playlist && bridgingPhrases.test(data.reply);
    if (data.playlist && userResponseCount >= 1) {
      setTimeout(fetchPlaylists, 600);
    } else if ((data.ready || impliedReady || chatCount >= 4) && userResponseCount >= 1) {
      setTimeout(fetchSong, 600);
    }
  } catch (err) {
    typing.textContent = 'Error — is the backend running?';
    console.error(err);
  }
}

// ─── MOBILE KEYBOARD — keep layout still, lift only the input row ──
// iOS Safari overlays the keyboard and pans the page to reveal the input,
// which makes the whole screen jump. Instead: pin the page and add
// padding-bottom to the dialog (flex column) so just the input row rises.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const onVVChange = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height));
    chatDialog.style.paddingBottom = kb > 0 ? kb + 'px' : '';
    if (kb > 0) {
      window.scrollTo(0, 0);                    // undo Safari's auto-pan
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
  };
  vv.addEventListener('resize', onVVChange);
  vv.addEventListener('scroll', onVVChange);
}

sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e => {
  // e.isComposing is true while IME (Chinese/Japanese/Korean) is composing —
  // ignore Enter during composition so it only confirms the character, not sends
  if (e.key === 'Enter' && !e.isComposing) sendChat();
});

// City button — always visible, triggers reveal immediately using whatever AI knows so far
cityBtn.addEventListener('click', () => {
  if (cityRevealed) return;
  fetchSong();
});

// ─── SESSION COMPLETE — save to DB after song reveal ────
async function saveSession(songData) {
  try {
    const t = { ...telemetry };
    t.undoRatio   = t.totalStrokes > 0 ? Math.round(t.undoCount   / t.totalStrokes * 100) / 100 : 0;
    t.eraserRatio = t.totalStrokes > 0 ? Math.round(t.eraserStrokes / t.totalStrokes * 100) / 100 : 0;
    t.sessionOpenCount = totalDialogOpens; // final count, not the first-open snapshot
    delete t.undoCount; delete t.eraserStrokes; delete t.totalStrokes;

    // Finalize chat timer (we're in chat phase when song reveals)
    const finalChatMs = chatAccumMs + (chatPhaseStart ? Date.now() - chatPhaseStart : 0);

    const payload = {
      session_id:               SESSION_ID,
      drawing_duration_sec:      Math.round(drawingAccumMs / 1000),
      conversation_duration_sec: Math.round(finalChatMs / 1000),
      device_type:               /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      user_timezone:             Intl.DateTimeFormat().resolvedOptions().timeZone,
      // Primary gradient stop (hex if manually picked, hsl if auto hue)
      bg_color:             bgStops[0],
      canvas_width:         REF_W,   // stroke coordinate space (reference)
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
    dbSessionId = data.db_session_id;
    console.log('[DB] session saved:', dbSessionId);
  } catch (err) {
    console.warn('[DB] session save failed:', err);
  }
}

// ─── STAR RATING — shown below song card ────────────────
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

// ─── SONG REVEAL — rendered as a card inside chat ───────
async function fetchSong() {
  if (cityRevealed) return;
  cityRevealed = true;

  const typing = addMsg('ai', '…', true);
  try {
    const res  = await fetch(`${API_BASE}/song-result`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'reveal', session_id: SESSION_ID }),
    });
    const data = await res.json();
    typing.remove();

    // Backend may return {error} (AI JSON parse fail / Spotify miss) —
    // don't render an empty card, a null DB row, or a rating for nothing
    if (data.error || (!data.song && !data.spotify_url)) {
      console.warn('[song] result error:', data.error, data.raw);
      addMsg('ai', "Hmm, I couldn't lock in a song — ask me again in a sec?");
      cityRevealed = false; // allow retry
      return;
    }

    // Build song card as an AI chat bubble
    const card = document.createElement('div');
    card.className = 'msg ai city-card';

    const trackLabel = `${data.song || 'Your song'}${data.artist ? ` · ${data.artist}` : ''}`;

    card.innerHTML = `
      ${data.image ? `<a class="city-card-img-wrap"><img class="city-card-img" src="${data.image}" alt="${trackLabel}"></a>` : ''}
      <div class="city-card-body">
        <div class="city-card-name">${data.song || ''}</div>
        <div class="city-card-artist">${data.artist || ''}</div>
        <div class="city-card-reason">${data.reason || ''}</div>
        ${data.spotify_url ? `<a class="city-card-spotify city-card-spotify-link" data-url="${data.spotify_url}">▶ Open in Spotify</a>` : ''}
      </div>`;

    // Intercept Spotify link — log opened, then navigate
    const spotifyLink = card.querySelector('.city-card-spotify-link');
    if (spotifyLink) {
      spotifyLink.style.cursor = 'pointer';
      spotifyLink.addEventListener('click', async () => {
        if (dbSessionId) {
          try {
            await fetch(`${API_BASE}/spotify-opened`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ db_session_id: dbSessionId }),
            });
          } catch (e) { /* non-blocking */ }
        }
        window.open(spotifyLink.dataset.url, '_blank', 'noopener');
      });
    }

    // Same intercept for album art link
    const imgWrap = card.querySelector('.city-card-img-wrap');
    if (imgWrap && data.spotify_url) {
      imgWrap.style.cursor = 'pointer';
      imgWrap.addEventListener('click', () => spotifyLink && spotifyLink.click());
    }

    chatMsgs.appendChild(card);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    // Save session to DB (non-blocking)
    lastSongData = data;
    saveSession(data);

    // Show star rating
    addStarRating();

    // Keep input alive — user can ask for another song
    cityRevealed = false;  // allow re-trigger if AI outputs READY:true again
    chatCount    = 0;      // reset so chatCount >= 4 fallback doesn't fire immediately
    chatInput.placeholder = UI.differentVibe;

  } catch (err) {
    const typing2 = document.querySelector('.msg.typing');
    if (typing2) typing2.textContent = 'Could not load song result.';
    else addMsg('ai', 'Could not load song result.');
    cityRevealed = false; // allow retry
    console.error(err);
  }
}

// ─── PLAYLIST OPTIONS — 3 clickable cards inside chat ───
async function fetchPlaylists() {
  const typing = addMsg('ai', '…', true);
  try {
    const res  = await fetch(`${API_BASE}/playlist-result`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'playlist', session_id: SESSION_ID }),
    });
    const data = await res.json();
    typing.remove();

    if (!data.playlists?.length) {
      addMsg('ai', 'Couldn\'t find playlists right now — try asking again?');
      return;
    }

    // Label bubble
    addMsg('ai', UI.playlistIntro);

    // 3 option cards
    const container = document.createElement('div');
    container.className = 'playlist-options';
    data.playlists.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'playlist-option';
      card.innerHTML = `
        ${pl.image ? `<img class="playlist-option-img" src="${pl.image}" alt="${pl.name}">` : ''}
        <div class="playlist-option-body">
          <div class="playlist-option-name">${pl.name}</div>
          <div class="playlist-option-meta">${pl.tracks} songs · ${pl.owner}</div>
        </div>`;
      card.addEventListener('click', () => window.open(pl.spotify_url, '_blank'));
      container.appendChild(card);
    });
    chatMsgs.appendChild(container);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    chatInput.placeholder = UI.somethingDifferent;
  } catch (err) {
    const t = document.querySelector('.msg.typing');
    if (t) t.textContent = 'Could not load playlists.';
    else addMsg('ai', 'Could not load playlists.');
    console.error(err);
  }
}

// ─── HELPERS ────────────────────────────────────────────
function addMsg(role, text, isTyping = false) {
  const div = document.createElement('div');
  div.className = `msg ${role}${isTyping ? ' typing' : ''}`;
  div.textContent = text;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
  return div;
}
