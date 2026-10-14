import {ExternalLink} from 'lucide-react';
import type {PlaybackEvidence,SourceLink,Stream,WatchListing} from '@/lib/types';
import {translateKnownText} from '@/lib/localization';
import {recentEpisodeAdvance} from '@/lib/episode-updates';
import {WatchListingSection,HistoricalPlaybackSection} from './watch-resources';

type Locale='zh'|'en'|'ja';
type Link={name:string;url:string;regions?:string[]|null;note?:string;scope?:string;scopeLabel?:string;retrievedAt?:string;sourceUrl?:string;kind:'source'|'additional'};
type Group={id:string;name:string;listings:WatchListing[];playback:PlaybackEvidence[];links:Link[]};
const text=(locale:Locale,zh:string,en:string,ja:string)=>locale==='ja'?ja:locale==='en'?en:zh;
const safe=(value:string|null|undefined)=>{try{const u=new URL(value||'');return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
const date=(value:string|null|undefined)=>{if(!value||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value))return null;const day=value.slice(0,10),calendar=new Date(day+'T00:00:00Z');if(!Number.isFinite(+calendar)||calendar.toISOString().slice(0,10)!==day)return null;const d=new Date(value);return Number.isFinite(+d)?d.toISOString().slice(0,16).replace('T',' ')+' UTC':null};
function recordedIssue(playback:PlaybackEvidence[],listing?:WatchListing){
 // Surface a known dated problem without treating it as present-day availability.
 // Unknown labels, undated records and successful samples never become warnings.
 const latest=playback.filter(proof=>date(proof.checkedAt)&&Date.parse(proof.checkedAt)<=Date.now()).sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt))[0];
 if(!latest||latest.playbackVerified!==false||!['wrong-season-catalogue-membership-required','geo-blocked'].includes(latest.verification||''))return null;
 if(latest.verification==='wrong-season-catalogue-membership-required'&&listing?.listingCheckedAt&&Date.parse(listing.listingCheckedAt)>=Date.parse(latest.checkedAt))return null;
 return latest;
}
function providerKey(name:string,url:string){
 const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');
 if(['iyf.tv','anime1.me','netflix.com','crunchyroll.com','bilibili.com','youtube.com','abema.tv','animestore.docomo.ne.jp','acg.gamer.com.tw','video.unext.jp','hbomax.com','viu.com','tver.jp','disneynow.com','iqiyi.com','ch.nicovideo.jp','southparkstudios.com','amazon.co.jp','disneyplus.com','web.nhk','v.youku.com'].includes(host))return host;
 return name.normalize('NFKC').trim().toLocaleLowerCase();
}
function groupsFor(listings:WatchListing[],playback:PlaybackEvidence[],streams:Stream[],extraStreams:SourceLink[]){
 const groups=new Map<string,Group>();
 const group=(name:string,url:string)=>{const id=providerKey(name,url);let row=groups.get(id);if(!row){row={id,name,listings:[],playback:[],links:[]};groups.set(id,row)}return row};
 for(const item of listings){const url=safe(item.sourceUrl);if(url)group(item.provider,url).listings.push(item)}
 for(const item of playback){const url=safe(item.url);if(url)group(item.provider,url).playback.push(item)}
 for(const item of streams){const url=safe(item.url);if(url)group(item.name,url).links.push({...item,url,kind:'source'})}
 for(const item of extraStreams){const url=safe(item.url);if(url)group(item.name,url).links.push({...item,url,kind:'additional'})}
 return [...groups.values()];
}

/** Empty-state decisions use exactly the same HTTPS provider filter as rendering. */
export function hasRenderableWatchProviders({listings=[],playback=[],streams=[],extraStreams=[]}:{listings?:WatchListing[];playback?:PlaybackEvidence[];streams?:Stream[];extraStreams?:SourceLink[]}){return groupsFor(listings,playback,streams,extraStreams).length>0;}

