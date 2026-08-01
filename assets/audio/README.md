# Background music

The page expects one file here:

```
assets/audio/music.mp3
```

That's it — drop the file in and it works. Nothing else needs editing.

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

**The file currently in this folder is the trimmed version** (4:16.7 ≈ 4:29
minus 0:13), so it plays from its first note.

The numbers live at the top of [`js/main.js`](../../js/main.js):

```js
clipStart: 13,   // 0:13
clipEnd:   269,  // 4:29
volume:    0.55,
fadeMs:    800,
```

Volume fades in over 0.8s from the moment the gate is tapped.

## Trimming it yourself

```bash
ffmpeg -i original.mp3 -ss 13 -to 269 -c:a libmp3lame -b:a 128k music.mp3
```

## File size

The current file is **5.7 MB** at 186 kbps. That's a real download for a guest
on mobile data before they hear anything. Re-encoding costs almost nothing in
quality for background music on a phone speaker:

```bash
ffmpeg -i music.mp3 -c:a libmp3lame -b:a 96k music-small.mp3   # ≈ 3.0 MB
```

Entirely optional — it works fine as it is.

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
