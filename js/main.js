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

    petalCount: 26,

    // RSVP. The endpoint URL and submit token live in js/api.js.
    rsvpMax: 20,                        // largest party the stepper allows
    rsvpKey: 'ashiq-sherin-rsvp'        // localStorage: "this browser replied"
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
