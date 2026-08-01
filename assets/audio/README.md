# Background music

The page expects one file here:

```
assets/audio/music.mp3
```

That's it — drop the file in and it works. Nothing else needs editing.

## How the clip is handled

You asked for the section **0:13 → 4:29**. The player already does this in
JavaScript, so you can drop in the **full-length track** untrimmed:

- playback starts at `0:13`, the moment the gate is tapped
- when it reaches `4:29` it loops straight back to `0:13`
- volume fades in over 0.8s, so it's audible almost immediately

Those numbers live at the top of [`js/main.js`](../../js/main.js):

```js
clipStart: 13,   // 0:13
clipEnd:   269,  // 4:29
volume:    0.55,
fadeMs:    800,
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

The page still works perfectly — it just opens in silence. The music button
shows a tooltip saying the file is missing. This is the only audio on the page;
there are no sound effects.
