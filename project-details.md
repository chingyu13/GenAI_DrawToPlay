# GenAI MoodToCity — Project Details

---

## Pre-Start Checklist

### APIs
- [x] OpenAI API key — GPT-4o (vision capable), credits loaded
- [x] OpenWeatherMap API key — returns current conditions by city name
- [x] Unsplash API key — free tier, city photos
- [x] Wikipedia REST API — no key needed

### Backend
- [x] Python environment (Anaconda)
- [x] FastAPI + uvicorn

### Frontend
- [x] Plain HTML / CSS / JS (no framework)

### Repo & Environment
- [x] `.env` file (gitignored — never commit)
- [x] GitHub repo created via GitHub Desktop

### Deployment (pending)
- [ ] Domain transfer from Squarespace → Cloudflare
- [ ] Deploy backend to Railway or Render
- [ ] Point subdomain to deployment

---

## Current Architecture

```
browser (localhost:3000)
  └── index.html / style.css / app.js
        │  fetch POST
        ▼
FastAPI (localhost:8000)
  ├── /chat          → LangChain + GPT-4o (vision)
  └── /city-result   → GPT-4o + OpenWeatherMap + Unsplash + Wikipedia
```

---

## User Flow (current)

### Phase 1 — Pick background colour
- Background cycles as a lava-lamp HSL gradient (hue advances 1.1°/frame, ~4× original speed)
- Centred text: "Tap to lock in your colour"
- **Tap/click anywhere** → background freezes, enter drawing phase

