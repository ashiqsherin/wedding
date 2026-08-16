# Muhammed Ashiq weds Fathima Sherin

A single-page wedding invitation — maroon, cream and gold, matching the couple's
poster artwork.

## Run it

No build step, no dependencies. Any static server works:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

To publish, drag the whole folder onto **Netlify Drop** (netlify.com/drop), or
push it to a GitHub repo and turn on GitHub Pages. Both give you a link you can
send on WhatsApp.

## Files

```
index.html                     all the content — names, dates, venue
admin.html                     the R.S.V.P. dashboard (not linked from the invite)
css/style.css                  theme, layout, animations
js/main.js                     gate, music, countdown, petals, the RSVP form
js/api.js                      talks to the Google Apps Script that stores replies
js/admin.js                    the dashboard — totals, table, CSV export
apps-script/Code.gs            the script itself, for reference (not used by the site)
site.webmanifest               name + icons for "Add to Home Screen"
assets/GateOpen1.png           the gate painting, as supplied
assets/gate3-*.{jpg,png}       the pieces it is cut into — see The gate, below
tools/build-gate3.py           cuts them; re-run it if the painting changes
assets/images/couple.jpeg      the portrait (cropped from ashiq-sherin.jpeg)
assets/images/og-banner.jpg    the 1200×630 WhatsApp share picture
assets/favicon.svg             tab icon (+ the png sizes beside it)
assets/audio/README.md         how to add the background music
tools/og-banner.html           editable source for the share banner
tools/make-banner.js           renders that source to og-banner.jpg
ashiq-sherin.jpeg              your original artwork, kept untouched
```

## The gate

The opening screen a guest lands on is **the painted gate** — the watercolour in
`assets/GateOpen1.png`, opened. It is not a film and not a slideshow: the page
holds the picture in three pieces and swings two of them.

| Piece | What it is |
|---|---|
| `assets/gate3-scene.jpg` | the painting with the ironwork lifted out of it — arch, columns, lanterns, lilies and the maroon flourishes exactly as painted, and behind where the iron stood, the light |
| `assets/gate3-leaf-l.png` | the left half of the ironwork, ink on transparency |
| `assets/gate3-leaf-r.png` | the right half |

Laid back in place the three *are* the original painting, to the pixel — the
guest sees the artwork untouched. Then the two leaves turn on their hinges, the
light behind them comes up through the openwork, and the view is drawn through
the opening. Tapping anywhere plays the music and starts a ~5-second sequence:

| Time | What happens |
|---|---|
| 0.0s | music starts, the bismillah and caption fade away |
| 0.2s | the two leaves begin a 3.4s swing inward, back against the columns |
| 0.5s | the light beyond comes up through the ironwork |
| 2.6s | a golden glow blooms through the opening |
| 2.9s | the view begins drifting through the archway |
| 4.5s | the gate dissolves into the invitation |

That timeline lives in a comment on the `1c. THE PAINTED GATE` block in
[`css/style.css`](css/style.css), and `openArt()` in
[`js/main.js`](js/main.js) is keyed to it. If you change one, change both.

The three pieces are cut by [`tools/build-gate3.py`](tools/build-gate3.py) —
run it again after editing the artwork:

```bash
python3 tools/build-gate3.py assets/
```

It reads `assets/GateOpen1.png` and works from one rectangle, the door opening
between the two lantern posts, written at the top of the script. Everything
keys off that: the scene loses exactly what the leaves gain, so the two still
add up to the original. The same rectangle is written into the percentages on
`.agate__light` and `.agate__leaf--l/--r` in the CSS — move it in one place and
it must move in the other. The script also prints the worst pixel it can find
between the reassembled gate and the original, and drops proof sheets beside
its output.

There is **no frame and no border** anywhere on it: the paper is masked away at
its own edges instead, so the flourishes and lilies at the sides carry on into
the page's cream rather than stopping at a rectangle.

### The hand-drawn gate

Behind it, and still in the page, is the original: a wrought-iron garden gate
under a classical stone arch, drawn in CSS and SVG — not a picture — so it stays
sharp on every screen, and downloads nothing at all.

It is **not a second gate on offer**. It is the safety net, and no guest can ask
for it: it appears only when the painting cannot be had — a metered or 2G line,
a picture that errors, or ten seconds gone with one of the three still missing.
Because it is drawn rather than fetched, keeping it costs the guests who never
see it nothing at all. You can see the garden through the ironwork before you
tap. Its sequence is slower, ~8 seconds:

