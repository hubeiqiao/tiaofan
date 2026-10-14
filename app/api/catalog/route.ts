import {withTitle} from '@/lib/known-titles';
import {fetchCatalogPage} from '@/lib/catalog-source';
import {catalogKey,safeSnapshot,snapshotInfo} from '@/lib/snapshots';
export async function GET(req:Request){const u=new URL(req.url),rank=u.searchParams.get('rank')==='1',year=Number(u.searchParams.get('year')),quarter=Number(u.searchParams.get('quarter')),offset=Math.max(0,Math.min(980,Number(u.searchParams.get('offset'))||0));
 const cached=await safeSnapshot(rank?'rank:bgm':catalogKey(year,quarter));
 if(cached){let data=JSON.parse(cached.payload);const version=u.searchParams.get('version');if(version&&data.at!==version){const previous=cached.previous_payload?JSON.parse(cached.previous_payload):null;if(previous?.at===version)data=previous;else return Response.json({error:'片单刚刚更新，请重新读取以保持分页一致。'},{status:409,headers:{'Cache-Control':'no-store'}})}const items=data.items.slice(offset,offset+20).map(withTitle);return Response.json({...data,items,total:data.items.length,received:items.length,totalScope:'服务端快照的已收录条目；页面按形式、季度及续播规则进一步筛选。',cache:snapshotInfo(cached)},{headers:{'Cache-Control':'no-store'}})}
 return Response.json({error:'当前季度的后台快照尚未准备好，请稍后再试。'},{status:503,headers:{'Cache-Control':'no-store'}});
}
