/* ══════════════════════════════════════════════════════════════════════
   RSVP transport — talks to the Google Apps Script web app.
   Shared by the invitation (js/main.js) and the dashboard (js/admin.js).

   ── Why the request looks the way it does ──────────────────────────────
   The /exec URL answers with a 302 to script.googleusercontent.com, and a
   CORS *preflight* is not allowed to be a redirect. So any request that
   triggers a preflight dies with "Redirect is not allowed for a preflight
   request", and it cannot be fixed from inside Apps Script: ContentService
   has no setHeader() and doOptions() is never routed.

   The way out is to never trigger a preflight — POST with a Content-Type of
   text/plain, which makes it a CORS "simple request". No preflight, the 302
   is followed, both hops carry Access-Control-Allow-Origin: *, and the JSON
   reply is readable. The script reads e.postData.contents and parses it.

   >>> Do NOT "fix" the Content-Type below to application/json. <<<
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = {
    /* Deploy ▸ New deployment ▸ Web app · Execute as: Me · Access: Anyone,
       then paste the /exec URL here. See the R.S.V.P. section of README.md. */
    url: 'https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID_HERE/exec',

    /* Printed by setup() in apps-script/Code.gs. Not a secret — it is visible
       in this file. Its value is that you can rotate it (change the Script
       Property and this line) if the endpoint ever gets spammed. */
    token: 'PASTE_SUBMIT_TOKEN_HERE',

    timeout: 12000
  };

  /* A stable id for this browser. It is what lets a retry — or a guest
     correcting their headcount — update their own row instead of booking a
     second family. Apps Script cannot see the caller's IP, so this is the
     only handle we have. */
  function clientId() {
    var key = 'ashiq-sherin-cid';
    var v = null;
    try { v = window.localStorage.getItem(key); } catch (e) {}
    if (!v || !/^[A-Za-z0-9_-]{6,64}$/.test(v)) {
      v = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { window.localStorage.setItem(key, v); } catch (e2) {}
    }
    return v;
  }

  /* done(err, res) — called exactly once. */
  function call(payload, done) {
    var settled = false;
    var triedFallback = false;

    function finish(err, res) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      done(err, res);
    }

    function fallback() {
      if (settled) return;
      if (triedFallback) { finish(new Error('unreachable')); return; }
      triedFallback = true;
      jsonp(payload, finish);
    }

    var timer = setTimeout(fallback, API.timeout);

    if (!window.fetch) { fallback(); return; }

    fetch(API.url, {
      method: 'POST',
      // See the banner comment. text/plain is load-bearing, not a typo.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
      // Never add credentials:'include' — it is incompatible with ACAO: *.
    })
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var data;
        // A body that is not JSON almost always means the deployment's access
        // is not "Anyone", so Google served a sign-in page with status 200.
        try { data = JSON.parse(txt); } catch (e) { fallback(); return; }
        finish(null, data);
      })
      .catch(function () { fallback(); });
  }

  /* GET-only, but immune to CORS: a <script> tag is not a fetch. */
  function jsonp(payload, finish) {
    var name = '__rsvpcb' + Math.random().toString(36).slice(2);
    var s = document.createElement('script');
    var timer = setTimeout(function () {
      cleanup();
      finish(new Error('timeout'));
    }, API.timeout);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }

    window[name] = function (res) { cleanup(); finish(null, res); };
    s.onerror = function () { cleanup(); finish(new Error('network')); };

    var q = ['callback=' + name];
    for (var k in payload) {
      if (!payload.hasOwnProperty(k)) continue;
      if (payload[k] === null || payload[k] === undefined) continue;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]));
    }
    s.src = API.url + '?' + q.join('&');
    document.head.appendChild(s);
  }

  window.RsvpApi = {
    configured: function () {
      return API.url.indexOf('PASTE_') === -1;
    },

    submit: function (reply, done) {
      call({
        action: 'rsvp',
        token: API.token,
        cid: clientId(),
        name: reply.name,
        status: reply.status,          // 'yes' | 'no'
        guests: reply.guests,
        phone: reply.phone,
        website: reply.website || ''   // honeypot — must stay empty
      }, done);
    },

    /* Pass {session:…} once signed in, or {user:…, pass:…} to sign in.
       This goes over POST like everything else, so the password never lands
       in browser history, a referrer header or Google's request logs. */
    admin: function (creds, done) {
      var p = { action: 'admin' };
      if (creds.session) { p.session = creds.session; }
      else { p.user = creds.user; p.pass = creds.pass; }
      call(p, done);
    }
  };
})();