/** One platform is one decision group. Current listing and dated playback remain independent evidence. */
export function WatchProviders({listings=[],playback=[],streams=[],extraStreams=[],format,locale}:{format?:string;listings?:WatchListing[];playback?:PlaybackEvidence[];streams?:Stream[];extraStreams?:SourceLink[];locale:Locale}){
 const groups=groupsFor(listings,playback,streams,extraStreams);if(!groups.length)return null;
 const movie=['movie','电影','剧场版','劇場版'].includes((format||'').toLowerCase());
 const t=(zh:string,en:string,ja:string)=>text(locale,zh,en,ja);
 return <section className="watch-providers" aria-label={movie?t('电影观看平台','Film viewing platforms','映画の視聴先'):t('观看平台与集数','Providers & episodes','配信元とエピソード')}>
  <p className="watch-resource-note">{movie?t('以下是来源收录的电影作品页；当前上线、播放、订阅及地区可用性尚未核验。','These are source-listed film pages; current availability, playback, subscription and region are unverified.','出典に掲載された映画の作品ページです。現在の配信・再生・契約条件・地域は未確認です。'):t('目录集数与历史核对分开记录；当前播放、授权及地区可用性以源站为准。','Listed episodes and dated checks are separate; current playback, rights and region are not established.','掲載話数と過去の確認は別の記録です。現在の再生・配信権・地域での視聴可否は未確認です。')}</p>
  <div className="watch-provider-list">{groups.map(group=>{
   const checked=group.listings.filter(s=>date(s.listingCheckedAt)&&s.latestEpisode&&safe(s.latestUrl)).sort((a,b)=>Number(b.latestEpisode)-Number(a.latestEpisode))[0];
   const listing=checked||group.listings[0],sourceLink=group.links[0],proof=group.playback[0],advance=recentEpisodeAdvance(group.listings);
   const issue=recordedIssue(group.playback,checked);
   const target=checked?safe(checked.latestUrl):listing?safe(listing.sourceUrl):sourceLink?safe(sourceLink.url):safe(proof?.url);
   const action=checked?t('打开第 '+checked.latestEpisode+' 集页面','Open episode '+checked.latestEpisode,'第'+checked.latestEpisode+'話のページ'):listing?t('查看源站目录','View episode listing','配信元の一覧'):!sourceLink&&proof?t('打开记录页面','Open recorded page','記録されたページ'):t('打开作品页','Open title page','作品ページ');
   const status=listing?.status==='failed'?(checked?t('更新暂未完成 · 保留上次目录','Update incomplete · previous listing retained','更新未完了 · 前回の一覧を保持'):null):checked?.stale?t('需重新核对','Recheck due','再確認が必要'):checked?t('目录已核对','Listing checked','一覧を確認済み'):null;
   return <article className="watch-provider" data-watch-provider={group.id} key={group.id}>
    <div className="watch-provider-top"><h3>{group.name}</h3></div>
    {checked?<p className="watch-provider-episode">{t('目录列出第 '+checked.latestEpisode+' 集','Listed through episode '+checked.latestEpisode,'掲載確認：第'+checked.latestEpisode+'話')}</p>:listing?<p className="watch-provider-empty">{listing.status==='failed'?t('目录暂未核对，仍可打开源站','Listing unconfirmed; provider page available','一覧は未確認です。配信元のページを開けます'):t('集数目录尚未核对','Episode listing not checked','エピソード一覧は未確認')}</p>:<p className="watch-provider-empty">{sourceLink?.scope==='series'?t('系列作品页 · 本季范围待确认','Series page · season coverage unconfirmed','シリーズページ · 今期の掲載範囲は未確認'):sourceLink?movie?t('电影作品页 · 当前可看性待核验','Film page · availability unverified','映画の作品ページ · 配信状況は未確認'):t('作品页 · 集数待核对','Title page · episodes unconfirmed','作品ページ · 掲載話数は未確認'):t('集数待核对','Episode count unconfirmed','掲載話数は未確認')}</p>}
    <p className="watch-provider-meta">{status&&<span>{status}</span>}{checked&&<time dateTime={checked.listingCheckedAt!}>{date(checked.listingCheckedAt)}</time>}{!listing&&sourceLink&&<span>{sourceLink.regions?.length?sourceLink.regions.join(' / '):t('地区待核验','Region unverified','地域は未確認')}</span>}</p>
    {issue&&<p className="watch-provider-empty" data-provider-issue={issue.verification}>
     <span>{issue.verification==='geo-blocked'?t('上次核对：测试地区无法播放','Last check: playback blocked in the test region','前回の確認：確認環境の地域では再生不可'):t('上次核对：这是其他季的目录','Last check: this catalogue showed a different season','前回の確認：別シーズンの一覧でした')}</span>{' · '}<time dateTime={issue.checkedAt}>{date(issue.checkedAt)}</time>
    </p>}
    {advance&&<p className="watch-provider-update"><span>{t('近7天目录增加核对','Listing advanced · past 7 days','直近7日間の掲載増加を確認')}</span><time dateTime={advance.observedAt}>{date(advance.observedAt)}</time></p>}
    <div className="watch-provider-controls">{target&&<a className="watch-provider-action" href={target} target="_blank" rel="noreferrer"><span>{action}</span><ExternalLink size={15} aria-hidden="true"/></a>}
    <details className="watch-provider-evidence system-disclosure"><summary><span>{listing?.status==='failed'?t('核对问题与历史记录','Check issue & dated evidence','確認の問題と過去の記録'):t('目录与历史核对','Listing & dated evidence','一覧と過去の確認記録')}</span></summary><div className="watch-provider-evidence-body">
     {group.listings.length>0&&<WatchListingSection listings={group.listings} locale={locale}/>}
     {group.playback.length>0&&<HistoricalPlaybackSection playback={group.playback} locale={locale}/>}
     {group.links.length>0&&<div className="watch-provider-source-links"><h4>{t('来源收录的作品页','Source title pages','出典掲載の作品ページ')}</h4>{[...new Map(group.links.map(link=>[link.url,link])).values()].map(link=><div key={link.url}><a className="watch-provider-action" href={link.url} target="_blank" rel="noreferrer"><span>{link.name}</span><ExternalLink size={14} aria-hidden="true"/></a>{link.scope==='series'&&<p>{translateKnownText(locale,link.scopeLabel||'系列整体页面 · 本季入口待确认')}</p>}{link.regions?.length&&<p>{t('来源地区标签：','Source region labels: ','出典の地域表記：')}{link.regions.join(' / ')}</p>}{link.note&&<p>{translateKnownText(locale,link.note)}</p>}{date(link.retrievedAt)&&<p>{t('来源收录时间：','Source retrieved: ','出典の取得日時：')}<time dateTime={link.retrievedAt}>{date(link.retrievedAt)}</time></p>}</div>)}<p>{t('作品页和地区标签不代表已实测播放。','Title pages and region labels do not verify playback.','作品ページと地域表記は、再生確認を意味しません。')}</p></div>}
    </div></details></div>
   </article>
  })}</div>
 </section>;
}
