// Bangumi's public subject API exposes these same-image resize variants.
// Restrict rewriting to its exact cover host/path; other providers stay untouched.
export function posterSrcSet(src:string){
 const match=/^https:\/\/lain\.bgm\.tv\/(?:r\/(?:100|200|400|800)\/)?(pic\/cover\/l\/[a-f0-9]{2}\/[a-f0-9]{2}\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp))$/.exec(src);
 return match?[200,400,800].map(w=>`https://lain.bgm.tv/r/${w}/${match[1]} ${w}w`).join(', '):undefined;
}
export const catalogPosterSizes='(max-width:700px) calc((100vw - 44px) / 2), (max-width:1023px) calc((100vw - 164px) / 3), (max-width:1279px) calc((100vw - 188px) / 4), (max-width:1679px) calc((100vw - 208px) / 5), (max-width:2199px) calc((100vw - 228px) / 6), 300px';
// Match the two compact-layout conditions in mobile.css without a client-only
// viewport branch. Hidden hero art resolves to inline transparent pixels.
export const desktopHeroMedia='(min-width:701px) and (min-height:501px), (min-width:951px)';
export const transparentPoster='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221%22%20height=%221%22/%3E';

// Official Bangumi v0 documented image redirect. This is an on-demand lookup,
// not a claim that the archive contains a verified image for every title.
/** Source demo deliberately never requests upstream artwork. */
export function posterSources(_image?:string,_bgm?:number):string[]{return ['/demo-poster.svg'];}
