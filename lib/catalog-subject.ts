import {displayTitle} from './title-fallback';
import type {Anime} from './types';

export type CatalogPeriod={year:number;quarter:number};
type Subject=Record<string,any>;
export const catalogContinuation=(id:number,period:CatalogPeriod)=>id===639938&&period.year===2026&&period.quarter===3;
const excludedTags=new Set(['里番','18禁','成人动画','Hentai']);
export function catalogSubjectEligible(x:Subject){
 return x.type===2&&!x.nsfw&&x.id!==701303&&(!['WEB','ONA','网络动画'].includes(x.platform)||x.id===639938)&&!(x.tags||[]).some((t:any)=>excludedTags.has(t.name));
}
export function normalizeCatalogSubject(x:Subject,at:string):Anime{
 return {key:`bgm:${x.id}`,bgm:x.id,name:displayTitle(x.name_cn,x.name,[],x.id),originalName:x.name||'',aliases:[x.name_cn,x.name].filter(Boolean),image:x.images?.common||x.images?.medium||'',summary:x.summary||'',date:x.date||'',format:x.platform||'',episodes:x.eps||undefined,collection:x.collection,tags:(x.tags||[]).map((t:{name:string})=>t.name).filter((s:string)=>/\p{Script=Han}/u.test(s)&&!/[\u3040-\u30ff]/.test(s)&&s.length<10&&!/^\d/.test(s)).slice(0,5),rating:{bgm:{score:x.rating?.total&&x.rating?.score?x.rating.score:null,count:x.rating?.total||0,rank:x.rating?.rank,distribution:x.rating?.count,url:`https://bangumi.tv/subject/${x.id}`,at}}};
}
// Search already constrains type/date. Exact-ID reconciliation must independently
// establish those facts; an incomplete response cannot authorize a removal.
export function exactSubjectEligible(x:unknown,id:number,period:CatalogPeriod):x is Subject{
 if(!x||typeof x!=='object')throw Error('条目身份无法核实，保留上次目录');
 const s=x as Subject;
 if(s.id!==id||!Number.isSafeInteger(s.type)||typeof s.nsfw!=='boolean'||typeof s.platform!=='string'||!Array.isArray(s.tags)||s.tags.some((t:any)=>!t||typeof t.name!=='string'))throw Error('条目身份或筛选信息无法核实，保留上次目录');
 if(!catalogSubjectEligible(s))return false;
 const date=s.date;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('条目播出日期无法核实，保留上次目录');
 const start=new Date(Date.UTC(period.year,period.quarter*3,1)).toISOString().slice(0,10),end=new Date(Date.UTC(period.year,period.quarter*3+3,1)).toISOString().slice(0,10);
 return (date>=start&&date<end)||catalogContinuation(id,period);
}
