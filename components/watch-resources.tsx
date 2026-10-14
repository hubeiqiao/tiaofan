import {listingFailureReason} from '@/lib/watch-listing-presentation';
import {ExternalLink} from 'lucide-react';
import type {PlaybackEvidence,WatchListing} from '@/lib/types';
import {translateKnownText} from '@/lib/localization';

type Locale = 'zh'|'en'|'ja';
const text = (locale:Locale,zh:string,en:string,ja:string) => locale==='ja'?ja:locale==='en'?en:zh;
function href(value:string|null|undefined){
 try {const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;} catch {return undefined;}
}
function stamp(value:string|null|undefined){
 if(!value||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value))return null;
 const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString().slice(0,16).replace('T',' ')+' UTC':null;
}

/** Provider listings and historical playback tests are independent evidence. */
export function WatchListingSection({listings=[],locale}:{listings?:WatchListing[];locale:Locale}){
 if(!listings.length)return null;
 const t=(zh:string,en:string,ja:string)=>text(locale,zh,en,ja);
 return <section className="watch-listings" aria-label={t('源站集数目录','Provider episode listings','配信元のエピソード一覧')}>
  <h3>{t('源站集数目录','Provider episode listings','配信元のエピソード一覧')}</h3>
  <p className="watch-resource-note">{t('目录记录不代表播放、授权或地区可用性已验证。','Listing checks do not verify playback, rights or regional availability.','一覧の確認は、再生・配信権・地域での視聴可否の確認ではありません。')}</p>
  <div className="watch-resource-group">{listings.map(source=>{
   const checked=stamp(source.listingCheckedAt),latest=checked&&source.latestEpisode?href(source.latestUrl):undefined,sourceUrl=href(source.sourceUrl);
   const state=source.status==='failed'?'failed':!checked?'pending':source.stale?'stale':'checked';
   const status=state==='failed'?t('核对失败','Check failed','確認に失敗'):state==='pending'?t('尚未核对','Not checked yet','未確認'):state==='stale'?t('需重新核对','Recheck due','再確認が必要'):t('目录已核对','Listing checked','一覧を確認済み');
   return <article className="watch-listing-source watch-resource-row" key={source.id} data-listing-state={state}>
    <header className="watch-resource-heading"><strong>{source.provider}</strong><span className="watch-listing-status">{status}</span></header>
    {latest?<a className="watch-listing-latest watch-resource-action" href={latest} target="_blank" rel="noreferrer"><span>{t('最近列出：第 '+source.latestEpisode+' 集','Last listed: episode '+source.latestEpisode,'最終確認：第'+source.latestEpisode+'話')}</span><ExternalLink size={16} aria-hidden="true"/></a>:<>
     <p className="watch-listing-empty">{checked&&source.latestEpisode?t('最近列出：第 '+source.latestEpisode+' 集','Last listed: episode '+source.latestEpisode,'最終確認：第'+source.latestEpisode+'話'):t('还没有经过核对的集数记录。','No checked episode listing is available yet.','確認済みのエピソード情報はまだありません。')}</p>
     {sourceUrl&&<a className="watch-resource-action" href={sourceUrl} target="_blank" rel="noreferrer"><span>{t('打开源站目录','Open provider listing','配信元の一覧を開く')}</span><ExternalLink size={16} aria-hidden="true"/></a>}
    </>}
    {checked&&<p className="watch-listing-date">{t('目录核对：','Listing checked: ','一覧確認：')}<time dateTime={source.listingCheckedAt!}>{checked}</time></p>}
    {(state==='failed'&&checked||state==='stale')&&<p className="watch-listing-retained">{t('保留上次结果，源站可能已有更新。','Previous result retained; the source may have newer episodes.','前回の結果です。配信元は更新されている可能性があります。')}</p>}
    <div className="watch-listing-links">
     <details className="watch-resource-details system-disclosure"><summary><span>{t('目录记录与检查状态','Listing records & check status','記録と確認状況')}</span></summary><div className="watch-listing-records">
      {state==='failed'&&<p className="watch-listing-issue">{listingFailureReason(source.error,locale)}{source.error&&<> <small>({source.error})</small></>}</p>}
      {latest&&sourceUrl&&<a className="watch-resource-action" href={sourceUrl} target="_blank" rel="noreferrer"><span>{t('打开源站目录','Open provider listing','配信元の一覧を開く')}</span><ExternalLink size={16} aria-hidden="true"/></a>}
      {state==='failed'&&checked&&<p>{t('保留上次成功核对的目录；源站可能已有更新。','The last successful listing is retained; the source may have newer episodes.','前回確認できた一覧を保持しています。配信元は更新されている可能性があります。')}</p>}
      <p>{source.refreshMode==='browser-required'?t('此来源需要浏览器核对，不在自动检查范围内。','This source requires a browser check and is outside automatic coverage.','この配信元はブラウザーでの確認が必要なため、自動確認の対象外です。'):t('自动分批检查；符合检查条件不代表马上更新。','Checked in automatic batches; eligibility does not guarantee an immediate update.','自動で順次確認します。確認可能な時刻は、更新時刻の保証ではありません。')}</p>
      {source.automaticQueuePosition!=null&&<p>{t('当前检查队列位置：','Current check queue position: ','現在の確認待ち順：')}{source.automaticQueuePosition}</p>}
      {stamp(source.lastAttemptAt)&&<p>{t('最近尝试：','Last attempt: ','最終試行：')}<time dateTime={source.lastAttemptAt!}>{stamp(source.lastAttemptAt)}</time></p>}
      {source.episodes.length>0&&<><p>{t('以下仅为核对时看到的目录片段，不代表全季完整。','These are the entries observed during the check, not a guarantee of full-season coverage.','確認時に掲載されていた項目です。シーズン全体の網羅を保証するものではありません。')}</p><ul>{source.episodes.map((episode,index)=><li key={episode.url+index}>{href(episode.url)?<a className="watch-resource-action" href={href(episode.url)} target="_blank" rel="noreferrer"><span>{t('第 '+episode.label+' 集','Episode '+episode.label,'第'+episode.label+'話')}</span><ExternalLink size={14} aria-hidden="true"/></a>:<span>{episode.label}</span>}{stamp(episode.publishedAt)&&<small>{t('源站发布：','Source published: ','配信元の公開日時：')}<time dateTime={episode.publishedAt}>{stamp(episode.publishedAt)}</time></small>}</li>)}</ul></>}
     </div></details>
    </div>
   </article>;
  })}</div>
 </section>;
}

