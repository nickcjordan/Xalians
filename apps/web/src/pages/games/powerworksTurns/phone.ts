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

/** One key cell's identity, for the tap preview ("key index : target"). */
export function cellId(keyIndex: number, target: string): string {
  return `${keyIndex}:${target}`;
}

/**
  On a touch screen there is no hover, so a key cell answers the first tap with its preview (the
  stage rings who it lands on) and the second tap on the same cell uses it. A mouse or keyboard
  press, or a cell already previewed, commits at once.
*/
export function tapStep(twoTap: boolean, previewed: string | null, id: string): "preview" | "commit" {
  return twoTap && previewed !== id ? "preview" : "commit";
}
