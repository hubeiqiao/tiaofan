'use client';
import {useId,useState,type ReactNode,type RefObject} from 'react';
import {ArrowUpRight,Bookmark,Check,ChevronLeft,ChevronRight,Film,Layers} from 'lucide-react';
import {motion,useReducedMotion} from 'motion/react';
import {RadioGroup} from '@heroui/react/radio-group';
import {Radio} from '@heroui/react/radio';
import {Label} from '@heroui/react/label';
import {Button} from '@/components/ui/button';
import {catalogCardFacts} from '@/components/catalog-card-facts';
import {posterSrcSet,transparentPoster} from '@/lib/poster-image';
import {useLocale} from '@/lib/i18n';
import type {Anime} from '@/lib/types';

type Props={mobileControls?:ReactNode;intentActive?:boolean;posters:Anime[];children:ReactNode;onDetail:(a:Anime)=>void;onScreen:()=>void;screeningRef:RefObject<HTMLButtonElement|null>;previous:boolean;seasonTitle:string;count:number;loading:boolean;renderRatings?:(a:Anime)=>ReactNode;summary?:(a:Anime)=>string;onSave?:(a:Anime)=>void;isSaved?:(a:Anime)=>boolean;saveDisabled?:boolean};
const desktopMedia='(min-width:768px)';
const artSizes='(max-width:1000px) 166px, 184px';

