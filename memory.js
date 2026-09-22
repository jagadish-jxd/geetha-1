/* ============================================================
   OUR LITTLE MEMORIES — Interactive Memory Album Engine
   ============================================================ */
import { initHeartCursor } from './heart-cursor.js';

// 1. Immediate Browser Refresh Guard (Redirects to first page on refresh)
(function checkRefreshGuard() {
  try {
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = (navEntries && navEntries.length > 0 && navEntries[0].type === 'reload') ||
      (window.performance && window.performance.navigation && window.performance.navigation.type === 1);

    if (isReload) {
      window.location.replace('index.html');
      return;
    }
  } catch (e) {
    // Ignore error
  }
})();

window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    window.location.replace('index.html');
  }
});

// Selectors
const $ = (id) => document.getElementById(id);
const counterText = $('counterText');
const burstCanvas = $('burstCanvas');
const bctx = burstCanvas ? burstCanvas.getContext('2d') : null;
const ambientCanvas = $('ambientCanvas');
const actx = ambientCanvas ? ambientCanvas.getContext('2d') : null;
const petalsCanvas = $('petalsCanvas');
const pctx = petalsCanvas ? petalsCanvas.getContext('2d') : null;
const celebrationBanner = $('celebrationBanner');

const lightbox = $('memoryLightbox');
const lightboxImg = $('lightboxImg');
const lightboxCaption = $('lightboxCaption');
const lightboxClose = $('lightboxClose');
const lightboxBackdrop = $('lightboxBackdrop');

let revealedCount = 0;
const TOTAL_MEMORIES = 8;

