/* ══════════════════════════════════════════════════════════════════════
   Muhammed Ashiq weds Fathima Sherin — RSVP backend

   This file is NOT part of the website. It is a version-controlled copy of
   the Google Apps Script that stores the replies. GitHub Pages serves it as
   inert text; nothing on the site loads it.

   To install it, see the "R.S.V.P." section of README.md.
   Deploy as:  Web app  ·  Execute as: Me  ·  Who has access: Anyone
   ══════════════════════════════════════════════════════════════════════ */

var CFG = {
  SHEET: 'Responses',
  HEADERS: ['Timestamp', 'Name', 'Status', 'Guests', 'Phone',
            'ClientId', 'SubmissionId', 'Updated', 'Void'],
  COL: { TS: 1, NAME: 2, STATUS: 3, GUESTS: 4, PHONE: 5,
         CID: 6, SID: 7, UPD: 8, VOID: 9 },

  NAME_MIN: 2, NAME_MAX: 80,
  PHONE_MIN_DIGITS: 7, PHONE_MAX_DIGITS: 15,
  GUESTS_MAX: 20,

  LOCK_MS: 25000,        // how long to wait for the write lock
  REPLAY_S: 300,         // remember the last reply per browser, for retries
  BURST_MAX: 8,          // submissions per browser per BURST_S
  BURST_S: 600,
  SESSION_S: 8 * 3600,   // admin session lifetime
  LOGIN_FAIL_MAX: 25, LOGIN_FAIL_S: 900,

  NOTIFY_EMAIL: ''       // optional: '' = off, or 'you@gmail.com'
};


/* ─────────────────────────── ENTRY POINTS ─────────────────────────── */
/* Both verbs share one router. POST is the normal path (a CORS "simple
   request", so no preflight). GET serves the JSONP fallback and lets you
   smoke-test the deployment by pasting the /exec URL into a browser.      */

function doPost(e) { return route_(e); }
function doGet(e)  { return route_(e); }

function route_(e) {
  var cb = null;
  try {
    cb = cleanCallback_(e && e.parameter ? e.parameter.callback : null);
    var d = readPayload_(e);
    if (!cb) cb = cleanCallback_(d.callback);

    var action = String(d.action || 'ping');
    var res;
    if      (action === 'ping')  res = { ok: true, service: 'rsvp', time: new Date().toISOString() };
    else if (action === 'rsvp')  res = handleRsvp_(d);
    else if (action === 'admin') res = handleAdmin_(d);
    else                         res = { ok: false, error: 'unknown_action' };
    return respond_(res, cb);
  } catch (err) {
    // Never let Apps Script emit its own HTML error page — the client can
    // only parse JSON, and an HTML body looks exactly like a CORS failure.
    return respond_({ ok: false, error: 'server_error',
                      message: 'Something went wrong. Please try again.',
                      detail: String((err && err.message) || err) }, cb);
  }
}

/* Accepts all three shapes with one function:
     • a text/plain body holding JSON        (the primary path)
     • application/x-www-form-urlencoded     (e.parameter)
     • a GET query string                    (the JSONP fallback)          */
function readPayload_(e) {
  var out = {}, k;
  if (e && e.parameter) { for (k in e.parameter) out[k] = e.parameter[k]; }
  if (e && e.postData && e.postData.contents) {
    var raw = String(e.postData.contents).replace(/^\uFEFF/, '').trim();
    if (raw.charAt(0) === '{') {
      try { var j = JSON.parse(raw); for (k in j) out[k] = j[k]; } catch (ignore) {}
    }
  }
  return out;
}

