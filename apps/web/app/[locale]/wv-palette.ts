// Variant 2 "White" — single source of truth for the DNA palette. Imported by
// every white module (showcase, header, footer, shop, PDP) so a tweak lands in
// one place instead of drifting across files.

export const INK = '#1c1714'; // primary text — warm near-black, not pure #000
// Warm secondary grey. Tuned to 5.0:1 on #fff (WCAG AA for body text); the DNA
// brief's #8c837a was only 3.72:1 and failed on descriptions/nav/prices/footer.
// Keep edits at or above this contrast — do NOT revert to #8c837a.
export const MUTED = '#776e64';
export const HAIR = '#e7e2db'; // hairline borders / dividers
export const SIGNAL = '#b4452f'; // colour used only as a signal (sale, accents)
