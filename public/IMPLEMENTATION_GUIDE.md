# Falling Tech Pills — Implementation Guide

A reusable guide for building the **"Technologies I Use"** portfolio section with Matter.js physics, pill-shaped draggable objects, SVG icons, and custom canvas rendering.

**Reference demo:** [Matter.js Mixed Demo](https://brm.io/matter-js/demo/#mixed)  
**Working sample:** `index.html` in this project

---

## 1. What We Built

A portfolio section with two layers:

| Layer | What it is | Technology |
|-------|-----------|------------|
| **Static UI** | Heading, subtitle, description | HTML + CSS |
| **Physics layer** | Falling pill objects with icon + label | Matter.js + HTML Canvas |

On page load, every technology in a data array spawns above the viewport and falls into a pile at the bottom. Users can **drag** pills around. No click-to-spawn or other actions.

---

## 2. Tech Stack

```
HTML5          → Section structure
CSS            → Layout, typography, pink background (#fff0f0)
Canvas         → Physics viewport + custom drawing
Matter.js 0.19 → 2D physics engine (gravity, collision, drag)
Simple Icons   → SVG brand icons via CDN (optional)
Google Fonts   → Inter (sans) + Instrument Serif (italic subtitle)
```

### Matter.js modules used

```js
Engine, Render, Runner, Bodies, Body, Composite,
Events, Mouse, MouseConstraint, Query, Sleeping, World
```

### CDN links

```html
<!-- Physics -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>

<!-- Fonts -->
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600;700&display=swap');

<!-- Icons (per item in array) -->
https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/{name}.svg
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│  HERO SECTION (static HTML)                 │
│  - Title: "Technologies I Use To Build"     │
│  - Subtitle: "Modern Web Applications"    │
│  - Description paragraph                    │
├─────────────────────────────────────────────┤
│  CANVAS WRAP (physics viewport)             │
│  ┌───────────────────────────────────────┐  │
│  │  Matter.js Engine                     │  │
│  │  ├── Static bodies: floor + walls     │  │
│  │  ├── Dynamic bodies: pill rectangles  │  │
│  │  └── MouseConstraint: drag interaction  │  │
│  │                                       │  │
│  │  Custom afterRender hook:             │  │
│  │  └── Draw pill + SVG icon + text      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Data flow

```
TECH_LANGUAGES array
       ↓
preload SVG images → Image cache (Map)
       ↓
createPill() → Matter.js body (invisible, physics only)
       ↓
spawnAllLanguages() → drop from top with staggered Y
       ↓
afterRender → draw visual pill on canvas each frame
       ↓
MouseConstraint → user drags body, visual follows via afterRender
```

---

## 4. Data Structure (Single Source of Truth)

All technologies live in one array. **Not displayed as a list** — only used to spawn physics objects.

```js
const DEFAULT_SVG = 'data:image/svg+xml,...'; // fallback </> icon

const TECH_LANGUAGES = [
  { svg: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/javascript.svg', text: 'JavaScript' },
  { svg: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/react.svg',         text: 'React' },
  { svg: '/assets/icons/my-tool.svg',                                            text: 'My Tool' },
  // Add more items here — one falling pill per entry
];
```

| Field | Type | Purpose |
|-------|------|---------|
| `svg` | string (URL or path) | Icon drawn inside the pill |
| `text` | string | Label drawn next to the icon |

If `svg` fails to load → falls back to `DEFAULT_SVG`.

---

## 5. Step-by-Step Implementation

### Step 1 — HTML structure

```html
<section class="hero">
  <h1>Technologies I Use To Build</h1>
  <h2>Modern Web Applications</h2>
  <p>Description text...</p>
</section>

<div class="canvas-wrap">
  <canvas id="physics-canvas"></canvas>
</div>
```

### Step 2 — CSS layout

- Page background: `#fff0f0`
- Hero: centered, max-width ~720px
- Canvas wrap: full width, height `min(58vh, 520px)`
- Canvas cursor: `default` (overridden by JS on hover/drag)

### Step 3 — Initialize Matter.js

```js
const engine = Engine.create();
engine.gravity.y = 1.1;
engine.enableSleeping = false; // prevents drag delay on stacked objects

const render = Render.create({
  canvas,
  engine,
  options: {
    width, height,
    background: 'transparent',
    wireframes: false,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  }
});

Runner.run(Runner.create(), engine);
Render.run(render);
```

### Step 4 — Create invisible boundaries

Static bodies the user never sees:

```js
// Floor — below canvas bottom
Bodies.rectangle(width/2, height + 30, width + 200, 80, { isStatic: true, render: { visible: false } })

// Left wall
Bodies.rectangle(-40, height/2, 80, height * 2, { isStatic: true, render: { visible: false } })

// Right wall
Bodies.rectangle(width + 40, height/2, 80, height * 2, { isStatic: true, render: { visible: false } })
```

### Step 5 — Create pill physics bodies

**Key technique:** Use a chamfered rectangle to simulate a capsule/pill shape.

```js
Bodies.rectangle(x, y, width, height, {
  chamfer: { radius: height / 2 },  // fully rounded ends = pill shape
  restitution: 0.35,                 // bounce
  friction: 0.45,                   // surface friction
  frictionAir: 0.012,               // air resistance
  density: 0.0012,
  label: 'pill',
  render: { visible: false }        // hide Matter's default render
});
```

**Width is dynamic** — measured from canvas text + icon size:

```
pillWidth = iconSize + gap + textWidth + paddingX * 2
pillHeight = fontSize + paddingY * 2
```

Store visual data on the body:

```js
body.plugin = { text, svg, fontSize, width, height, contentWidth };
```

### Step 6 — Preload SVG icons

SVGs must be loaded as `Image` objects before drawing on canvas:

```js
const img = new Image();
img.crossOrigin = 'anonymous';
img.src = url;
// cache in Map<url, Image>
```

Preload all icons, then spawn pills:

```js
preloadAllSvgs().then(() => spawnAllLanguages());
```

### Step 7 — Custom canvas rendering

Matter.js handles physics. **We handle visuals** in `afterRender`:

```js
Events.on(render, 'afterRender', () => {
  bodies.filter(b => b.label === 'pill').forEach(body => {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    // 1. Draw gray rounded pill background
    // 2. Draw SVG icon (left side)
    // 3. Draw text label (right of icon)

    ctx.restore();
  });
});
```

This is why text and icons rotate/move perfectly with each object.

### Step 8 — Spawn objects on load

```js
TECH_LANGUAGES.forEach((item, i) => {
  const x = bounds.width * (0.12 + Math.random() * 0.76);
  const y = -50 - i * (34 + Math.random() * 18); // staggered above viewport
  spawnPill(x, y, item);
});
```

Each pill gets a small random angular velocity so they tumble naturally.

### Step 9 — Drag interaction (MouseConstraint)

```js
const mouse = Mouse.create(canvas);
mouse.pixelRatio = render.options.pixelRatio; // critical for accurate hit detection

const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: {
    stiffness: 1,    // 1 = instant grab (0.15 feels laggy/rubbery)
    damping: 0,
    length: 0,
    render: { visible: false }
  }
});
```

**Drag delay fixes applied:**

| Issue | Fix |
|-------|-----|
| Rubber-band lag | `stiffness: 1`, `length: 0`, `damping: 0` |
| Sleeping bodies don't respond | `engine.enableSleeping = false` |
| Momentum carries on grab | Zero velocity on `startdrag` |
| Hit detection offset on retina | `mouse.pixelRatio = render.options.pixelRatio` |

### Step 10 — Smart cursor behavior

```js
// Default arrow on empty canvas
// Pointer when hovering a pill (Query.point)
// Grabbing while dragging (mouseConstraint.body is set)

Query.point(pillBodies, mouse.position)  → pointer
mouseConstraint.body                     → grabbing
otherwise                                → default
```

### Step 11 — Resize handling

On window resize:
1. Update canvas dimensions + pixel ratio
2. Clear world bodies (keep mouseConstraint)
3. Rebuild walls/floor
4. Re-spawn all pills

---

## 6. Visual Design Tokens

```js
PILL_COLOR   = '#d9d9d9'   // light gray pill
TEXT_COLOR   = '#1a1a1a'   // near-black label
BG_COLOR     = '#fff0f0'   // pale pink page
ICON_SIZE    = 18          // px
ICON_GAP     = 8           // px between icon and text
FONT_SIZE    = 15          // px
FONT_WEIGHT  = 600
```

Typography:
- **Title:** Inter 700
- **Subtitle:** Instrument Serif italic
- **Pill labels:** Inter 600

---

## 7. Integrating Into a Real Portfolio

### Option A — Plain HTML/CSS/JS (current)

Copy `index.html` structure directly. Easiest for static sites.

### Option B — React / Next.js component

```
components/
  TechPhysicsSection/
    TechPhysicsSection.tsx   ← hero HTML + canvas mount
    useTechPhysics.ts        ← Matter.js logic in useEffect
    techLanguages.ts         ← TECH_LANGUAGES array
    constants.ts             ← colors, sizes
```

**Important React rules:**
- Initialize Matter.js in `useEffect` only (not during render)
- Clean up on unmount: `Render.stop`, `Runner.stop`, `Engine.clear`, remove event listeners
- Use `useRef` for canvas element
- Do **not** store Matter bodies in React state (causes re-renders)

```tsx
useEffect(() => {
  const engine = Engine.create();
  // ... setup
  return () => {
    Render.stop(render);
    Runner.stop(runner);
    Events.off(render, 'afterRender');
    Engine.clear(engine);
  };
}, []);
```

### Option C — Lazy load for performance

Only init physics when section scrolls into view:

```js
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    initPhysics();
    observer.disconnect();
  }
});
observer.observe(canvasWrap);
```

---

## 8. Customization Checklist

When moving to production, edit these:

- [ ] `TECH_LANGUAGES` — your actual stack
- [ ] Hero copy (title, subtitle, description)
- [ ] `PILL_COLOR`, `TEXT_COLOR`, `BG_COLOR` — match your brand
- [ ] Canvas height (`58vh` / `520px`)
- [ ] Gravity (`engine.gravity.y`) — higher = faster fall
- [ ] Spawn count — one per array item, or subset
- [ ] Icon source — Simple Icons CDN, local `/public/icons/`, or Devicon
- [ ] Font families — match portfolio fonts
- [ ] Mobile — consider fewer items or shorter canvas on small screens

---

## 9. Performance Notes

- **24 pills** runs smoothly on desktop
- Cap `pixelRatio` at 2 to avoid GPU overhead on 4K screens
- Preload SVGs once; cache in a `Map`
- `enableSleeping: false` uses slightly more CPU but needed for responsive drag
- For 50+ items, consider spawning only visible subset or reducing physics iterations

---

## 10. Known Limitations

| Limitation | Workaround |
|-----------|------------|
| Canvas text doesn't inherit CSS fonts until loaded | Wait for `document.fonts.ready` before measuring/spawning |
| SVG CORS from external CDN | Use `crossOrigin = 'anonymous'`; host icons locally if blocked |
| Resize resets pile | Expected — bodies re-drop (or save positions if you want persistence) |
| No touch-specific cursor | Works on touch via MouseConstraint; cursor logic is mouse-only |
| Pills can overlap unreadably | Reduce count or increase canvas height |

---

## 11. File Map (This Project)

```
Falling Object Test/
├── index.html              ← Full working demo
└── IMPLEMENTATION_GUIDE.md ← This document
```

---

## 12. Copy-Paste AI Prompt (For Future Use)

Use this prompt when building or porting the section into your real portfolio:

---

```
Build a "Technologies I Use" portfolio section with Matter.js physics.

GOAL
A hero section with heading + subtitle + description on a pale pink (#fff0f0) background.
Below it, a full-width canvas where pill-shaped objects (gray #d9d9d9) fall from the top,
pile up at the bottom, and can be dragged by the user.

TECH STACK
- HTML + CSS + vanilla JS (or React useEffect if porting to Next.js)
- Matter.js 0.19 via CDN
- HTML Canvas with custom rendering (NOT Matter's default body sprites)
- SVG icons loaded as Image objects and drawn on canvas
- Fonts: Inter (sans) + Instrument Serif italic for subtitle

DATA ARRAY (single source of truth — not shown as a visible list)
const TECH_LANGUAGES = [
  { svg: 'path-or-url-to-icon.svg', text: 'JavaScript' },
  { svg: 'path-or-url-to-icon.svg', text: 'React' },
  ...
];
Each array entry spawns one falling pill. Include a DEFAULT_SVG fallback.

PHYSICS SETUP
- Engine with gravity.y = 1.1, enableSleeping = false
- Static invisible floor + left/right walls
- Pill bodies: Bodies.rectangle() with chamfer.radius = height/2 (capsule shape)
- Body.render.visible = false (we draw custom visuals)
- Store { text, svg, fontSize, width, height } on body.plugin
- Spawn all items staggered above viewport on load with random X and slight angular velocity

CUSTOM RENDERING (Events.on render, 'afterRender')
For each pill body:
1. ctx.translate(position) + ctx.rotate(angle)
2. Draw rounded rectangle (pill background)
3. Draw SVG icon on the left (18px)
4. Draw text label to the right of icon
5. Pill width = icon + gap + measured text width + padding

DRAG INTERACTION
- MouseConstraint with stiffness: 1, damping: 0, length: 0 (instant grab, no rubber-band delay)
- mouse.pixelRatio = render.options.pixelRatio
- On startdrag: zero body velocity and angular velocity
- NO click-to-spawn or other click actions — only fall + drag

CURSOR BEHAVIOR
- default: normal arrow on empty canvas
- pointer: when hovering over a pill (use Query.point)
- grabbing: while actively dragging (mouseConstraint.body is set)

RESPONSIVE
- Canvas height: min(58vh, 520px)
- On resize: update canvas size, rebuild walls, re-spawn pills, re-attach mouseConstraint
- Cap pixelRatio at 2

REFERENCE
Inspired by https://brm.io/matter-js/demo/#mixed
Visual style: light pink bg, gray pill capsules with black text, icons inside pills,
objects pile naturally at bottom like a physics sandbox.

Do NOT show a sidebar list of technologies — the array is code-only for easy editing.
```

---

## 13. Quick Reference — Key Code Patterns

### Pill body creation
```js
Bodies.rectangle(x, y, w, h, {
  chamfer: { radius: h / 2 },
  label: 'pill',
  render: { visible: false }
});
```

### Custom draw hook
```js
Events.on(render, 'afterRender', drawPills);
```

### Instant drag
```js
constraint: { stiffness: 1, damping: 0, length: 0 }
```

### Hover detection
```js
Query.point(pillBodies, mouse.position).length > 0
```

### Add a new technology
```js
{ svg: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/svelte.svg', text: 'Svelte' }
```
Refresh page → new pill spawns and falls.

---

*Last updated: matches `index.html` in Falling Object Test project.*
