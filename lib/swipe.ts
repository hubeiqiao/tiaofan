export type SwipeReceipt={identityEpoch?:number;changed:boolean;revision?:number;state:string};
export function swipeDirection(dx:number,dy:number,width:number,velocityX=0):'want'|'skip'|null{
 if(![dx,dy,width,velocityX].every(Number.isFinite))return null;
 const threshold=Math.max(72,Math.min(120,Math.max(0,width)*.23));
 // A short deliberate flick can commit, but a tap, vertical scroll, or a
 // reversal at release must never turn into an accidental save.
 const horizontal=Math.abs(dx)>Math.abs(dy)*1.5;
 const distance=Math.abs(dx)>=threshold;
 const flick=Math.abs(dx)>=28&&Math.abs(velocityX)>=650&&Math.sign(velocityX)===Math.sign(dx);
 return horizontal&&(distance||flick)?(dx>0?'want':'skip'):null;
}

export type SwipeLibraryStatus='loading'|'checking'|'ready'|'guest'|'error';
export function swipeIsChecking(status:SwipeLibraryStatus){return status!=='ready'&&status!=='guest'}
export function swipeCanRetainCard(status:SwipeLibraryStatus,privateContext=true){
 // `checking` is a verified same-document identity with read-only retention.
 // Cold loading/error never retain a card derived from a private library.
 return status==='checking'||(!privateContext&&(status==='loading'||status==='error'));
}

import type {Anime} from './types';
import {trustedSeedIndex} from './anime-identity';
export function swipeSavedKeys(items:Anime[],saved:Anime[],meta:Record<string,{mal?:string|number|null;conflicts?:{mal?:unknown}}>={}){
 // Standalone MAL/Kitsu keys on either side are lookups, not second owners of a BGM bridge.
 const {byKey}=trustedSeedIndex([...items,...saved].filter(a=>a.key.startsWith('bgm:')),meta);
 const keys=new Set(saved.map(a=>a.key));
 for(const a of saved){const canonical=byKey.get(a.key);if(canonical)keys.add(canonical.key)}
 return new Set(items.filter(a=>keys.has(a.key)||keys.has(byKey.get(a.key)?.key||'')).map(a=>a.key));
}
export function swipeRemaining(items:Anime[],seen:Set<string>,savedKeys:Set<string>){return items.filter(a=>!seen.has(a.key)&&!savedKeys.has(a.key))}
