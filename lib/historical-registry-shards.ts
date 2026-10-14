// No large eager imports. Parsed shard objects are request-local, not global cache.
const loaders: Record<string,()=>Promise<{default:string}>>={"000":()=>import("../data/historical-registry-shards/000")};
export async function registryDetails(index:any,ids:number[]){
 if(ids.length>80)throw Error('Detail ID cap exceeded');
 const wanted=new Set(ids),selected=index.items.filter((r:any)=>wanted.has(r.bgm)&&r.detailShard),groups=[...new Set<string>(selected.map((r:any)=>r.detailShard))],result:Record<string,any>={};
 for(const group of groups){const load=loaders[group];if(!load)continue;const raw=(await load()).default;const shard=JSON.parse(raw);for(const row of selected)if(row.detailShard===group&&shard[row.bgm])result[row.bgm]=shard[row.bgm];}
 return result;
}
