/**
 * Cloudinary can resize and re-encode on the fly: `f_auto` serves WebP/AVIF to browsers that
 * support them, `q_auto` picks a quality that looks the same at a fraction of the bytes, and
 * `w_` stops phones from downloading 4000px originals. Non-Cloudinary URLs are returned as-is.
 */
export function optimizedImage(url: string | undefined, width: number): string {
  if (!url) return '';
  const marker = '/image/upload/';
  const at = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || at === -1) return url;
  const rest = url.slice(at + marker.length);
  // Already transformed (e.g. ".../upload/w_400,c_fill/v123/...") — leave it alone. A plain
  // version segment ("v123/") has no underscore, so it doesn't match.
  if (/^[a-z]{1,3}_[^/]*\//.test(rest)) return url;
  return `${url.slice(0, at + marker.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

/** `srcSet` for responsive <img> tags. */
export function optimizedSrcSet(url: string | undefined, widths: number[]): string | undefined {
  if (!url || !url.includes('res.cloudinary.com')) return undefined;
  return widths.map((w) => `${optimizedImage(url, w)} ${w}w`).join(', ');
}