| Time | What happens |
|---|---|
| 0.0s | music starts, the caption fades away |
| 0.0s | the two leaves begin a 6.5s swing inward, back behind the columns |
| 0.6s | the light and the lamps come up in the garden beyond |
| 4.4s | a golden burst blooms through the opening |
| 4.4s | the view begins drifting through the archway |
| 6.5s | the gate dissolves into the invitation |

That one is written out in a comment on the `.gate` rule in
[`css/style.css`](css/style.css); the two JS timers in
[`js/main.js`](js/main.js) are keyed to it. If you change one, change both.

To make the swing slower or faster, edit the `6.5s` on the
`.gate.is-open .leaf--left` / `--right` rules and shift the later steps to match.

The arch, the leaves and the flora all share one 400 × 620 coordinate space, and
`.doorway` is sized to exactly that ratio — so SVG viewBox units and the CSS
percentages that place the leaves describe the same points. Keep that ratio if
you resize anything.

One trap when editing the ironwork: every gradient used on a *stroke* is
`gradientUnits="userSpaceOnUse"`. A plain vertical or horizontal line has a
zero-width bounding box, and an `objectBoundingBox` gradient is ignored there —
the line silently vanishes, taking every picket and rail with it.

### The gates that are gone

Two filmed gateways were tried alongside the painting — `assets/GateOpen2.mp4`
and `assets/gate-opening.mp4` — and both have been taken out. With them went the
`GATES` registry, the `?gate=` switch that chose between them, and `gates.html`,
the internal page that showed them side by side. They cost a phone 600–700 KB of
video before the guest had seen anything, on a connection that is often mobile
data in a village.

The clips and their posters are still in `assets/`, and the whole apparatus is in
git history if either is ever wanted back.

Note that `?gate=` no longer does anything — and never did as much as it looked
like it did. An unknown key always fell through to the default, so
`?gate=anything` and the plain address showed the same painted gate.

## Sound

Only your music file plays — there are no sound effects.

The track plays the **0:13 → 4:29** section on loop, fading in over 0.8s. There
are two copies of it — `assets/audio/music.m4a` and `assets/audio/music.mp3` —
and the page picks the AAC one wherever it will play, which is nearly
everywhere and about a third smaller. The player also detects whether you gave
it the full track or a file already trimmed to that section and does the right
thing either way — see [`assets/audio/README.md`](assets/audio/README.md).
Remove both files and the page still works; the music button just reports it
missing.

Browsers only allow audio after a user gesture, so playback starts on the tap
that opens the gate — that tap is what makes it legal, so it can't start any
earlier. The button bottom-right toggles it, and music pauses when the tab goes
to the background.

## Weight, and slow connections

Most guests open this on a phone, on mobile data. The page is built so that
nothing heavy is ever fetched before it is needed, and so that a bad line
degrades into something that still looks deliberate.

**What loads, and when.** Only the gate itself is fetched up front — its three
pictures, 470 KB. Everything else waits its turn.

| | | |
|---|---|---|
| the painted scene | 310 KB | preloaded in the head, at high priority |
| its two leaves | 160 KB | preloaded right behind it; the guest waits on these |
| the nasheed | 1.9 MB | connection opened once the gate is down, played on the tap |
| couple's clip | 1.5 MB | only once the gate is open and the arch is in view |

So a guest can tap the gate after ~470 KB rather than the ~12.8 MB the page
used to pull before it would do anything.

**While the gate comes down the wire**, the "tap anywhere to open" line is
replaced by a gold progress bar and *Preparing your invitation…*, and the
doorway is held back until all three pictures have landed — a gate that painted
its scene before its leaves would stand open before it was touched. Tapping
during the wait is not ignored: it starts the music, says *Almost there…*, and
opens the moment the gate is ready. The bar shows how many of the three have
arrived, and a slow creep where nothing is known yet, so it never sits still.

**If the gate cannot be had** — a straight error on any of the three, or ten
seconds gone with one still missing — the guest is quietly handed the hand-drawn
SVG gate instead, which is pure CSS and downloads nothing. They never learn there
was another one.

**On Data Saver or a 2G-class line** (`navigator.connection`, Chromium only)
that swap happens up front, before a byte of painting is asked for, and the
couple's clip is never fetched at all — its poster stands in and reads as a
portrait in its own right. Such a guest downloads about 180 KB in total, and the
music only if they ask for it.

