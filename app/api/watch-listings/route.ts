import {watchListingsIndex} from '@/lib/watch-listings';
// Public bundled metadata only: query parameters cannot become upstream URLs or writes.
export async function GET(request:Request) {
  const params = new URL(request.url).searchParams;
  const bgm = params.get('bgm') || undefined;
  if (bgm && !/^\d{1,10}$/.test(bgm)) return Response.json({error:'Invalid title ID'},{status:400});
  return Response.json(watchListingsIndex({bgm,query:params.get('q') || '',offset:Number(params.get('offset') || 0),limit:Number(params.get('limit') || 24)}),{headers:{'Cache-Control':'no-store'}});
}
