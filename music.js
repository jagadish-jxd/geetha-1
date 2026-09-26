/* ============================================================
   BACKGROUND MUSIC SYSTEM
   Single continuous background soundtrack across the entire website
   - ONE background audio instance for the entire website
   - Starts automatically when opened if browser allows
   - Immediately attempts playback from 0:00 after refreshing
   - Continuous through all pages: First Page → Second Page → Tree → Message → Memory
   - Never restarts when moving between pages
   - Loops continuously (audio.loop = true)
   - Volume button only mutes/unmutes (DOES NOT pause or restart)
   - Respects session mute choice across navigation
   ============================================================ */

class BirthdayMusicManager {
  constructor() {
    this.audio = null;
    this.hasStarted = false;
    this.defaultVolume = 0.35;
    this.primarySrc = '/music/birthday-song.mp3';
    this.fallbackSrc = './music/birthday-song.mp3';
    this._listenersAttached = false;
    this._interactionHandler = this.handleInteraction.bind(this);

    // On fresh refresh, clear session mute so new session attempts autoplay normally
    this.checkIfReload();
  }

  checkIfReload() {
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      const isReload = navEntries && navEntries[0] && navEntries[0].type === 'reload';
      if (isReload) {
        sessionStorage.removeItem('birthday_music_muted');
      }
    } catch (_) {}
  }

  isSessionMuted() {
    try {
      return sessionStorage.getItem('birthday_music_muted') === 'true';
    } catch (_) {
      return false;
    }
  }

  setSessionMuted(val) {
    try {
      sessionStorage.setItem('birthday_music_muted', val ? 'true' : 'false');
    } catch (_) {}
  }

  getAudio() {
    if (!this.audio) {
      let existing = document.getElementById('bgAudio');
      if (existing) {
        this.audio = existing;
      } else {
        this.audio = new Audio();
        this.audio.id = 'bgAudio';
        this.audio.src = this.primarySrc;
      }

      this.audio.preload = 'auto';
      this.audio.autoplay = true;
      this.audio.loop = true;
      this.audio.volume = this.defaultVolume;
      this.audio.muted = this.isSessionMuted();
      this.audio.setAttribute('playsinline', '');
      this.audio.setAttribute('webkit-playsinline', '');

      // Continuous loop failsafe: when song reaches end, start immediately from 0:00
      this.audio.addEventListener('ended', () => {
        try {
          this.audio.currentTime = 0;
          const p = this.audio.play();
          if (p !== undefined) p.catch(() => {});
        } catch (_) {}
      });

      // Synchronize UI whenever volume/mute or play state changes
      this.audio.addEventListener('play', () => {
        this.hasStarted = true;
        this.removeInteractionListeners();
        this.updateButtonUI();
      });

      this.audio.addEventListener('pause', () => {
        this.updateButtonUI();
      });

      this.audio.addEventListener('volumechange', () => {
        this.updateButtonUI();
      });

      // Fallback path handler for Vercel / nested deployments
      let triedFallback = false;
      this.audio.addEventListener('error', () => {
        if (!triedFallback) {
          triedFallback = true;
          this.audio.src = this.fallbackSrc;
          this.audio.play().catch(() => {});
        }
      });
    }
    return this.audio;
  }

  start(forceFromStart = false) {
    const audio = this.getAudio();

    // If already playing smoothly during normal navigation, keep playing without restarting
    if (!forceFromStart && this.hasStarted && !audio.paused) {
      this.updateButtonUI();
      return;
    }

    if (forceFromStart || !this.hasStarted) {
      try {
        audio.currentTime = 0;
      } catch (_) {}
    }

    audio.loop = true;
    audio.volume = this.defaultVolume;
    audio.muted = this.isSessionMuted();

    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.hasStarted = true;
            this.removeInteractionListeners();
            this.updateButtonUI();
          })
          .catch(() => {
            // Autoplay rejected by browser policy until user gesture
            // Keep music state ready so first normal user interaction starts the song
            this.setupFirstInteractionListener();
            this.updateButtonUI();
          });
      }
    } catch (_) {
      this.setupFirstInteractionListener();
      this.updateButtonUI();
    }
  }

  /**
   * VOLUME ON/OFF TOGGLE
   * This is NOT a Play/Pause button.
   * Only controls whether the music can be heard (mute/unmute).
   * 🔊 → 🔇 : mute audio, song MUST continue playing in background, DO NOT pause.
   * 🔇 → 🔊 : unmute audio, song continues from current position, DO NOT restart.
   */
  toggleVolume() {
    const audio = this.getAudio();

    // If audio is currently paused because Chrome deferred initial autoplay
    if (audio.paused) {
      audio.muted = false;
      this.setSessionMuted(false);
      audio.volume = this.defaultVolume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.hasStarted = true;
            this.removeInteractionListeners();
            this.updateButtonUI();
          })
          .catch(() => {
            this.updateButtonUI();
          });
      }
      this.updateButtonUI();
      return;
    }

    // Toggle mute state without pausing or changing playback position
    if (audio.muted) {
      // 🔇 → 🔊 : Unmute, keep playing from exact current position
      audio.muted = false;
      audio.volume = this.defaultVolume;
      this.setSessionMuted(false);
    } else {
      // 🔊 → 🔇 : Mute, continues playing silently in background
      audio.muted = true;
      this.setSessionMuted(true);
    }

    this.updateButtonUI();
  }

  updateButtonUI() {
    const buttons = document.querySelectorAll('.volume-btn, #volumeBtn, #soundToggleBtn');
    if (!buttons || buttons.length === 0) return;

    const audio = this.audio;
    // Considered muted if audio is muted OR volume is 0
    const isMuted = !audio || audio.muted || audio.volume === 0;

    buttons.forEach((btn) => {
      if (isMuted) {
        btn.classList.add('is-muted');
        btn.setAttribute('aria-label', 'Unmute volume');
        btn.setAttribute('title', 'Volume OFF (Click to unmute)');
      } else {
        btn.classList.remove('is-muted');
        btn.setAttribute('aria-label', 'Mute volume');
        btn.setAttribute('title', 'Volume ON (Click to mute)');
      }
    });
  }

  initVolumeButton() {
    // Look for existing button or create if missing
    let btn = document.getElementById('volumeBtn') || document.getElementById('soundToggleBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'volume-btn';
      btn.id = 'volumeBtn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Mute volume');
      btn.setAttribute('title', 'Volume ON');
      btn.innerHTML = `
        <svg class="volume-btn__icon volume-btn__icon--on" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <svg class="volume-btn__icon volume-btn__icon--off" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      `;
      document.body.appendChild(btn);
    }

    if (!btn._volumeBound) {
      btn._volumeBound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleVolume();
      });
    }

    this.updateButtonUI();
  }

  handleInteraction(e) {
    if (e && e.type === 'keydown') {
      const key = e.key || '';
      const code = e.code || '';
      // Ignore physical keyboard volume control keys
      if (
        key === 'AudioVolumeUp' ||
        key === 'AudioVolumeDown' ||
        key === 'AudioVolumeMute' ||
        key === 'VolumeUp' ||
        key === 'VolumeDown' ||
        key === 'VolumeMute' ||
        code === 'AudioVolumeUp' ||
        code === 'AudioVolumeDown' ||
        code === 'AudioVolumeMute'
      ) {
        return;
      }
    }

    this.start(false);
  }

  setupFirstInteractionListener() {
    if (this._listenersAttached) return;
    this._listenersAttached = true;

    const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'];
    const opts = { capture: true, passive: true };

    events.forEach((evt) => {
      window.addEventListener(evt, this._interactionHandler, opts);
      document.addEventListener(evt, this._interactionHandler, opts);
    });

    window.addEventListener('focus', () => {
      if (!this.hasStarted) this.start(false);
    }, { passive: true, once: true });
  }

  removeInteractionListeners() {
    if (!this._listenersAttached) return;
    this._listenersAttached = false;

    const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'];
    const opts = { capture: true, passive: true };

    events.forEach((evt) => {
      window.removeEventListener(evt, this._interactionHandler, opts);
      document.removeEventListener(evt, this._interactionHandler, opts);
    });
  }
}

// Global singleton to guarantee exactly ONE instance across the entire application
const GLOBAL_AUDIO_KEY = '__BIRTHDAY_BG_MUSIC__';
if (!window[GLOBAL_AUDIO_KEY]) {
  window[GLOBAL_AUDIO_KEY] = new BirthdayMusicManager();
}

export const musicManager = window[GLOBAL_AUDIO_KEY];

// Hook up button and attempt playback immediately
function setupMusicLifecycle() {
  musicManager.initVolumeButton();
  musicManager.start(true);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMusicLifecycle, { once: true });
  } else {
    setupMusicLifecycle();
  }
  window.addEventListener('load', () => {
    musicManager.initVolumeButton();
    musicManager.start(true);
  }, { once: true });
  window.addEventListener('pageshow', (e) => {
    musicManager.initVolumeButton();
    musicManager.start(!e.persisted);
  });
}
