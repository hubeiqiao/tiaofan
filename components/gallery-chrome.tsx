'use client';

import {useEffect,useRef,type MouseEvent,type ReactNode} from 'react';
import {ChevronRight, Info, Layers, Search, X} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {DisplaySettings} from '@/components/display-settings';
import {SiteMark} from '@/components/site-mark';
import {useLocale} from '@/lib/i18n';

type GalleryChromeProps = {
  view: string;
  onViewChange: (view:string)=>void;
  query: string;
  onQueryChange: (query:string)=>void;
  searchVisible: boolean;
  pickVisible: boolean;
  picking: boolean;
  onPick: (event:MouseEvent<HTMLButtonElement>)=>void;
  recommendationsVisible?: boolean;
  recommendationsExpanded?: boolean;
  onRecommendations?: ()=>void;
  scheduleSettings?: ReactNode;
  busy: boolean;
  onRefresh: ()=>void;
  onInfo: ()=>void;
  seasonLinks: {current:string;previous:string};
  onViewportTop: (height:number)=>void;
};


/** Reveal keyboard focus inside the rail without changing document scroll. */
export function revealGalleryTab(nav:Pick<HTMLElement,'scrollLeft'|'getBoundingClientRect'>,target:Pick<HTMLElement,'getBoundingClientRect'>){
 const rail=nav.getBoundingClientRect(),item=target.getBoundingClientRect();
 if(item.right>rail.right-24)nav.scrollLeft+=item.right-rail.right+24;
 else if(item.left<rail.left+4)nav.scrollLeft-=rail.left-item.left+4;
}

/** Presentation-only shell. Catalog, identity and mutation ownership stay in Home. */
export function GalleryChrome(p:GalleryChromeProps) {
  const {locale,t}=useLocale();
  const header=useRef<HTMLElement|null>(null),navigation=useRef<HTMLDivElement|null>(null),tabs=useRef<HTMLElement|null>(null);
  const checkOverflow=()=>{const el=tabs.current;if(el){el.dataset.overflow=String(el.scrollWidth-el.clientWidth>2);el.dataset.overflowEnd=String(el.scrollWidth-el.clientWidth-el.scrollLeft>2)}};
  const revealSelected=()=>{const nav=tabs.current,selected=nav?.querySelector?.<HTMLElement>('[aria-current="page"]');if(nav&&selected)revealGalleryTab(nav,selected)};
  useEffect(()=>{
    const update=()=>{if(!header.current||!navigation.current)return;const height=header.current.getBoundingClientRect().height;p.onViewportTop(height);revealSelected();checkOverflow()};
    update();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
    if(header.current)observer?.observe(header.current);if(navigation.current)observer?.observe(navigation.current);if(tabs.current)observer?.observe(tabs.current);
    // Scroll-lock compensation can briefly widen the rail and clamp scrollLeft,
    // then restore the same final width without a ResizeObserver notification.
    let unlockFrame:number|null=null;
    const lockObserver=typeof MutationObserver==='undefined'||typeof document==='undefined'?null:new MutationObserver(()=>{
      if(document.body.hasAttribute('data-scroll-locked'))return;
      if(unlockFrame!==null)window.cancelAnimationFrame(unlockFrame);
      unlockFrame=window.requestAnimationFrame(()=>{unlockFrame=null;if(!document.body.hasAttribute('data-scroll-locked'))update()});
    });
    lockObserver?.observe(document.body,{attributes:true,attributeFilter:['data-scroll-locked']});
    window.addEventListener('resize',update);
    return()=>{observer?.disconnect();lockObserver?.disconnect();if(unlockFrame!==null)window.cancelAnimationFrame(unlockFrame);window.removeEventListener('resize',update)};
  },[p.searchVisible,p.onViewportTop]);
  useEffect(()=>{revealSelected();checkOverflow()},[p.view,locale,p.recommendationsVisible]);
  const library=locale==='ja'?'マイリスト':locale==='en'?'My list':'我的片单';
  const browseView=useRef('current');if(p.view!=='mine'&&p.view!=='recommendations')browseView.current=p.view;
  const browse=locale==='ja'?'探す':locale==='en'?'Browse':'浏览';
  return <header className="gallery-header" data-has-recommendations={p.recommendationsVisible||undefined} ref={header}>
      <a className="gallery-mobile-brand" href={'/'+locale}><SiteMark locale={locale}/></a>
      <div className="gallery-navigation" ref={navigation}>
        <div className="gallery-tab-strip"><nav ref={tabs} onScroll={checkOverflow} onFocusCapture={event=>{if(tabs.current&&event.target instanceof HTMLElement){revealGalleryTab(tabs.current,event.target);checkOverflow()}}} className="primary-navigation" aria-label={t('主要页面')}><button aria-current={p.view!=='mine'&&p.view!=='recommendations'?'page':undefined} className={p.view!=='mine'&&p.view!=='recommendations'?'is-current':''} onClick={()=>p.onViewChange(browseView.current)}>{browse}</button><button aria-current={p.view==='mine'?'page':undefined} className={'gallery-library-entry '+(p.view==='mine'?'is-current':'')} onClick={()=>p.onViewChange('mine')}>{library}</button>{p.recommendationsVisible&&<button type="button" className={'gallery-recommendation-entry'+(p.view==='recommendations'?' is-current':'')} aria-label={locale==='ja'?'次の作品を探す':locale==='en'?'Find next anime':'找下一部动画'} aria-current={p.view==='recommendations'?'page':undefined} aria-controls={p.view==='recommendations'?'recommendation-destination':undefined} onClick={p.onRecommendations}><span className="gallery-recommendation-label-full" aria-hidden="true">{locale==='ja'?'次の作品を探す':locale==='en'?'Find next anime':'找下一部动画'}</span><span className="gallery-recommendation-label-short" aria-hidden="true">{locale==='ja'?'次の作品':locale==='en'?'Find next':'找下一部'}</span></button>}</nav><ChevronRight className="gallery-tab-cue" size={18} aria-hidden="true"/></div>
      </div>
      {p.searchVisible&&<div className="gallery-discovery"><label className="gallery-search"><Search size={19} aria-hidden="true"/><Input aria-label={t('搜索作品或题材')} placeholder={locale==='ja'?'作品を検索':locale==='en'?'Search anime':'搜索动画'} value={p.query} onChange={event=>p.onQueryChange(event.target.value)}/>{p.query&&<button className="gallery-search-clear" aria-label={locale==='ja'?'検索をクリア':locale==='en'?'Clear search':'清除搜索'} onClick={()=>p.onQueryChange('')}><X size={16}/></button>}</label>{p.pickVisible&&<button className="gallery-pick-entry" aria-haspopup="dialog" aria-expanded={p.picking} onClick={p.onPick}><Layers size={17}/><span>{locale==='ja'?'カードで選ぶ':locale==='en'?'Pick with cards':'划卡挑番'}</span></button>}</div>}
      <div className="gallery-header-utilities"><button className="gallery-source-entry" aria-label={t('来源说明')} title={t('来源说明')} onClick={p.onInfo}><Info size={18}/></button><DisplaySettings onRefresh={p.onRefresh} refreshDisabled={p.busy} scheduleSettings={p.scheduleSettings}/></div>
    </header>;
}
