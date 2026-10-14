/** Attach the existing source retrieval record only after selecting an exact public title. */
export function metadataLinksWithProvenance(row:{streams:any[];sourceLinks:any[]},meta:any){
 const stamp=(link:any)=>{
  const cross=typeof link.provenance==='string'&&link.provenance.startsWith('wikidata:');
  return {...link,sourceUrl:cross?meta.crossSource?.sources?.find((s:any)=>s.name==='Wikidata')?.url:meta.snapshotUrl||meta.sourceUrl,retrievedAt:cross?meta.crossSource?.retrievedAt:meta.retrievedAt};
 };
 return {streams:row.streams.map(stamp),sourceLinks:row.sourceLinks.map(stamp)};
}
