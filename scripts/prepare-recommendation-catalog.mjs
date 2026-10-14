import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Public, immutable source snapshots only. Never read a watchlist or saved payload.
export function generateRecommendationCatalog(root=fileURLToPath(new URL('../',import.meta.url)),output=path.join(root,'data/recommendation-catalog.json')){
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/historical-registry.json'),'utf8'));
const metadata=JSON.parse(fs.readFileSync(path.join(root,'data/metadata.json'),'utf8'));
const direct=JSON.parse(fs.readFileSync(path.join(root,'data/anime-relations.json'),'utf8'));
const sources={metadata:{url:metadata.meta.snapshotUrl||metadata.meta.sourceUrl,at:metadata.meta.retrievedAt},...registry.sources};
const entryRecords=JSON.parse(fs.readFileSync(path.join(root,'data/recommendation-entry-evidence.json'),'utf8'));
if(entryRecords.schemaVersion!==1||!Array.isArray(entryRecords.items))throw Error('Invalid entry evidence schema');
// Preserve field observation separately. These relations were filtered to verified
// TV endpoints; even a present empty array is never complete predecessor proof.
const relationCoverage={schemaVersion:1,scope:'filtered_verified_tv_relations_only',notEntryProof:true,columns:['bgm','fieldState','sourceReferences','recordSha256'],rows:registry.items.map(row=>{
 const present=Object.hasOwn(row,'relations'),relations=Array.isArray(row.relations)?row.relations:null;
 const state=!present?'missing':relations===null?'invalid':relations.length?'observed_nonempty':'observed_empty';
 const references=relations?.length?[...new Map(relations.filter(e=>sources[e.sourceKey]&&e.sourceAt).map(e=>[e.sourceKey+':'+e.sourceAt,[e.sourceKey,e.sourceAt]])).values()]:relations&&row.archiveCheckedAt&&sources['bangumi-archive']?[['bangumi-archive',row.archiveCheckedAt]]:[];
 const recordSha256=createHash('sha256').update(JSON.stringify({bgm:row.bgm,present,...(present?{relations:row.relations}:{})})).digest('hex');
 return[row.bgm,state,references,recordSha256];
})};
const edges=[];
for(const row of registry.items){
 for(const edge of row.relations||[]){
  if(!['prequel','sequel'].includes(edge.relation)||!sources[edge.sourceKey]?.url||!edge.sourceAt)continue;
  edges.push([row.bgm,edge.targetBgm,edge.relation,edge.sourceKey,edge.sourceAt]);
 }
}
const supplement=JSON.parse(fs.readFileSync(path.join(path.dirname(output),'recommendation-relation-evidence.json'),'utf8'));
for(const edge of [...direct.items,...supplement.items]){
 if(edge.type!==2||!['prequel','sequel'].includes(edge.relation)||!edge.sourceUrl||!edge.retrievedAt)continue;
 const key='direct:'+edge.sourceId;sources[key]={url:edge.sourceUrl,at:edge.retrievedAt};
 edges.push([edge.sourceId,edge.targetId,edge.relation,key,edge.retrievedAt]);
}
const languages=Object.fromEntries(Object.entries(metadata.items).filter(([,row])=>typeof row.language==='string').map(([id,row])=>[id,row.language]));
const content=JSON.stringify({schemaVersion:2,registryRevision:registry.revision,scope:'Source language is catalog eligibility, not verified production country. Only explicit prequel/sequel edges join saved families. Entry eligibility requires separate dated proof; relation field presence and graph roots are not proof.',sources,languages,relationCoverage,entryEvidence:entryRecords.items,edgeColumns:['sourceId','targetId','relation','sourceKey','sourceAt'],edges});
fs.writeFileSync(output,content+'\n');
const runtime='// Generated from public source snapshots; no private records.\nconst raw:string='+JSON.stringify(content)+';\nconst catalog:{languages:Record<string,string>;sources:Record<string,{url?:string}>;edges:Array<Array<string|number>>;entryEvidence:unknown[];relationCoverage:unknown}=JSON.parse(raw);\nexport default catalog;\n';
fs.writeFileSync(output.replace(/\.json$/, '-runtime.ts'),runtime);
console.log(JSON.stringify({output,languageCount:Object.keys(languages).length,edges:edges.length,observedRelationFields:relationCoverage.rows.filter(row=>row[1]!=='missing').length,entryEvidenceRecords:entryRecords.items.length}));

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))generateRecommendationCatalog(process.argv[2],process.argv[3]);
