# Living planets on the galaxy map: packaging and cost

Proved on Zolton and Magmuth, 2026-10-09 (Nick: "prove out the concept before you go build all the ... worlds ... a quality animation while maintaining the smallest file size possible"). `package.py` builds each world's map-size planet and pulls its pictures out into shared, hashed files; `mapdemo.py` makes the proof page. Output goes to `dist/` (not committed).

## Sizes (per world, what a visitor downloads)

| | Before (one embedded page) | Now |
|---|---|---|
| Zolton | about 640 KB | 149 KB (29 KB markup compressed + 119 KB pictures) |
| Magmuth | 633 KB | 131 KB (11 KB + 119 KB) |
| Shared by every world | carried 14 times | 12 KB, once |
| Fourteen worlds (estimate) | about 9 MB | about 2 MB, none of it until the map is near |

How: pictures as separate WebP files named by content hash (the browser caches them, and a picture two worlds share is one file); no base64 (which added a third); markup served compressed (CloudFront `compress = true`); lossy pictures at WebP quality 40 (40, 60 and the original were indistinguishable at map size, checked at 2x); maps 512 wide (384 went visibly soft on the lava seams); the lens for map size drawn at 320 px without dither (dither hides 8-bit steps at 600 px, invisible at 150 px, and smooth values compress tenfold: 63 KB to 12 KB).

## Playback (fourteen planets on the map, headed Chrome)

| Stepping | Graphics thread busy |
|---|---|
| Every planet at 20 fps | 73% |
| Every planet at 12 fps | 41% |
| 20 fps page, planets alternating (10 fps each) | 34% (chosen) |

Nothing is drawn while the map is off screen. Further headroom if needed: merge each planet's lensed layers so it runs fewer displacement filters.
