/* ══════════════════════════════════════════════════════════════════════
   Muhammed Ashiq weds Fathima Sherin — interactions
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────────────────────── CONFIG ─────────────────────────── */
  var CONFIG = {
    // Background nasheed — two encodes of the same track (see
    // assets/audio/README.md). AAC is the smaller of the two and sounds better
    // at this bitrate; the MP3 is there for anything that cannot play it.
    audio: {
      aac: 'assets/audio/music.m4a',
      mp3: 'assets/audio/music.mp3'
    },
    // Play only this slice of the track, on loop.
    clipStart: 13,      // 0:13
    clipEnd: 269,       // 4:29
    // 70% of the level this used to play at (0.38) — quiet enough to sit
    // under the page rather than over it. Every play/unmute fades to this.
    volume: 0.06,
    fadeMs: 800,        // short fade so the music is audible right after the tap

    // Countdown target — Nikkah, 18 Dec 2026, 12:30 IST (UTC+05:30)
    countdownTo: new Date('2026-12-18T12:30:00+05:30'),

    petalCount: 26,

    // RSVP. The endpoint URL and submit token live in js/api.js.
    rsvpMax: 20,                        // largest party the stepper allows
    rsvpKey: 'ashiq-sherin-rsvp',       // localStorage: "this browser replied"

    // How long we will wait for the painted gate's three pictures to land
    // before giving up on it. Past this, a guest who has barely anything is
    // handed the hand-drawn gate instead: it costs no bandwidth at all.
    gateWaitMs: 10000
  };

  /* ── The gate ─────────────────────────────────────────────────
     A watercolour the page itself opens. `scene` is the picture with the
     ironwork lifted out of it; `leafL`/`leafR` are the two halves that were
     lifted. Laid back in place they are the original painting, to the pixel —
     and then the page swings them. tools/build-gate3.py cuts the three from
     assets/GateOpen1.png.

     `w`/`h` is the painting's own frame, so the doorway keeps its ratio.

     Two filmed gates were tried alongside this one and both are gone, along
     with the `?gate=` switch that chose between them — see the README. What is
     left behind the painting is the hand-drawn gateway in index.html, which is
     not an alternative on offer but a safety net: it is pure CSS and SVG, it
     downloads nothing, and it is what a guest is given when the painting
     cannot be had. */
  var ART = {
    scene: 'assets/gate3-scene.jpg',
    leafL: 'assets/gate3-leaf-l.png',
    leafR: 'assets/gate3-leaf-r.png',
    w: 923, h: 1703
  };

  /* ── What the guest's connection can bear ─────────────────────
     Many of these invitations are opened on a phone, on mobile data, in a
     village. Data Saver switched on — or a 2G-class line — means 470 KB of
     painting is a liability rather than a welcome: that guest gets the
     hand-drawn gate, which downloads nothing, and the couple's clip never
     loads at all (its poster is a perfectly good portrait on its own).
     Only Chromium reports any of this; everywhere else we assume a normal
     line and let the preloader below decide by what actually arrives.

     The head of index.html has already worked this out — it has to, to decide
     whether to preload the painting — so take its answer, and only work it out
     again if that script is somehow not there. */
  var thinPipe = (function () {
    if (typeof window.__thinPipe === 'boolean') return window.__thinPipe;
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    return !!c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g';
  })();

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

    // Working copies — calibrate() may override these once we know the file.
    var clipStart = CONFIG.clipStart;
    var clipEnd = CONFIG.clipEnd;

    /* Adapt to whichever file was actually supplied.
       A full-length track gets the 0:13 → 4:29 slice. But if the file is
       shorter than clipEnd it has already been trimmed to that slice, so
       seeking to 0:13 would chop 13s off music that is meant to play from its
       first note — in that case play the whole file instead. */
    function calibrate() {
      if (!isFinite(el.duration) || el.duration <= 0) return;
      if (el.duration < CONFIG.clipEnd) {
        clipStart = 0;
        clipEnd = el.duration;
      }
    }

    /* Move to the start of the clip. Bounded retries: if the host can't serve
       byte ranges the seek silently won't take, and retrying on every
       timeupdate would spin the element in a seek → stall → seek loop.
       After a couple of attempts we just let the track play from the top. */
    function seekToStart() {
      if (clipStart <= 0 || seekTries >= 3) return;
      if (!isFinite(el.duration) || el.duration <= clipStart) return;
      seekTries++;
      try { el.currentTime = clipStart; } catch (e) {}
    }

    /* AAC where it will play, MP3 otherwise. Same track, but the AAC file is
       roughly two thirds the size — worth the two lines on a metered phone. */
    function pickSrc() {
      var can = el.canPlayType && el.canPlayType('audio/mp4; codecs="mp4a.40.2"');
      return (can === 'probably' || can === 'maybe') ? CONFIG.audio.aac : CONFIG.audio.mp3;
    }

    /* Start pulling the track down without playing it. Called once the gate is
       out of the way, so the nasheed is already buffering by the time anyone
       reaches for the music button — and `play()` upgrades this to `auto`. */
    function warm() {
      if (loaded || thinPipe) return;
      load('metadata');
    }

    function load(how) {
      if (loaded) return;
      loaded = true;
      el.preload = how || 'auto';
      el.src = pickSrc();
      el.volume = 0;

      el.addEventListener('error', function () {
        available = false;
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'Music file not found — add assets/audio/music.m4a';
      });

      el.addEventListener('loadedmetadata', function () {
        calibrate();
        seekToStart();
      });
      el.addEventListener('canplay', function () {
        if (el.currentTime < 1) seekToStart();
      });

      // Wrap back to the start of the clip at the out-point. Only ever seeks
      // backwards from the end, so it cannot fight a failed seek.
      el.addEventListener('timeupdate', function () {
        if (clipEnd > 0 && el.currentTime >= clipEnd) {
          el.currentTime = clipStart;
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
      el.preload = 'auto';        // warm() may have left this at 'metadata'
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

    return { play: play, pause: pause, toggle: toggle, warm: warm };
  })();


  /* ═════════════ THE COUPLE'S CLIP, ONLY WHEN WANTED ═════════════
     It sits at the top of the page — behind the gate. Loading it with the page
     would have it fighting the gate film for a phone's single slow pipe, so
     index.html parks its address in data-src and it is moved into src only
     once the gate is open and the arch is near the viewport. It is never
     fetched at all on a metered or 2G line, or for a guest who has asked for
     less motion: the poster is a portrait in its own right and nobody can tell
     it is standing in. Off-screen, it pauses — this page is read one-handed on
     a phone that is probably low on battery. */
  var Portrait = (function () {
    var v = $('.portrait__arch video');
    var started = false;

    /* The poster, which every guest sees — the one on a 2G line most of all,
       because for them it is the whole portrait. Held back out of the markup
       only so it does not race the gate film for the same pipe; warm() is
       called the moment the gate has what it needs, which is well before the
       hero is revealed, so it is in cache by the time anyone looks. */
    function warm() {
      if (!v) return;
      var poster = v.getAttribute('data-poster');
      if (!poster) return;
      v.removeAttribute('data-poster');
      v.poster = poster;
    }

    function begin() {
      var src = v.getAttribute('data-src');
      if (!src) return;
      v.removeAttribute('data-src');
      v.preload = 'auto';
      v.src = src;
      play();
    }

    // muted + playsinline, so this is permitted without a gesture. It can
    // still be refused (low power mode); the poster stays put if so.
    function play() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

    function start() {
      if (started || !v) return;
      started = true;
      warm();                                    // in case the gate never got there
      if (thinPipe || reduceMotion) return;      // the poster alone

      if (!('IntersectionObserver' in window)) { begin(); return; }

      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) { if (!v.paused) v.pause(); return; }
          if (v.getAttribute('data-src')) begin(); else play();
        });
      }, { rootMargin: '200px 0px' }).observe(v);
    }

    return { start: start, warm: warm };
  })();


  /* ══════════════════════════ THE GATE ══════════════════════════ */
  (function () {
    var gate = $('#gate');
    var page = $('#page');
    var scene = $('#gateScene');
    var leafL = $('#gateLeafL');
    var leafR = $('#gateLeafR');
    var opened = false;

    // Two gateways live in the markup, and the `gate--art` class picks between
    // them: the painting, and the hand-drawn one behind it. The painting is
    // what a guest is meant to see. The drawn gate is not an alternative on
    // offer — it is what they are given instead when the painting cannot be
    // had, and it needs nothing off the wire to give.
    var art = (scene && leafL && leafR) ? ART : null;

    // A metered or 2G-class connection is handed the drawn gate up front,
    // before a byte of painting has been asked for.
    if (thinPipe) art = null;

    if (art) {
      // Dress the doorway for the painting: its three pieces and its own frame,
      // so the box keeps the artwork's ratio. The pictures are hung here rather
      // than in the markup — see the notes in index.html — and they are already
      // in cache from the head's preload, so they paint on the spot.
      gate.classList.add('gate--art');
      scene.src = art.scene;
      leafL.src = art.leafL;
      leafR.src = art.leafR;
      gate.style.setProperty('--agate-w', String(art.w));
      gate.style.setProperty('--agate-h', String(art.h));
    } else {
      gate.classList.remove('gate--art');
    }

    /* Give up on the painting and hand the guest the drawn gate. Safe at any
       point before the gate has started opening; after that we let it finish. */
    function toSvgGate() {
      if (opened || !art) return;
      art = null;
      gate.classList.remove('gate--art');
      ready.settle();
    }

    /* ══════════════ WAITING FOR THE GATE ══════════════
       On a good line the painting is there before the guest has finished
       reading the names and none of this shows. On a slow one they would
       otherwise be looking at a blank frame with "tap anywhere to open" under
       it, tapping, and getting nothing — so while it comes down the wire we say
       so, and show how far along it is.

       The three pictures either arrived or they did not, so the bar takes the
       larger of two numbers: how many have landed, and a creep that eases
       toward 92% and never arrives. The creep covers the stretch before
       anything is known and browsers that report nothing useful; the real
       figure takes over the moment it overtakes it. */
    var ready = (function () {
      var wait  = $('#gateWait');
      var fill  = $('#gateWaitFill');
      var text  = $('#gateWaitText');
      var done  = false;
      var creep = 0;
      var ticker = null;
      var capTimer = null;
      var waiting = false;
      var pics = 0;                     // pictures that have landed

      /* How much of what this gate needs has arrived, 0–1. */
      function have() {
        return art ? pics / 3 : 1;
      }

      /* Enough to open on. A gate with a hole in it is not enough. */
      function enough() {
        return have() >= 1;
      }

      function paint() {
        creep += (0.92 - creep) * 0.05;
        var pct = Math.max(creep, have());
        if (fill) fill.style.width = (pct * 100).toFixed(0) + '%';
      }

      /* Ready enough to open on. */
      function settle() {
        if (done) return;
        done = true;
        clearInterval(ticker);
        clearTimeout(capTimer);
        if (fill) fill.style.width = '100%';
        gate.classList.remove('is-waiting');
        gate.classList.add('is-ready');   // the painted doorway rises on this
        if (wait) wait.hidden = true;
        // The gate is down and the pipe is free. Queue up what the guest meets
        // on the other side of it, heaviest last.
        Portrait.warm();
        Music.warm();
        if (pending) open();            // they tapped while we were still waiting
      }

      /* The pictures only say when they are there. One of them missing would
         leave a gate with a hole in it, so any failure hands the guest the
         drawn gate rather than a broken painting. */
      function watchArt() {
        [scene, leafL, leafR].forEach(function (img) {
          // Cached from a previous visit, or already decoded while we were
          // getting here: `load` will not fire again for those.
          if (img.complete && img.naturalWidth) { pics++; return; }
          img.addEventListener('load', function () {
            pics++;
            if (enough()) settle();
          });
          img.addEventListener('error', function () {
            if (!opened) toSvgGate();
          });
        });
        if (enough()) settle();
      }

      function start() {
        waiting = true;
        gate.classList.add('is-waiting');
        if (wait) wait.hidden = false;
        ticker = setInterval(paint, 220);
        paint();

        watchArt();

        // Nothing worth having after ten seconds — stop asking the guest to
        // wait on a gate that is not coming and give them the drawn one.
        capTimer = setTimeout(function () {
          if (done) return;
          if (!enough()) toSvgGate();
          else settle();
        }, CONFIG.gateWaitMs);
      }

      return {
        start: start,
        settle: settle,
        isWaiting: function () { return waiting && !done; },
        say: function (msg) { if (text) text.textContent = msg; }
      };
    })();

    // A tap that lands before the gate is ready. The gesture is not wasted —
    // open() starts the music on it, which is what needs a gesture — but the
    // doors hold until there is something to open.
    var pending = false;

    // The drawn gate has nothing to wait on, so nothing to queue behind.
    if (art) ready.start();
    else { Portrait.warm(); Music.warm(); }

    // Hands the page over once the gate has finished its business.
    function reveal(liveAt, removeAt) {
      setTimeout(function () {
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-open');
        page.setAttribute('aria-hidden', 'false');
        window.scrollTo(0, 0);
        startPetals();
        Portrait.start();
      }, reduceMotion ? 60 : liveAt);

      setTimeout(function () {
        gate.remove();
      }, reduceMotion ? 300 : removeAt);
    }

    /* ── The painted gate ───────────────────────────────── */
    // The leaves turn, the light behind them comes up and the view is drawn
    // through the opening — all of it in CSS, so there is nothing to wait on
    // here beyond the clock.
    function openArt() {
      gate.classList.add('is-open');

      // Matches the painted-gate timeline in css/style.css (fade ends at 5.5s).
      reveal(3200, 5600);
    }

    /* ── The drawn gate it falls back to ────────────────── */
    function openSvg() {
      gate.classList.add('is-open');

      // Let the page underneath become live while the doors are still swinging.
      // Matches the gate timeline in css/style.css (fade ends at 7.7s).
      reveal(4800, 7900);
    }

    function open() {
      if (opened) return;

      // Music first — this is the user gesture that permits playback, and it
      // has to run on the tap itself even if the doors are about to hold.
      Music.play();

      // Tapped before the gate is down. Say so rather than doing nothing, and
      // let ready.settle() call straight back in here the moment there is
      // something to open.
      if (ready.isWaiting()) {
        if (!pending) { pending = true; ready.say('Almost there…'); }
        return;
      }

      opened = true;
      if (art) openArt();
      else openSvg();
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

      // The hero's scroll hint has done its job the moment the page moves,
      // and it does not come back — a guest who has scrolled once knows.
      if (window.scrollY > 40) {
        document.body.classList.add('has-scrolled');
      }
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


  /* ══════════════════════════════ RSVP ══════════════════════════════ */
  (function () {
    var card = $('#rsvpCard');
    if (!card) return;

    var steps  = $$('.rsvp__step', card);
    var status = $('#rsvpStatus');
    var numEl  = $('#cntVal');
    var minus  = $('#cntMinus');
    var plus   = $('#cntPlus');

    var count = 1;
    var sending = false;
    var booted = false;      // the first step must not steal focus on page load

    /* ── the step machine ────────────────────────────────────────
       Every step is a sibling tagged data-step; `hidden` is the switch, so
       the inactive ones leave the tab order and the accessibility tree.
       showStep is the only thing that mutates which step is visible. */
    function showStep(name) {
      var shown = null;
      card.setAttribute('data-step', name);
      steps.forEach(function (s) {
        var on = (s.getAttribute('data-step') === name);
        s.hidden = !on;
        if (on) shown = s;
      });
      say('');

      // Focus the heading, not the first input: focusing an input on a phone
      // throws the keyboard up over the card before the guest has read it.
      // Query inside the step itself — card also carries data-step, so a
      // descendant selector would match every step's heading and return the
      // first (hidden) one.
      if (!booted) { booted = true; return; }
      var head = shown ? $('.rsvp__ask', shown) : null;
      if (head) head.focus({ preventScroll: true });
    }

    function say(msg, isError) {
      status.textContent = msg;
      status.classList.toggle('is-error', !!isError);
    }

    /* ── validation ──────────────────────────────────────────── */
    function setError(input, msg) {
      var box = $('#' + input.id + 'Err');
      box.textContent = msg || '';
      box.hidden = !msg;
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      return !msg;
    }

    function checkName(input) {
      var v = input.value.trim();
      if (!v) return setError(input, 'Please tell us your name.');
      if (v.length < 2) return setError(input, 'That looks a little short.');
      return setError(input, '');
    }

    // Digits, spaces, dashes and brackets with one optional leading +, and
    // between 7 and 15 actual digits (E.164 allows at most 15).
    function checkPhone(input) {
      var v = input.value.trim();
      if (!v) return setError(input, 'Please leave a number so we can reach you.');
      if (!/^\+?[0-9][0-9\s\-().]*$/.test(v)) {
        return setError(input, 'Digits, spaces and + only, please.');
      }
      var digits = v.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        return setError(input, 'That does not look like a phone number.');
      }
      return setError(input, '');
    }

    /* ── the stepper ─────────────────────────────────────────── */
    // aria-disabled rather than disabled: a disabled button loses focus the
    // instant it is disabled, so stepping down to 1 from the keyboard would
    // silently drop you on <body>. setCount clamps, so the click is harmless.
    function setOff(btn, off) {
      btn.setAttribute('aria-disabled', off ? 'true' : 'false');
      btn.classList.toggle('is-off', off);
    }

    function setCount(n) {
      var next = Math.min(CONFIG.rsvpMax, Math.max(1, Math.round(n) || 1));
      var moved = next !== count;
      count = next;
      numEl.textContent = String(count);
      numEl.setAttribute('aria-valuenow', String(count));
      setOff(minus, count <= 1);
      setOff(plus, count >= CONFIG.rsvpMax);
      if (!moved) return;
      numEl.classList.remove('tick');
      void numEl.offsetWidth;            // reflow, so the animation restarts
      numEl.classList.add('tick');
    }

    minus.addEventListener('click', function () { setCount(count - 1); });
    plus.addEventListener('click', function () { setCount(count + 1); });

    // Behave like a native spinbutton for anyone on a keyboard.
    numEl.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowUp' || k === 'ArrowRight') setCount(count + 1);
      else if (k === 'ArrowDown' || k === 'ArrowLeft') setCount(count - 1);
      else if (k === 'PageUp') setCount(count + 5);
      else if (k === 'PageDown') setCount(count - 5);
      else if (k === 'Home') setCount(1);
      else if (k === 'End') setCount(CONFIG.rsvpMax);
      else return;
      e.preventDefault();
    });

    /* ── "this browser already replied" ──────────────────────── */
    var store = {
      read: function () {
        try { return JSON.parse(localStorage.getItem(CONFIG.rsvpKey) || 'null'); }
        catch (e) { return null; }       // private mode, or a stale value
      },
      write: function (data) {
        try { localStorage.setItem(CONFIG.rsvpKey, JSON.stringify(data)); }
        catch (e) {}
      }
    };

    /* ── sending ─────────────────────────────────────────────── */
    function send(payload, btn, onSuccess) {
      var label = btn.textContent;
      sending = true;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      say('');

      function stop() {
        sending = false;
        btn.disabled = false;
        btn.textContent = label;
      }

      window.RsvpApi.submit(payload, function (err, res) {
        stop();
        if (err || !res || res.ok === false) {
          // Nothing is cleared: every field keeps what was typed and the
          // count stays put, so retrying is one more tap on the same button.
          say((res && res.message) ||
              'We could not send that just now. Check your connection and tap again.',
              true);
          return;
        }
        onSuccess(res);
      });
    }

    /* ── the two forms ───────────────────────────────────────── */
    function wireForm(form, reply) {
      var nameIn  = $('[name="name"]', form);
      var phoneIn = $('[name="phone"]', form);
      var submit  = $('[type="submit"]', form);

      // Clear an error once the guest starts fixing it — never sooner.
      [nameIn, phoneIn].forEach(function (input) {
        input.addEventListener('input', function () {
          if (input.getAttribute('aria-invalid')) setError(input, '');
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sending) return;

        var okName = checkName(nameIn);
        var okPhone = checkPhone(phoneIn);
        if (!okName) { nameIn.focus(); return; }
        if (!okPhone) { phoneIn.focus(); return; }

        var party = reply === 'yes' ? count : 0;

        send({
          name: nameIn.value.trim(),
          phone: phoneIn.value.trim(),
          status: reply,
          guests: party
        }, submit, function () {
          store.write({ name: nameIn.value.trim(), status: reply, count: party });
          $('#rsvpDoneMsg').textContent = reply === 'yes'
            ? 'In sha’ Allah we will see you — ' + party +
              (party > 1 ? ' guests' : ' guest') + ' noted.'
            : 'Thank you for letting us know. You will be in our du‘a.';
          form.reset();
          setCount(1);
          showStep('done');
        });
      });
    }

    wireForm($('#rsvpFormYes'), 'yes');
    wireForm($('#rsvpFormNo'), 'no');

    $('#rsvpYes').addEventListener('click', function () { showStep('yes'); });
    $('#rsvpNo').addEventListener('click', function () { showStep('no'); });
    $$('[data-back]', card).forEach(function (b) {
      b.addEventListener('click', function () { showStep('choice'); });
    });
    $('#rsvpAgain').addEventListener('click', function () { showStep('choice'); });
    $('#rsvpSeenAgain').addEventListener('click', function () { showStep('choice'); });

    numEl.setAttribute('aria-valuemax', String(CONFIG.rsvpMax));  // no drift
    setCount(1);

    /* A guest who already replied gets a calm summary and one button back
       into the form — no modal, no lock. Families share phones here, so
       replying a second time has to stay easy. */
    var seen = store.read();
    if (seen && seen.name) {
      $('#rsvpSeenName').textContent = seen.name;
      $('#rsvpSeenWhat').textContent = seen.status === 'yes'
        ? 'you are coming with ' + seen.count + (seen.count > 1 ? ' guests' : ' guest')
        : 'you sent your regrets';
      showStep('seen');
    } else {
      showStep('choice');
    }
  })();

})();
