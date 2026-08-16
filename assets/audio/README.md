# Background music

The page expects the track here, twice — the same music in two formats:

```
assets/audio/music.m4a     AAC, what nearly every guest gets
assets/audio/music.mp3     the fallback, for anything that won't play AAC
```

The page asks the browser which it can play and takes the AAC where possible,
because it is about a third smaller for the same thing on a phone speaker. Only
one of them is ever downloaded.

One file on its own works too: drop in just `music.mp3` and every guest gets
that. Nothing else needs editing either way.

## How the clip is handled

You asked for the section **0:13 → 4:29**, and the player works out on its own
which kind of file you gave it — so either works, with nothing to edit:

| The file you drop in | What plays |
|---|---|
| **Full-length track** | starts at `0:13`, loops back to `0:13` at `4:29` |
| **Already trimmed** to that section | plays whole, from the first note, loops at the end |

It decides by comparing the file's duration against `clipEnd`. A file shorter
than 4:29 must already be the trimmed clip, so seeking 13s into it would chop
off music that's meant to be heard — it plays from `0:00` instead.

**The files currently in this folder are the trimmed version** (3:50.6, well
short of the 4:29 out-point), so they play from the first note. If you replace
them, replace both — the page decides by duration, and two copies of different
lengths would behave differently depending on which a guest got.

The numbers live at the top of [`js/main.js`](../../js/main.js):

```js
clipStart: 13,   // 0:13
clipEnd:   269,  // 4:29
volume:    0.27,
fadeMs:    800,
```

Volume fades in over 0.8s from the moment the gate is tapped.

## Trimming it yourself

```bash
ffmpeg -i original.mp3 -ss 13 -to 269 -c:a libmp3lame -b:a 128k music.mp3
```

## File size

This is the largest thing on the site and it goes down a mobile connection, so
it is worth encoding properly. Both current files are **mono** — the track is
background music heard on a phone speaker, and stereo buys nothing there while
costing double.

| | |
|---|---|
| `music.m4a` | **1.9 MB** — AAC-LC, 64 kbps mono |
| `music.mp3` | **2.7 MB** — MP3, 96 kbps mono |

From a fresh source file, both come from:

```bash
ffmpeg -i source.mp3 -vn -ac 1 -c:a aac        -b:a 64k -movflags +faststart music.m4a
ffmpeg -i source.mp3 -vn -ac 1 -c:a libmp3lame -b:a 96k music.mp3
```

Nothing here is fetched until the gate film has finished downloading, and
nothing is played until the guest taps — so this size is never what stands
between them and the invitation. See **Weight, and slow connections** in the
[main README](../../README.md).

## About the source track

I didn't rip the audio from the YouTube link — that's against YouTube's terms of
service, so it isn't something I'll do for you. Get the file yourself from a
source you're entitled to use (a purchase, the artist's own download, a
royalty-free nasheed library such as Pixabay Music or Uppbeat), rename it
`music.mp3`, and drop it in this folder.

Since this is a wedding invitation that will be shared publicly, a
royalty-free nasheed is also the safer choice — no takedown risk if you ever
share the link on WhatsApp status or Instagram.

## No music file yet?

The page still works perfectly — it just opens in silence. The music button
shows a tooltip saying the file is missing. This is the only audio on the page;
there are no sound effects.
