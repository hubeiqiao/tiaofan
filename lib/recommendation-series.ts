import catalog from '@/data/recommendation-catalog-runtime';
import type {Anime} from './types';
import {positiveId as positive,dated,publicSourceUrl as publicUrl,sourceRecord,predecessorObservation,scopedEntryEvidence,scopedEntryStatus,scopedReleaseFacts,conflictingReleaseSubjects,type ScopedEntryEvidence,type EntryState,type SourceRecord} from './entry-order-evidence';
export type {EntryState,SourceRecord,ScopedEntryEvidence} from './entry-order-evidence';

export type SeriesEdge={sourceId:number;targetId:number;relation:string;sourceUrl:string;sourceAt:string;sourceRecordSha256?:string};
export type LegacyEntryEvidence=SourceRecord & {bgm:number;state:EntryState;method:'official_entry_and_predecessor_check';continuityScope:string;confidence:'source_supported';reviewVersion:1;predecessorCheck:SourceRecord & {scope:'unfiltered_subject_relations';predecessorIds:number[]}};
export type EntryEvidence=LegacyEntryEvidence|ScopedEntryEvidence;
type Saved={anime_key:string;state:string;updated_at:number;favorite?:number};
type Identity={byKey:ReadonlyMap<string,Pick<Anime,'bgm'>>;claims:ReadonlyMap<string,ReadonlySet<string>>};
type Row=Pick<Anime,'bgm'|'key'|'date'>;
export const RECOMMENDATION_MINIMUM_SCORE=0.8;
// A score cutoff is not semantic validation. Remain fail-closed until the public
// evaluation set has been run against the actual model and reviewed.
export const PERSONAL_RELEVANCE_VALIDATED=false;
export const PUBLIC_RELEVANCE_VALIDATED=false;
export function usableSynopsis(value:unknown):value is string{return typeof value==='string'&&value.trim().length>=40;}
/** Source language only; never infer country from title script, studio or tags. */
export function japaneseLanguageEligible(anime:Pick<Anime,'bgm'|'language'>,metadata:Record<string,{language?:string}>={}){
 const pinned=(catalog.languages as Record<string,string>)[String(anime.bgm)];
 const values=[pinned,metadata[String(anime.bgm)]?.language,anime.language].filter((x):x is string=>!!x);
 return values.length>0&&values.every(value=>value==='ja');
}
const sourceMap=catalog.sources as Record<string,{url?:string}>;
export const sourcedSeriesEdges:SeriesEdge[]=catalog.edges.map((row:Array<string|number>)=>({sourceId:Number(row[0]),targetId:Number(row[1]),relation:String(row[2]),sourceUrl:sourceMap[String(row[3])]?.url||'',sourceAt:String(row[4])}));
function validEntryEvidence(value:any):value is LegacyEntryEvidence{
 return !!value&&positive(value.bgm)&&['unknown','verified_entry','known_non_entry','conflict'].includes(value.state)&&sourceRecord(value)
  &&value.method==='official_entry_and_predecessor_check'&&value.confidence==='source_supported'&&value.reviewVersion===1
  &&typeof value.continuityScope==='string'&&value.continuityScope.trim().length>0&&value.continuityScope.length<=500
  &&sourceRecord(value.predecessorCheck)&&value.predecessorCheck.scope==='unfiltered_subject_relations'
  &&Array.isArray(value.predecessorCheck.predecessorIds)&&value.predecessorCheck.predecessorIds.every(positive);
}

