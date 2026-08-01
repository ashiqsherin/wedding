# Background music

The page expects one file here:

```
assets/audio/music.mp3
```

That's it — drop the file in and it works. Nothing else needs editing.

## How the clip is handled

You asked for the section **0:13 → 4:29**. The player already does this in
JavaScript, so you can drop in the **full-length track** untrimmed:

- playback starts at `0:13`
- when it reaches `4:29` it loops straight back to `0:13`
- volume fades in gently over ~2 seconds when the gate opens

Those numbers live at the top of [`js/main.js`](../../js/main.js):

```js
clipStart: 13,   // 0:13
clipEnd:   269,  // 4:29
volume:    0.55,
```

## If you'd rather pre-trim the file

Smaller download for guests on mobile data. With `ffmpeg` (already installed on
your machine):

```bash
ffmpeg -i original.mp3 -ss 13 -to 269 -c:a libmp3lame -b:a 128k music.mp3
```

Then set `clipStart: 0` and `clipEnd: 256` in `js/main.js`.

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

The page still works perfectly. The music button just shows a tooltip saying the
file is missing, and every other sound (the door creak, the golden shimmer, the
closing thud, button taps) is **synthesised in the browser** with the Web Audio
API — no files involved, nothing to 404.
