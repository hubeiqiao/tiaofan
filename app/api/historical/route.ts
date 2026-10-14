import {historicalContent} from '@/lib/historical-content';
export const dynamic='force-dynamic';
/** Bounded public TV subset; no private profile and no external source requests. */
export async function GET(){return Response.json(await historicalContent(),{headers:{'Cache-Control':'public, max-age=300'}})}
