/* ══════════════════════════════════════════════════════════════════════
   Muhammed Ashiq weds Fathima Sherin — interactions
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────────────────────── CONFIG ─────────────────────────── */
  var CONFIG = {
    // Background nasheed. Drop your file at this path (see assets/audio/README.md).
    audioSrc: 'assets/audio/music.mp3',
    // Play only this slice of the track, on loop.
    clipStart: 13,      // 0:13
    clipEnd: 269,       // 4:29
    volume: 0.55,
    fadeMs: 2200,

    // Countdown target — Nikkah, 18 Dec 2026, 12:30 IST (UTC+05:30)
    countdownTo: new Date('2026-12-18T12:30:00+05:30'),

    petalCount: 26
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };


  /* ══════════════════════ SOUND EFFECTS (synthesised) ══════════════════════
     No sfx files needed — everything below is generated with the Web Audio API,
     so the page stays light and nothing can 404.                              */
  var SFX = (function () {
    var ctx = null;
    var noiseBuf = null;

    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function noise(c) {
      if (noiseBuf) return noiseBuf;
      var len = c.sampleRate * 2;
      noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }

    /* Heavy wooden doors dragging open */
    function creak() {
      var c = ac(); if (!c) return;
      var t = c.currentTime;

      var src = c.createBufferSource();
      src.buffer = noise(c);
      src.loop = true;

      var bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 7;
      bp.frequency.setValueAtTime(320, t);
      bp.frequency.exponentialRampToValueAtTime(880, t + 0.9);
      bp.frequency.exponentialRampToValueAtTime(420, t + 1.9);

      var lfo = c.createOscillator();
      var lfoGain = c.createGain();
      lfo.frequency.value = 7.5;
      lfoGain.gain.value = 140;
      lfo.connect(lfoGain).connect(bp.frequency);

      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.35);
      g.gain.setValueAtTime(0.09, t + 1.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

      src.connect(bp).connect(g).connect(c.destination);
      src.start(t); lfo.start(t);
      src.stop(t + 2.2); lfo.stop(t + 2.2);
    }

    /* Low resonant thud — the doors coming to rest */
    function thud(delay) {
      var c = ac(); if (!c) return;
      var t = c.currentTime + (delay || 0);

      var o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.5);

      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.30, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);

      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.8);
    }

    /* Golden shimmer — a rising arpeggio of bell partials */
    function shimmer(delay) {
      var c = ac(); if (!c) return;
      var base = c.currentTime + (delay || 0);
      // A pentatonic rise: A4 C#5 E5 F#5 A5 C#6
      var notes = [440, 554.37, 659.25, 739.99, 880, 1108.73];

      notes.forEach(function (f, i) {
        var t = base + i * 0.085;

        var o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;

        var o2 = c.createOscillator();       // shining upper partial
        o2.type = 'sine';
        o2.frequency.value = f * 2.76;

        var g  = c.createGain();
        var g2 = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

        o.connect(g).connect(c.destination);
        o2.connect(g2).connect(c.destination);
        o.start(t);  o.stop(t + 1.6);
        o2.start(t); o2.stop(t + 0.7);
      });
    }

    /* Tiny tap for the knocker / button presses */
    function tap() {
      var c = ac(); if (!c) return;
      var t = c.currentTime;
      var o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.09);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.2);
    }

    return { creak: creak, thud: thud, shimmer: shimmer, tap: tap, ctx: ac };
  })();


  /* ══════════════════════════ MUSIC ══════════════════════════ */
  var Music = (function () {
    var el = $('#track');
    var btn = $('#musicBtn');
    var loaded = false;
    var fadeTimer = null;
    var available = true;
    var seekTries = 0;

    /* Move to the start of the clip. Bounded retries: if the host can't serve
       byte ranges the seek silently won't take, and retrying on every
       timeupdate would spin the element in a seek → stall → seek loop.
       After a couple of attempts we just let the track play from the top. */
    function seekToStart() {
      if (seekTries >= 3) return;
      if (!isFinite(el.duration) || el.duration <= CONFIG.clipStart) return;
      seekTries++;
      try { el.currentTime = CONFIG.clipStart; } catch (e) {}
    }

    function load() {
      if (loaded) return;
      loaded = true;
      el.preload = 'auto';
      el.src = CONFIG.audioSrc;
      el.volume = 0;

      el.addEventListener('error', function () {
        available = false;
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'Music file not found — add assets/audio/music.mp3';
      });

      el.addEventListener('loadedmetadata', seekToStart);
      el.addEventListener('canplay', function () {
        if (el.currentTime < 1) seekToStart();
      });

      // Wrap back to the start of the clip at 4:29. Only ever seeks backwards
      // from the end, so it cannot fight a failed seek.
      el.addEventListener('timeupdate', function () {
        if (el.currentTime >= CONFIG.clipEnd) {
          el.currentTime = CONFIG.clipStart;
        }
      });
    }

    function fadeTo(target, ms, done) {
      clearInterval(fadeTimer);
      var from = el.volume;
      var steps = Math.max(1, Math.round(ms / 40));
      var i = 0;
      fadeTimer = setInterval(function () {
        i++;
        var v = from + (target - from) * (i / steps);
        el.volume = Math.min(1, Math.max(0, v));
        if (i >= steps) { clearInterval(fadeTimer); if (done) done(); }
      }, 40);
    }

    function play() {
      load();
      if (!available) return;
      var p = el.play();
      if (p && p.catch) {
        p.catch(function () {
          btn.setAttribute('aria-pressed', 'false');
        });
      }
      fadeTo(CONFIG.volume, CONFIG.fadeMs);
      btn.setAttribute('aria-pressed', 'true');
    }

    function pause() {
      fadeTo(0, 600, function () { el.pause(); });
      btn.setAttribute('aria-pressed', 'false');
    }

    function toggle() {
      SFX.tap();
      if (el.paused) play(); else pause();
    }

    btn.addEventListener('click', toggle);

    // Pause while the tab is hidden, resume when it comes back.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && !el.paused) {
        el.pause();
        el.dataset.wasPlaying = '1';
      } else if (!document.hidden && el.dataset.wasPlaying === '1') {
        el.dataset.wasPlaying = '';
        el.play().catch(function () {});
      }
    });

    return { play: play, pause: pause, toggle: toggle };
  })();


  /* ══════════════════════════ THE GATE ══════════════════════════ */
  (function () {
    var gate = $('#gate');
    var page = $('#page');
    var opened = false;

    function open() {
      if (opened) return;
      opened = true;

      SFX.ctx();                 // unlock audio on this user gesture
      SFX.tap();
      SFX.creak();
      SFX.shimmer(0.9);
      SFX.thud(1.9);

      gate.classList.add('is-open');
      Music.play();

      // Let the page underneath become live as the doors swing.
      setTimeout(function () {
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-open');
        page.setAttribute('aria-hidden', 'false');
        window.scrollTo(0, 0);
        startPetals();
      }, reduceMotion ? 60 : 1400);

      setTimeout(function () {
        gate.remove();
      }, reduceMotion ? 300 : 3400);
    }

    gate.addEventListener('click', open);
    gate.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  })();


  /* ══════════════════════ SCROLL REVEALS ══════════════════════ */
  (function () {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (n) { io.observe(n); });
  })();


  /* ══════════════════════════ COUNTDOWN ══════════════════════════ */
  (function () {
    var cells = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
    var grid = $('#countGrid');
    var done = $('#countDone');
    var last = {};

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function tick() {
      var diff = CONFIG.countdownTo - new Date();

      if (diff <= 0) {
        grid.hidden = true;
        done.hidden = false;
        clearInterval(timer);
        return;
      }

      var s = Math.floor(diff / 1000);
      var v = {
        d: Math.floor(s / 86400),
        h: Math.floor(s / 3600) % 24,
        m: Math.floor(s / 60) % 60,
        s: s % 60
      };

      Object.keys(v).forEach(function (k) {
        if (last[k] === v[k]) return;
        last[k] = v[k];
        cells[k].textContent = k === 'd' ? String(v.d) : pad(v[k]);
        var cell = cells[k].parentNode;
        cell.classList.remove('tick');
        void cell.offsetWidth;      // restart the animation
        cell.classList.add('tick');
      });
    }

    var timer = setInterval(tick, 1000);
    tick();
  })();


  /* ══════════════════════ SCROLL PROGRESS ══════════════════════ */
  (function () {
    var bar = $('#scrollProgress i');
    var ticking = false;

    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = p.toFixed(2) + '%';
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  })();


  /* ══════════════════════ FALLING PETALS ══════════════════════ */
  var startPetals = (function () {
    var wrap = $('#petals');
    var started = false;
    var shades = [
      'linear-gradient(140deg,#B0324B,#6E1428)',
      'linear-gradient(140deg,#F3E3BC,#C9A96A)',
      'linear-gradient(140deg,#FFFDF8,#E3D5C0)',
      'linear-gradient(140deg,#8B1E3F,#A8465C)'
    ];

    function spawn(i) {
      var p = document.createElement('span');
      p.className = 'petal';
      var size = 7 + Math.random() * 11;
      var dur = 11 + Math.random() * 13;

      p.style.left = (Math.random() * 100) + 'vw';
      p.style.width = size + 'px';
      p.style.height = (size * (0.75 + Math.random() * 0.5)) + 'px';
      p.style.background = shades[i % shades.length];
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = (-Math.random() * dur) + 's';
      p.style.setProperty('--dx', (Math.random() * 220 - 110) + 'px');
      p.style.setProperty('--spin', (Math.random() * 900 - 300) + 'deg');
      p.style.setProperty('--o', (0.35 + Math.random() * 0.45).toFixed(2));
      p.style.filter = 'blur(' + (Math.random() < 0.35 ? 1.2 : 0) + 'px)';

      wrap.appendChild(p);
    }

    return function () {
      if (started || reduceMotion) return;
      started = true;
      for (var i = 0; i < CONFIG.petalCount; i++) spawn(i);
    };
  })();


  /* ══════════════════ ADD TO CALENDAR (.ics) ══════════════════ */
  (function () {
    var btn = $('#calBtn');
    if (!btn) return;

    // Reception: 19 Dec 2026, 16:30–22:00 IST  →  11:00–16:30 UTC
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ashiq weds Sherin//Invitation//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:reception-ashiq-sherin-20261219@invitation',
      'DTSTAMP:20260101T000000Z',
      'DTSTART:20261219T110000Z',
      'DTEND:20261219T163000Z',
      'SUMMARY:Reception — Muhammed Ashiq weds Fathima Sherin',
      'LOCATION:KMK Auditorium, Karakkuthangadi',
      'DESCRIPTION:With great pleasure we invite you to the wedding reception of Muhammed Ashiq and Fathima Sherin.',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reception tomorrow — Ashiq weds Sherin',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      SFX.tap();
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'ashiq-weds-sherin-reception.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  })();


  /* ══════════════════ small polish: button taps ══════════════════ */
  $$('.btn, .foot__top, .hero__scroll').forEach(function (n) {
    n.addEventListener('click', function () { SFX.tap(); });
  });

})();
