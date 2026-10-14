import {SiteMark} from '@/components/site-mark';
import {SiteFooter} from '@/components/site-footer';
import {readingSynopsis} from '@/lib/synopsis-presentation';
import {RatingEvidence} from '@/components/rating-evidence';
import {ratingCountLabel} from '@/lib/catalog-evidence-context';
import {CommunityWatchLinks} from '@/components/watch-resources';
import {WatchProviders,hasRenderableWatchProviders} from '@/components/watch-providers';
import {AnimePoster} from '@/components/anime-poster';
import {relationLabel} from './relation-label';
import {translateKnownText} from './localization';
import type {relatedAnime} from './related-anime';
import type {Metadata} from 'next';
import english from '@/data/english-content.json';
import japanese from '@/data/japanese-content.json';
import {projectAnime,type EnglishRecord} from './localized-content';
import {animeContent,seasonContent,jsonLd,SEASONS,SEASON_NAMES} from './public-content';
import {premiereLabel} from './premiere';
import {japaneseRelativeReviewDate} from './japanese-format';
import type {Anime,PlaybackEvidence,Stream,SourceLink} from './types';
import {SITE_ORIGIN,SITE_LOCALES,siteBrand,siteOgImage,localePath,localeLanguage,localeOpenGraph,localeOgAlternates,localeAlternates,type SiteLocale} from './site-brand';

type Lang=SiteLocale;
const texts=(lang:Lang,zh:string,en:string,ja:string)=>lang==='ja'?ja:lang==='en'?en:zh;
export const documentPath=localePath;
export const languageAlternates=localeAlternates;
const recordFor=(id:number|undefined,lang:Lang)=>((lang==='ja'?japanese.items:english.items) as Record<string,EnglishRecord>)[String(id)];