// ============================================================
// CANVAS RESIZING & AMBIENT MOTES
// ============================================================
let W = window.innerWidth;
let H = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvases() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (burstCanvas && bctx) {
    burstCanvas.width = Math.round(W * dpr);
    burstCanvas.height = Math.round(H * dpr);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  if (ambientCanvas && actx) {
    ambientCanvas.width = Math.round(W * dpr);
    ambientCanvas.height = Math.round(H * dpr);
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  if (petalsCanvas && pctx) {
    petalsCanvas.width = Math.round(W * dpr);
    petalsCanvas.height = Math.round(H * dpr);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// Ambient floating particles
const ambientMotes = [];
const MOTE_COLORS = ['rgba(255,180,205,', 'rgba(255,220,180,', 'rgba(255,255,255,', 'rgba(230,160,220,'];

for (let i = 0; i < 35; i++) {
  ambientMotes.push({
    x: Math.random() * W,
    y: Math.random() * H,
    radius: 1.5 + Math.random() * 3.5,
    colorPrefix: MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)],
    alpha: 0.2 + Math.random() * 0.5,
    vx: -0.3 + Math.random() * 0.6,
    vy: -0.4 - Math.random() * 0.5,
    pulseSpeed: 0.02 + Math.random() * 0.03,
    phase: Math.random() * Math.PI * 2,
  });
}

function renderAmbient() {
  if (!actx) return;
  actx.clearRect(0, 0, W, H);

  for (const m of ambientMotes) {
    m.phase += m.pulseSpeed;
    m.x += m.vx;
    m.y += m.vy;

    if (m.y < -10) m.y = H + 10;
    if (m.x < -10) m.x = W + 10;
    if (m.x > W + 10) m.x = -10;

    const curAlpha = Math.max(0.1, m.alpha + Math.sin(m.phase) * 0.25);
    actx.beginPath();
    actx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    actx.fillStyle = `${m.colorPrefix}${curAlpha.toFixed(2)})`;
    actx.fill();
  }

  requestAnimationFrame(renderAmbient);
}
requestAnimationFrame(renderAmbient);

// ============================================================
// BALLOON POP PARTICLES SYSTEM
// ============================================================
const particles = [];
const PARTICLE_PALETTE = ['#ff4d84', '#ffd166', '#ff7a59', '#e23b67', '#ff8fae', '#f9c5d1', '#fff'];

function drawHeart(ctx, x, y, size, color, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(0, topCurveHeight);
  ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
  ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size * 0.75, 0, size);
  ctx.bezierCurveTo(0, size * 0.75, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
  ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPetal(ctx, x, y, size, color, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.5, size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ============================================================
// FALLING HEART PETALS ENGINE (ROMANTIC AMBIENCE)
// ============================================================
const memoryPetals = [];
const HEART_COLORS = [
  '#ff4d84', '#ff7a9e', '#f4577f', '#ffd1dc', '#ffb6c1', '#f9c5d1', '#e84370', '#ffe4e8'
];

function spawnMemoryHeartPetal(initialY = null) {
  const isHeart = Math.random() < 0.72;
  const size = isHeart ? 14 + Math.random() * 16 : 10 + Math.random() * 12;
  memoryPetals.push({
    x: Math.random() * W,
    y: initialY !== null ? initialY : -size - Math.random() * 25,
    vx: -0.5 + Math.random() * 1.0,
    vy: 1.1 + Math.random() * 1.6,
    sway: 0.018 + Math.random() * 0.024,
    swayAmp: 22 + Math.random() * 28,
    phase: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    vrot: -0.02 + Math.random() * 0.04,
    size,
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    alpha: 0.65 + Math.random() * 0.28,
    isHeart,
  });
}

// Initial romantic shower of heart petals on memory page load
for (let i = 0; i < 30; i++) {
  spawnMemoryHeartPetal(Math.random() * H);
}

function renderMemoryPetals() {
  if (!pctx) return;
  pctx.clearRect(0, 0, W, H);

  // Maintain ~30-34 falling heart petals
  if (memoryPetals.length < 34 && Math.random() < 0.28) {
    spawnMemoryHeartPetal(-20);
  }

  for (let i = memoryPetals.length - 1; i >= 0; i--) {
    const p = memoryPetals[i];
    p.phase += p.sway;
    p.x += p.vx + Math.sin(p.phase) * (p.swayAmp * 0.035);
    p.y += p.vy;
    p.rot += p.vrot;

    if (p.isHeart) {
      drawHeart(pctx, p.x, p.y, p.size, p.color, p.alpha, p.rot);
    } else {
      drawPetal(pctx, p.x, p.y, p.size, p.color, p.alpha, p.rot);
    }

    if (p.y > H + 40 || p.x < -40 || p.x > W + 40) {
      memoryPetals.splice(i, 1);
      spawnMemoryHeartPetal(-25);
    }
  }

  requestAnimationFrame(renderMemoryPetals);
}
requestAnimationFrame(renderMemoryPetals);

function spawnBalloonBurst(cx, cy, count = 48) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 320;
    const isHeart = Math.random() < 0.45;
    const isPetal = !isHeart && Math.random() < 0.6;
    const size = isHeart ? 14 + Math.random() * 16 : (isPetal ? 12 + Math.random() * 14 : 4 + Math.random() * 8);

    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      gravity: 160 + Math.random() * 120,
      drag: 0.94,
      rot: Math.random() * Math.PI * 2,
      vrot: -4 + Math.random() * 8,
      size,
      color: PARTICLE_PALETTE[Math.floor(Math.random() * PARTICLE_PALETTE.length)],
      alpha: 1,
      isHeart,
      isPetal,
      life: 0,
      maxLife: 1.4 + Math.random() * 1.2,
    });
  }

  if (!burstRunning) {
    burstRunning = true;
    lastBurstT = performance.now();
    requestAnimationFrame(renderBurstParticles);
  }
}

let burstRunning = false;
let lastBurstT = 0;

function renderBurstParticles(now) {
  const dt = Math.min(0.05, (now - lastBurstT) / 1000);
  lastBurstT = now;

  if (!bctx) return;
  bctx.clearRect(0, 0, W, H);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    p.vx *= p.drag;
    p.vy = (p.vy + p.gravity * dt) * p.drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;

    if (p.life > p.maxLife * 0.6) {
      p.alpha = Math.max(0, 1 - (p.life - p.maxLife * 0.6) / (p.maxLife * 0.4));
    }

    if (p.life >= p.maxLife || p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    if (p.isHeart) {
      drawHeart(bctx, p.x, p.y, p.size, p.color, p.alpha, p.rot);
    } else if (p.isPetal) {
      drawPetal(bctx, p.x, p.y, p.size, p.color, p.alpha, p.rot);
    } else {
      bctx.save();
      bctx.globalAlpha = p.alpha;
      bctx.fillStyle = p.color;
      bctx.beginPath();
      bctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      bctx.fill();
      bctx.restore();
    }
  }

  if (particles.length > 0) {
    requestAnimationFrame(renderBurstParticles);
  } else {
    burstRunning = false;
    bctx.clearRect(0, 0, W, H);
  }
}

