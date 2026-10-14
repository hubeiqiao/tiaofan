import type {Anime,Rating,ReviewEvidence} from './types';
import {selectedReviewCount} from './review-count';
type Locale='zh'|'en'|'ja';
/** Display order inside an already eligible catalog; never a recommendation or score rank. */
export function featuredByRatingCount<T extends Pick<Anime,'key'|'bgm'|'rating'>>(items:T[]):T[]{
 return items.filter(a=>Number.isFinite(a.rating.bgm?.count)&&a.rating.bgm!.count!>0).sort((a,b)=>b.rating.bgm!.count!-a.rating.bgm!.count!||(a.bgm??Infinity)-(b.bgm??Infinity)||a.key.localeCompare(b.key)).slice(0,3);
}
export function ratingCountLabel(count:number|null|undefined,locale:Locale,sourceKey?:string):string{
 const records=sourceKey==='kitsu'; // Kitsu counts summed ratingFrequencies, not confirmed distinct voters.
 if(count==null||!Number.isFinite(count))return locale==='ja'?'評価件数不明':locale==='en'?(records?'Ratings unavailable':'Votes unavailable'):(records?'评分数未知':'人数未知');
 const value=count.toLocaleString(locale==='zh'?'zh-CN':locale==='ja'?'ja-JP':'en-US');
 if(records)return locale==='ja'?`${value}件の評価`:locale==='en'?`${value} ${count===1?'rating':'ratings'}`:`${value}条评分`;
 return locale==='ja'?`${value}件`:locale==='en'?`${value} ${count===1?'vote':'votes'}`:`${value}人`;
}
export function ratingCountQualification(locale:Locale,sourceKey?:string):string{return locale==='ja'?'少数の評価':locale==='en'?'Few ratings':sourceKey==='kitsu'?'评分较少':'评分人数少'}
export function hasFewRatings(rating:Pick<Rating,'count'>):boolean{return rating.count!=null&&rating.count>=0&&rating.count<10}
export function sourceDate(value?:string|null):string|null{if(!value)return null;const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null}
export function reviewCardContext(review:ReviewEvidence,locale:Locale){
 const count=selectedReviewCount(review),source=review.sources.find(s=>sourceDate(s.retrievedAt))||review.sources[0];
 const sourceName=source&&/^https:\/\/(?:bangumi\.tv|bgm\.tv|chii\.in)\//.test(source.url)?'Bangumi':source?.name||'';
 return{count,label:count?(locale==='ja'?`${count}件の感想を読む`:locale==='en'?`Read ${count} selected ${count===1?'review':'reviews'}`:`${count}条样本 · 查看评价`):(locale==='ja'?'レビューの要約を読む':locale==='en'?'Read review summary':'查看评价摘要'),source:sourceName,date:sourceDate(source?.retrievedAt)};
}