/** Family exclusion and entry suitability deliberately use different evidence. */
export function buildSeriesGraph(edges:readonly SeriesEdge[],entryEvidence:readonly unknown[]=[]){
 const parents=new Map<number,number>(),predecessors=new Map<number,Set<number>>(),nodes=new Set<number>();
 const find=(id:number):number=>{const p=parents.get(id);if(p===undefined){parents.set(id,id);return id}if(p===id)return id;const root=find(p);parents.set(id,root);return root};
 const observedPredecessorEdges:SeriesEdge[]=entryEvidence.flatMap(item=>{const o=predecessorObservation(item);return o?o.check.predecessorIds.map(id=>({sourceId:o.bgm,targetId:id,relation:'prequel',sourceUrl:o.check.sourceUrl,sourceAt:o.check.sourceAt,sourceRecordSha256:o.check.recordSha256})):[]});
 for(const edge of [...edges,...observedPredecessorEdges]){
  if(!['prequel','sequel'].includes(edge.relation)||!positive(edge.sourceId)||!positive(edge.targetId)||edge.sourceId===edge.targetId||!publicUrl(edge.sourceUrl)||!dated(edge.sourceAt))continue;
  const previous=edge.relation==='sequel'?edge.sourceId:edge.targetId,next=edge.relation==='sequel'?edge.targetId:edge.sourceId;
  nodes.add(previous);nodes.add(next);const before=predecessors.get(next)||new Set<number>();before.add(previous);predecessors.set(next,before);
  const a=find(previous),b=find(next);if(a!==b)parents.set(Math.max(a,b),Math.min(a,b));
 }
 const groups=new Map<number,number[]>();for(const id of nodes){const key=find(id),members=groups.get(key)||[];members.push(id);groups.set(key,members)}
 const evidence=new Map<number,LegacyEntryEvidence[]>();for(const item of entryEvidence){if(!validEntryEvidence(item))continue;const rows=evidence.get(item.bgm)||[];rows.push(item);evidence.set(item.bgm,rows)}
 const scoped=new Map<number,ScopedEntryEvidence[]>(),invalidScoped=new Set<number>();for(const item of entryEvidence){const p=scopedEntryEvidence(item);if(p){const rows=scoped.get(p.bgm)||[];rows.push(p);scoped.set(p.bgm,rows)}else if(item&&typeof item==='object'&&(item as any).reviewVersion===2&&positive((item as any).bgm))invalidScoped.add((item as any).bgm)}
 const releaseConflicts=conflictingReleaseSubjects([...scoped.values()].flat());
 const roots=new Map<number,number[]>(),conflictedGroups=new Set<number>(),cyclicGroups=new Set<number>();
 for(const [key,members] of groups){
  const groupRoots=members.filter(id=>!predecessors.get(id)?.size);roots.set(key,groupRoots);
  // Check the full component, never just the filtered/capped candidate subset.
  const pending=new Map(members.map(id=>[id,predecessors.get(id)?.size||0]));const queue=[...groupRoots];let visited=0;
  const successors=new Map<number,number[]>();for(const id of members)for(const before of predecessors.get(id)||[]){const next=successors.get(before)||[];next.push(id);successors.set(before,next)}
  for(let i=0;i<queue.length;i++){visited++;for(const next of successors.get(queue[i])||[]){const left=pending.get(next)!-1;pending.set(next,left);if(left===0)queue.push(next)}}
  if(visited!==members.length)cyclicGroups.add(key);
  if(groupRoots.length!==1||visited!==members.length)conflictedGroups.add(key);
  // Conflicting positive proofs must not disappear when their row is filtered out.
  if(members.some(id=>(evidence.get(id)||[]).some(e=>e.state==='conflict'||e.state==='verified_entry'&&((predecessors.get(id)?.size||0)>0||e.predecessorCheck.predecessorIds.length>0))))conflictedGroups.add(key);
 }
 const group=(id:number)=>parents.has(id)?find(id):id;
 function entryStatus(id:number):EntryState{
  if(invalidScoped.has(id))return'unknown';
  // v2 never silently overrides active v1 assertions. Migrate/review the active
  // record explicitly, preserving prior evidence in its audit history.
  const scopedProof=scoped.get(id);if(scopedProof){if(evidence.get(id)?.length)return'conflict';return scopedEntryStatus(scopedProof,predecessors.get(id)||new Set(),cyclicGroups.has(group(id)),releaseConflicts.has(id)||scopedProof.flatMap(scopedReleaseFacts).some(fact=>releaseConflicts.has(fact.subjectId)))}
  const proof=evidence.get(id)||[],knownPredecessor=(predecessors.get(id)?.size||0)>0;
  const verified=proof.filter(e=>e.state==='verified_entry'),negative=proof.some(e=>e.state==='known_non_entry'||e.predecessorCheck.predecessorIds.length>0);
  if(conflictedGroups.has(group(id))||proof.some(e=>e.state==='conflict')||verified.length>0&&(negative||knownPredecessor||new Set(verified.map(e=>e.continuityScope)).size>1))return'conflict';
  if(knownPredecessor||negative)return'known_non_entry';
  if(!verified.length)return'unknown';
  const componentRoots=roots.get(group(id));if(componentRoots&&(componentRoots.length!==1||componentRoots[0]!==id))return'conflict';
  return'verified_entry';
 }
 return{group,groups,predecessors,entryStatus,observedPredecessorEdges,entryEvidence:(id:number):EntryEvidence[]=>[...(evidence.get(id)||[]),...(scoped.get(id)||[])]};
}
const defaultGraph=buildSeriesGraph(sourcedSeriesEdges,catalog.entryEvidence||[]);
/** Every saved member excludes its sourced family; no saved state is inferred or written. */
export function savedSeriesKeys(saved:readonly Saved[],identity:Identity,graph=defaultGraph){
 const blockedGroups=new Set<number>();
 for(const signal of saved){
  const id=identity.byKey.get(signal.anime_key)?.bgm||(/^bgm:[1-9]\d*$/.test(signal.anime_key)?Number(signal.anime_key.slice(4)):undefined);
  if(id)blockedGroups.add(graph.group(id));
  for(const key of identity.claims.get(signal.anime_key)||[]){if(/^bgm:\d+$/.test(key))blockedGroups.add(graph.group(Number(key.slice(4))))}
 }
 return blockedGroups;
}
/** Unknown/partial relation coverage never certifies a new-viewer entry. */
export function seriesEntryCandidates<T extends Row>(rows:readonly T[],saved:readonly Saved[],identity:Identity,graph=defaultGraph):T[]{
 const blockedGroups=savedSeriesKeys(saved,identity,graph),seen=new Set<number>();
 return rows.filter(row=>{
  if(!positive(row.bgm)||row.key!==`bgm:${row.bgm}`||seen.has(row.bgm)||blockedGroups.has(graph.group(row.bgm))||graph.entryStatus(row.bgm)!=='verified_entry')return false;
  seen.add(row.bgm);return true;
 });
}
export function recommendationEntryStatus(id:number){return defaultGraph.entryStatus(id);}
export function recommendationSeriesKey(id:number){return defaultGraph.group(id);}
/** Public, source-backed component IDs only; safe to project for a few spotlight cards. */
export function recommendationSeriesMembers(id:number){return [...(defaultGraph.groups.get(defaultGraph.group(id))||[id])].sort((a,b)=>a-b);}