function respond_(obj, cb) {
  var body = JSON.stringify(obj);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

/* A JSONP callback name is echoed straight into executable JS. Whitelist it. */
function cleanCallback_(v) {
  v = String(v == null ? '' : v);
  return /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(v) ? v : null;
}


/* ─────────────────────────── WRITE PATH ─────────────────────────── */

function handleRsvp_(d) {
  var p = PropertiesService.getScriptProperties();

  // 1 · shared submit token — a speed bump against drive-by bots, not a
  //     secret. It is visible in the public JS; its value is that you can
  //     rotate it (property + one line in js/api.js) if you ever get spammed.
  var token = p.getProperty('SUBMIT_TOKEN');
  if (token && String(d.token || '') !== token) {
    return { ok: false, error: 'bad_token',
             message: 'This page is out of date. Please reload and try again.' };
  }

  // 2 · honeypot — real people never fill this in. Pretend it worked so the
  //     bot does not retry.
  if (String(d.website || '').trim() !== '') {
    return { ok: true, updated: false, id: 'ok', message: 'Thank you!' };
  }

  // 3 · validate and sanitise
  var name = cleanText_(d.name, CFG.NAME_MAX);
  if (name.length < CFG.NAME_MIN) {
    return { ok: false, error: 'bad_name', message: 'Please enter your name.' };
  }

  var status = String(d.status || '').trim().toLowerCase();
  if (status !== 'yes' && status !== 'no') {
    return { ok: false, error: 'bad_status',
             message: 'Please tell us whether you can join us.' };
  }

  var guests = 0;
  if (status === 'yes') {
    guests = Math.floor(Number(d.guests));
    if (!isFinite(guests) || guests < 1) guests = 1;
    if (guests > CFG.GUESTS_MAX) {
      return { ok: false, error: 'bad_guests',
               message: 'For more than ' + CFG.GUESTS_MAX +
                        ' guests, please call us instead.' };
    }
  }

  var phone  = cleanText_(d.phone, 24);
  var digits = phone.replace(/\D/g, '');
  if (digits.length < CFG.PHONE_MIN_DIGITS || digits.length > CFG.PHONE_MAX_DIGITS) {
    return { ok: false, error: 'bad_phone',
             message: 'Please enter a valid phone number.' };
  }

  var cid = String(d.cid || '');
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(cid)) cid = Utilities.getUuid();

  // 4 · replay and burst control. CacheService is shared and evictable, so
  //     this is best-effort — good enough for a wedding invitation.
  var cache = CacheService.getScriptCache();
  var fp = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,
      [name, status, guests, phone].join('|'), Utilities.Charset.UTF_8));

  var prevRaw = cache.get('res_' + cid);
  if (prevRaw) {
    var prev = JSON.parse(prevRaw);
    if (prev.fp === fp) return prev.res;   // an exact retry → replay the answer
  }
  var n = Number(cache.get('n_' + cid) || 0);
  if (n >= CFG.BURST_MAX) {
    return { ok: false, error: 'rate',
             message: 'That is a lot of changes at once — please try again in a few minutes.' };
  }

  // 5 · write, serialised
  var lock = LockService.getScriptLock();
  try { lock.waitLock(CFG.LOCK_MS); }
  catch (busy) {
    return { ok: false, error: 'busy',
             message: 'We are a little busy — please try again in a moment.' };
  }

  var res;
  try {
    var sh = sheet_();
    var now = new Date();
    var row = findRowByClientId_(sh, cid);
    var label = (status === 'yes') ? 'Attending' : 'Not attending';

    if (row > 0) {
      // This browser has replied before → correct that row, never duplicate.
      var sid = String(sh.getRange(row, CFG.COL.SID).getValue() || Utilities.getUuid());
      sh.getRange(row, CFG.COL.NAME, 1, 4)
        .setValues([[safe_(name), label, guests, safe_(phone)]]);
      sh.getRange(row, CFG.COL.UPD).setValue(now);
      res = { ok: true, updated: true, id: sid, cid: cid,
              message: 'Your reply has been updated.' };
    } else {
      var newId = Utilities.getUuid();
      sh.appendRow([now, safe_(name), label, guests, safe_(phone), cid, newId, '', '']);
      res = { ok: true, updated: false, id: newId, cid: cid,
              message: (status === 'yes')
                ? 'Thank you — we cannot wait to see you!'
                : 'Thank you for letting us know.' };
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  cache.put('res_' + cid, JSON.stringify({ fp: fp, res: res }), CFG.REPLAY_S);
  cache.put('n_' + cid, String(n + 1), CFG.BURST_S);
  notify_(name, status, guests, phone);
  return res;
}

function findRowByClientId_(sh, cid) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var vals = sh.getRange(2, CFG.COL.CID, last - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {          // the newest match wins
    if (String(vals[i][0]) === cid) return i + 2;
  }
  return -1;
}


/* ─────────────────────── READ PATH (ADMIN) ─────────────────────── */

function handleAdmin_(d) {
  var p = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();

  var session = String(d.session || '');
  var authed = session && cache.get('sess_' + session) === '1';

  if (!authed) {
    var fails = Number(cache.get('login_fails') || 0);
    if (fails >= CFG.LOGIN_FAIL_MAX) {
      return { ok: false, error: 'locked',
               message: 'Too many attempts. Try again in fifteen minutes.' };
    }

    var wantUser = String(p.getProperty('ADMIN_USER') || '');
    var wantHash = String(p.getProperty('ADMIN_PASS_HASH') || '');
    var salt     = String(p.getProperty('ADMIN_SALT') || '');
    if (!wantUser || !wantHash || !salt) {
      return { ok: false, error: 'not_configured',
               message: 'Admin sign-in is not set up yet (run setupAdminPassword).' };
    }

    var okUser = safeEq_(String(d.user || '').trim().toLowerCase(),
                         wantUser.trim().toLowerCase());
    var okPass = safeEq_(hash_(String(d.pass || ''), salt), wantHash.toLowerCase());

    if (!okUser || !okPass) {
      cache.put('login_fails', String(fails + 1), CFG.LOGIN_FAIL_S);
      Utilities.sleep(600);                       // blunt the guessing rate
      return { ok: false, error: 'auth', message: 'Wrong username or password.' };
    }
    session = Utilities.getUuid();
  }

  cache.put('sess_' + session, '1', CFG.SESSION_S);   // sliding expiry
  var out = readAll_();
  out.ok = true;
  out.session = session;
  return out;
}

/* Totals are never stored — they are recomputed from the sheet on every
   load, so hand-editing a cell simply works.                              */
function readAll_() {
  var sh = sheet_();
  var tz = Session.getScriptTimeZone();
  var last = sh.getLastRow();
  var rows = [];
  var totals = { responses: 0, attending: 0, declined: 0, guests: 0 };

  if (last >= 2) {
    var v = sh.getRange(2, 1, last - 1, CFG.HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var r = v[i];
      if (String(r[CFG.COL.VOID - 1]).trim() !== '') continue;   // voided by hand
      var name = String(r[CFG.COL.NAME - 1]).trim();
      if (!name) continue;                                       // blank row

      var attending = /^att/i.test(String(r[CFG.COL.STATUS - 1]).trim());
      var g = attending ? (Number(r[CFG.COL.GUESTS - 1]) || 0) : 0;

      totals.responses++;
      if (attending) { totals.attending++; totals.guests += g; }
      else           { totals.declined++; }

      rows.push({
        row: i + 2,
        at: iso_(r[CFG.COL.TS - 1]),
        ts: fmt_(r[CFG.COL.TS - 1], tz),
        name: name,
        status: attending ? 'yes' : 'no',
        guests: g,
        phone: String(r[CFG.COL.PHONE - 1] || ''),
        id: String(r[CFG.COL.SID - 1] || ''),
        updated: fmt_(r[CFG.COL.UPD - 1], tz)
      });
    }
  }
  rows.reverse();                                   // newest first
  return { rows: rows, totals: totals, generated: fmt_(new Date(), tz) };
}


/* ─────────────────────────── HELPERS ─────────────────────────── */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.SHEET);
  if (!sh) { sh = ss.insertSheet(CFG.SHEET); }
  if (sh.getLastRow() === 0 ||
      String(sh.getRange(1, 1).getValue()).trim() !== CFG.HEADERS[0]) {
    sh.getRange(1, 1, 1, CFG.HEADERS.length).setValues([CFG.HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('E:E').setNumberFormat('@');        // phone must stay text
    sh.getRange('A:A').setNumberFormat('dd-MM-yyyy HH:mm');
    sh.getRange('H:H').setNumberFormat('dd-MM-yyyy HH:mm');
  }
  return sh;
}

/* Trim, drop control characters, collapse whitespace, cap the length. */
function cleanText_(v, max) {
  var s = String(v == null ? '' : v);
  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.substring(0, max) : s;
}

/* A cell whose text starts with = + - or @ becomes a live formula in Sheets,
   so a name like "=IMPORTXML(...)" would run. A leading apostrophe forces
   literal text; Sheets strips it again on read.                            */
function safe_(s) {
  s = String(s == null ? '' : s);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function fmt_(d, tz) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, tz, 'dd MMM yyyy, HH:mm');
}

