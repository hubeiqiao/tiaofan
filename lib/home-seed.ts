import {prepareSourcePersonal} from './source-personal-recommendations';
import {safeSnapshot,catalogKey,currentPeriods} from './snapshots';
import {withTitle} from './known-titles';
import {mergeMeta,publicIdentityMeta,compactSeedRow} from './anime-display';
import {homeMetadata} from './home-metadata';
import {GET as translationsGET} from '@/app/api/translations/route';
import {GET as spotlightGET} from '@/app/api/spotlight/route';
import type {Anime} from './types';
import type {HomeSeed} from './home-seed-types';
// Public snapshots only. No request headers, identity, library, preference or provider call.
// React serializes this typed prop; never inject source JSON through an HTML script.
export async function homeSeed(locale:'zh'|'en'|'ja'):Promise<HomeSeed|null>{
 try{
  const {year,quarter}=currentPeriods().current,snapshot=await safeSnapshot(catalogKey(year,quarter));if(!snapshot)return null;
  const data=JSON.parse(snapshot.payload);if(!Array.isArray(data.items)||data.items.length>400||!Number.isFinite(Date.parse(data.at)))return null;
  const rows:Anime[]=data.items.map(withTitle),ids=rows.map(a=>a.bgm).filter(id=>Number.isSafeInteger(id)&&id!>0).map(String);
  const [meta,english,spotlight]=await Promise.all([
   homeMetadata(ids).then(r=>r.json()) as Promise<any>,
   locale!=='zh'?translationsGET(new Request('https://seed.invalid/api/translations?lang='+locale+'&ids='+ids.join(','))).json() as Promise<any>:Promise.resolve({items:{}}),
   spotlightGET(new Request(`https://seed.invalid/api/spotlight?year=${year}&quarter=${quarter}`)).then(r=>r.json()) as Promise<any>
  ]);
  const publicRows=rows.map(a=>compactSeedRow(mergeMeta(a,meta.items[a.bgm!])));
  const discovery=prepareSourcePersonal({period:'current',media:'series',q:''},[],{current:{items:publicRows,updatedAt:snapshot.updated_at},previous:{items:[],updatedAt:snapshot.updated_at}},meta.items,Date.now()).discoveryCandidates;
  const seed:HomeSeed={year,quarter,at:data.at,items:publicRows,discovery,identityMeta:publicIdentityMeta(meta.items),english:english.items||{},spotlights:spotlight.items||[]};
  return new TextEncoder().encode(JSON.stringify(seed)).length<=1000000?seed:null;
 }catch{return null}
}
