/* ══════════════════════════════════════════════════════════════════════
   Muhammed Ashiq weds Fathima Sherin — R.S.V.P. responses

   The sign-in below is carried, never checked, here: this file is public,
   so the Apps Script is the one that says yes or no. See js/api.js.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CONFIG = {
    // Kept for the tab's lifetime only, so a refresh does not sign you out
    // but closing the tab does.
    sessionKey: 'ashiq-sherin-admin'
  };

  var $ = function (s, c) { return (c || document).querySelector(s); };

  var login  = $('#admLogin');
  var panel  = $('#admPanel');
  var status = $('#admStatus');
  var tbody  = $('#admRows');
  var rows   = [];            // module scope: the CSV and the table share it

  function say(msg, isError) {
    status.textContent = msg || '';
    status.classList.toggle('is-error', !!isError);
  }

  var session = {
    read: function () {
      try { return sessionStorage.getItem(CONFIG.sessionKey); } catch (e) { return null; }
    },
    write: function (v) {
      try { sessionStorage.setItem(CONFIG.sessionKey, v); } catch (e) {}
    },
    clear: function () {
      try { sessionStorage.removeItem(CONFIG.sessionKey); } catch (e) {}
    }
  };

  function show(signedIn) {
    login.hidden = signedIn;
    panel.hidden = !signedIn;
  }

  /* ─────────────────────────── LOADING ─────────────────────────── */
  function load(creds, btn) {
    var label = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = 'Please wait…'; }
    say('');

    window.RsvpApi.admin(creds, function (err, res) {
      if (btn) { btn.disabled = false; btn.textContent = label; }

      if (err || !res) {
        say('Could not reach the responses. Check your connection and try again.', true);
        return;
      }
      if (res.ok === false) {
        if (res.error === 'auth' || res.error === 'locked') session.clear();
        say(res.message || 'Sign-in failed.', true);
        show(false);
        $('#admUser').focus();
        return;
      }

      if (res.session) session.write(res.session);
      render(res);
      show(true);
    });
  }

  function render(res) {
    rows = res.rows || [];
    var t = res.totals || { attending: 0, guests: 0, declined: 0 };

    $('#statYes').textContent    = t.attending;
    $('#statGuests').textContent = t.guests;
    $('#statNo').textContent     = t.declined;
    $('#admStamp').textContent   = res.generated ? 'As of ' + res.generated : '';

    tbody.textContent = '';
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');

      tr.appendChild(cell(String(i + 1), 'adm__num'));
      tr.appendChild(cell(r.name));

      // Guest names come from a public form, so every cell is built with
      // textContent. Never innerHTML here.
      var td = document.createElement('td');
      var tag = document.createElement('span');
      tag.className = 'tag ' + (r.status === 'yes' ? 'tag--yes' : 'tag--no');
      tag.textContent = r.status === 'yes' ? 'Attending' : 'Declined';
      td.appendChild(tag);
      tr.appendChild(td);

      tr.appendChild(cell(r.status === 'yes' ? String(r.guests) : '—', 'adm__num'));
      tr.appendChild(cell(r.phone, 'adm__num'));
      tr.appendChild(cell(r.ts));

      tbody.appendChild(tr);
    });

    $('#admEmpty').hidden = rows.length > 0;
    say(rows.length ? '' : 'No replies yet.');
  }

  function cell(text, cls) {
    var td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text === null || text === undefined ? '' : String(text);
    return td;
  }


  /* ══════════════════════ EXPORT (.csv) ══════════════════════ */
  /* Same Blob → object URL → synthetic anchor → revoke sequence as the
     Add-to-Calendar download in js/main.js. */

  function csvCell(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    // Excel and Sheets treat a leading = + - or @ as a formula, so a phone
    // number saved as "+91…" would try to run as one.
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function toCsv(list) {
    var lines = [['#', 'Guest', 'Reply', 'Guests', 'Phone', 'Received']
      .map(csvCell).join(',')];
    list.forEach(function (r, i) {
      lines.push([
        i + 1,
        r.name,
        r.status === 'yes' ? 'Attending' : 'Declined',
        r.status === 'yes' ? r.guests : 0,
        r.phone,
        r.ts
      ].map(csvCell).join(','));
    });
    // A leading BOM so Excel opens it as UTF-8; CRLF because RFC 4180 says so.
    return String.fromCharCode(0xFEFF) + lines.join('\r\n');
  }

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  $('#admCsv').addEventListener('click', function () {
    if (!rows.length) { say('Nothing to export yet.'); return; }
    var blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp-' + stamp() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });


  /* ─────────────────────────── WIRING ─────────────────────────── */
  login.addEventListener('submit', function (e) {
    e.preventDefault();
    var user = $('#admUser').value.trim();
    var pass = $('#admPass').value;
    if (!user || !pass) { say('Enter both a username and a password.', true); return; }
    load({ user: user, pass: pass }, $('#admGo'));
  });

  $('#admRefresh').addEventListener('click', function () {
    var s = session.read();
    if (!s) { show(false); say('Please sign in again.', true); return; }
    load({ session: s }, this);
  });

  $('#admOut').addEventListener('click', function () {
    session.clear();
    rows = [];
    tbody.textContent = '';
    $('#admPass').value = '';
    show(false);
    say('Signed out.');
    $('#admUser').focus();
  });

  /* Boot */
  if (!window.RsvpApi || !window.RsvpApi.configured()) {
    show(false);
    say('The RSVP endpoint is not configured yet — see the R.S.V.P. section of README.md.', true);
  } else {
    var saved = session.read();
    if (saved) load({ session: saved });
    else show(false);
  }
})();
