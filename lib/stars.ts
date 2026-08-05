/** Converts an ambiguous 0-100 trust score into a coarse 1-5 star rating. */
export function scoreToStars(score: number): number {
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

export function starGlyphs(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}
