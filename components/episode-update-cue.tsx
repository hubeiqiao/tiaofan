import {ChevronRight} from 'lucide-react';

export type EpisodeAdvance={episode:number;previousEpisode:number;observedAt:string};
export function episodeUpdateLabel(locale:'zh'|'en'|'ja'){
 return locale==='ja'?'直近7日間の掲載更新':locale==='en'?'Listing update · past 7 days':'近7天目录更新';
}
export function EpisodeUpdateCue({advance,locale,onOpen}:{advance:EpisodeAdvance|null;locale:'zh'|'en'|'ja';onOpen:()=>void}){
 if(!advance)return null;
 const at=new Intl.DateTimeFormat(locale==='zh'?'zh-CN':locale==='ja'?'ja-JP':'en-GB',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'}).format(new Date(advance.observedAt))+' UTC';
 const episode=locale==='ja'?'第'+advance.episode+'話':locale==='en'?'Episode '+advance.episode:'第'+advance.episode+'集';
 const observed=locale==='ja'?'掲載の増加を確認：':locale==='en'?'Listing advance observed: ':'目录增加核对于：';
 return <button type="button" className="episode-update-cue" onClick={onOpen} title={observed+at} aria-label={episodeUpdateLabel(locale)+' · '+episode+' · '+observed+at}><span><span>{episodeUpdateLabel(locale)}</span><strong>{episode}</strong></span><ChevronRight size={14} aria-hidden="true"/></button>;
}
