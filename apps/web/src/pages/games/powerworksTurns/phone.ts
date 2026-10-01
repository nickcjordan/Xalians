/**
  Phone mode (UX pass 2, round 4, docs/design/powerworks-ux-pass-2.md). On a landscape phone the
  play screen is not the 1280x720 console shrunk with zoom (that made every word about 6 px):
  it is composed again at the phone's own size, at zoom 1, with its own layout in CSS under
  `.pwt-console.phone`. Desktop never sees any of it.
*/

/** A landscape screen this short is a phone (the largest phones are 430 to 440 tall). */
export const PHONE_MAX_HEIGHT = 500;

export function isPhoneLandscape(width: number, height: number): boolean {
  return width > height && height <= PHONE_MAX_HEIGHT;
}

/**
  What pressing a key does. A key that needs a target (one enemy of several, one squadmate) is
  selected, or unselected when it already is; the target is chosen next. A key that acts on the press
  alone (on itself, the whole squad, every enemy, or the only target there is) acts at once on a mouse
  or keyboard; on a touch screen, where there is no hover to look first, the first tap selects it (its
  numbers show on the plates) and the second tap uses it.
*/
export function keyPressStep(twoTap: boolean, selected: number | null, index: number, actsAtOnce: boolean): "select" | "unselect" | "act" {
  if (!actsAtOnce) return selected === index ? "unselect" : "select";
  return twoTap && selected !== index ? "select" : "act";
}