The same restraint is why `#gateScene` and the two leaves carry no `src` in the
markup, and why the clip carries `data-src` rather than `src`: the preload
scanner fetches whatever it finds while parsing, long before any script could
decide it was not wanted. Anything that must be skippable on a thin line has to
be hung on its element by JavaScript.

**Re-encoding.** The couple's clip is H.264, silent (`-an` — it is played muted
under the nasheed, so its audio track was 160 KB of nothing), cropped to the
600×720 the arch actually shows, and written with `-movflags +faststart` so
playback can begin before the file is down. To rebuild it from a 1280×720
original:

```bash
ffmpeg -i in.mp4 -an -vf "crop=600:720:340:0" \
       -c:v libx264 -preset veryslow -crf 21 \
       -profile:v high -pix_fmt yuv420p -movflags +faststart assets/couple.mp4
```

The crop is `.portrait__arch`'s own geometry: a 1:1.2 box under `object-fit:
cover` shows the central 46.9% of a 16:9 frame and discards the rest. Change
that ratio in the CSS and this needs recutting — otherwise the clip will not
reach the sides.

## The WhatsApp link preview

Sharing the link shows a 1200×630 banner with the couple's photo, both names,
the dates and the venue — [`assets/images/og-banner.jpg`](assets/images/og-banner.jpg).

**The one rule: `og:image` must be an absolute `https://` URL.** A relative path
makes WhatsApp show the link with no picture at all. The tags in
[`index.html`](index.html) are hard-coded to:

```
https://ashiqsherin.github.io/wedding/
```

If the site ever moves to another domain, update all four absolute URLs in the
`<head>` — otherwise the preview breaks.

### Changing the banner

Edit [`tools/og-banner.html`](tools/og-banner.html) — it's an ordinary web page
using the same fonts and colours as the site — then:

```bash
npm i -D playwright-core     # once
node tools/make-banner.js
```

Keep it under ~300 KB or WhatsApp may skip the preview; the script warns you.

### The preview doesn't update

WhatsApp caches previews per-URL for about a week, so re-sending the same link
keeps showing the old (or missing) image. To see the new one immediately, share
the link with anything appended:

```
https://ashiqsherin.github.io/wedding/?v=2
```

That's a different URL to the cache but the same page to visitors. Once you're
happy, share the clean link — new recipients get the fresh preview. Also give
GitHub Pages a minute to publish before testing; the crawler caches a 404 too.

You can check what crawlers see at
[opengraph.xyz](https://www.opengraph.xyz/) or Facebook's Sharing Debugger.

## R.S.V.P.

Guests answer *Will you attend?* at the bottom of the invitation, give their
name, phone and headcount, and you see the totals at **`/admin.html`**.

The site stays completely static. The replies live in a **Google Sheet**, and a
**Google Apps Script** bound to that sheet is the only thing in between. Nothing
to host, nothing to pay for. The sheet is the source of truth — edit a cell by
hand and the dashboard follows.

### Setting it up (once, about ten minutes)

1. In a **personal @gmail.com** account (a Workspace admin can block the kind of
   web app this needs), go to <https://sheets.new> and name the sheet
   **Wedding RSVP**.
2. **Extensions ▸ Apps Script**. Delete the stub, paste all of
   [`apps-script/Code.gs`](apps-script/Code.gs), and save.
3. **⚙ Project Settings ▸ Time zone → (GMT+05:30) India Standard Time.**
4. Pick `setup` in the function dropdown and press **▶ Run**. Google warns
   *"This app isn't verified"* — **Advanced ▸ Go to … (unsafe) ▸ Allow**. It is
   your own script; that prompt is expected. Open the **Execution log** and copy
   the `SUBMIT_TOKEN` it prints.
5. Edit `USER` and `PLAIN` at the top of `setupAdminPassword()`, run that once,
   then **blank `PLAIN` out again and save** so the password is not left sitting
   in the project. Only a salted hash of it is stored.
6. **Deploy ▸ New deployment ▸ ⚙ ▸ Web app.** Execute as **Me**. Who has access
   **Anyone** — *not* "Anyone with Google Account", which forces every guest to
   log in. Deploy, then copy the **Web app URL** ending in `/exec`.
7. Paste that URL and the token into the `API` block at the top of
   [`js/api.js`](js/api.js). Commit and push.

Check it worked by opening the `/exec` URL in a browser: you should see
`{"ok":true,"service":"rsvp",...}`. A Google **sign-in page** instead means step
6 picked the wrong access setting.

### Changing the script later

Saving the script does **not** change what guests hit — the live web app is
pinned to a version. To publish an edit:

> **Deploy ▸ Manage deployments ▸ ✎ Edit ▸ Version: New version ▸ Deploy**

That keeps the same `/exec` URL. Using **New deployment** again instead mints a
*different* URL, and the site carries on calling the old code until you edit
`js/api.js` too. Ignore the `/dev` URL entirely — it requires a Google login and
will never work for guests.

### Why the request looks odd

`js/api.js` posts with `Content-Type: text/plain` and a JSON string as the body.
That looks wrong and is deliberate. The `/exec` URL answers with a redirect, and
a CORS preflight is not allowed to be a redirect — so `application/json`, which
triggers a preflight, fails with *"Redirect is not allowed for a preflight
request"*. It cannot be fixed inside Apps Script (`ContentService` has no
`setHeader`). `text/plain` makes it a "simple request", which skips the
preflight entirely. **Don't change it to `application/json`.**

