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
index.html                  all the content — names, dates, venue
css/style.css               theme, layout, animations
js/main.js                  gate, sound, music, countdown, petals
assets/images/couple.jpeg   the portrait (cropped from ashiq-sherin.jpeg)
assets/audio/README.md      how to add the background music
ashiq-sherin.jpeg           your original artwork, kept untouched
```

## The gate

The opening screen is an ornate arched double door built in CSS and SVG — not a
picture — so it stays sharp on every screen. Tapping anywhere swings both leaves
open, a warm light and lantern come up behind them, and the camera moves through
the doorway into the invitation. Roughly a 3-second sequence.

## Sound

Every sound effect — the door creak, the rising golden shimmer, the closing
thud, button taps — is **synthesised in the browser** with the Web Audio API.
There are no sound files to host and nothing that can fail to load.

The background nasheed is the one thing you need to supply. See
[`assets/audio/README.md`](assets/audio/README.md) — drop a file at
`assets/audio/music.mp3` and it plays the **0:13 → 4:29** section on loop, fading
in when the gate opens. Until you add it, the page works normally and the music
button just reports the file is missing.

Browsers only allow audio after a user gesture, so playback starts on the tap
that opens the gate. The button bottom-right toggles it, and music pauses when
the tab goes to the background.

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
