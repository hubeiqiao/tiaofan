import {queryRanking,hydrateRankingPage} from './ranking-catalog.mjs';
/** Read-only, dependency-injected HTTP boundary. It never initiates source fetches. */
export async function rankingResponse(req,deps){
 const u=new URL(req.url),source=u.searchParams.get('source')||'bgm',now=Date.now();
 const args={offset:Number(u.searchParams.get('offset')||0),limit:Number(u.searchParams.get('limit')||24),top:Number(u.searchParams.get('top')||500),media:u.searchParams.get('media')||'series',query:u.searchParams.get('q')||'',minimumVotes:Number(u.searchParams.get('minimumVotes')||0),version:u.searchParams.get('version'),airing:u.searchParams.get('airing')||'all'};
 try{
  if(!['bgm','kitsu'].includes(source))throw Error('INVALID_RANKING_QUERY');
  let result;
  if(source==='bgm'){
   const registry=await deps.registry();result=queryRanking({source,registry},args,now);
   result=await hydrateRankingPage(result,ids=>deps.details(registry,ids));
  }else{
   const stored=await deps.snapshot();if(!stored)throw Error('RANKING_UNAVAILABLE');
   let snapshot=JSON.parse(stored.payload),retainedPreviousVersion=false;
   const versionFor=at=>`kitsu:${at}${args.airing==='all'?'':':date:'+new Date(now).toISOString().slice(0,10)}`;
   if(args.version&&args.version!==versionFor(snapshot.at)&&stored.previous_payload){const previous=JSON.parse(stored.previous_payload);if(args.version===versionFor(previous.at)){snapshot=previous;retainedPreviousVersion=true;}}
   result=queryRanking({source,snapshot},args,now);
   const cacheStale=now-Date.parse(snapshot.at)>12*3600000,cacheDegraded=!!stored.last_error;
   result.items=result.items.map(row=>({...row,rating:{...row.rating,kitsu:{...row.rating.kitsu,cacheStale:cacheStale||now-Date.parse(row.rating.kitsu.at)>12*3600000,cacheDegraded}}}));
   result.coverage={...result.coverage,cacheStale,cacheDegraded,lastAttemptFailed:cacheDegraded,lastSuccessfulAt:snapshot.at,lastAttemptAt:typeof stored.attempted_at==='number'&&Number.isFinite(stored.attempted_at)?new Date(stored.attempted_at).toISOString():null,retainedPreviousVersion,dataState:cacheDegraded?'last-good':cacheStale?'stale':'fresh'};
  }
  return Response.json(result,{headers:{'Cache-Control':'no-store','X-Ranking-Revision':result.revision}});
 }catch(error){const code=error instanceof Error?error.message:'';const status=code==='RANKING_VERSION_CHANGED'?409:code==='INVALID_RANKING_QUERY'?400:503;return Response.json({error:status===503?'RANKING_UNAVAILABLE':code,items:[]},{status,headers:{'Cache-Control':'no-store'}});}
}
