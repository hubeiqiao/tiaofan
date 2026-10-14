import type {ReactNode,MouseEvent} from 'react';
import {ChevronRight,Heart,Play} from 'lucide-react';
import {AnimePoster} from '@/components/anime-poster';

type Props={
 animeKey:string;name:string;image?:string;bgm?:number;href?:string;locale:'zh'|'en'|'ja';
 schedule:string;season:string;status:string;favorite:boolean;reviewLabel:string;
 proof:ReactNode;update?:ReactNode;
 onDetail:()=>void;onWatch:()=>void;onReviews:()=>void;onManage:()=>void;
};

/** A weekly task row, deliberately independent of poster Grid/List geometry. */
export function WeeklyAgendaCard(p:Props){
 const t=(zh:string,en:string,ja:string)=>p.locale==='ja'?ja:p.locale==='en'?en:zh;
 const titleAction=(event:MouseEvent<HTMLAnchorElement>)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();p.onDetail()};
 return <article className="library-agenda-card" data-anime-key={p.animeKey}>
  <div className="poster-material-tint" aria-hidden="true"><AnimePoster image={p.image} bgm={p.bgm} sizes="48px" loading="lazy"/></div>
  <button className="agenda-cover" onClick={p.onDetail} aria-label={t('查看'+p.name,'Details: '+p.name,p.name+'の詳細')}><AnimePoster image={p.image} bgm={p.bgm} title={p.name} alt="" sizes="64px" width={64} height={96}/></button>
  <div className="agenda-copy"><h4>{p.href?<a href={p.href} onClick={titleAction}>{p.name}</a>:<button onClick={p.onDetail}>{p.name}</button>}</h4><p className="agenda-schedule">{p.schedule}</p><span className="agenda-season">{p.season}</span><div className="agenda-proof">{p.proof}</div>{p.update}</div>
  <footer className="agenda-actions"><div className="agenda-reading-actions"><button onClick={p.onWatch}><Play size={14}/>{t('观看','Watch','視聴')}</button><button onClick={p.onReviews}>{p.reviewLabel}<ChevronRight size={13}/></button></div><div className="agenda-personal-actions"><span>{p.favorite&&<Heart size={13} fill="currentColor" aria-label={t('已珍藏','Favorite','お気に入り')}/>}<span>{p.status}</span></span><button onClick={p.onManage}>{t('管理','Manage','管理')}<ChevronRight size={14}/></button></div></footer>
 </article>;
}
