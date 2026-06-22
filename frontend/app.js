// ─── CONFIG ─────────────────────────────────────────────
const API_BASE   = 'http://localhost:8000';
const SESSION_ID = crypto.randomUUID();

// ─── DOM ────────────────────────────────────────────────
const drawCanvas   = document.getElementById('drawing-canvas');
const hintEyes     = document.getElementById('hint-eyes');
const eyeLeft      = document.getElementById('eye-left');
const eyeRight     = document.getElementById('eye-right');
const drawCtx      = drawCanvas.getContext('2d');
const colorHint    = document.getElementById('color-hint');
const colorWrap    = document.getElementById('color-picker-wrap');
const colorInput   = document.getElementById('color-input');
const completeBtn  = document.getElementById('complete-btn');
const chatOverlay  = document.getElementById('chat-overlay');
const previewImg   = document.getElementById('preview-img');
const chatMsgs     = document.getElementById('chat-messages');
const chatInput    = document.getElementById('chat-input');
const sendBtn      = document.getElementById('send-btn');
const backBtn      = document.getElementById('back-btn');
const cityReveal   = document.getElementById('city-reveal');
const cityRevealImg    = document.getElementById('city-reveal-img');
const cityRevealReason = document.getElementById('city-reveal-reason');
const cityRevealName   = document.getElementById('city-reveal-name');
const cityRevealWeather = document.getElementById('city-reveal-weather');

// ─── STATE ──────────────────────────────────────────────
let phase        = 'color-select';
let animHue      = Math.random() * 360;
let currentHue   = animHue;
let bgConfirmed  = false;
let penColor     = '#ffffff';
let isDrawing    = false;
let lastPoint    = null;
let lastMid      = null; // for smooth bezier drawing
let idleTimer    = null;
let chatCount    = 0;
let hasDrawn     = false;
let drawingDataURL = null;
let bgRafId      = null;
let currentBgHex = null;

// ─── CANVAS RESIZE ──────────────────────────────────────
function resizeCanvases() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const tmp = drawCanvas.width > 0
    ? drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height)
    : null;
  drawCanvas.width        = w;
  drawCanvas.height       = h;
  drawCanvas.style.width  = w + 'px';
  drawCanvas.style.height = h + 'px';
  if (tmp) try { drawCtx.putImageData(tmp, 0, 0); } catch(_) {}
}
resizeCanvases();
window.addEventListener('resize', resizeCanvases);

