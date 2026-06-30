// ─── CONFIG ─────────────────────────────────────────────
const API_BASE   = 'http://localhost:8000';
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

// ─── CANVAS INIT (fixed resolution — never changes after this) ──
// CSS scales the canvas element to fill the window; we lock the pixel
// resolution once so coordinates never need re-normalising.
drawCanvas.width   = window.innerWidth;
drawCanvas.height  = window.innerHeight;
blinkCanvas.width  = window.innerWidth;
blinkCanvas.height = window.innerHeight;

// Scale factor: converts CSS-pixel event coords → canvas-internal pixels.
// Updated on every resize but does NOT touch canvas.width/height.
function cssToCanvas() {
  const r = drawCanvas.getBoundingClientRect();
  return { sx: drawCanvas.width / r.width, sy: drawCanvas.height / r.height };
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
};

// ─── PEN / ERASER SIZE ──────────────────────────────────
function calcBasePenWidth() { return Math.max(2, drawCanvas.width / 250); }
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
// Pen strokes: no color/width → always render at current penColor + penWidth().
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
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
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
  basePenWidth = calcBasePenWidth();
  closeAllPopups();
  // Redraw to re-render with updated penWidth (size slider feel scales with window)
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
function applyHueBg(h) {
  const h2 = (h + 55) % 360;
  document.body.style.background = `linear-gradient(135deg, hsl(${h},65%,50%), hsl(${h2},65%,44%))`;
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
  colorHint.style.opacity = '0';
  setTimeout(() => { colorHint.style.display = 'none'; }, 400);
  toolbar.style.display = 'flex';
  setTimeout(startHintAnimation, 350);
});

colorInput.addEventListener('input', e => {
  currentBgHex = e.target.value;
  document.body.style.background = currentBgHex;
  updatePenFromRgb(...hexToRgb(currentBgHex));
  if (phase === 'drawing') telemetry.colorAdjustments++;
});

// ─── EYE HINT ───────────────────────────────────────────
let eyeAnimId    = null;
let eyeAnimFrame = 0;
const EYE_FRAMES = 40;
const EYE_GAP    = 5;

// Convert SVG-space point → canvas-internal pixels, accounting for CSS scaling.
function svgPtToCanvas(pt) {
  const sp = hintEyes.createSVGPoint();
  sp.x = pt.x; sp.y = pt.y;
  const vp   = sp.matrixTransform(hintEyes.getScreenCTM()); // viewport coords
  const rect = drawCanvas.getBoundingClientRect();
  return {
    x: (vp.x - rect.left) * (drawCanvas.width  / rect.width),
    y: (vp.y - rect.top)  * (drawCanvas.height / rect.height),
  };
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
    eyeCenters = computeEyeCenters();
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

// ─── BLINK ──────────────────────────────────────────────
let blinkTimer = null;
let eyeCenters = null;

function computeEyeCenters() {
  // Derive blink center + radius from SVG path geometry
  function bounds(pathEl) {
    const len = pathEl.getTotalLength();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const p = svgPtToCanvas(pathEl.getPointAtLength(len * i / 20));
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    return { x: (minX+maxX)/2, y: (minY+maxY)/2, r: (maxX-minX)/2 };
  }
  return { left: bounds(eyeLeft), right: bounds(eyeRight) };
}

function doBlink() {
  if (hasDrawn || phase !== 'drawing' || !eyeCenters) return;
  blinkCtx.clearRect(0, 0, blinkCanvas.width, blinkCanvas.height);
  blinkCtx.strokeStyle = penColor;
  blinkCtx.lineWidth   = penWidth() * 2.5;
  blinkCtx.lineCap     = 'round';
  ['left', 'right'].forEach(side => {
    const { x, y, r } = eyeCenters[side];
    blinkCtx.beginPath();
    blinkCtx.moveTo(x - r, y);
    blinkCtx.quadraticCurveTo(x, y - r * 0.4, x + r, y);
    blinkCtx.stroke();
  });
  setTimeout(() => {
    blinkCtx.clearRect(0, 0, blinkCanvas.width, blinkCanvas.height);
    scheduleBlink();
  }, 120);
}

function scheduleBlink() {
  if (hasDrawn || phase !== 'drawing') return;
  blinkTimer = setTimeout(doBlink, 3000 + Math.random() * 3000);
}

function stopBlink() {
  clearTimeout(blinkTimer); blinkTimer = null;
  blinkCtx.clearRect(0, 0, blinkCanvas.width, blinkCanvas.height);
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
  redrawAll();
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
// getPos converts CSS-pixel event coords to canvas-internal pixels
function getPos(e) {
  const { sx, sy } = cssToCanvas();
  if (e.touches && e.touches.length > 0) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
      x: (e.touches[0].clientX - rect.left) * sx,
      y: (e.touches[0].clientY - rect.top)  * sy,
    };
  }
  return { x: e.offsetX * sx, y: e.offsetY * sy };
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
  e.stopPropagation(); clearTimeout(idleTimer); openChat();
});

// ─── OPEN CHAT ──────────────────────────────────────────
function captureMergedCanvas() {
  const merged = document.createElement('canvas');
  merged.width = drawCanvas.width; merged.height = drawCanvas.height;
  const mCtx = merged.getContext('2d');
  if (currentBgHex) {
    mCtx.fillStyle = currentBgHex; mCtx.fillRect(0, 0, merged.width, merged.height);
  } else {
    const h2 = (currentHue + 55) % 360;
    const grad = mCtx.createLinearGradient(0, 0, merged.width, merged.height);
    grad.addColorStop(0, `hsl(${currentHue},65%,50%)`);
    grad.addColorStop(1, `hsl(${h2},65%,44%)`);
    mCtx.fillStyle = grad; mCtx.fillRect(0, 0, merged.width, merged.height);
  }
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
  chatCount = 0;

  stopBlink(); stopHintAnimation(); hideCompleteBtn(); closeAllPopups();

  drawingDataURL = captureMergedCanvas();

  toolbar.style.display = 'none';
  document.body.classList.add('chat-open');
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
  toolbar.style.display = 'flex';
  resetIdleTimer();
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

    // Build song card as an AI chat bubble
    const card = document.createElement('div');
    card.className = 'msg ai city-card';

    const trackLabel = `${data.song || 'Your song'}${data.artist ? ` · ${data.artist}` : ''}`;

    const spotifyHref = data.spotify_url ? `href="${data.spotify_url}" target="_blank" rel="noopener"` : '';
    card.innerHTML = `
      ${data.image ? `<a class="city-card-img-wrap" ${spotifyHref}><img class="city-card-img" src="${data.image}" alt="${trackLabel}"></a>` : ''}
      <div class="city-card-body">
        <div class="city-card-name">${data.song || ''}</div>
        <div class="city-card-artist">${data.artist || ''}</div>
        <div class="city-card-reason">${data.reason || ''}</div>
        ${data.spotify_url ? `<a class="city-card-spotify" href="${data.spotify_url}" target="_blank" rel="noopener">▶ Open in Spotify</a>` : ''}
      </div>`;

    chatMsgs.appendChild(card);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    // Keep input alive — user can ask for another song
    cityRevealed = false;  // allow re-trigger if AI outputs READY:true again
    chatCount    = 0;      // reset so chatCount >= 4 fallback doesn't fire immediately
    chatInput.placeholder = 'Want a different vibe? Tell me…';

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
    addMsg('ai', 'Here are 3 playlists — pick whichever vibe fits 🎵');

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

    chatInput.placeholder = 'Want something different? Tell me…';
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
