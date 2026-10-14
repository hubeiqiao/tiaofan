/** Public, offline-reviewed source evidence. Shape validation is not factual review. */
export type EntryState='unknown'|'verified_entry'|'known_non_entry'|'conflict';
export type SourceRecord={sourceUrl:string;sourceAt:string;sourceAtMeaning:'observed_snapshot_not_publication'|'published_snapshot';sourcePublishedAt?:string|null;fetchedAt:string;recordSha256:string};
export type PredecessorObservation=SourceRecord & {scope:'unfiltered_subject_relations';predecessorIds:number[]};
type Support=SourceRecord & {subjectId:number;claim:'newcomer_narrative_start'|'independent_continuity_start'|'independent_comprehension';statement:string};
type ReleaseRecord=SourceRecord & {subjectId:number;media:'TV'|'movie'|'OVA'|'ONA'|'special';originalReleaseDate:string;datePrecision:'day';territory:'JP';timezone:'Asia/Tokyo';releaseStatus:'released'};
type Disposition={subjectId:number;classification:'required'|'unresolved'|'later_chronological_prequel'|'alternate_continuity'|'standalone_not_required';rationale:string;sources:SourceRecord[];releaseOrder?:{entry:ReleaseRecord;predecessor:ReleaseRecord}};
export type ScopedEntryEvidence=SourceRecord & {
 bgm:number;state:EntryState;method:'scoped_entry_and_prerequisite_review';reviewVersion:2;confidence:'source_supported';continuityScope:string;
 entryContext:{purpose:'newcomer';media:'TV';viewingOrder:'release';continuityId:string};
 entryBasis:'release_order_origin'|'independent_remake'|'standalone_side_story';
 conclusionOrigin:'explicit_official_guidance'|'editorial_inference_from_sourced_facts';
 entrySupport:Support[];predecessorCheck:PredecessorObservation;
 prerequisiteAssessment:{requiredBeforeIds:number[];unresolvedIds:number[];dispositions:Disposition[]};
};
export const positiveId=(id:unknown):id is number=>typeof id==='number'&&Number.isSafeInteger(id)&&id>0;
export const dated=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export const publicSourceUrl=(value:unknown)=>{if(typeof value!=='string')return false;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max=1000):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const ids=(value:unknown):value is number[]=>Array.isArray(value)&&value.length<=200&&value.every(positiveId)&&new Set(value).size===value.length;
const sameIds=(a:number[],b:number[])=>a.length===b.length&&a.every(id=>b.includes(id));
export function sourceRecord(value:unknown):value is SourceRecord & Record<string,any>{
 return record(value)&&publicSourceUrl(value.sourceUrl)&&dated(value.sourceAt)&&['observed_snapshot_not_publication','published_snapshot'].includes(value.sourceAtMeaning)&&dated(value.fetchedAt)
  &&Date.parse(value.sourceAt)<=Date.parse(value.fetchedAt)
  &&(value.sourcePublishedAt===undefined||value.sourcePublishedAt===null||(dated(value.sourcePublishedAt)&&Date.parse(value.sourcePublishedAt)<=Date.parse(value.sourceAt)))
  &&typeof value.recordSha256==='string'&&/^[a-f0-9]{64}$/.test(value.recordSha256);
}
/** Relation observation can remain useful for exclusion even if entry proof fails. */
export function predecessorObservation(value:unknown):{bgm:number;check:PredecessorObservation}|null{
 if(!record(value)||!positiveId(value.bgm)||!record(value.predecessorCheck))return null;
 const p=value.predecessorCheck;
 return sourceRecord(p)&&p.scope==='unfiltered_subject_relations'&&ids(p.predecessorIds)&&!p.predecessorIds.includes(value.bgm)?{bgm:value.bgm,check:p as PredecessorObservation}:null;
}
const sourceList=(value:unknown):value is SourceRecord[]=>Array.isArray(value)&&value.length>0&&value.length<=12&&value.every(sourceRecord);
function exactDate(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value;
}
function releaseRecord(value:unknown,subjectId:number,entry:boolean):value is ReleaseRecord{
 return record(value)&&sourceRecord(value)&&value.subjectId===subjectId&&['TV','movie','OVA','ONA','special'].includes(value.media)&&(!entry||value.media==='TV')
  &&exactDate(value.originalReleaseDate)&&value.datePrecision==='day'&&value.territory==='JP'&&value.timezone==='Asia/Tokyo'&&value.releaseStatus==='released'
  &&Date.parse(value.originalReleaseDate+'T00:00:00+09:00')<=Date.parse(value.sourceAt)&&Date.parse(value.originalReleaseDate+'T00:00:00+09:00')<=Date.parse(value.fetchedAt);
}
export function scopedEntryEvidence(value:unknown):ScopedEntryEvidence|null{
 if(!record(value)||!positiveId(value.bgm)||!sourceRecord(value)||value.reviewVersion!==2||value.method!=='scoped_entry_and_prerequisite_review'||value.confidence!=='source_supported'
  ||!['unknown','verified_entry','known_non_entry','conflict'].includes(value.state)||!text(value.continuityScope,500)
  ||!record(value.entryContext)||value.entryContext.purpose!=='newcomer'||value.entryContext.media!=='TV'||value.entryContext.viewingOrder!=='release'||!text(value.entryContext.continuityId,150)
  ||!['release_order_origin','independent_remake','standalone_side_story'].includes(value.entryBasis)
  ||!['explicit_official_guidance','editorial_inference_from_sourced_facts'].includes(value.conclusionOrigin)||!predecessorObservation(value))return null;
 const claim={release_order_origin:'newcomer_narrative_start',independent_remake:'independent_continuity_start',standalone_side_story:'independent_comprehension'}[value.entryBasis as ScopedEntryEvidence['entryBasis']];
 if(!Array.isArray(value.entrySupport)||value.entrySupport.length<1||value.entrySupport.length>12||!value.entrySupport.every(s=>record(s)&&sourceRecord(s)&&s.subjectId===value.bgm&&s.claim===claim&&text(s.statement)))return null;
 const a=value.prerequisiteAssessment;
 if(!record(a)||!ids(a.requiredBeforeIds)||!ids(a.unresolvedIds)||a.requiredBeforeIds.includes(value.bgm)||a.unresolvedIds.includes(value.bgm)
  ||a.requiredBeforeIds.some(id=>a.unresolvedIds.includes(id))||!Array.isArray(a.dispositions)||a.dispositions.length>200)return null;
 const seen=new Set<number>();
 for(const d of a.dispositions){
  if(!record(d)||!positiveId(d.subjectId)||seen.has(d.subjectId)||!text(d.rationale)||!sourceList(d.sources)
   ||!['required','unresolved','later_chronological_prequel','alternate_continuity','standalone_not_required'].includes(d.classification))return null;
  seen.add(d.subjectId);
  if(d.classification==='later_chronological_prequel'){
   if(value.entryBasis!=='release_order_origin'||!record(d.releaseOrder)||!releaseRecord(d.releaseOrder.entry,value.bgm,true)||!releaseRecord(d.releaseOrder.predecessor,d.subjectId,false)
    ||d.releaseOrder.entry.originalReleaseDate>=d.releaseOrder.predecessor.originalReleaseDate)return null;
  }else if(d.releaseOrder!==undefined)return null;
  if(d.classification==='alternate_continuity'&&value.entryBasis!=='independent_remake')return null;
  if(d.classification==='standalone_not_required'&&value.entryBasis!=='standalone_side_story')return null;
 }
 const observed=(value.predecessorCheck as PredecessorObservation).predecessorIds;
 if(!sameIds([...seen],observed)||!sameIds(a.requiredBeforeIds,a.dispositions.filter(d=>d.classification==='required').map(d=>d.subjectId))
  ||!sameIds(a.unresolvedIds,a.dispositions.filter(d=>d.classification==='unresolved').map(d=>d.subjectId)))return null;
 return value as ScopedEntryEvidence;
}
export function scopedReleaseFacts(proof:ScopedEntryEvidence):ReleaseRecord[]{
 return proof.prerequisiteAssessment.dispositions.flatMap(d=>d.releaseOrder?[d.releaseOrder.entry,d.releaseOrder.predecessor]:[]);
}
/** Original release facts are about exact subjects, not individual proof occurrences. */
export function conflictingReleaseSubjects(proofs:ScopedEntryEvidence[]):Set<number>{
 const facts=new Map<number,string>(),media=new Map<number,string>(),conflicts=new Set<number>();
 for(const proof of proofs)media.set(proof.bgm,proof.entryContext.media);
 for(const fact of proofs.flatMap(scopedReleaseFacts)){
  const signature=JSON.stringify([fact.media,fact.originalReleaseDate,fact.datePrecision,fact.territory,fact.timezone,fact.releaseStatus]);
  const knownMedia=media.get(fact.subjectId);if(knownMedia!==undefined&&knownMedia!==fact.media)conflicts.add(fact.subjectId);else media.set(fact.subjectId,fact.media);
  const prior=facts.get(fact.subjectId);if(prior!==undefined&&prior!==signature)conflicts.add(fact.subjectId);else facts.set(fact.subjectId,signature);
 }
 return conflicts;
}
/** Full known predecessor union must be covered; source chronology alone is not a prerequisite. */
export function scopedEntryStatus(proofs:ScopedEntryEvidence[],knownPredecessors:ReadonlySet<number>,cyclic:boolean,releaseConflict=false):EntryState{
 if(!proofs.length)return'unknown';
 if(cyclic||releaseConflict||conflictingReleaseSubjects(proofs).size>0||proofs.some(p=>p.state==='conflict')||new Set(proofs.map(p=>p.entryContext.continuityId)).size>1)return'conflict';
 const positive=proofs.some(p=>p.state==='verified_entry');
 const required=proofs.some(p=>p.state==='known_non_entry'||p.prerequisiteAssessment.requiredBeforeIds.length>0);
 const classifications=new Map<number,Set<string>>();
 for(const p of proofs)for(const d of p.prerequisiteAssessment.dispositions){const s=classifications.get(d.subjectId)||new Set<string>();s.add(d.classification);classifications.set(d.subjectId,s)}
 if([...classifications.values()].some(s=>[...s].filter(x=>x!=='unresolved').length>1))return'conflict';
 if(required)return positive?'conflict':'known_non_entry';
 if(proofs.some(p=>p.state==='unknown'||p.prerequisiteAssessment.unresolvedIds.length>0||[...knownPredecessors].some(id=>!p.predecessorCheck.predecessorIds.includes(id))))return'unknown';
 return positive?'verified_entry':'unknown';
}