function originalLanguage(value:string){
 // Stored Chinese notes can quote Japanese episode names; ignore quoted titles.
 const prose=value.replace(/「[^」]*」|“[^”]*”/g,'');
 return /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(prose)?'ja':/\p{Script=Han}/u.test(prose)?'zh-Hans':/[A-Za-z]/.test(prose)?'en':'und';
}
function historicalStamp(value:string){
 const formatted=stamp(value),calendarDate=value?.slice(0,10);
 // Date accepts February 31 by rolling into March; never present that as proof.
 if(!formatted||new Date(calendarDate+'T00:00:00Z').toISOString().slice(0,10)!==calendarDate)return null;
 return formatted;
}

/** Historical flags describe the recorded check, not present-day availability. */
export function HistoricalPlaybackSection({playback=[],locale}:{playback?:PlaybackEvidence[];locale:Locale}){
 if(!playback.length)return null;
 const t=(zh:string,en:string,ja:string)=>text(locale,zh,en,ja);
 const state=(value:boolean|null|undefined)=>value===true?'verified':value===false?'unverified':'unknown';
 const label=(value:boolean|null|undefined,yes:string,no:string,unknown:string)=>value===true?yes:value===false?no:unknown;
 const translated=(value:string)=>{
  const localized=translateKnownText(locale,value);
  return <span lang={localized===value?originalLanguage(value):locale==='zh'?'zh-Hans':locale}>{localized}</span>;
 };
 return <section className="watch-history" aria-label={t('历史播放抽样','Historical playback samples','過去の再生確認')}>
  <h3>{t('历史播放抽样','Historical playback samples','過去の再生確認')}</h3>
  <p className="watch-resource-note">{t('仅为历史抽样，不代表当前或全部集数可用。','Dated samples only; current and all-episode availability are not established.','過去のサンプルです。現在・全話の視聴可否を示すものではありません。')}</p>
  <div className="watch-resource-group">{playback.map((proof,index)=>{
   const url=href(proof.url),checked=historicalStamp(proof.checkedAt);
   const title=<span><strong>{proof.provider}</strong>{' · '}{proof.episode?t('第 '+proof.episode+' 集','Episode '+proof.episode,'第'+proof.episode+'話'):t('打开作品页','Open title page','作品ページを開く')}</span>;
   const scope=proof.verificationScope==='sampled-episode-start'?t('单集起播抽样','Sampled episode start','1話の再生開始サンプル'):proof.verificationScope==='catalogue-and-provider-check'?t('目录与平台核对','Catalogue and provider check','一覧と配信元の確認'):proof.verificationScope;
   return <article className="watch-playback-record watch-resource-row" key={proof.url+index}>
    {url?<a className="watch-resource-action watch-playback-link" href={url} target="_blank" rel="noreferrer">{title}<ExternalLink size={16} aria-hidden="true"/></a>:<p className="watch-playback-title">{title}</p>}
    <div className="watch-playback-flags" aria-label={t('历史核对结果','Historical check results','過去の確認結果')}>
     <span data-proof-flag="playback" data-proof-state={state(proof.playbackVerified)}>{label(proof.playbackVerified,t('播放已验证','Playback verified','再生を確認済み'),t('播放未验证','Playback unverified','再生は未確認'),t('播放情况未知','Playback unknown','再生の記録なし'))}</span>
     <span data-proof-flag="region" data-proof-state={state(proof.regionVerified)}>{label(proof.regionVerified,t('地区已核对','Region checked','地域を確認済み'),t('地区未验证','Region unverified','地域は未確認'),t('地区情况未知','Region unknown','地域の記録なし'))}</span>
     <span data-proof-flag="rights" data-proof-state={state(proof.rightsVerified)}>{label(proof.rightsVerified,t('授权已核对','Rights verified','配信権を確認済み'),t('授权未核验','Rights unverified','配信権は未確認'),t('授权情况未知','Rights unknown','配信権の記録なし'))}</span>
    </div>
    <p className="watch-listing-date">{checked?<>{t('实测记录：','Check recorded: ','確認日時：')}<time dateTime={proof.checkedAt}>{checked}</time></>:t('实测日期不可用','Check date unavailable','確認日時は不明')}</p>
    <details className="watch-resource-details system-disclosure"><summary><span>{t('核对范围与记录','Scope & test notes','確認範囲と記録')}</span></summary><div className="watch-listing-records">
     <dl className="watch-playback-facts">
      <div><dt>{t('测试地区','Test region','確認環境の地域')}</dt><dd>{proof.regionObserved?translated(proof.regionObserved):t('未记录','Not recorded','記録なし')}</dd></div>
      <div><dt>{t('核对范围','Check scope','確認範囲')}</dt><dd>{scope?scope===proof.verificationScope?translated(scope):scope:t('未记录核对范围','Scope not recorded','確認範囲の記録なし')}</dd></div>
      <div><dt>{t('完整单集','Full episode','1話全体')}</dt><dd>{label(proof.fullEpisodeViewed,t('已观看','Viewed','視聴済み'),t('未完整观看','Not fully viewed','全編未視聴'),t('未知','Unknown','不明'))}</dd></div>
      <div><dt>{t('全部集数','Every episode','全話')}</dt><dd>{label(proof.allEpisodesVerified,t('已核对','Verified','確認済み'),t('未核对','Not verified','未確認'),t('未知','Unknown','不明'))}</dd></div>
     </dl>
     {proof.official===false&&<p>{t('第三方来源','Third-party source','第三者の配信元')}</p>}
     {proof.statusLabel&&<p>{translated(proof.statusLabel)}</p>}
     {proof.verification&&<p>{t('原始核对结果：','Recorded outcome: ','記録された確認結果：')}<span lang={originalLanguage(proof.verification)}>{proof.verification}</span></p>}
     {proof.note&&<p className="watch-playback-note" lang={originalLanguage(proof.note)}>{proof.note}</p>}
    </div></details>
   </article>;
  })}</div>
 </section>;
}

export function CommunityWatchLinks({locale}:{locale:Locale}){return <p className="watch-resource-note">{text(locale,'虚构示例不提供观看资源。','No viewing resources are provided for fictional demo titles.','架空のデモ作品に視聴リンクはありません。')}</p>;}
