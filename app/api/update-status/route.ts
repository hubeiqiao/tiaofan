import {curatedPlatformStatus} from '@/lib/curated-platforms';
import historicalStatus from '@/data/historical-status.json';
export async function GET(){return Response.json({demo:true,curatedPlatforms:curatedPlatformStatus(),method:'synthetic_fixtures',historicalArchive:historicalStatus,onDemandSources:[],snapshots:[],jobs:[],cadence:null,playbackPolicy:'No real playback evidence or automated source updates exist in this demo.'},{headers:{'Cache-Control':'no-store'}})}
