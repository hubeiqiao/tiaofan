import english from '@/data/english-content.json';
import japanese from '@/data/japanese-content.json';
export function GET(req:Request){const url=new URL(req.url),content=url.searchParams.get('lang')==='ja'?japanese:english;const ids=[...new Set((url.searchParams.get('ids')||'').split(',').filter(x=>/^(?:kitsu:)?\d+$/.test(x)))].slice(0,400),data=content.items as Record<string,unknown>;return Response.json({items:Object.fromEntries(ids.filter(x=>data[x]).map(x=>[x,data[x]])),provenance:content.meta},{headers:{'Cache-Control':'public,max-age=3600'}})}
