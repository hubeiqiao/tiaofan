import {mergeMeta,type Meta} from './anime-display';
import type {RankingAnime} from '@/hooks/use-ranking-catalog';
import type {Anime} from './types';
type Row=RankingAnime&{mappingEligible?:boolean};
type Read=(url:string,signal:AbortSignal)=>Promise<any>;
/** Enrich only the demanded public page. A global unique-source claim plus a
 * unique non-conflicting metadata claim and exact subject response are required
 * before a Kitsu card acquires an existing canonical BGM saved-list key. */
export async function enrichRankingPage(rows:Row[],read:Read,signal:AbortSignal):Promise<Row[]>{
 if(rows.length>24)throw Error('RANKING_PAGE_TOO_LARGE');signal.throwIfAborted();
 const bgms=rows.filter(row=>row.bgm).map(row=>row.bgm!);
 if(bgms.length){const meta=await read('/api/metadata?ids='+bgms.join(','),signal);signal.throwIfAborted();return rows.map(row=>({...mergeMeta(row,meta.items?.[row.bgm!]),sourceRank:row.sourceRank,displayPosition:row.displayPosition,sourceAt:row.sourceAt}));}
 const eligible=rows.filter(row=>row.mappingEligible===true&&row.mal&&row.kitsuId),mals=[...new Set(eligible.map(row=>row.mal!))];
 if(!mals.length)return rows;
 const metadata=await read('/api/metadata?mals='+mals.join(','),signal);signal.throwIfAborted();
 const claims=new Map<number,Array<[number,Meta]>>();
 for(const [id,value]of Object.entries(metadata.items||{}) as Array<[string,Meta]>){const bgm=Number(id),mal=Number(value.mal);if(!Number.isSafeInteger(bgm)||bgm<=0||!mals.includes(mal))continue;const entries=claims.get(mal)||[];entries.push([bgm,value]);claims.set(mal,entries);}
 const bridges=new Map<string,[number,Meta]>();
 for(const row of eligible){const matches=claims.get(row.mal!)||[];if(matches.length===1&&!matches[0][1].conflicts?.mal&&![639938,551918].includes(matches[0][0]))bridges.set(row.kitsuId!,matches[0]);}
 if(!bridges.size)return rows;
 const ids=[...new Set([...bridges.values()].map(([id])=>id))],details=new Map<number,Anime>();
 for(let offset=0;offset<ids.length;offset+=20){const requested=ids.slice(offset,offset+20),response=await read('/api/subjects?ids='+requested.join(','),signal);signal.throwIfAborted();for(const item of response.items||[])if(requested.includes(item.bgm)&&item.key===`bgm:${item.bgm}`&&!response.excluded?.includes(String(item.bgm)))details.set(item.bgm,item);}
 return rows.map(row=>{const bridge=row.mappingEligible&&row.kitsuId?bridges.get(row.kitsuId):undefined,detail=bridge?details.get(bridge[0]):undefined;if(!bridge||!detail)return row;const enriched=mergeMeta({...row,...detail,key:`bgm:${bridge[0]}`,bgm:bridge[0],mal:row.mal,kitsuId:row.kitsuId,rating:{...detail.rating,...row.rating}},bridge[1]);return{...enriched,kitsuId:row.kitsuId,format:row.format,date:row.date,sourceRank:row.sourceRank,displayPosition:row.displayPosition,sourceAt:row.sourceAt,mappingEligible:row.mappingEligible,rating:{...enriched.rating,kitsu:row.rating.kitsu}};});
}
