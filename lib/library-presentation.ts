import type {Anime} from './types';
import {dateStatus,inCatalogSeason} from './catalog';
export type LibrarySeason='current'|'previous'|'upcoming'|'unknown';
export const librarySeasonOrder:LibrarySeason[]=['current','previous','upcoming','unknown'];
/** Source premiere stays primary; explicit continuing catalog membership takes precedence. */
export function librarySeason(a:Pick<Anime,'date'|'bgm'|'key'>,year:number,quarter:number,currentKeys:ReadonlySet<string>=new Set(),today=new Date().toISOString().slice(0,10)):LibrarySeason{
 const status=dateStatus(a,today);if(status==='unknown')return 'unknown';if(status==='upcoming')return 'upcoming';
 if(currentKeys.has(a.key)||inCatalogSeason(a,year,quarter))return 'current';
 const start=new Date(Date.UTC(year,quarter*3,1)).toISOString().slice(0,10);
 return a.date<start?'previous':'upcoming';
}
/** Strip account-owned fields before retaining a detail or a public enrichment result. */
export function publicPresentation(a:Anime):Anime{const {state: _state,favorite: _favorite,...publicFields}=a;return publicFields}
export function librarySignalKey(rows:Anime[]){return JSON.stringify(rows.map(a=>[a.key,a.state||'',a.favorite===true]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))}
export function visibleDetail(selection:Anime|null,fresh:Anime|undefined,privateSelection:boolean,selectionIdentity:number,currentIdentity:number,status:string){
 if(!selection||(privateSelection&&((status!=='ready'&&status!=='checking')||selectionIdentity!==currentIdentity)))return null;
 return publicPresentation({...selection,...fresh,rating:{...selection.rating,...fresh?.rating}});
}
