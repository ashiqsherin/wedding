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
    fadeMs: 800,        // short fade so the music is audible right after the tap

    // Countdown target — Nikkah, 18 Dec 2026, 12:30 IST (UTC+05:30)
    countdownTo: new Date('2026-12-18T12:30:00+05:30'),

    petalCount: 26
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

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

      // Music first — this is the user gesture that permits playback.
      Music.play();
      gate.classList.add('is-open');

      // Let the page underneath become live while the doors are still swinging.
      setTimeout(function () {
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-open');
        page.setAttribute('aria-hidden', 'false');
        window.scrollTo(0, 0);
        startPetals();
      }, reduceMotion ? 60 : 4800);

      // Matches the gate timeline in css/style.css (fade ends at 7.7s).
      setTimeout(function () {
        gate.remove();
      }, reduceMotion ? 300 : 7900);
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

})();