### The dashboard

`admin.html` is not linked from the invitation and carries `noindex`, but it is
still a public file — the username and password are checked **inside the Apps
Script**, not in the JavaScript, so nothing secret ships in this repo. Sign-in
lasts for the life of the browser tab.

Three tiles: **Attending** (how many replies said yes), **Total guests** (the
sum of their headcounts — the catering number), **Declined**. Below them, every
reply newest first, with an **Export CSV** button.

### Editing replies by hand

Open the sheet and type. The totals are recomputed from it on every refresh.

| To do this | Do this |
|---|---|
| Fix a typo or a wrong headcount | Edit the cell |
| Mark someone as not coming | Set **Status** to `Not attending` — the headcount is ignored automatically |
| Drop a junk reply | Put any character in the **Void** column (keeps the row, hides it from the totals), or delete the row |
| Add someone who phoned you | Type a new row; leave ClientId and SubmissionId blank |

Don't rename or reorder the header row — the script finds columns by position.
Extra notes of your own can go in new columns to the right of **Void**.

The **ClientId** column is how a guest correcting their answer updates their own
row instead of booking a second family. It also means one phone that replies for
two households will overwrite the first reply — the second guest should use the
*"Reply for another family"* button, which is what it is there for.

### If you get spam

Change `SUBMIT_TOKEN` in **Project Settings ▸ Script Properties**, put the new
value in `js/api.js`, and push. Any scraped copy of the endpoint stops working.

## Icons

[`assets/favicon.svg`](assets/favicon.svg) is a gold onion arch on maroon — the
same gate as the opening screen, with a lit lantern inside. PNG sizes for
Android, iOS and older browsers sit next to it, generated with:

```bash
npx sharp-cli -i assets/favicon.svg -o assets/icon-512.png resize 512 512
```

`site.webmanifest` means "Add to Home Screen" on a phone gives a proper icon and
the name *Ashiq & Sherin*.

## Things you may want to edit

| What | Where |
|---|---|
| Nikkah time / masjid name | `index.html`, marked `<!-- EDIT: ... -->` |
| Map pin | `index.html`, the `venue__actions` Google Maps link |
| Countdown target | `js/main.js`, `CONFIG.countdownTo` |
| Music clip in/out points | `js/main.js`, `CONFIG.clipStart` / `clipEnd` |
| RSVP endpoint + token | `js/api.js`, the `API` block at the top |
| Largest party the stepper allows | `js/main.js`, `CONFIG.rsvpMax` |
| Colours | `css/style.css`, the `:root` block at the top |

The Nikkah entry currently reads *"Ba'da Jumu'ah — In sha' Allah"* because you
didn't give a time. 18/12/2026 does fall on a Friday, so that fits — but change
it if the timing is different.

## Notes

- Works down to 320px-wide phones; no horizontal scrolling at any width.
- Honours `prefers-reduced-motion` — animations and petals switch off for guests
  who need that.
- "Add to Calendar" generates a proper `.ics` for the reception (19 Dec 2026,
  4:30–10:00 PM IST) with a one-day-before reminder.
- Printing the page gives a clean invitation without the gate or the controls.
