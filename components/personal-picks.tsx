'use client';

import {RatingEvidence} from '@/components/rating-evidence';
import {useState} from 'react';
import {Bookmark, Check, ChevronDown, ExternalLink} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {translateKnownText, type Locale} from '@/lib/localization';
import {AnimePoster} from '@/components/anime-poster';
import {isWatchlistState, type Anime, type Rating} from '@/lib/types';

export type PersonalRecommendationEvidence = {
  code?: string;
  tags?: string[];
  sourceUrl?: string;
  seed?: {id?: string; title?: string; sourceUrl?: string; favorite?: boolean; state?: string};
};
export type PersonalRecommendationEntry = {
  bgm?: number;
  /** Accepted for older responses only; source evidence does not establish a match score. */
  score?: number;
  entryStatus?: 'unknown' | 'verified_entry' | 'known_non_entry' | 'conflict';
  evidence?: PersonalRecommendationEvidence[];
};
export type PersonalPicksProps = {
  /** Already projected to the selected locale by the owning screen. */
  items: Anime[];
  results?: PersonalRecommendationEntry[];
  mode?: 'personal' | 'discovery';
  savedKeys: ReadonlySet<string> | ReadonlyMap<string, unknown>;
  savingKey?: string;
  seedNames: Readonly<Record<string, string>>;
  locale: Locale;
  /** Revalidation removes private DOM without discarding in-memory disclosure state. */
  paused?: boolean;
  readOnly?: boolean;
  onDetail: (item: Anime) => void;
  onSave: (item: Anime) => void | Promise<unknown>;
};

