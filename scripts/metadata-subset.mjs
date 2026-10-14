import {createHash} from 'node:crypto';
export function metadataSubset(rawMetadata,rawSnapshots){
 const metadata=JSON.parse(rawMetadata),snapshots=JSON.parse(rawSnapshots),ids=new Set();
 if(!metadata.items||!Array.isArray(snapshots.snapshots))throw Error('Public metadata inputs are invalid');
 for(const snapshot of snapshots.snapshots){
  if(!/^catalog:\d{4}:[0-3]$/.test(snapshot.key))continue;
  for(const body of [snapshot.payload,snapshot.previous_payload]){
   if(!body)continue;const rows=JSON.parse(body).items;if(!Array.isArray(rows))throw Error('Catalogue rows are invalid');
   for(const row of rows){if(!Number.isSafeInteger(row.bgm)||row.bgm<=0)throw Error('Catalogue identity is invalid');ids.add(String(row.bgm))}
  }
 }
 const coveredIds=[...ids].sort((a,b)=>Number(a)-Number(b));
 return {schemaVersion:1,source:{metadataSha256:createHash('sha256').update(rawMetadata).digest('hex'),catalogIdsSha256:createHash('sha256').update(JSON.stringify(coveredIds)).digest('hex')},coveredIds,metadata:{meta:metadata.meta,items:Object.fromEntries(coveredIds.filter(id=>Object.hasOwn(metadata.items,id)).map(id=>[id,metadata.items[id]]))}};
}