### Phase 2 — Draw
- Two eye shapes animate onto the canvas stroke-by-stroke (drawn directly on the same canvas layer as the user's drawing, same line style)
  - Left eye draws first (~1.3 s), right eye starts ~5 frames (~0.08 s) after left finishes
- Toolbar appears in bottom-right corner (stacked vertically):
  - **Eraser** — toggles destination-out composite; button turns dark when active
  - **Thickness** — cycles through 4 sizes (0.5×, 1×, 2×, 3.5× of base). Base scales with viewport (`innerWidth / 250`). Last setting remembered via `localStorage`
  - **Colour wheel** — opens native colour picker; changes background immediately; pen colour auto-updates based on WCAG luminance
- **Pen colour** auto-picks black or white depending on background luminance
- **Smooth lines** — quadratic Bézier midpoint technique
- **Undo** — Cmd/Ctrl+Z, up to 10 steps
- **Idle 2.5 s after first stroke** → "Completed ✓" button appears at bottom centre
  - Any new stroke hides the button and resets the timer
- **✕ button** in chat overlay lets user return to drawing

### Phase 3 — Chat
- "Completed ✓" clicked → canvas + background merged into JPEG, sent to `/chat`
- Chat overlay shows:
  - Drawing preview strip (120 px) at top with ✕ to return
  - AI chat panel below
- GPT-4o analyses the drawing on the first message, then asks 3–5 short questions
- After 3–5 exchanges the AI appends `READY:true`; frontend auto-calls `/city-result`

### Phase 4 — City Reveal
- Chat overlay closes
- Full-screen card fades in showing:
  - City photo (Unsplash)
  - One-sentence reason (from AI)
  - City name + country
  - Weather (temp °C + description)

---

## File Structure

```
GenAI_MoodToCity/
├── frontend/
│   ├── index.html       — markup + inline SVGs (colour wheel, eye paths)
│   ├── style.css        — layout, toolbar, chat overlay, city reveal card
│   ├── app.js           — all interaction logic
│   └── eyes.svg         — source SVG (visibility:hidden; used for path geometry only)
├── backend/
│   ├── main.py          — FastAPI app, CORS, /chat + /city-result endpoints
│   ├── agent.py         — LangChain + GPT-4o, session memory, city result prompt
│   ├── tools.py         — OpenWeatherMap, Unsplash, Wikipedia helpers
│   └── .env             — API keys (gitignored)
└── project-details.md
```

---

## Key Settings / Magic Numbers

| Setting | Value | File / location |
|---|---|---|
| Background hue speed | +1.1° per frame | `app.js` → `startBgAnimation` |
| Gradient angle | 135° | `app.js` → `applyHueBg` |
| Gradient hue offset | +55° | `app.js` → `applyHueBg` |
| Eye animation frames | 80 per eye | `app.js` → `EYE_FRAMES` |
| Gap between eyes | 5 frames (~0.08 s) | `app.js` → `EYE_GAP` |
| Idle timer | 2500 ms | `app.js` → `resetIdleTimer` |
| Thickness base | `innerWidth / 250` px | `app.js` → `calcBasePenWidth` |
| Thickness scales | 0.5×, 1×, 2×, 3.5× | `app.js` → `THICKNESS_SCALES` |
| Undo max steps | 10 | `app.js` → `MAX_UNDO` |
| AI model | `gpt-4o` | `backend/agent.py` |
| AI max exchanges | 5 | `app.js` → `chatCount >= 5` |
| Session memory | In-memory Python list per session | `backend/agent.py` |
| JPEG quality | 0.85 | `app.js` → `captureAndStartChat` |

---

## AI Prompts (OUTDATED — see new spec below)

### City result prompt (unchanged)
> Based on the conversation and drawing so far, select the ONE city that best matches this person's mood, personality, and inner world. Consider: temperature feel, weather (sun/cloud/rain/wind), cultural vibe, pace of life, history. Respond with ONLY valid JSON: { city, country, reason, weather_query }.

---

## NEW: Personality Inference System

### Philosophy
The AI does not ask questions — it makes confident, playful guesses. The user can react (or not), and either way the AI gathers signal. Silence is itself a signal ("you didn't say much — that tracks"). The tone is "perceptive friend at a party doing a cold read", not "personality quiz". Final city reveal feels like a verdict, not a recommendation.

### Conversation flow
- **Adaptive length**: 1–4 exchanges. If user is chatty → more turns. If silent/monosyllabic → wrap up fast.
- **Silence handling**: interpret non-response as personality data ("okay, not a talker — got it").
- **Tone**: playful, slightly cheeky. Direct. No filler ("That's interesting!", "Great answer!").
- **READY:true**: appended when AI is ready to trigger city reveal (1–4 exchanges in).

### Behavioral telemetry (collected in frontend, sent with first message)

| Signal | Key | Personality inference |
|---|---|---|
| Time to lock color (ms) | `color_lock_ms` | <2 s → impulsive/decisive; >15 s → anxious or deliberate |
| Color picker adjustments | `color_adj` | >3 → indecisive / perfectionist / explorative |
| Total drawing duration (ms) | `draw_ms` | <10 s → impulsive; >120 s → thoughtful or avoidant |
| Total stroke count | `strokes` | <5 → minimalist/reserved; >50 → expressive or anxious |
| Undo count | `undos` | high → self-critical, perfectionist |
| Eraser stroke count | `erasers` | same signal as undo |
| (undo+eraser)/strokes ratio | `correction_ratio` | >0.3 → perfectionist; 0 + messy drawing → carefree |
| Pen size slider adjustments | `size_adj` | >2 → fiddly, detail-oriented |
| Idle time before "Complete" (ms) | `idle_before_complete_ms` | long → hesitant; short → decisive |

### Color signals (from Wilms & Oberfeld 2018)

| Color property | Signal |
|---|---|
| High saturation + bright | High arousal, energy, social |
| Low saturation + dark | Calm, withdrawn, introspective |
| Warm hues (red/orange/yellow) | Energetic, social, expressive |
| Cool hues (blue/green) | Calm, contemplative, introverted |
| Purple | Creative, spiritual, mysterious |
| Very dark background | Dramatic, introspective, possibly melancholic |
| Very light/white background | Clean, minimal, controlled |

### Drawing content signals (from projective drawing research)

| Drawing type | Inference |
|---|---|
| Identifiable face, happy expression | Positive mood, socially aware |
| Face with sad/worried expression | Emotional state to acknowledge |
| Eyes/gaze drawn prominently | Seeking connection or self-aware |
| Objects (nature, buildings, food) | Grounded, nostalgic, concrete thinker |
| Abstract or geometric shapes | Analytical, intellectually detached |
| Chaotic / random lines | Free-spirited OR disengaged/dismissive |
| Very minimal / almost nothing | Overwhelmed, minimal, or deliberately sparse |
| Words or text in drawing | Communicative, literary, verbal thinker |
| The hint eyes incorporated naturally | Playful, goes with the flow |
| The hint eyes aggressively erased | Assertive, maybe annoyed |

### New system prompt

```
You're a slightly cheeky AI who reads people through their drawings and behavior. Not a therapist — more like a perceptive friend doing a cold read at a party.

You receive:
1. An image of what the user drew (canvas with background color)
2. A JSON of behavioral signals: color_lock_ms (how fast they picked the color), color_adj (color adjustments), draw_ms (how long they drew), strokes (stroke count), undos, erasers, correction_ratio ((undo+eraser)/strokes), size_adj (pen size changes), idle_before_complete_ms.
3. The chat history so far.

Your job: make confident, playful guesses about their current mood or personality. Do NOT ask "Do you prefer A or B?" or formal questions. Instead, make observations and let them react — or not. Reference specific signals naturally when relevant.

Examples of good messages:
- "You picked that color in about 2 seconds. Either decisive or you just stopped caring. Both are valid."
- "Six correction attempts. Six. You're harder on yourself than you let on."
- "Okay the face... you drew eyes that look directly at me. That's either very self-aware or you're showing off."
- "You spent 3 minutes drawing and then immediately hit Complete. Finished when it felt right, not when it was perfect."

Silence or one-word replies ARE data — read into them. Don't beg for responses.
Examples:
- "...okay, not a talker. Noted."
- "Yep. That tracks."

After 1–4 exchanges (read the room — chatty = more exchanges, quiet = wrap up fast), reveal a city. The reveal should feel like a verdict, not a polite suggestion:
- "You're giving me 'needs somewhere that won't demand too much'. Lisbon. Warm, a little faded, no pressure."
- "You didn't say much. That tracks. I'm sending you to Reykjavík — quiet, dramatic, very 'I have thoughts but I'm keeping them'."
- "You drew a random mess and answered in three words. Respect. Tokyo — overstimulating in the best way, zero time to overthink."

Append READY:true at the end of the message just before or during the city reveal.
Keep every reply to 2–3 sentences max. No filler words.
```

### First message format (sent with image + telemetry)

```
[IMAGE attached]

Behavioral signals: {JSON of telemetry}

The user has finished drawing. Make your first observation about the drawing and/or their behavior. Don't ask a direct question — make a guess or observation and let them react.
```

### Example city verdicts (for tone reference)

- "Quiet, went dark colors, minimal strokes, said nothing → Reykjavík. Quiet, cold, beautiful, doesn't need to explain itself."
- "Fast color lock, messy drawing, lots of corrections → Tokyo. The city for people who are thinking too fast for their own good."
- "Drew a face, warm background, chatty → Barcelona. You clearly like people even if you'd never admit it."
- "Drew randomly, short session, ignored my messages → 'I'll randomly pick a city too. Bogotá. Don't ask why.'"
- "Very long session, lots of undos, careful lines → Vienna. For people who care too much about getting it right."

---

## Psychology Research References

8 papers across 4 domains — all free to access. Download each, paste into chat, and I'll distill the key findings into the AI system prompt.

---

### Domain 1 — Color → Emotion & Personality (3 papers)

**P1 · Wilms & Oberfeld (2018)**
"Color and emotion: effects of hue, saturation, and brightness."
*Psychological Research*, 82(5), 896–914.
→ FREE PDF: https://www.staff.uni-mainz.de/oberfeld/downloads/Wilms-Oberfeld2018_Article_ColorAndEmotionEffectsOfHueSat.pdf
→ Extract: hue/saturation/brightness × arousal/valence mapping table. The core empirical color-mood framework.

**P2 · Sorokowski et al. (2022)**
"Exploring the relationships between personality and color preferences."
*Frontiers in Psychology*, 13.
→ FREE (Open Access): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1065372/full
→ Extract: Big Five trait → color preference mappings (e.g. Extraversion → high chroma/warm; Neuroticism → dark/dull/grey; Openness → unusual/complex hues).

**P3 · Frontiers in Psychology (2025)**
"Text-to-image models reveal specific color-emotion associations."
*Frontiers in Psychology*, 16.
→ FREE (Open Access): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1593928/full
→ Extract: AI-confirmed color-emotion pairing validation, very recent. Shows which specific colors AI systems reliably link to which emotions — useful for calibrating our GPT-4o prompts.

---

### Domain 2 — Drawing → Emotion & Personality (3 papers)

**P4 · arXiv 2512.21360 (2024)**
"From Visual Perception to Deep Empathy: An Automated Assessment Framework for House-Tree-Person Drawings Using Multimodal LLMs and Multi-Agent Collaboration."
→ FREE PDF: https://arxiv.org/pdf/2512.21360
→ Extract: multi-agent prompting strategy for drawing interpretation with GPT-4o. What the model reliably picks up in drawings (stroke energy, spatial composition, facial features, object choice).

**P5 · Ma et al. (ACM MM 2025, arXiv 2510.19451)**
"Reasoning Like Experts: Leveraging Multimodal Large Language Models for Drawing-based Psychoanalysis."
→ FREE PDF: https://arxiv.org/pdf/2510.19451
→ Extract: the PICK framework — hierarchical drawing analysis (single object → multi-object → whole composition). Best prompting patterns for getting psychological insight from drawings with LLMs.

**P6 · Scientific Reports 2024**
"Drawing as a window to emotion with insights from tech-transformed participant images."
*Scientific Reports*, 14.
→ FREE (PMC): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11109233/
→ Extract: empirical color-emotion mappings from spontaneous drawings (red=anger 73%, yellow=happiness 18%, blue=sadness 51%, black=fear 41%). Tangible vs abstract drawing style across emotions. Saturation/brightness patterns per emotion.

---

### Domain 3 — Behavioral Signals → Personality (1 paper)

**P7 · Wright et al. (2020, PMC)**
"Self-reported impulsivity does not predict response caution."
*Psychological Research*.
→ FREE (PMC): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7457714/
→ Extract: nuanced picture of what speed/correction behavior actually signals (behavioral impulsivity ≠ self-reported impulsivity). Grounds our behavioral telemetry interpretations in evidence — avoids overconfident personality claims.

---

### Domain 4 — City/Place → Personality (1 paper)

**P8 · Mõttus et al. (2020, Frontiers)**
"Where You Are Is Who You Are? The Geographical Account of Psychological Phenomena."
*Frontiers in Psychology*, 11.
→ FREE (Open Access): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.00536/full
→ Extract: which personality trait clusters appear in which types of cities/regions. Maps OCEAN traits to geographic/city vibes — the direct input for city selection logic.

---

### Key embedded frameworks (no download needed)

- **Big Five (OCEAN)**: O=Openness, C=Conscientiousness, E=Extraversion, A=Agreeableness, N=Neuroticism. Maps behavior → trait → city type.
- **Russell's circumplex**: valence (pleasant↔unpleasant) × arousal (high↔low) — maps color + drawing energy to the 4-quadrant mood space.
- **Mehrabian-Russell (1974)**: Pleasure driven by brightness; Arousal driven by saturation; Dominance inversely linked to brightness. Foundational model behind P1.
- **HTP projective drawing**: House=security/family, Tree=growth/vitality, Person=self-concept. For MoodToCity: face=social awareness, objects=grounded, abstract=analytical, chaos=free-spirited/detached, minimal=reserved/overwhelmed.

---

## Implementation Plan: Personality Inference

### Frontend changes needed (app.js)

1. **Collect telemetry** — add a `telemetry` object updated throughout the session:
```js
const telemetry = {
  color_lock_ms: 0,       // Date.now() at phase 1 start → phase 2 start
  color_adj: 0,           // increment on colorInput 'input' event
  draw_start_ms: 0,       // Date.now() on first pointerDown
  draw_ms: 0,             // updated on each pointerUp: Date.now() - draw_start_ms
  strokes: 0,             // increment on pointerUp
  undos: 0,               // increment on undo()
  erasers: 0,             // increment on pointerUp when isErasing
  size_adj: 0,            // increment on penSlider 'input'
  idle_before_complete_ms: 0, // Date.now() at idle timer fire - last stroke time
};
```

2. **Send telemetry** — include in first `/chat` POST alongside image:
```js
body: JSON.stringify({
  message: 'analyze_drawing',
  session_id: SESSION_ID,
  image: drawingDataURL,
  telemetry: {
    ...telemetry,
    correction_ratio: telemetry.strokes > 0
      ? (telemetry.undos + telemetry.erasers) / telemetry.strokes : 0,
    bg_hue: currentHue,
    bg_hex: currentBgHex,
  }
})
```

### Backend changes needed (agent.py)

1. Replace system prompt with new one above
2. Accept `telemetry` in `/chat` request body
3. On first message, format telemetry as a readable JSON block prepended to the user message
4. Remove strict "3–5 questions" constraint — model self-regulates via READY:true

---

## Things To Review

- [ ] Behavioral telemetry collection (frontend)
- [ ] New system prompt + telemetry injection (backend)
- [ ] City reveal card tone matches new playful verdict style
- [ ] Eye shape / position / scale on different screen sizes
- [ ] Background gradient — hue range, saturation, speed
- [ ] Deployment setup