function iso_(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toISOString();
}

function hash_(pass, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
                String(salt) + '|' + String(pass), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

/* Compares without an early return, and fails closed on empty input. */
function safeEq_(a, b) {
  a = String(a); b = String(b);
  if (!a || !b) return false;
  var diff = a.length ^ b.length;
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i % a.length) ^ b.charCodeAt(i % b.length));
  }
  return diff === 0;
}

/* Optional: a note in your inbox for every reply. Consumer quota is 100/day,
   and a failure here must never fail the guest's submission.               */
function notify_(name, status, guests, phone) {
  if (!CFG.NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail(CFG.NOTIFY_EMAIL,
      'RSVP: ' + name + ' — ' + (status === 'yes' ? 'attending' : 'not attending'),
      ['Name: ' + name,
       'Status: ' + status,
       'Guests: ' + guests,
       'Phone: ' + phone].join('\n'));
  } catch (ignore) {}
}


/* ─────────────────────── ONE-TIME SETUP ─────────────────────── */

/* Run once from the editor (▶ Run) and accept the permission prompt. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');
  var sh = sheet_();
  sh.setColumnWidth(CFG.COL.NAME, 220);
  sh.setColumnWidth(CFG.COL.PHONE, 160);
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SUBMIT_TOKEN')) {
    p.setProperty('SUBMIT_TOKEN', 'as26-' + Utilities.getUuid().slice(0, 12));
  }
  Logger.log('Ready. SUBMIT_TOKEN = ' + p.getProperty('SUBMIT_TOKEN'));
}

/* Edit USER and PLAIN, run this once, then blank PLAIN out again and save.
   The password itself is never stored — only a salted SHA-256 of it.      */
function setupAdminPassword() {
  var USER  = 'ashiq';
  var PLAIN = 'change-me-then-clear-this';

  var p = PropertiesService.getScriptProperties();
  var salt = p.getProperty('ADMIN_SALT') || Utilities.getUuid();
  p.setProperties({
    ADMIN_USER: USER,
    ADMIN_SALT: salt,
    ADMIN_PASS_HASH: hash_(PLAIN, salt)
  });
  Logger.log('Saved. Now clear PLAIN from this function and save the project.');
}