// ─── COLOUR UTILITIES ───────────────────────────────────
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function getLuminance(r, g, b) {
  return [r, g, b].reduce((sum, c, i) => {
    const v = c / 255;
    const lin = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return sum + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function updatePenFromRgb(r, g, b) {
  penColor = getLuminance(r, g, b) > 0.25
    ? 'rgba(0,0,0,0.85)'
    : 'rgba(255,255,255,0.85)';
  eyeLeft.style.stroke  = penColor;
  eyeRight.style.stroke = penColor;
}

// ─── BACKGROUND ANIMATION ───────────────────────────────
function applyHueBg(h) {
  const h2 = (h + 55) % 360;
  document.body.style.background =
    `linear-gradient(135deg, hsl(${h},65%,50%), hsl(${h2},65%,44%))`;
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
  cancelAnimationFrame(bgRafId);
  phase = 'drawing';
  colorHint.style.opacity = '0';
  setTimeout(() => { colorHint.style.display = 'none'; }, 400);
  colorWrap.style.display = 'block';
  setTimeout(startHintAnimation, 350);
});

colorInput.addEventListener('input', e => {
  currentBgHex = e.target.value;
  document.body.style.background = currentBgHex;
  updatePenFromRgb(...hexToRgb(currentBgHex));
});

// ─── HINT ANIMATION (SVG eye paths) ─────────────────────
let cachedPenWidth = 2;

function startHintAnimation() {
  hintEyes.style.display = 'block';

  // Measure actual rendered SVG width now that it's visible, cache for canvas
  const rect = hintEyes.getBoundingClientRect();
  const strokeSVG = parseFloat(
    getComputedStyle(hintEyes).getPropertyValue('--eyes-stroke-width').trim()
  ) || 15.82;
  cachedPenWidth = strokeSVG * (rect.width / 205); // 205 = viewBox width units

  // Set dasharray from actual path length so animation draws fully
  [eyeLeft, eyeRight].forEach(el => {
    const len = Math.ceil(el.getTotalLength()) + 2;
    el.style.strokeDasharray  = len;
    el.style.strokeDashoffset = len;
    // Restart animation via reflow trick
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

// Hide eyes entirely (used when entering chat)
function hideHint() {
  hintEyes.style.display = 'none';
  [eyeLeft, eyeRight].forEach(el => { el.style.animation = 'none'; });
}

// ─── DRAWING ────────────────────────────────────────────
function getPos(e) {
  if (e.touches && e.touches.length > 0) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }
  return { x: e.offsetX, y: e.offsetY };
}

function setupCtx() {
  drawCtx.strokeStyle = penColor;
  drawCtx.fillStyle   = penColor;
  drawCtx.lineWidth   = cachedPenWidth;
  drawCtx.lineCap     = 'round';
  drawCtx.lineJoin    = 'round';
}

function pointerDown(e) {
  if (phase !== 'drawing') return;
  // Don't touch hint — let eyes stay visible while drawing
  hideCompleteBtn();
  isDrawing = true;
  lastMid   = null;
  lastPoint = getPos(e);
  setupCtx();
  // Draw a dot on tap/click
  drawCtx.beginPath();
  drawCtx.arc(lastPoint.x, lastPoint.y, cachedPenWidth / 2, 0, Math.PI * 2);
  drawCtx.fill();
  e.preventDefault();
}

function pointerMove(e) {
  if (!isDrawing || phase !== 'drawing') return;
  const cur = getPos(e);
  const mid = { x: (lastPoint.x + cur.x) / 2, y: (lastPoint.y + cur.y) / 2 };

  setupCtx();
  drawCtx.beginPath();
  // Quadratic bezier from lastMid (or lastPoint) through lastPoint to mid → smooth
  if (lastMid) {
    drawCtx.moveTo(lastMid.x, lastMid.y);
  } else {
    drawCtx.moveTo(lastPoint.x, lastPoint.y);
  }
  drawCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
  drawCtx.stroke();

  lastMid   = mid;
  lastPoint = cur;
  e.preventDefault();
}

function pointerUp(e) {
  if (!isDrawing) return;
  isDrawing = false;
  lastPoint = null;
  lastMid   = null;
  hasDrawn  = true;
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
  }, 2500);
}

function showCompleteBtn() {
  completeBtn.style.display = 'block';
}

function hideCompleteBtn() {
  clearTimeout(idleTimer);
  completeBtn.style.display = 'none';
}

// ─── COMPLETE ───────────────────────────────────────────
completeBtn.addEventListener('click', e => {
  e.stopPropagation();
  clearTimeout(idleTimer);
  captureAndStartChat();
});

function drawBgOnCanvas(ctx, w, h) {
  if (currentBgHex) {
    ctx.fillStyle = currentBgHex;
    ctx.fillRect(0, 0, w, h);
  } else {
    const h2   = (currentHue + 55) % 360;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${currentHue},65%,50%)`);
    grad.addColorStop(1, `hsl(${h2},65%,44%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

async function captureAndStartChat() {
  phase = 'chat';
  hideHint();

  const merged = document.createElement('canvas');
  merged.width  = drawCanvas.width;
  merged.height = drawCanvas.height;
  const mCtx = merged.getContext('2d');
  drawBgOnCanvas(mCtx, merged.width, merged.height);
  mCtx.drawImage(drawCanvas, 0, 0);
  drawingDataURL = merged.toDataURL('image/jpeg', 0.85);

  previewImg.src = drawingDataURL;
  chatOverlay.style.display = 'flex';
  completeBtn.style.display  = 'none';

  const typing = addMsg('ai', '...', true);
  try {
    const res  = await fetch(`${API_BASE}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        message:    'analyze_drawing',
        session_id: SESSION_ID,
        image:      drawingDataURL,
      }),
    });
    const data = await res.json();
    typing.classList.remove('typing');
    typing.textContent = data.reply;
    chatCount++;
    if (data.ready || chatCount >= 5) setTimeout(fetchCity, 600);
  } catch (err) {
    typing.textContent = 'Could not reach the server.';
    console.error(err);
  }
}

// ─── CHAT ───────────────────────────────────────────────
async function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg || phase !== 'chat') return;
  chatInput.value = '';

  addMsg('user', msg);
  const typing = addMsg('ai', '...', true);

  try {
    const res  = await fetch(`${API_BASE}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: msg, session_id: SESSION_ID }),
    });
    const data = await res.json();
    typing.classList.remove('typing');
    typing.textContent = data.reply;
    chatCount++;
    if (data.ready || chatCount >= 5) setTimeout(fetchCity, 600);
  } catch (err) {
    typing.textContent = 'Error — is the backend running?';
    console.error(err);
  }
}

// ─── CITY RESULT ────────────────────────────────────────
async function fetchCity() {
  const typing = addMsg('ai', '...', true);
  try {
    const res  = await fetch(`${API_BASE}/city-result`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: 'reveal', session_id: SESSION_ID }),
    });
    const data = await res.json();
    typing.remove();

    // Close chat dialog, show city reveal card
    chatOverlay.style.display = 'none';

    if (data.image)  cityRevealImg.src = data.image;
    cityRevealReason.textContent = data.reason || '';
    cityRevealName.textContent   =
      (data.city || '') + (data.country ? `, ${data.country}` : '');
    cityRevealWeather.textContent =
      data.weather?.main
        ? `🌡️ ${data.weather.main.temp}°C · ${data.weather.weather[0].description}`
        : '';

    cityReveal.classList.add('visible');

  } catch (err) {
    typing.textContent = 'Could not load city result.';
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

sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

// ─── BACK TO DRAWING ────────────────────────────────────
backBtn.addEventListener('click', () => {
  chatOverlay.style.display = 'none';
  phase = 'drawing';
  // Reset chat state so a fresh session starts next time
  chatCount = 0;
  chatMsgs.innerHTML = '';
  // Idle timer restarts when user draws again
});