const copy = {
  zh: {list:'根据片单推荐', discoveryList:'公开目录发现', save:'加入片单', saved:'已收录', saving:'正在保存…', sources:'推荐依据', publicSources:'资料来源', tags:'共同来源标签', favorite:'已标为珍藏', watching:'正在看', library:'片单中的作品', candidate:'候选作品来源', ratings:'社区评分', noScore:'社区评分待积累', unknownEntry:'观看顺序待核对', nonEntry:'需先看前作', paused:'正在核对片单，稍后恢复推荐。', fallback:'先了解剧情，再决定是否加入片单。', sourceNote:'共同标签是题材线索；加入片单或看完不代表喜欢。', publicFallback:'公开目录作品，题材标签待补充。', publicTags:(tags:string)=>`公开目录标签：${tags}。`, detail:(title:string)=>`查看《${title}》详情`, saveLabel:(title:string)=>`将《${title}》加入片单`},
  en: {list:'Recommendations from your library', discoveryList:'Public catalogue discovery', save:'Save', saved:'Saved', saving:'Saving…', sources:'Sources', publicSources:'Sources', tags:'Shared source tags', favorite:'Marked as a favorite', watching:'Watching', library:'In your library', candidate:'Candidate source', ratings:'Community ratings', noScore:'No community score yet', unknownEntry:'Watch order unverified', nonEntry:'Earlier viewing required', paused:'Checking your library. Recommendations will return shortly.', fallback:'Read the story before deciding whether to save.', sourceNote:'Shared tags are topic clues. Saving or finishing a title does not mean liking it.', publicFallback:'From the public catalogue; genre tags are not available yet.', publicTags:(tags:string)=>`Public catalogue tags: ${tags}.`, detail:(title:string)=>`View details for ${title}`, saveLabel:(title:string)=>`Save ${title} to your list`},
  ja: {list:'マイリストからのおすすめ', discoveryList:'公開カタログから探す', save:'保存', saved:'保存済み', saving:'保存中…', sources:'おすすめの根拠', publicSources:'資料の出典', tags:'共通の出典タグ', favorite:'お気に入りに登録', watching:'視聴中', library:'マイリスト内の作品', candidate:'候補作品の出典', ratings:'コミュニティ評価', noScore:'コミュニティ評価はまだありません', unknownEntry:'視聴順は未確認', nonEntry:'前作の視聴が必要', paused:'マイリストを確認しています。確認後におすすめを再表示します。', fallback:'あらすじを読んで、保存するか決めてみてください。', sourceNote:'共通タグは題材の手がかりです。保存や視聴済みだけでは好みを示しません。', publicFallback:'公開カタログの作品です。ジャンルタグはまだありません。', publicTags:(tags:string)=>`公開カタログのタグ：${tags}。`, detail:(title:string)=>`「${title}」の詳細を見る`, saveLabel:(title:string)=>`「${title}」をマイリストに保存`},
};
const missingTagTranslations: Record<string, {en:string; ja:string}> = {
  友情:{en:'Friendship',ja:'友情'}, 家庭:{en:'Family',ja:'家族'}, 血腥:{en:'Gore',ja:'流血描写'}, 热血:{en:'Hot-blooded',ja:'熱血'},
  魔法:{en:'Magic',ja:'魔法'}, 群像:{en:'Ensemble cast',ja:'群像劇'}, 萌系:{en:'Moe',ja:'萌え'}, 致郁:{en:'Bleak themes',ja:'重いテーマ'},
};
const sources = [{key:'bgm', label:'Bangumi', scale:10}, {key:'kitsu', label:'Kitsu', scale:100}, {key:'mal', label:'MAL', scale:10}] as const;
function safeUrl(value?:string) {
  if (!value) return undefined;
  try { const url=new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
function ratingTitle(rating:Rating, source:string, locale:Locale) {
  const cached=source==='mal'&&(rating.cacheStale||rating.cacheDegraded) ? (locale==='zh'?'保留上次成功的 MAL 缓存，本次未能更新。':locale==='ja'?'前回取得した MAL のキャッシュです。今回は更新できませんでした。':'Previous successful MAL cache; refresh unavailable.') : '';
  return [cached, translateKnownText(locale,rating.note || source)].filter(Boolean).join(' ');
}
function localizedTag(tag:string, locale:Locale) { return locale === 'zh' ? tag : missingTagTranslations[tag]?.[locale] || translateKnownText(locale, tag); }
function cleanTags(tags?:string[]) { return [...new Set((tags || []).filter(tag=>typeof tag==='string').map(tag=>tag.trim()).filter(Boolean))]; }
function seedTitle(evidence:PersonalRecommendationEvidence, seedNames:PersonalPicksProps['seedNames']) { return seedNames[evidence.seed?.id || ''] || evidence.seed?.title || ''; }
function sharedEvidence(entry:PersonalRecommendationEntry | undefined, seedNames:PersonalPicksProps['seedNames']) {
  return (entry?.evidence || []).filter(e => e.code === 'SHARED_SOURCE_TAGS' && e.seed?.id && seedTitle(e,seedNames) && cleanTags(e.tags).length && (e.seed.favorite === true || isWatchlistState(e.seed.state))).sort((a,b) => Number(b.seed?.favorite === true)-Number(a.seed?.favorite === true)).slice(0,2);
}
function reason(evidence:PersonalRecommendationEvidence | undefined, locale:Locale, seedNames:PersonalPicksProps['seedNames']) {
  if (!evidence) return copy[locale].fallback;
  const title=seedTitle(evidence,seedNames), tags=cleanTags(evidence.tags).slice(0,2).map(tag=>localizedTag(tag,locale)).join(locale==='en'?' / ':'・');
  const favorite=evidence.seed?.favorite === true, watching=evidence.seed?.state === 'watching';
  if (locale==='zh') return favorite ? `与你珍藏的《${title}》同有「${tags}」标签。` : watching ? `与你在看的《${title}》同有「${tags}」标签。` : `与你片单中的《${title}》同有「${tags}」标签。`;
  if (locale==='ja') return favorite ? `お気に入りの「${title}」と「${tags}」タグが共通。` : watching ? `視聴中の「${title}」と「${tags}」タグが共通。` : `マイリスト内の「${title}」と「${tags}」タグが共通。`;
  return favorite ? `Shares ${tags} tags with your favorite, ${title}.` : watching ? `Shares ${tags} tags with ${title}, which you are watching.` : `Shares ${tags} tags with ${title} in your library.`;
}
function publicReason(item:Anime, locale:Locale) {
  const tags=cleanTags(item.tags).slice(0,3).map(tag=>localizedTag(tag,locale)).join(locale==='en'?' / ':'・');
  return tags ? copy[locale].publicTags(tags) : copy[locale].publicFallback;
}
function publicSources(item:Anime) {
  const links=[...sources.map(source=>({name:source.label,url:safeUrl(item.rating[source.key]?.url)})),...(item.sourceLinks || []).map(source=>({name:source.name,url:safeUrl(source.url)}))];
  return links.filter((link,index)=>link.url && links.findIndex(other=>other.url===link.url)===index).slice(0,3);
}
function Poster({item}:{item:Anime}) {return <AnimePoster image={item.image} bgm={item.bgm} title={item.name} fallbackClassName="recommendation-poster-fallback" sizes="(max-width:479px) 96px, (max-width:899px) 44vw, (max-width:1199px) 29vw, 22vw"/>}

export function PersonalPicks({items,results=[],mode='personal',savedKeys,savingKey='',seedNames,locale,paused=false,readOnly=false,onDetail,onSave}:PersonalPicksProps) {
  const [openSources,setOpenSources]=useState<Record<string,boolean>>({});
  const text=copy[locale], discovery=mode==='discovery';
  // The parent must key this component by account identity, so a new account
  // starts fresh. Keep it mounted across same-identity revalidation only.
  if (paused) return <p className="recommendation-paused" role="status">{text.paused}</p>;
  return <div className="recommendation-grid" role="list" aria-label={discovery?text.discoveryList:text.list} lang={locale==='zh'?'zh-CN':locale}>
    {items.map(item=>{
      const entry=results.find(row=>typeof item.bgm==='number'&&row.bgm===item.bgm), evidence=discovery?[]:sharedEvidence(entry,seedNames), isSaved=savedKeys.has(item.key), isSaving=savingKey===item.key;
      const ratings=sources.filter(source=>typeof item.rating[source.key]?.score==='number'&&Number.isFinite(item.rating[source.key].score));
      const candidateSources=publicSources(item), hasSources=evidence.length>0||candidateSources.length>0;
      const entryLabel=entry?.entryStatus==='verified_entry'?null:entry?.entryStatus==='known_non_entry'?text.nonEntry:text.unknownEntry;
      return <Card className="recommendation-card" key={item.key} role="listitem" aria-label={item.name}>
        <button type="button" className="recommendation-poster" onClick={()=>onDetail(item)} aria-label={text.detail(item.name)}><Poster key={item.image} item={item}/></button>
        <CardContent className="recommendation-content">
          <h3 className="recommendation-title"><button type="button" onClick={()=>onDetail(item)}>{item.name}</button></h3>
          <div className="recommendation-ratings" aria-label={text.ratings}>
            {ratings.map(source=>{const rating=item.rating[source.key];return <a className="recommendation-rating" key={source.key} href={safeUrl(rating.url)} target="_blank" rel="noreferrer" aria-label={`${source.label}: ${rating.score!.toFixed(1)}/${source.scale}`} title={ratingTitle(rating,source.key,locale)}><RatingEvidence source={source.label} sourceKey={source.key} score={rating.score!} scale={source.scale} count={rating.count} locale={locale}/></a>;})}
            {!ratings.length&&<span className="recommendation-no-score">{text.noScore}</span>}
          </div>
          {item.summary.trim()&&<p className="recommendation-summary">{item.summary.trim()}</p>}
          <p className="recommendation-reason">{discovery?publicReason(item,locale):reason(evidence[0],locale,seedNames)}</p>
          {entryLabel&&<span className="recommendation-entry-status">{entryLabel}</span>}
          <div className="recommendation-actions" aria-busy={isSaving}>
            <Button type="button" className="recommendation-save" variant={isSaved?'secondary':'default'} disabled={readOnly||isSaved||!!savingKey} aria-busy={isSaving} aria-label={isSaved?`${text.saved}: ${item.name}`:text.saveLabel(item.name)} onClick={()=>{if(!readOnly)void onSave(item)}}>{isSaved?<Check size={15} aria-hidden="true"/>:<Bookmark size={15} aria-hidden="true"/>}{isSaved?text.saved:isSaving?text.saving:text.save}</Button>
          </div>
          {hasSources&&<Collapsible className="recommendation-proof" open={!!openSources[item.key]} onOpenChange={open=>setOpenSources(previous=>({...previous,[item.key]:open}))}>
            <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="recommendation-proof-trigger">{discovery?text.publicSources:text.sources}<ChevronDown size={14} aria-hidden="true"/></Button></CollapsibleTrigger>
            <CollapsibleContent className="recommendation-proof-content">
              {evidence.map((record,index)=>{
                const seedUrl=safeUrl(record.seed?.sourceUrl), candidateUrl=safeUrl(record.sourceUrl);
                const seedLabel=`${record.seed?.favorite===true?text.favorite:record.seed?.state==='watching'?text.watching:text.library}: ${seedTitle(record,seedNames)}`;
                return <div className="recommendation-proof-item" key={`${record.seed?.id}-${index}`}><span className="recommendation-proof-tags">{text.tags} · {cleanTags(record.tags).map(tag=>localizedTag(tag,locale)).join(' / ')}</span>{seedUrl?<a href={seedUrl} target="_blank" rel="noreferrer">{seedLabel}<ExternalLink size={12} aria-hidden="true"/></a>:<span className="recommendation-proof-tags">{seedLabel}</span>}{candidateUrl&&<a href={candidateUrl} target="_blank" rel="noreferrer">{text.candidate}<ExternalLink size={12} aria-hidden="true"/></a>}</div>;
              })}
              {!evidence.length&&candidateSources.length>0&&<div className="recommendation-proof-item">{candidateSources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}<ExternalLink size={12} aria-hidden="true"/></a>)}</div>}
              {evidence.length>0&&<p className="recommendation-source-note">{text.sourceNote}</p>}
            </CollapsibleContent>
          </Collapsible>}
        </CardContent>
      </Card>;
    })}
  </div>;
}