/** One manual, source-labeled title preview; eligibility and ordering remain with the caller. */
export function ImmersiveHero({mobileControls,posters,children,onDetail,onScreen,screeningRef,previous,seasonTitle,count,loading,renderRatings,summary,onSave,isSaved,saveDisabled=false}:Props){
 const {locale,t:tr}=useLocale();
 const [selectedKey,setSelectedKey]=useState<string|null>(null);
 const [failedImages,setFailedImages]=useState<string[]>([]);
 const detailId=useId(),reduced=useReducedMotion();
 const copy=(zh:string,en:string,ja:string)=>locale==='ja'?ja:locale==='en'?en:zh;
 const candidates=posters.slice(0,3);
 const selected=Math.max(0,candidates.findIndex(anime=>anime.key===selectedKey));
 const active=candidates[selected];
 const synopsis=active?(summary?summary(active):active.summary).trim():'';
 const ratings=active&&renderRatings?renderRatings(active):null;
 const image=active?.image&&!failedImages.includes(active.image)?active.image:null;
 const episodeLabel=active?.episodes&&Number.isSafeInteger(active.episodes)&&active.episodes>0?copy(`${active.episodes} 集`,`${active.episodes} ${active.episodes===1?'episode':'episodes'}`,`全${active.episodes}話`):'';
 const formatLabel=active?catalogCardFacts({anime:active,locale}).find(fact=>fact.kind==='format')?.label:'';
 const catalogLabel=previous?copy('上季目录 · 按Bangumi评分人数展示','Previous season catalog · Ordered by Bangumi rating count','前期の作品 · Bangumi評価人数順'):copy('本季目录 · 按Bangumi评分人数展示','Season catalog · Ordered by Bangumi rating count','今期の作品 · Bangumi評価人数順');
 const choose=(step:number)=>{if(candidates.length)setSelectedKey(candidates[(selected+step+candidates.length)%candidates.length].key)};
 return <section className="immersive-hero editorial-hero cover-world-hero" aria-label={tr('发现下一部动画')}>
  {image&&<link rel="preload" as="image" href={image} imageSrcSet={posterSrcSet(image)} imageSizes={artSizes} media={desktopMedia} fetchPriority="high"/>}
  <div className="hero-content">
   <div className="hero-masthead" data-compact-controls={!!mobileControls}><div className="hero-heading"><h1>{seasonTitle}</h1><span className="hero-facts" aria-label={loading?tr('正在读取片单'):copy(`${count} 部作品`,`${count} ${count===1?'title':'titles'}`,`${count}作品`)}>{loading?tr('正在读取片单'):<>{count}<span className="hero-count-unit">{copy(' 部作品',count===1?' title':' titles','作品')}</span></>}</span></div>{mobileControls&&<div className="hero-mobile-controls">{mobileControls}</div>}<Button ref={screeningRef} className="hero-screening" onClick={onScreen} aria-label={tr('滑卡挑番')}><Layers data-icon="inline-start"/><span className="hero-screening-label">{tr('滑卡挑番')}</span><span className="hero-screening-short" aria-hidden="true">{copy('滑卡','Cards','カード')}</span><ArrowUpRight data-icon="inline-end"/></Button></div>
  </div>
  {active&&<div className="hero-featured-stage">
   <div className="hero-featured-copy" id={detailId}>
    <p className="hero-catalog-label">{catalogLabel}</p>
    <h2 title={active.name}>{active.name}</h2>
    {(formatLabel||episodeLabel)&&<p className="hero-featured-meta">{formatLabel&&<span>{formatLabel}</span>}{episodeLabel&&<span>{episodeLabel}</span>}</p>}
    {synopsis&&<p className="hero-featured-summary">{synopsis}</p>}
    {ratings&&<div className="hero-featured-ratings" aria-label={copy('独立来源评分','Independent source ratings','各サイトの評価')}>{ratings}</div>}
    <div className="hero-featured-actions">
     <Button className="hero-detail-button" onClick={()=>onDetail(active)} aria-label={copy(`查看《${active.name}》`,`View ${active.name}`,`「${active.name}」を見る`)}>{copy('查看作品','View title','作品を見る')}<ArrowUpRight data-icon="inline-end"/></Button>
     {onSave&&<Button className="hero-save-button" variant="outline" disabled={saveDisabled||!!isSaved?.(active)} onClick={()=>onSave(active)} aria-label={isSaved?.(active)?copy(`已保存《${active.name}》`,`Saved ${active.name}`,`「${active.name}」は保存済み`):copy(`保存《${active.name}》`,`Save ${active.name}`,`「${active.name}」を保存`)}>{isSaved?.(active)?<Check size={17}/>:<Bookmark size={17}/>}<span>{isSaved?.(active)?copy('已保存','Saved','保存済み'):copy('保存','Save','保存')}</span></Button>}
    </div>
   </div>
   <div className="hero-billboard-art">
    <motion.div key={active.key} className="hero-billboard-image" data-anime-key={active.key} initial={reduced?false:{opacity:.72}} animate={{opacity:1}} transition={{duration:reduced?0:.18}}>
     {image?<picture><source media={desktopMedia} srcSet={posterSrcSet(image)||image} sizes={artSizes}/><img src={transparentPoster} width={400} height={600} alt={active.name} loading="eager" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailedImages(old=>old.includes(image)?old:[...old,image])}/></picture>:<span className="hero-art-fallback"><Film size={28}/><span>{copy('暂无海报','Poster unavailable','ポスター未収録')}</span></span>}
    </motion.div>
    <div className="hero-thumbnail-rail">
     <RadioGroup className="hero-title-selector hero-thumbnail-selector" aria-label={copy('选择展示作品','Choose a title to preview','表示する作品を選ぶ')} orientation="vertical" value={active.key} onChange={key=>{if(candidates.some(anime=>anime.key===key))setSelectedKey(key)}}>
      {candidates.map(anime=>{const chosen=anime.key===active.key,src=anime.image&&!failedImages.includes(anime.image)?anime.image:null;return <Radio className="hero-title-choice" key={anime.key} value={anime.key} data-selected={chosen||undefined}><Radio.Content aria-controls={detailId}><Radio.Control><Radio.Indicator/></Radio.Control><Label className="hero-cover-label">{anime.name}</Label>{src?<picture><source media={desktopMedia} srcSet={posterSrcSet(src)||src} sizes="48px"/><img src={transparentPoster} width={400} height={600} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailedImages(old=>old.includes(src)?old:[...old,src])}/></picture>:<span className="hero-art-fallback"><Film size={18}/></span>}</Radio.Content></Radio>})}
     </RadioGroup>
     {candidates.length>1&&<div className="hero-hand-controls"><Button variant="ghost" size="icon" aria-label={copy('上一部展示作品','Previous featured title','前の作品')} onClick={()=>choose(-1)}><ChevronLeft size={19}/></Button><Button variant="ghost" size="icon" aria-label={copy('下一部展示作品','Next featured title','次の作品')} onClick={()=>choose(1)}><ChevronRight size={19}/></Button></div>}
    </div>
    <p className="hero-selection-status sr-only" role="status" aria-live="polite" aria-atomic="true">{copy(`展示作品：${active.name}`,`Featured title: ${active.name}`,`表示中の作品：${active.name}`)}</p>
   </div>
  </div>}
  <div className="hero-intent expanded">{children}</div>
 </section>;
}
