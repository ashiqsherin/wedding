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
css/style.css                  theme, layout, animations
js/main.js                     gate, music, countdown, petals
site.webmanifest               name + icons for "Add to Home Screen"
assets/images/couple.jpeg      the portrait (cropped from ashiq-sherin.jpeg)
assets/images/og-banner.jpg    the 1200×630 WhatsApp share picture
assets/favicon.svg             tab icon (+ the png sizes beside it)
assets/audio/README.md         how to add the background music
tools/og-banner.html           editable source for the share banner
tools/make-banner.js           renders that source to og-banner.jpg
ashiq-sherin.jpeg              your original artwork, kept untouched
```

## The gate

The opening screen is an ornate arched double door built in CSS and SVG — not a
picture — so it stays sharp on every screen. Tapping anywhere plays the music and
starts a slow ~8-second sequence:

| Time | What happens |
|---|---|
| 0.0s | music starts, the caption fades away |
| 0.0s | the two leaves begin a 6.5s swing outward |
| 0.6s | lamplight and a hanging lantern come up behind the doors |
| 4.4s | a golden burst blooms through the opening |
| 4.4s | the view begins drifting through the doorway |
| 6.5s | the gate dissolves into the invitation |

The full timeline is written out in a comment on the `.gate` rule in
[`css/style.css`](css/style.css); the two JS timers in
[`js/main.js`](js/main.js) are keyed to it. If you change one, change both.

To make the swing slower or faster, edit the `6.5s` on the
`.gate.is-open .door--left` / `--right` rules and shift the later steps to match.

## Sound

Only your music file plays — there are no sound effects.

Drop a file at `assets/audio/music.mp3` and it plays the **0:13 → 4:29** section
on loop, fading in over 0.8s. See
[`assets/audio/README.md`](assets/audio/README.md). Until you add it, the page
works normally and the music button just reports the file is missing.

Browsers only allow audio after a user gesture, so playback starts on the tap
that opens the gate — that tap is what makes it legal, so it can't start any
earlier. The button bottom-right toggles it, and music pauses when the tab goes
to the background.

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
