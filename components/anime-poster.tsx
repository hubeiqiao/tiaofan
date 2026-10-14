'use client';
import {useState,type CSSProperties} from 'react';
import {Film} from 'lucide-react';
import {posterSources,posterSrcSet,catalogPosterSizes} from '@/lib/poster-image';
/** Resolve only rendered covers. A failed known URL gets one documented public-ID lookup. */
export function AnimePoster({image,bgm,title='',alt='',className='',fallbackClassName='',sizes=catalogPosterSizes,loading='lazy',priority=false,width=400,height=600,style}:{image?:string;bgm?:number;title?:string;alt?:string;className?:string;fallbackClassName?:string;sizes?:string;loading?:'lazy'|'eager';priority?:boolean;width?:number;height?:number;style?:CSSProperties}){
 const sources=posterSources(image,bgm),signature=sources.join('|');
 const [attempt,setAttempt]=useState({signature,index:0});
 const index=attempt.signature===signature?attempt.index:0,src=sources[index];
 if(!src)return <span className={'anime-poster-fallback '+fallbackClassName} role={alt?'img':undefined} aria-label={alt||undefined}><Film size={26} aria-hidden="true"/></span>;
 return <img ref={node=>{if(node?.complete&&node.naturalWidth===0&&node.getAttribute('src')===src)setAttempt({signature,index:index+1})}} className={className} src={src} srcSet={posterSrcSet(src)} sizes={sizes} alt={alt} width={width} height={height} loading={loading} fetchPriority={priority?'high':'auto'} decoding="async" referrerPolicy="no-referrer" style={{...style,color:'transparent',fontSize:0}} onError={()=>setAttempt({signature,index:index+1})}/>;
}
