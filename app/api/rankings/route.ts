import {rankingResponse} from '@/lib/ranking-response.mjs';
import {historicalRegistry} from '@/lib/historical-registry-content';
import {registryDetails} from '@/lib/historical-registry-shards';
import {safeSnapshot} from '@/lib/snapshots';
export const dynamic='force-dynamic';
export function GET(req:Request){return rankingResponse(req,{registry:historicalRegistry,details:registryDetails,snapshot:()=>safeSnapshot('rank:kitsu')})}
