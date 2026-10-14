import {trustedSeedIndex} from './anime-identity';
import type {Anime} from './types';

/** Public picks are personalized only in this verified browser view. No private request or persistence. */
export function visibleSpotlights<T extends {bgm:number;familyIds?:number[]}>(rows:readonly T[],saved:Anime[],status:string,catalog:Anime[]=[],meta:Record<string,{mal?:string|number|null;conflicts?:{mal?:unknown}}>={}):T[]{
 if(status==='guest')return [...rows];
 if(status!=='ready'&&status!=='checking')return [];
 const identity=trustedSeedIndex([...catalog,...saved].filter(row=>row.key.startsWith('bgm:')),meta),blocked=new Set<string>();
 for(const row of saved){
  blocked.add(row.key);
  const canonical=identity.byKey.get(row.key);if(canonical)blocked.add(canonical.key);
  // Withhold ambiguous aliases conservatively; never display an already saved possible owner.
  for(const key of identity.claims.get(row.key)||[])blocked.add(key);
 }
 // The lightweight SSR seed has no family graph. Wait for the public bounded
 // spotlight response before showing authenticated picks; never flash a saved sequel.
 return rows.filter(row=>Array.isArray(row.familyIds)&&row.familyIds.includes(row.bgm)&&![row.bgm,...row.familyIds].some(id=>Number.isSafeInteger(id)&&id>0&&blocked.has('bgm:'+id)));
}
