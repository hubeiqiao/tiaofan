import type {PublicAiringRow} from './library-airing';

/** In-memory public scalar evidence only. This is not a saved-list or account cache. */
export type PublicAiringEvidence = Readonly<{
 identityEpoch: number;
 rows: ReadonlyMap<string, PublicAiringRow>;
}>;
export function createPublicAiringEvidence(identityEpoch: number): PublicAiringEvidence {
 return {identityEpoch, rows:new Map()};
}
/** Call only with trusted public API/SSR rows, never merged personal-library payloads.
 * `current` must be evaluated inside the React state updater, using both the request
 * generation/abort guard and the current library identity check.
 */
export function retainPublicAiringEvidence(previous: PublicAiringEvidence,
 trustedRows: readonly PublicAiringRow[],
 context: {identityEpoch:number; current:boolean}): PublicAiringEvidence {
 if(!context.current)return previous;
 const rows=new Map(previous.identityEpoch===context.identityEpoch?previous.rows:[]);
 for(const row of trustedRows){
  if(!Number.isSafeInteger(row.bgm)||Number(row.bgm)<=0||row.key!==`bgm:${row.bgm}`)continue;
  const existing=rows.get(row.key);
  const next: {key:string;bgm:number;date:string;format:string;end?:string;broadcast?:string}={
   key:row.key,bgm:row.bgm!,date:existing?.date??'',format:existing?.format??''};
  for(const field of ['date','format','end','broadcast'] as const){
   const value=row[field]===undefined?existing?.[field]:row[field];
   if(typeof value==='string')next[field]=value;
  }
  rows.set(row.key,next);
 }
 return {identityEpoch:context.identityEpoch,rows};
}
/** Reject cross-identity reads during render, before effects have had a chance to clear. */
export function readPublicAiringEvidence(evidence:PublicAiringEvidence,identityEpoch:number):ReadonlyMap<string,PublicAiringRow>{
 return evidence.identityEpoch===identityEpoch?evidence.rows:new Map();
}
