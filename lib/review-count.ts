import type {ReviewEvidence} from './types';
/** Navigation counts refer only to rendered individual notes, never the wider source sample. */
export function selectedReviewCount(review?:ReviewEvidence|null):number{
 return Array.isArray(review?.individualReviews)?review.individualReviews.length:0;
}
export function reviewLinkLabel(review:ReviewEvidence|undefined,locale:'zh'|'en'|'ja'):string{
 if(!review)return locale==='ja'?'レビューは準備中':locale==='en'?'Reviews pending':'评价待补充';
 const count=selectedReviewCount(review);
 return count?(locale==='ja'?`レビュー · ${count}`:locale==='en'?`Reviews · ${count}`:`评价 · ${count}`):(locale==='ja'?'レビューの要約':locale==='en'?'Review summary':'评价摘要');
}
