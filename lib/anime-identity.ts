import type {Anime} from './types';
function aliases(a:Anime){return[a.key,a.bgm?`bgm:${a.bgm}`:'',a.mal?`mal:${a.mal}`:'',a.kitsuId?`kitsu:${a.kitsuId}`:''].filter(Boolean)}
// Shared conservative canonical identity policy for recommendations and swipe.
export function trustedSeedIndex(input:Anime[],meta:Record<string,{mal?:string|number|null;conflicts?:{mal?:unknown}}>){
 const rows=input.filter(a=>!!a&&/^(bgm|mal|kitsu):[1-9]\d{0,11}$/.test(a.key)&&typeof a.name==='string'&&Array.isArray(a.tags)&&(!a.bgm||a.key===`bgm:${a.bgm}`));
 const canonical=new Map<string,Anime>(),claims=new Map<string,Set<string>>(),blocked=new Set<string>(),perTitle=new Map<string,{mal:Set<string>;kitsu:Set<string>}>();
 const claim=(alias:string,key:string)=>{if(!/^(bgm|mal|kitsu):[1-9]\d{0,11}$/.test(alias))return;const owners=claims.get(alias)||new Set<string>();owners.add(key);claims.set(alias,owners)};
 for(const [id,m]of Object.entries(meta))if(/^[1-9]\d{0,11}$/.test(id)&&/^[1-9]\d{0,11}$/.test(String(m.mal||''))){const alias=`mal:${m.mal}`;claim(alias,`bgm:${id}`);if(m.conflicts?.mal)blocked.add(alias)}
 for(const a of rows){
  const prior=canonical.get(a.key);canonical.set(a.key,{...prior,...a,mal:a.mal||prior?.mal,kitsuId:a.kitsuId||prior?.kitsuId});
  const ids=perTitle.get(a.key)||{mal:new Set<string>(),kitsu:new Set<string>()};
  for(const alias of aliases(a))claim(alias,a.key);
  for(const alias of (a as Anime&{personalBlockedAliases?:string[]}).personalBlockedAliases||[]){blocked.add(alias);claim(alias,a.key)}
  if(a.mal){const alias=`mal:${a.mal}`;ids.mal.add(alias);if(a.bgm&&meta[String(a.bgm)]?.conflicts?.mal)blocked.add(alias)}
  if(a.kitsuId)ids.kitsu.add(`kitsu:${a.kitsuId}`);perTitle.set(a.key,ids);
 }
 for(const [key,ids]of perTitle){
  const m=key.startsWith('bgm:')?meta[key.slice(4)]:undefined;
  if(m?.mal&&ids.mal.size&&!ids.mal.has(`mal:${m.mal}`)){for(const alias of ids.mal)blocked.add(alias);blocked.add(`mal:${m.mal}`)}
  for(const set of [ids.mal,ids.kitsu])if(set.size>1)for(const alias of set)blocked.add(alias);
 }
 for(const [alias,owners]of claims)if(owners.size>1)blocked.add(alias);
 // Kitsu links assembled through MAL must also be withheld if a later source disputes that bridge.
 for(const [key,ids]of perTitle)if(key.startsWith('bgm:')&&[...blocked].some(alias=>alias.startsWith('mal:')&&claims.get(alias)?.has(key)))for(const alias of ids.kitsu)blocked.add(alias);
 const safe=(alias:string,key:string)=>!blocked.has(alias)&&claims.get(alias)?.size===1&&claims.get(alias)?.has(key);
 for(const [key,a]of canonical){const clean:Anime&{personalBlockedAliases?:string[]}={...a,personalBlockedAliases:[...blocked].filter(alias=>claims.get(alias)?.has(key))};if(a.mal&&!safe(`mal:${a.mal}`,key))delete clean.mal;if(a.kitsuId&&!safe(`kitsu:${a.kitsuId}`,key))delete clean.kitsuId;canonical.set(key,clean)}
 // Canonical keys are authoritative. Aliases never overwrite an exact key.
 const byKey=new Map(canonical);for(const [alias,owners]of claims)if(!byKey.has(alias)&&owners.size===1&&!blocked.has(alias)){const a=canonical.get([...owners][0]);if(a)byKey.set(alias,a)}
 return{canonical,byKey,claims};
}