function validDay(date:string){const d=new Date(date+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date}
export function releaseText(date:string,format:string,lang:Lang){
 if(lang==='zh')return premiereLabel(date,undefined,format);
 const movie=['movie','电影','剧场版','劇場版'].includes(format.toLowerCase()),future=date>new Date().toISOString().slice(0,10);
 if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&validDay(date))return (movie?texts(lang,'','Source release date: ','出典記載の公開日：'):future?texts(lang,'','Expected premiere: ','放送開始予定日：'):texts(lang,'','Premiere: ','放送開始日：'))+date;
 if(/^\d{4}-(?:0[1-9]|1[0-2])$/.test(date))return (movie?texts(lang,'','Source release month: ','出典記載の公開月：'):texts(lang,'','Premiere month: ','放送開始月：'))+date;
 const quarter=date.match(/^(\d{4})-Q([1-4])$/i);
 if(quarter){const month=(Number(quarter[2])-1)*3+1;return lang==='ja'?`${quarter[1]}年${month}〜${month+2}月${movie?'公開予定':'放送開始予定'}`:`Expected ${movie?'release':'premiere'}: ${quarter[1]} Q${quarter[2]}`}
 return movie?texts(lang,'','Release date unverified','公開日は未確認'):texts(lang,'','Premiere date unconfirmed','放送開始日は未定');
}
// ISO timestamps have a known zone. Source-supplied relative dates stay unchanged;
// converting them to absolute dates would invent precision or a timezone.
export function sourceDateText(value:string|number){
 if(typeof value==='string'&&!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value))return value;
 const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString().slice(0,16).replace('T',' ')+' UTC':String(value);
}
function noteLanguage(value:string,lang:Lang){return lang==='en'&&/\p{Script=Han}/u.test(value)?'zh-Hans':localeLanguage(lang)}
function formatText(format:string,lang:Lang){
 if(lang==='zh')return format;
 const labels:Record<string,[string,string]>={tv:['TV anime','TVアニメ'],movie:['Movie','劇場版'],'电影':['Movie','劇場版'],'剧场版':['Movie','劇場版'],'劇場版':['Movie','劇場版'],web:['Web anime','Webアニメ'],ona:['Web anime','Webアニメ'],ova:['OVA','OVA'],oad:['OAD','OAD'],special:['Special','特別編'],'特别篇':['Special','特別編'],'网络动画':['Web anime','Webアニメ'],'电视动画':['TV anime','TVアニメ'],music:['Music video','ミュージックビデオ']};
 return labels[format.toLowerCase()]?.[lang==='ja'?1:0]||(/^[\x20-\x7e]+$/.test(format)?format:texts(lang,'','Anime','アニメ'));
}
function DocumentNav({lang,path}:{lang:Lang;path:string}){
 return <nav className="public-document-nav"><a className="public-brand" href={documentPath('/',lang)}><SiteMark locale={lang}/><span>{texts(lang,'返回交互片单','Interactive catalog','アニメ一覧に戻る')}</span></a><div className="public-language-links" aria-label={texts(lang,'切换语言','Choose language','表示言語')} style={{display:'flex',gap:12,flexWrap:'wrap'}}>{SITE_LOCALES.map(locale=><a key={locale} href={documentPath(path,locale)} hrefLang={localeLanguage(locale)} lang={localeLanguage(locale)} data-locale-switch={locale} aria-current={locale===lang?'page':undefined}>{locale==='zh'?'中文':locale==='en'?'English':'日本語'}</a>)}</div></nav>;
}
type PublicAnime=Anime&{related?:ReturnType<typeof relatedAnime>;bgm:number;playback:PlaybackEvidence[];streams:Stream[];sourceLinks:SourceLink[];updatedAt:number};
export async function documentAnime(id:number,lang:Lang):Promise<PublicAnime|null>{
 const a=await animeContent(id);if(!a)return null;
 const projected=projectAnime(a,recordFor(id,lang),lang);
 return{...a,...projected,bgm:id,playback:projected.playback??a.playback,streams:projected.streams??a.streams,sourceLinks:projected.sourceLinks??a.sourceLinks};
}
export function animeMetadata(a:NonNullable<Awaited<ReturnType<typeof documentAnime>>>,lang:Lang):Metadata{
 const title=texts(lang,`${a.name}：评分、剧情与观看入口｜${siteBrand(lang)}`,`${a.name}: ratings, story & where to watch | ${siteBrand(lang)}`,`${a.name}｜評価・あらすじ・視聴ガイド｜${siteBrand(lang)}`),path=documentPath('/anime/'+a.bgm,lang);
 const description=a.summary.replace(/<[^>]*>/g,'').slice(0,155)||texts(lang,`${a.name}的独立评分、来源资料与观看核对记录。`,`${a.name}: independent ratings, source records and checked viewing links.`,`${a.name}の各サイトの評価、出典情報、視聴リンクの確認記録。`),fallback=siteOgImage(lang);
 const image=a.image?{url:a.image,alt:a.name}:fallback;
 return{title,description,alternates:languageAlternates(path),openGraph:{title,description,url:SITE_ORIGIN+path,type:'website',siteName:siteBrand(lang),locale:localeOpenGraph(lang),alternateLocale:localeOgAlternates(lang),images:[image]},twitter:{card:'summary_large_image',title,description,images:[image.url]}};
}
export function AnimeDocument({a,lang}:{a:NonNullable<Awaited<ReturnType<typeof documentAnime>>>;lang:Lang}){
 const t=(zh:string,en:string,ja:string)=>texts(lang,zh,en,ja),path=documentPath('/anime/'+a.bgm,lang),url=SITE_ORIGIN+path;
 const ratings=Object.entries(a.rating).filter(([source,rating])=>source!=='imdb'&&rating.score!=null),movie=['movie','电影','剧场版','劇場版'].includes(a.format.toLowerCase());
 const number=(value:number)=>new Intl.NumberFormat(lang==='zh'?'zh-CN':lang==='ja'?'ja-JP':'en-US').format(value);
 const titleFor=(anime:Anime)=>projectAnime(anime,recordFor(anime.bgm,lang),lang).name;
 const relationships=a.related?.relations||[];
 const summary=readingSynopsis(a.summary,lang);
 const summaryBreak=summary.length>360?Math.min(summary.length,summary.slice(0,480).search(/[。.!?]\s|。/g)>160?summary.slice(0,480).search(/[。.!?]\s|。/g)+1:360):summary.length;
 const synopsisLong=summary.length>520;
 const externalArrow=<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" stroke="currentColor" strokeWidth="1.5"/></svg>;
 const arrow=<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5"/></svg>;
 const factDate=(/^\d{4}-\d{2}-\d{2}$/.test(a.date)&&validDay(a.date))||/^\d{4}-(?:0[1-9]|1[0-2]|Q[1-4])$/.test(a.date)?a.date:null;
 return <main lang={localeLanguage(lang)} className="public-content public-anime public-editorial">
  <DocumentNav lang={lang} path={path}/>
  <div className="anime-document-workspace">
   <div className="anime-feature-art"><AnimePoster image={a.image} bgm={a.bgm} title={a.name} alt={a.name} width={240} height={360} loading="eager" priority sizes="(max-width:700px) 112px, 240px" fallbackClassName="anime-feature-no-art"/></div>
   <div className="anime-document-reading">
    <header className="anime-feature">
   <div className="anime-feature-copy">
    <div className="anime-feature-heading"><div className="anime-feature-format"><span>{formatText(a.format,lang)}</span>{factDate&&<time dateTime={/^\d{4}-\d{2}-\d{2}$/.test(a.date)?a.date:undefined}>{a.date.slice(0,4)}</time>}</div>
    <h1>{a.name}</h1>
    {a.originalName&&a.originalName!==a.name&&<p className="anime-original-title">{t('原名：','Original title: ','原題：')}{a.originalName}</p>}
    </div>
    {!!a.tags?.length&&<div className="anime-source-tags" aria-label={t('来源标签','Source tags','出典タグ')}><small>{t('来源标签','Source tags','出典タグ')}</small>{a.tags.slice(0,4).map(tag=><span key={tag}>{translateKnownText(lang,tag)}</span>)}</div>}
    <div className="anime-inline-ratings">{ratings.map(([source,rating])=><a href="#ratings" key={source}><RatingEvidence source={source==='bgm'?'Bangumi':source==='kitsu'?'Kitsu':source.toUpperCase()} sourceKey={source} score={rating.score!} scale={source==='kitsu'?100:10} count={rating.count} locale={lang}/></a>)}</div>
    <div className="anime-feature-actions"><a className="anime-feature-primary action-primary" href="#watch">{t('观看入口','Watch links','視聴リンク')}{arrow}</a><a className="anime-feature-secondary action-link" href={documentPath('/',lang)}>{t('浏览片单','Browse catalog','作品を探す')}{externalArrow}</a></div>
   </div>
    </header>
  <nav className="anime-section-nav" aria-label={t('作品详情章节','Title detail sections','作品情報のセクション')}><a href="#story">{t('故事','Story','あらすじ')}</a><a href="#watch">{t('观看入口','Watch links','視聴リンク')}</a><a href="#reviews">{t('评论与依据','Reviews & evidence','レビュー・出典')}</a>{relationships.length>0&&<a href="#relations">{t('系列关系','Relationships','作品の関係')}</a>}<a href="#sources">{t('资料来源','Sources','出典情報')}</a></nav>
  <div className="anime-main-grid">
   <div className="anime-main-column">
    <section id="story" className="anime-story anime-editorial-section">
     <h2>{t('故事，从这里开始','The story starts here','物語は、ここから')}</h2>
     {synopsisLong?<details className="anime-synopsis"><summary><span>{summary.slice(0,summaryBreak)}…</span><b className="anime-synopsis-open">{t('展开完整简介','Read the full synopsis','あらすじを全文読む')}<span aria-hidden="true">＋</span></b><b className="anime-synopsis-close">{t('收起完整简介','Collapse synopsis','あらすじを閉じる')}<span aria-hidden="true">−</span></b></summary><p>{summary}</p></details>:<p className="anime-synopsis-text">{summary}</p>}
     {!!a.editorial?.watchPoints?.length&&<ul className="anime-watch-points">{a.editorial.watchPoints.map((point,i)=><li key={i}>{point}</li>)}</ul>}
     {a.editorial?.sourceUrl&&<a className="anime-text-source" href={a.editorial.sourceUrl} target="_blank" rel="noreferrer">{t('简介来源','Premise source','あらすじの出典')}{externalArrow}</a>}
    </section>
    <section id="reviews" className="anime-editorial-section anime-reviews"><h2>{t('评论，有据可循','Reviews, with context','レビューと、その根拠')}</h2>{a.review?<>
     <p className="anime-section-description">{a.review.stage} · {a.review.sampleSize??t('若干','Several','数')}{t('则样本，不代表全站共识。',' sampled opinions, not a site-wide consensus.','件のサンプルです。サイト全体の総意を表すものではありません。')}</p>
     <div className="anime-review-points"><div><h3>{t('受到肯定','Appreciated','評価された点')}</h3>{a.review.strengths.map((point,i)=><p key={i}>{point}</p>)}</div><div><h3>{t('分歧与保留','Reservations','意見が分かれる点')}</h3>{a.review.criticisms.map((point,i)=><p key={i}>{point}</p>)}</div></div>
     <div className="anime-review-sources">{a.review.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}{externalArrow}</strong>{source.publishedAt&&<small>{t('发布：','Published: ','公開日：')}{sourceDateText(source.publishedAt)}</small>}{source.retrievedAt&&<small>{t('读取：','Retrieved: ','取得日時：')}{sourceDateText(source.retrievedAt)}</small>}</a>)}</div>
     {(a.review.sampleDescription||!!a.review.reviewers?.length||!!a.review.individualReviews?.length)&&<details className="anime-evidence-disclosure system-disclosure"><summary>{a.review.individualReviews?.length?t('查看个别观众观点','Individual viewer opinions','視聴者それぞれの意見'):t('样本说明','Sample details','サンプルの詳細')}{!!a.review.individualReviews?.length&&<span>{a.review.individualReviews.length}</span>}</summary>{a.review.sampleDescription&&<p className="anime-evidence-note">{a.review.sampleDescription}</p>}{!!a.review.reviewers?.length&&<p className="anime-evidence-note">{t('评论者：','Reviewers: ','レビュアー：')}{a.review.reviewers.join(' / ')}</p>}<p className="anime-evidence-note">{t('以下为对各位观众原评的转述，并非逐字引用，也不代表全部观众。相对时间以资料采集时为参照。','These are paraphrases of the named viewers’ reviews, not direct quotations or an audience-wide consensus. Relative dates refer to the original collection time.','以下は各レビュアーの原文を要約・翻訳したものです。直接の引用でも、日本の視聴者や視聴者全体の総意でもありません。相対時刻は資料を取得した時点を基準にしています。')}</p>{a.review.individualReviews?.map((review,i)=><article className="anime-individual-review" key={review.sourceUrl+review.author+i}><a href={review.sourceUrl} target="_blank" rel="noreferrer"><strong>{review.author}</strong><span>{review.source}{externalArrow}</span></a><p>{review.summary}</p><small>{review.stage}{review.rating!=null?' · '+review.rating+(review.ratingScale?' / '+review.ratingScale:''):''}{review.dateText?' · '+(lang==='ja'?japaneseRelativeReviewDate(review.dateText):sourceDateText(review.dateText)):''}</small></article>)}</details>}
    </>:<p className="anime-quiet-state">{a.reviewCoverage?.reason||t('尚无足够可核对的评论样本。','No sufficiently supported review sample has been prepared.','出典を確認できる十分なレビューサンプルは、まだ用意できていません。')}</p>}</section>
   </div>
   <aside id="watch" className="anime-watch-column anime-editorial-section" aria-labelledby="anime-watch-title">
    <div className="anime-watch-heading"><h2 id="anime-watch-title">{t('在哪里看','Where to watch','視聴先を探す')}</h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="m9 5 11 7L9 19V5Z" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5v14" stroke="currentColor" strokeWidth="1.5"/></svg></div>
    <WatchProviders listings={a.watchListings} playback={a.playback} streams={a.streams} format={a.format} locale={lang}/>
    {!hasRenderableWatchProviders({streams:a.streams,playback:a.playback,listings:a.watchListings})&&<p className="anime-evidence-note">{t('暂未收录可核对的观看入口。','No supported viewing link is currently listed.','出典を確認できる視聴リンクは、まだ掲載されていません。')}</p>}
    <CommunityWatchLinks locale={lang}/>

   </aside>
  </div>
   </div>
  <dl className="anime-fact-strip">
   <div><dt>{movie?t('来源上映日期','Source release date','出典記載の公開日'):t('首播','Premiere','初回放送')}</dt><dd>{factDate?<time dateTime={/^\d{4}-\d{2}-\d{2}$/.test(a.date)?a.date:undefined}>{a.date}</time>:t('待确认','Unconfirmed','未確認')}</dd>{factDate&&(a.date.length!==10||a.date>new Date().toISOString().slice(0,10))&&<dd className="anime-fact-note"><small>{releaseText(a.date,a.format,lang)}</small></dd>}</div>
   {!movie&&<div><dt>{t('收录集数','Listed episodes','出典記載の話数')}</dt><dd>{a.episodes?<>{number(a.episodes)}<span>{t(' 集',' episodes','話')}</span></>:t('未提供','Not provided','未提供')}</dd><dd className="anime-fact-note"><small>{t('来源记录，不代表已播进度','Source count, not airing progress','放送済み話数ではなく、出典の記載数')}</small></dd></div>}
   <div><dt>{t('作品形式','Format','作品の形式')}</dt><dd>{formatText(a.format,lang)}</dd><dd className="anime-fact-note"><small><a href={localePath('/ai',lang)} target="_blank" rel="noreferrer">{t('虚构示例说明','Fictional demo information','架空デモの説明')}{externalArrow}</a></small></dd></div>
  </dl>
    <section id="ratings" className="anime-rating-panel" aria-labelledby="anime-ratings-title">
     <div className="anime-rating-heading"><h2 id="anime-ratings-title">{t('各来源独立评分','Independent source ratings','各サイトの評価')}</h2><span>{t('原始量尺','Original scales','各出典の尺度')}</span></div>
     {ratings.length?<div className="anime-score-list">{ratings.map(([source,rating])=>{const maximum=source==='kitsu'?100:10,sourceName=source==='bgm'?'Bangumi':source==='kitsu'?'Kitsu':source.toUpperCase(),score=rating.score!,distribution=source==='bgm'?Object.entries(rating.distribution||{}).filter(([key,count])=>/^(?:[1-9]|10)$/.test(key)&&Number.isFinite(count)&&count>=0).sort(([left],[right])=>Number(left)-Number(right)):[],distributionMaximum=Math.max(1,...distribution.map(([,count])=>count));return <article className="anime-score" key={source}>
      <div className="anime-score-top"><a href={rating.url} target="_blank" rel="noreferrer">{sourceName}{externalArrow}</a><span><strong>{score.toFixed(1)}</strong><small> / {maximum}</small></span></div>
      <meter min="0" max={maximum} value={Math.max(0,Math.min(maximum,score))} aria-label={`${sourceName}: ${score.toFixed(1)} / ${maximum}`}>{score.toFixed(1)} / {maximum}</meter>
      <div className="anime-score-evidence"><span>{source==='kitsu'?ratingCountLabel(rating.count,lang,source):rating.count==null?t('人数未提供','Vote count unavailable','評価件数の情報なし'):number(rating.count)+t(' 人评价',' ratings','件の評価')}</span><span>{rating.at?(rating.sourceKey==='bangumi-archive'?t('档案截至 ','Archive as of ','アーカイブ基準日：'):t('读取 ','Retrieved ','取得日時：'))+sourceDateText(rating.at):t('资料日期未提供','Source date unavailable','資料の日時は未提供')}</span></div>
      {distribution.length>0&&<div className="anime-score-distribution"><div className="anime-distribution-heading"><span>{t('评分分布','Votes by score','点数別の評価件数')}</span><small>{t('来自 Bangumi 原始记录','Bangumi source distribution','Bangumiの出典データ')}</small></div><ol aria-label={t('Bangumi 评分分布','Bangumi rating distribution','Bangumiの評価分布')}>{distribution.map(([value,count])=><li key={value} style={{gridColumn:Number(value)}} data-max-score={value==='10'} aria-label={`${value} / 10: ${number(count)} ${t('人评价','ratings','件の評価')}`}><span className="anime-distribution-bar" title={`${value} / 10: ${number(count)}`}><i style={{height:count>0?Math.max(2,count/distributionMaximum*100)+'%':'0%'}}/></span><small>{value}</small></li>)}</ol></div>}
      {rating.note&&<details className="anime-score-note system-disclosure"><summary>{t('评分范围说明','Rating scope','評価の対象範囲')}</summary><p lang={noteLanguage(rating.note,lang)}>{rating.note}</p></details>}
     </article>})}</div>:<p className="anime-quiet-state">{t('评分待积累。','Ratings are not yet available.','評価はまだ集計されていません。')}</p>}
    </section>
  </div>
  {relationships.length>0&&<section id="relations" className="anime-editorial-section anime-relations"><div className="anime-section-heading"><h2>{t('在同一部故事之外','Connected stories','つながる物語')}</h2><span>{relationships.length} {t('条来源关系','sourced relationships','件の出典付き関係')}</span></div><div className="anime-relation-grid">{relationships.map(r=><article className="anime-relation-card" key={r.targetId+':'+r.sourceRelation}><div className="anime-relation-label"><span aria-hidden="true"/>{relationLabel(r.relation,lang)}</div><a className="anime-related-title" href={r.anime?.bgm?documentPath('/anime/'+r.anime.bgm,lang):r.targetUrl} target={r.anime?.bgm?undefined:'_blank'} rel={r.anime?.bgm?undefined:'noreferrer'}>{r.anime&&<AnimePoster image={r.anime.image} bgm={r.anime.bgm} title={titleFor(r.anime)} alt="" width={68} height={102} loading="lazy" sizes="68px" fallbackClassName="anime-relation-no-art"/>}<span><strong>{r.anime?titleFor(r.anime):r.targetName||r.targetId}</strong><small>{r.anime?releaseText(r.anime.date,r.anime.format,lang):t('仅来源条目','Source listing only','出典へのリンクのみ')}</small></span>{arrow}</a><a className="anime-relation-source" href={r.sourceUrl} target="_blank" rel="noreferrer">{(r as {sourceAsOf?:string}).sourceAsOf?t('档案截至 ','Archive as of ','アーカイブ基準日：'):t('来源核对 ','Source checked ','出典の確認：')}{sourceDateText((r as {sourceAsOf?:string}).sourceAsOf||r.retrievedAt)}{externalArrow}</a></article>)}</div><p className="anime-evidence-note">{t('只展示已核对关系，不是完整系列图或观看顺序。','Only checked relationships are shown; this is not a complete franchise graph or watch order.','確認した関係のみを表示しています。シリーズ全体の一覧や視聴順ではありません。')}</p></section>}
  <section id="sources" className="anime-editorial-section anime-sources"><details className="anime-source-disclosure system-disclosure"><summary><span>{t('资料与来源','Source records','資料と出典')}</span><small>{a.sourceLinks.length} {t('个来源','sources','件の出典')}</small></summary><div className="anime-source-list">{a.sourceLinks.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.name}{externalArrow}</span>{source.note&&<small lang={noteLanguage(source.note,lang)}>{lang==='en'&&noteLanguage(source.note,lang)==='zh-Hans'?'Original scope note: ':''}{source.note}</small>}</a>)}</div></details><p className="anime-attribution">{t('虚构示例：作品资料与几何占位图为本演示创作。不含真实动画评分、评论、海报或观看验证。','Fictional demo: sample records and geometric placeholders were authored for this demo. No real anime ratings, reviews, posters or playback checks are included.','架空デモ：サンプル資料と図形のプレースホルダーは本デモ用です。実際の評価、レビュー、ポスター、再生確認は含まれません。')}</p></section>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:a.name,url,inLanguage:localeLanguage(lang),mainEntity:{'@id':url+'#work'}},{'@type':movie?'Movie':a.format.toLowerCase()==='tv'?'TVSeries':'CreativeWork','@id':url+'#work',name:a.name,alternateName:a.originalName||undefined,url,image:a.image||undefined,description:a.summary.slice(0,300)},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:siteBrand(lang),item:SITE_ORIGIN+documentPath('/',lang)},{'@type':'ListItem',position:2,name:a.name,item:url}]}]})}}/>
  <SiteFooter locale={lang}/>
 </main>;
}
export function seasonHeading(year:number,quarter:number,lang:Lang){return texts(lang,`${year}年${SEASON_NAMES[quarter]}季动画片单`,`${['Winter','Spring','Summer','Autumn'][quarter]} ${year} anime guide`,`${year}年${SEASON_NAMES[quarter]}アニメ一覧`)}
export async function seasonDocument(year:number,quarter:number,lang:Lang){const data=await seasonContent(year,quarter);if(!data)return null;return{...data,items:data.items.map(a=>projectAnime(a,recordFor(a.bgm,lang),lang))}}
export function seasonMetadata(year:number,quarter:number,lang:Lang):Metadata{
 const title=seasonHeading(year,quarter,lang)+'｜'+siteBrand(lang),path=documentPath(`/season/${year}/${SEASONS[quarter]}`,lang),description=texts(lang,'本季动画、独立评分、首播时间与观看核对记录。','Seasonal anime, independent ratings, premiere dates and checked viewing records.','今期のアニメ、各サイトの評価、放送開始日、視聴リンクの確認記録をまとめています。'),image=siteOgImage(lang);
 return{title,description,alternates:languageAlternates(path),openGraph:{title,description,url:SITE_ORIGIN+path,siteName:siteBrand(lang),type:'website',locale:localeOpenGraph(lang),alternateLocale:localeOgAlternates(lang),images:[image]},twitter:{card:'summary_large_image',title,description,images:[image.url]}};
}
export function SeasonDocument({data,lang}:{data:NonNullable<Awaited<ReturnType<typeof seasonDocument>>>;lang:Lang}){
 const t=(zh:string,en:string,ja:string)=>texts(lang,zh,en,ja),title=seasonHeading(data.year,data.quarter,lang),path=`/season/${data.year}/${SEASONS[data.quarter]}`,url=SITE_ORIGIN+documentPath(path,lang),date=new Date(data.updatedAt),updated=data.updatedAt&&Number.isFinite(date.getTime())?date.toISOString():null;
 return <main lang={localeLanguage(lang)} className="public-content"><DocumentNav lang={lang} path={path}/><header className="public-heading"><h1>{title}</h1><p>{data.items.length} {t('部 · 当季首播与明确收录的续播 · 更新于','titles · Premieres and explicitly included continuing series · Updated','作品 · 今期の新作と、継続作品として明示された作品 · 更新日時：')} {updated?<time dateTime={updated}>{sourceDateText(updated)}</time>:t('更新时间待确认','Update time unavailable','更新日時は未確認')}</p></header>
  <div className="public-season-grid">{data.items.map(a=><article key={a.key}><a href={documentPath('/anime/'+a.bgm,lang)}><AnimePoster image={a.image} bgm={a.bgm} alt={a.name} loading="lazy" width={100} height={150} sizes="90px"/><div><h2>{a.name}</h2><p>{releaseText(a.date,a.format,lang).split(/(\d{4}-\d{2}-\d{2})/).map((part,index)=>/^\d{4}-\d{2}-\d{2}$/.test(part)?<time key={index} dateTime={part}>{part}</time>:part)}</p>{a.rating.bgm?.score!=null?<RatingEvidence source="Bangumi" score={a.rating.bgm.score} scale={10} count={a.rating.bgm.count} locale={lang}/>:<span className="season-unrated">{t('评分待积累','Ratings pending','評価の集計待ち')}</span>}</div></a></article>)}</div>
  <p className="public-source-note">{t('来源：Bangumi。数据更新时间与单集播放测试时间分别保留。','Source: Bangumi. Snapshot update time is separate from episode playback testing.','出典：Bangumi。データの更新日時と各話の再生確認日時は、別々に記録しています。')}</p>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({'@context':'https://schema.org','@graph':[{'@type':'CollectionPage',name:title,url,inLanguage:localeLanguage(lang),mainEntity:{'@id':url+'#list'}},{'@type':'ItemList','@id':url+'#list',name:title,url,numberOfItems:data.items.length,itemListElement:data.items.map((a,i)=>({'@type':'ListItem',position:i+1,name:a.name,url:SITE_ORIGIN+documentPath('/anime/'+a.bgm,lang)}))}]})}}/>
  <SiteFooter locale={lang}/>
 </main>;
}