// Celebration Shower when all 5 are discovered
function spawnCelebrationShower() {
  if (celebrationBanner) {
    celebrationBanner.classList.add('is-active');
  }

  for (let burst = 0; burst < 3; burst++) {
    setTimeout(() => {
      spawnBalloonBurst(W * (0.2 + burst * 0.3), H * 0.35, 40);
    }, burst * 350);
  }
}

// ============================================================
// MEMORY BALLOON CLICK INTERACTION
// ============================================================
function setupMemoryItem(item) {
  const balloon = item.querySelector('.balloon-btn');
  const card = item.querySelector('.memory-card');
  const imgBox = item.querySelector('.memory-card__img-box');
  const img = item.querySelector('.memory-card__img');
  const caption = item.querySelector('.memory-card__caption');

  if (!balloon || !card) return;

  // Fallback handler for images
  if (img) {
    let errorTry = 0;
    const originalSrc = img.getAttribute('src');
    img.addEventListener('error', () => {
      errorTry++;
      const id = item.getAttribute('data-id');
      if (errorTry === 1) {
        img.src = `./media/memories/Memory${id}.jpeg`;
      } else if (errorTry === 2) {
        img.src = `/media/memories/Memory${id}.jpg`;
      } else if (errorTry === 3) {
        img.src = `media/memories/Memory${id}.jpeg`;
      } else if (errorTry === 4) {
        img.src = `media/memories/Memory${id}.jpg`;
      } else if (errorTry === 5) {
        img.src = `/media/memories/memory${id}.jpeg`;
      } else if (errorTry === 6) {
        img.src = `/media/memories/memory${id}.jpg`;
      }
    });
  }

  // Balloon click -> Burst -> Reveal Photo
  balloon.addEventListener('click', (e) => {
    if (item.getAttribute('data-revealed') === 'true') return;
    item.setAttribute('data-revealed', 'true');

    // Get balloon center coordinates for particle burst
    const rect = balloon.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.42;

    // Trigger pop CSS animation
    balloon.classList.add('is-popping');

    // Spawn rich particle explosion locally around balloon
    spawnBalloonBurst(cx, cy, 52);

    // After brief pop animation, remove balloon and reveal photo card
    setTimeout(() => {
      balloon.style.display = 'none';
      balloon.remove();

      card.classList.add('is-revealed');
      card.setAttribute('aria-hidden', 'false');

      // Update counter
      revealedCount++;
      if (counterText) {
        counterText.textContent = `${revealedCount} of ${TOTAL_MEMORIES} Memories Discovered`;
      }

      // Check if all memories unlocked
      if (revealedCount === TOTAL_MEMORIES) {
        setTimeout(spawnCelebrationShower, 700);
      }
    }, 180);
  });

  // Lightbox View on Click
  if (imgBox && img) {
    imgBox.addEventListener('click', () => {
      const subquote = item.querySelector('.memory-card__subquote');
      const fullText = caption ? (caption.textContent + (subquote ? '\n' + subquote.textContent : '')) : '';
      openLightbox(img.src, fullText);
    });
  }
}

// Initialize all memory items
document.querySelectorAll('.memory-item').forEach(setupMemoryItem);

// ============================================================
// LIGHTBOX MODAL
// ============================================================
function openLightbox(src, text) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  if (lightboxCaption) lightboxCaption.textContent = text;
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) {
    closeLightbox();
  }
});

// Smooth entrance fade from letter page
const pageTransitionVeil = document.getElementById('pageTransitionVeil');
if (pageTransitionVeil) {
  requestAnimationFrame(() => {
    pageTransitionVeil.classList.add('is-hidden');
    setTimeout(() => {
      try { pageTransitionVeil.remove(); } catch (_) {}
    }, 500);
  });
}

initHeartCursor();
