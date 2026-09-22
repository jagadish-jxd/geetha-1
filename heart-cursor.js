import './heart-cursor.css';

export function initHeartCursor(){
  // Prevent duplicate initialization
  if (document.getElementById('heartCursor')) return;

  // Touch screen check: keep native touch on phones/tablets
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouch) return;

  // 1. Create DOM Elements
  const cursor = document.createElement('div');
  cursor.className = 'heart-cursor';
  cursor.id = 'heartCursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `
    <div class="heart-cursor__icon">
      <svg viewBox="0 0 28 26" width="100%" height="100%" fill="none">
        <defs>
          <linearGradient id="curHeartG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff6b95" />
            <stop offset="55%" stop-color="#e8245f" />
            <stop offset="100%" stop-color="#ab1343" />
          </linearGradient>
          <linearGradient id="curStrokeG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#ffd5df" />
          </linearGradient>
          <filter id="curGlowF" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#c4184c" flood-opacity="0.55" />
          </filter>
        </defs>
        <!-- Heart shape with top-left pointer alignment -->
        <path d="M14 24 C8.5 19 2 14.5 2 8.5 C2 4 5.5 1 10 1 C12.5 1 13.8 2.2 14 2.5 C14.2 2.2 15.5 1 18 1 C22.5 1 26 4 26 8.5 C26 14.5 19.5 19 14 24 Z"
          fill="url(#curHeartG)" stroke="url(#curStrokeG)" stroke-width="1.5" filter="url(#curGlowF)" />
        <ellipse cx="8.5" cy="6.5" rx="2.5" ry="1.4" fill="#ffffff" opacity="0.85" />
      </svg>
    </div>
  `;

  const follower = document.createElement('div');
  follower.className = 'heart-cursor-follower';
  follower.id = 'heartCursorFollower';
  follower.setAttribute('aria-hidden', 'true');

  document.body.appendChild(follower);
  document.body.appendChild(cursor);
  document.body.classList.add('has-custom-cursor');

  // 2. Position tracking
  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;
  let isVisible = false;
  let lastTrailTime = 0;
  let lastTrailX = -100;
  let lastTrailY = -100;
  const pageStartTime = performance.now();

  // Mini heart SVGs for fairy trail & click burst
  const heartColors = ['#ff4f81', '#ff7096', '#ff94b4', '#ffd166', '#f39c12', '#ff527f', '#ffffff'];
  const miniSVG = (col) => `<svg viewBox="0 0 24 22" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z" fill="${col}"/></svg>`;

  function spawnTrailMote(x, y){
    // Don't spawn trail motes during initial 700ms page opening
    if (performance.now() - pageStartTime < 700) return;
    const now = performance.now();
    if (now - lastTrailTime < 65) return;
    const dist = Math.hypot(x - lastTrailX, y - lastTrailY);
    if (dist < 22) return;

    lastTrailTime = now;
    lastTrailX = x;
    lastTrailY = y;

    const el = document.createElement('span');
    el.className = 'heart-trail-mote';
    const isHeart = Math.random() < 0.65;
    const s = isHeart ? Math.floor(7 + Math.random() * 5) : Math.floor(4 + Math.random() * 3);
    el.style.width = `${s}px`;
    el.style.height = `${s}px`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.marginLeft = `${-s / 2}px`;
    el.style.marginTop = `${-s / 2}px`;

    const col = heartColors[(Math.random() * heartColors.length) | 0];
    if (isHeart){
      el.innerHTML = miniSVG(col);
    } else {
      el.style.borderRadius = '50%';
      el.style.background = col;
      el.style.boxShadow = '0 0 6px rgba(255, 220, 140, 0.9)';
    }

    document.body.appendChild(el);

    const driftX = (Math.random() - 0.5) * 22;
    const driftY = -(14 + Math.random() * 24);
    const duration = 0.45 + Math.random() * 0.3;

    el.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 0.85 },
      { transform: `translate(${driftX}px, ${driftY}px) scale(0.2) rotate(${(Math.random() - 0.5) * 50}deg)`, opacity: 0 }
    ], {
      duration: duration * 1000,
      easing: 'ease-out',
      fill: 'forwards'
    }).onfinish = () => el.remove();
  }

  function spawnClickBurst(x, y){
    const count = 8;
    for (let i = 0; i < count; i++){
      const el = document.createElement('span');
      el.className = 'heart-cursor-burst';
      const isHeart = i % 2 === 0;
      const s = isHeart ? Math.floor(8 + Math.random() * 6) : Math.floor(4 + Math.random() * 4);
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.marginLeft = `${-s / 2}px`;
      el.style.marginTop = `${-s / 2}px`;

      const col = heartColors[i % heartColors.length];
      if (isHeart){
        el.innerHTML = miniSVG(col);
      } else {
        el.style.borderRadius = '50%';
        el.style.background = col;
        el.style.boxShadow = '0 0 8px rgba(255, 230, 140, 0.95)';
      }

      document.body.appendChild(el);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 24 + Math.random() * 28;
      const destX = Math.cos(angle) * dist;
      const destY = Math.sin(angle) * dist;

      el.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destX}px, ${destY}px) scale(0.25)`, opacity: 0 }
      ], {
        duration: 520,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      }).onfinish = () => el.remove();
    }
  }

  // Pointer move handler (0ms hardware-accelerated translation)
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible){
      isVisible = true;
      cursor.classList.add('is-visible');
      follower.classList.add('is-visible');
      followerX = mouseX;
      followerY = mouseY;
    }

    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    spawnTrailMote(mouseX, mouseY);
  }, { passive: true });

  // Smooth follower RAF lerp
  function renderFollower(){
    if (isVisible){
      followerX += (mouseX - followerX) * 0.18;
      followerY += (mouseY - followerY) * 0.18;
      follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
    }
    requestAnimationFrame(renderFollower);
  }
  requestAnimationFrame(renderFollower);

  // Click / Press feedback
  window.addEventListener('pointerdown', (e) => {
    cursor.classList.add('is-clicking');
    follower.classList.add('is-clicking');
    spawnClickBurst(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('pointerup', () => {
    cursor.classList.remove('is-clicking');
    follower.classList.remove('is-clicking');
  }, { passive: true });

  // Hover detection over interactive elements
  const hoverSelector = 'button, a, input, select, textarea, [role="button"], .love-btn, #archery, .polaroid, .message-btn, [tabindex]:not([tabindex="-1"])';

  document.addEventListener('mouseover', (e) => {
    if (e.target && e.target.closest && e.target.closest(hoverSelector)){
      cursor.classList.add('is-hovering');
      follower.classList.add('is-hovering');
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (e.target && e.target.closest && e.target.closest(hoverSelector)){
      cursor.classList.remove('is-hovering');
      follower.classList.remove('is-hovering');
    }
  }, { passive: true });

  // Window exit / enter
  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('is-visible');
    follower.classList.remove('is-visible');
    isVisible = false;
  });

  document.addEventListener('mouseenter', () => {
    cursor.classList.add('is-visible');
    follower.classList.add('is-visible');
    isVisible = true;
  });
}
