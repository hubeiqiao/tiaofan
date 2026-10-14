import type {Anime} from './types';
import {translateKnownText,type Locale} from './localization';
export type EnglishRecord={summary?:string;watchPoints?:string[];sourceUrl?:string;originalName?:string;review?:Anime['review']};
export type LocalizedRecord=EnglishRecord;
export function englishKey(a:Pick<Anime,'bgm'|'kitsuId'>){return a.bgm?String(a.bgm):a.kitsuId?'kitsu:'+a.kitsuId:''}
export function projectAnime(a:Anime,record:LocalizedRecord|undefined,locale:Locale,pending=false):Anime{
 if(locale==='zh')return a;
 const ja=locale==='ja',t=(value:string|undefined)=>value?translateKnownText(locale,value):value;
 const coverageReason=a.reviewCoverage?t(a.reviewCoverage.reason)!:'';
 const localizedCoverageReason=locale==='en'&&/\p{Script=Han}/u.test(coverageReason)?'No sufficiently detailed, verifiable review sample is available yet. Refer to the linked source and its recorded check date.':coverageReason;
 const stageTitle=ja?undefined:a.bgm===639938?'STEEL BALL RUN JoJo’s Bizarre Adventure — 2nd & 3rd Stages':a.bgm===551918?'STEEL BALL RUN JoJo’s Bizarre Adventure — 1st Stage':undefined;
 const englishAlias=a.aliases?.find(s=>/[A-Za-z]{3}/.test(s)&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s));
 const japaneseAlias=[a.originalName,record?.originalName,...(a.aliases||[])].find(s=>s&&/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s));
 const name=ja?japaneseAlias||a.originalName||record?.originalName||a.name:stageTitle||englishAlias||a.originalName||record?.originalName||a.name;
 const missing=ja?(pending?'日本語のあらすじを読み込み中…':'日本語のあらすじはまだありません。リンク先の出典をご確認ください。'):(pending?'Loading English synopsis…':'An English synopsis is not yet available. Refer to the linked original source.');
 return {...a,name,summary:record?.summary||missing,editorial:{summary:record?.summary||missing,watchPoints:record?.watchPoints||[],sourceUrl:record?.sourceUrl||a.editorial?.sourceUrl||a.rating.bgm?.url||a.rating.kitsu?.url||''},review:record?.review,
  reviewCoverage:a.reviewCoverage?{...a.reviewCoverage,reason:localizedCoverageReason}:undefined,
  playback:a.playback?.map(p=>({...p,provider:t(p.provider)!,statusLabel:t(p.statusLabel),note:t(p.note),regionObserved:t(p.regionObserved||undefined)})),
  sourceLinks:a.sourceLinks?.map(s=>({...s,name:t(s.name)!,note:t(s.note)})),extraStreams:a.extraStreams?.map(s=>({...s,name:t(s.name)!,note:t(s.note)})),
  streams:a.streams?.map(s=>({...s,name:t(s.name)!,note:t(s.note),scopeLabel:t(s.scopeLabel),regionScope:t(s.regionScope)}))};
}
