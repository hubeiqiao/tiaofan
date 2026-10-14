import {registryDetails} from '@/lib/historical-registry-shards';
import {queryHistoricalRegistry} from '@/lib/historical-registry.mjs';
export const dynamic='force-dynamic';
// Load the public registry on this route only. No private watchlist or broad metadata import.
export async function GET(req:Request){
 const u=new URL(req.url);
 try{
  const {default:registry}=await import('@/data/historical-registry-runtime');
  const version=u.searchParams.get('version');if(version&&version!==registry.revision)return Response.json({error:'REGISTRY_VERSION_CHANGED'},{status:409,headers:{'Cache-Control':'no-store'}});
  const q=u.searchParams.get('q')||'',offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||24),media=u.searchParams.get('media')||'series',year=u.searchParams.has('year')?Number(u.searchParams.get('year')):null,quarter=u.searchParams.has('quarter')?Number(u.searchParams.get('quarter')):null,coverage=u.searchParams.get('coverage')||'any',sort=u.searchParams.get('sort')||'id',minimumVotes=Number(u.searchParams.get('minimumVotes')||0);
  const result=queryHistoricalRegistry(registry,{q,offset,limit,media,year,quarter,coverage,sort,minimumVotes});
  const details=await registryDetails(registry,result.items.map((row:any)=>row.bgm));
  result.items=result.items.map((row:any)=>{const d=details[row.bgm];return{...row,image:d?.image||null,summary:d?.summary||null,summaryLanguage:d?.summaryLanguage||null,episodes:d?.episodes||null,ratings:d?.ratings||{},tags:d?.tags||[],relations:d?.relations||null};});
  return Response.json(result,{headers:{'Cache-Control':'public,max-age=300','X-Registry-Revision':registry.revision}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Registry unavailable'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
